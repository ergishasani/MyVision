package com.myvision.api.ledger;

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
 * Company-wide payment and document listings.
 *
 * <p>Both existed as data with no way to read them: payments were only reachable through their
 * invoice, and stored documents had no endpoint at all.
 */
class LedgerIntegrationTest extends AbstractIntegrationTest {

  @Test
  void paymentsAcrossTheCompanyCarryInvoiceAndClientContext() throws Exception {
    String token = registerAndGetToken("ledger-pay@myvision.dev", "Ledger Co");
    String clientId = createClient(token, "Ledger Client GmbH");
    String invoiceId = sentInvoice(token, clientId);

    mockMvc.perform(post("/api/invoices/{id}/payments", invoiceId)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"amount\": 100.00, \"method\": \"bank_transfer\"}"))
        .andExpect(status().isCreated());

    mockMvc.perform(get("/api/payments").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].amount").value(100.00))
        .andExpect(jsonPath("$[0].method").value("bank_transfer"))
        // The join is the point: a row is readable without fetching the invoice separately.
        .andExpect(jsonPath("$[0].invoiceNumber").isNotEmpty())
        .andExpect(jsonPath("$[0].clientName").value("Ledger Client GmbH"));
  }

  @Test
  void anotherCompanyPaymentsAreNeverListed() throws Exception {
    String mine = registerAndGetToken("ledger-mine@myvision.dev", "Mine Co");
    String theirs = registerAndGetToken("ledger-theirs@myvision.dev", "Theirs Co");

    String clientId = createClient(theirs, "Their Client");
    String invoiceId = sentInvoice(theirs, clientId);
    mockMvc.perform(post("/api/invoices/{id}/payments", invoiceId)
            .header("Authorization", "Bearer " + theirs)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"amount\": 50.00}"))
        .andExpect(status().isCreated());

    mockMvc.perform(get("/api/payments").header("Authorization", "Bearer " + mine))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(0));
  }

  @Test
  void storedDocumentsAreListed() throws Exception {
    String token = registerAndGetToken("ledger-docs@myvision.dev", "Docs Co");
    String clientId = createClient(token, "Docs Client");
    String invoiceId = sentInvoice(token, clientId);

    mockMvc.perform(get("/api/documents").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(0));

    mockMvc.perform(post("/api/invoices/{id}/pdf", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());

    mockMvc.perform(get("/api/documents").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].mimeType").value("application/pdf"))
        .andExpect(jsonPath("$[0].invoiceId").value(invoiceId));
  }

  @Test
  void bothListsRequireAuthentication() throws Exception {
    mockMvc.perform(get("/api/payments")).andExpect(status().isUnauthorized());
    mockMvc.perform(get("/api/documents")).andExpect(status().isUnauthorized());
  }

  /** A sent 238.00 EUR invoice. */
  private String sentInvoice(String token, String clientId) throws Exception {
    MvcResult result = mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "clientId": "%s",
                  "items": [
                    {
                      "kind": "labor",
                      "description": "Installation work",
                      "quantity": 2,
                      "unit": "h",
                      "unitPrice": 100.00,
                      "taxRate": 19
                    }
                  ]
                }
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        .andReturn();

    JsonNode invoice = objectMapper.readTree(result.getResponse().getContentAsString());
    String invoiceId = invoice.get("id").asText();

    mockMvc.perform(post("/api/invoices/{id}/mark-sent", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());

    return invoiceId;
  }
}
