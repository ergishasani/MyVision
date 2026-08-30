package com.myvision.api.invoice;

import com.myvision.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.hamcrest.Matchers.containsString;
import static org.hamcrest.Matchers.not;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Whose name an invoice is issued under.
 *
 * <p>A sole trader bills as a person, not as a business, so the company name is optional on the
 * document. The supplier's name is not: docs/invoice-compliance-checklist.md lists it among the
 * required fields, so turning the company name off has to substitute the owner's own name rather
 * than leave the seller position empty — in the PDF and in the XRechnung export alike.
 */
class InvoiceSenderNameIntegrationTest extends AbstractIntegrationTest {

  @Test
  void anInvoiceIsIssuedUnderTheCompanyNameByDefault() throws Exception {
    String token = registerAndGetToken("sender-company@myvision.dev", "Sender Bau GmbH");
    String clientId = createClient(token, "Kunde GmbH");
    String invoiceId = createInvoice(token, clientId, null);

    mockMvc.perform(get("/api/invoices/{id}", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.showCompanyName").value(true));

    mockMvc.perform(get("/api/invoices/{id}/xrechnung", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(content().string(containsString("Sender Bau GmbH")));
  }

  @Test
  void turningTheCompanyNameOffIssuesTheDocumentUnderTheOwnersName() throws Exception {
    String token = registerAndGetToken("sender-person@myvision.dev", "Person Bau GmbH");
    String clientId = createClient(token, "Kunde GmbH");
    String invoiceId = createInvoice(token, clientId, false);

    mockMvc.perform(get("/api/invoices/{id}", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.showCompanyName").value(false));

    // The seller party carries the owner instead of the company — a name, either way.
    mockMvc.perform(get("/api/invoices/{id}/xrechnung", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(content().string(containsString("Test User")))
        .andExpect(content().string(not(containsString("Person Bau GmbH"))));

    // And the PDF still renders, with the letterhead the XML agrees with.
    mockMvc.perform(get("/api/invoices/{id}/pdf", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());
  }

  /** Creates a one-line invoice, passing showCompanyName only when the test sets it. */
  private String createInvoice(String token, String clientId, Boolean showCompanyName)
      throws Exception {
    String flag = showCompanyName == null ? "" : ",\"showCompanyName\":" + showCompanyName;
    MvcResult result = mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s"%s,"items":[
                  {"description":"Arbeit","quantity":1,"unitPrice":100.00,"taxRate":19}
                ]}
                """.formatted(clientId, flag)))
        .andExpect(status().isCreated())
        .andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
  }
}
