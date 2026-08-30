package com.myvision.api.invoice;

import com.myvision.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Filing tags on an invoice.
 *
 * <p>The rule worth pinning is that tags stay editable after the invoice is issued. Everything
 * else about a sent invoice is frozen, and it would be easy for a later change to sweep tags in
 * with it — but the moment you most want to label an invoice is after it has gone out.
 */
class InvoiceTagsIntegrationTest extends AbstractIntegrationTest {

  @Test
  void tagsAreTrimmedDeduplicatedAndKeptInOrder() throws Exception {
    String token = registerAndGetToken("tags-clean@myvision.dev", "Tags Clean Co");
    String id = invoice(token);

    mockMvc.perform(put("/api/invoices/{id}/tags", id)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"tags\":[\"Roof\",\" roof \",\"\",\"  \",\"Urgent\"]}"))
        .andExpect(status().isOk())
        // "Roof" and " roof " are the same label; blanks are not labels at all.
        .andExpect(jsonPath("$.tags.length()").value(2))
        .andExpect(jsonPath("$.tags[0]").value("Roof"))
        .andExpect(jsonPath("$.tags[1]").value("Urgent"));
  }

  @Test
  void tagsRemainEditableAfterTheInvoiceIsIssued() throws Exception {
    String token = registerAndGetToken("tags-issued@myvision.dev", "Tags Issued Co");
    String id = invoice(token);

    mockMvc.perform(post("/api/invoices/{id}/mark-sent", id)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());

    // The document is frozen; how the operator files it is not.
    mockMvc.perform(put("/api/invoices/{id}/tags", id)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"tags\":[\"Filed 2026\"]}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.tags[0]").value("Filed 2026"))
        .andExpect(jsonPath("$.status").value("sent"));
  }

  @Test
  void anEmptyListClearsThem() throws Exception {
    String token = registerAndGetToken("tags-clear@myvision.dev", "Tags Clear Co");
    String id = invoice(token);

    mockMvc.perform(put("/api/invoices/{id}/tags", id)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"tags\":[\"Temporary\"]}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.tags.length()").value(1));

    mockMvc.perform(put("/api/invoices/{id}/tags", id)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"tags\":[]}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.tags.length()").value(0));
  }

  @Test
  void anotherCompanysInvoiceCannotBeTagged() throws Exception {
    String owner = registerAndGetToken("tags-owner@myvision.dev", "Tags Owner Co");
    String stranger = registerAndGetToken("tags-stranger@myvision.dev", "Tags Stranger Co");
    String id = invoice(owner);

    mockMvc.perform(put("/api/invoices/{id}/tags", id)
            .header("Authorization", "Bearer " + stranger)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"tags\":[\"Nosy\"]}"))
        .andExpect(status().isNotFound());
  }

  private String invoice(String token) throws Exception {
    String clientId = createClient(token, "Etikett GmbH");
    MvcResult result = mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","items":[
                  {"description":"Arbeit","quantity":1,"unitPrice":100.00,"taxRate":19}
                ]}
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        // Absent rather than null on a fresh invoice: an empty set, not "unknown".
        .andExpect(jsonPath("$.tags.length()").value(0))
        .andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
  }
}
