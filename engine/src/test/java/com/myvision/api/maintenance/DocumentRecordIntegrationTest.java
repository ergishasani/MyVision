package com.myvision.api.maintenance;

import com.fasterxml.jackson.databind.JsonNode;
import com.myvision.api.AbstractIntegrationTest;
import com.myvision.api.entity.Document;
import com.myvision.api.repository.DocumentRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Generated artifacts were being written to storage without leaving a queryable record, so the
 * documents table stayed empty and nothing could list them.
 */
class DocumentRecordIntegrationTest extends AbstractIntegrationTest {

  @Autowired
  private DocumentRepository documentRepository;

  @Test
  void storingAnInvoicePdfRecordsADocument() throws Exception {
    String token = registerAndGetToken("doc-record-1@myvision.dev", "Documents Co");
    String clientId = createClient(token, "Document Client");
    String invoiceId = createSentInvoice(token, clientId);

    mockMvc.perform(post("/api/invoices/{id}/pdf", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());

    List<Document> documents = documentRepository.findByInvoiceIdAndCompanyIdOrderByCreatedAtDesc(
        UUID.fromString(invoiceId), companyIdFor(token, invoiceId));

    assertThat(documents).hasSize(1);
    assertThat(documents.getFirst().getFileName()).endsWith(".pdf");
    assertThat(documents.getFirst().getMimeType()).isEqualTo("application/pdf");
    // The check constraint on the table allows exactly one of quote_id / invoice_id.
    assertThat(documents.getFirst().getQuoteId()).isNull();
  }

  @Test
  void regeneratingTheSamePdfUpdatesOneRowRatherThanAddingAnother() throws Exception {
    String token = registerAndGetToken("doc-record-2@myvision.dev", "Regenerate Co");
    String clientId = createClient(token, "Repeat Client");
    String invoiceId = createSentInvoice(token, clientId);

    for (int i = 0; i < 3; i++) {
      mockMvc.perform(post("/api/invoices/{id}/pdf", invoiceId)
              .header("Authorization", "Bearer " + token))
          .andExpect(status().isOk());
    }

    assertThat(documentRepository.findByInvoiceIdAndCompanyIdOrderByCreatedAtDesc(
        UUID.fromString(invoiceId), companyIdFor(token, invoiceId))).hasSize(1);
  }

  @Test
  void pdfAndXrechnungAreRecordedSeparately() throws Exception {
    String token = registerAndGetToken("doc-record-3@myvision.dev", "Both Formats Co");
    String clientId = createClient(token, "Both Formats Client");
    String invoiceId = createSentInvoice(token, clientId);

    mockMvc.perform(post("/api/invoices/{id}/pdf", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());
    mockMvc.perform(post("/api/invoices/{id}/xrechnung", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());

    List<Document> documents = documentRepository.findByInvoiceIdAndCompanyIdOrderByCreatedAtDesc(
        UUID.fromString(invoiceId), companyIdFor(token, invoiceId));

    assertThat(documents).hasSize(2);
    assertThat(documents).extracting(Document::getMimeType)
        .containsExactlyInAnyOrder("application/pdf", "application/xml");
  }

  /** Reads the company id straight off the session rather than assuming it. */
  private UUID companyIdFor(String token, String invoiceId) throws Exception {
    MvcResult result = mockMvc.perform(
            org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                .get("/api/auth/me")
                .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andReturn();
    JsonNode body = objectMapper.readTree(result.getResponse().getContentAsString());
    return UUID.fromString(body.get("company").get("id").asText());
  }

  private String createSentInvoice(String token, String clientId) throws Exception {
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

    String invoiceId = objectMapper.readTree(result.getResponse().getContentAsString())
        .get("id").asText();

    mockMvc.perform(post("/api/invoices/{id}/mark-sent", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());

    return invoiceId;
  }
}
