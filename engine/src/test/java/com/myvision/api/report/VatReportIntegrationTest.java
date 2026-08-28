package com.myvision.api.report;

import com.fasterxml.jackson.databind.JsonNode;
import com.myvision.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * VAT invoiced over a period.
 *
 * <p>The rules that matter are which invoices count and how mixed rates split, because both
 * change the number an operator would carry into a return.
 */
class VatReportIntegrationTest extends AbstractIntegrationTest {

  @Test
  void draftInvoicesAreExcludedUntilIssued() throws Exception {
    String token = registerAndGetToken("vat-draft@myvision.dev", "VAT Draft Co");
    String clientId = createClient(token, "VAT Client");

    String invoiceId = createInvoice(token, clientId, "2026-05-10", "100.00", 19);

    // Still a draft: nothing has been invoiced, so nothing is owed.
    mockMvc.perform(get("/api/reports/vat")
            .param("from", "2026-01-01").param("to", "2026-12-31")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.invoiceCount").value(0))
        .andExpect(jsonPath("$.vatAmount").value(0));

    mockMvc.perform(post("/api/invoices/{id}/mark-sent", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());

    mockMvc.perform(get("/api/reports/vat")
            .param("from", "2026-01-01").param("to", "2026-12-31")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.invoiceCount").value(1))
        .andExpect(jsonPath("$.netAmount").value(200.00))
        .andExpect(jsonPath("$.vatAmount").value(38.00))
        .andExpect(jsonPath("$.grossAmount").value(238.00));
  }

  @Test
  void invoicesOutsideThePeriodAreIgnored() throws Exception {
    String token = registerAndGetToken("vat-period@myvision.dev", "VAT Period Co");
    String clientId = createClient(token, "VAT Client");

    String inside = createInvoice(token, clientId, "2026-05-10", "100.00", 19);
    String outside = createInvoice(token, clientId, "2026-11-10", "100.00", 19);
    markSent(token, inside);
    markSent(token, outside);

    // Q2 only: the November invoice belongs to a different return.
    mockMvc.perform(get("/api/reports/vat")
            .param("from", "2026-04-01").param("to", "2026-06-30")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.invoiceCount").value(1))
        .andExpect(jsonPath("$.vatAmount").value(38.00));
  }

  @Test
  void mixedRatesAreSplitPerRate() throws Exception {
    String token = registerAndGetToken("vat-rates@myvision.dev", "VAT Rates Co");
    String clientId = createClient(token, "VAT Client");

    MvcResult result = mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "clientId": "%s",
                  "issueDate": "2026-05-10",
                  "items": [
                    { "kind": "labor", "description": "Standard rated", "quantity": 1,
                      "unit": "pcs", "unitPrice": 100.00, "taxRate": 19 },
                    { "kind": "service", "description": "Reduced rated", "quantity": 1,
                      "unit": "pcs", "unitPrice": 100.00, "taxRate": 7 }
                  ]
                }
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        .andReturn();
    markSent(token, objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText());

    // A return reports each rate separately, so a blended total would be unusable.
    mockMvc.perform(get("/api/reports/vat")
            .param("from", "2026-01-01").param("to", "2026-12-31")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.byRate.length()").value(2))
        .andExpect(jsonPath("$.byRate[0].rate").value(7))
        .andExpect(jsonPath("$.byRate[0].vatAmount").value(7.00))
        .andExpect(jsonPath("$.byRate[1].rate").value(19))
        .andExpect(jsonPath("$.byRate[1].vatAmount").value(19.00))
        .andExpect(jsonPath("$.vatAmount").value(26.00));
  }

  @Test
  void anInvertedPeriodIsRejected() throws Exception {
    String token = registerAndGetToken("vat-range@myvision.dev", "VAT Range Co");

    mockMvc.perform(get("/api/reports/vat")
            .param("from", "2026-06-30").param("to", "2026-04-01")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isBadRequest());
  }

  private void markSent(String token, String invoiceId) throws Exception {
    mockMvc.perform(post("/api/invoices/{id}/mark-sent", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());
  }

  private String createInvoice(
      String token, String clientId, String issueDate, String unitPrice, int taxRate)
      throws Exception {
    MvcResult result = mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "clientId": "%s",
                  "issueDate": "%s",
                  "items": [
                    { "kind": "labor", "description": "Work", "quantity": 2,
                      "unit": "h", "unitPrice": %s, "taxRate": %d }
                  ]
                }
                """.formatted(clientId, issueDate, unitPrice, taxRate)))
        .andExpect(status().isCreated())
        .andReturn();

    JsonNode invoice = objectMapper.readTree(result.getResponse().getContentAsString());
    return invoice.get("id").asText();
  }
}
