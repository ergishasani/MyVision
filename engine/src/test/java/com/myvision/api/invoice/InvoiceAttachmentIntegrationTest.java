package com.myvision.api.invoice;

import com.myvision.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Files attached to an invoice.
 *
 * <p>Uploads are untrusted input, so the limits are asserted rather than assumed: a file picker's
 * accept list constrains what a person can choose, not what a client can send. The filename in
 * particular is attacker-controlled and must never reach a storage path intact.
 */
class InvoiceAttachmentIntegrationTest extends AbstractIntegrationTest {

  @Test
  void aPdfCanBeAttachedListedAndRemoved() throws Exception {
    String token = registerAndGetToken("attach-happy@myvision.dev", "Attach Happy Co");
    String invoiceId = invoice(token);

    MvcResult uploaded = mockMvc.perform(multipart("/api/invoices/{id}/attachments", invoiceId)
            .file(new MockMultipartFile(
                "file", "delivery-note.pdf", MediaType.APPLICATION_PDF_VALUE, "%PDF-1.4".getBytes()))
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.fileName").value("delivery-note.pdf"))
        // Not-null in the schema: a document nobody can open is not a document.
        .andExpect(jsonPath("$.fileUrl").isNotEmpty())
        .andReturn();
    String documentId = objectMapper.readTree(uploaded.getResponse().getContentAsString())
        .get("id").asText();

    mockMvc.perform(get("/api/invoices/{id}/attachments", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1));

    mockMvc.perform(delete("/api/invoices/{id}/attachments/{doc}", invoiceId, documentId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());

    mockMvc.perform(get("/api/invoices/{id}/attachments", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(0));
  }

  @Test
  void anExecutableIsRefusedWhateverItIsCalled() throws Exception {
    String token = registerAndGetToken("attach-type@myvision.dev", "Attach Type Co");
    String invoiceId = invoice(token);

    // The browser's accept list is a hint to the person choosing, not a constraint on the request.
    mockMvc.perform(multipart("/api/invoices/{id}/attachments", invoiceId)
            .file(new MockMultipartFile(
                "file", "invoice.pdf.exe", "application/x-msdownload", "MZ".getBytes()))
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message")
            .value(org.hamcrest.Matchers.containsString("PDF, PNG and JPEG")));
  }

  @Test
  void anOversizedFileIsRefused() throws Exception {
    String token = registerAndGetToken("attach-size@myvision.dev", "Attach Size Co");
    String invoiceId = invoice(token);

    mockMvc.perform(multipart("/api/invoices/{id}/attachments", invoiceId)
            .file(new MockMultipartFile(
                "file", "big.pdf", MediaType.APPLICATION_PDF_VALUE, new byte[5_000_001]))
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message")
            .value(org.hamcrest.Matchers.containsString("5 MB")));
  }

  @Test
  void aTraversingFilenameIsStrippedBeforeItReachesStorage() throws Exception {
    String token = registerAndGetToken("attach-path@myvision.dev", "Attach Path Co");
    String invoiceId = invoice(token);

    // "../../etc/passwd" is a legal thing for a filename to contain, and it must not survive.
    mockMvc.perform(multipart("/api/invoices/{id}/attachments", invoiceId)
            .file(new MockMultipartFile(
                "file", "../../etc/passwd.pdf", MediaType.APPLICATION_PDF_VALUE, "%PDF".getBytes()))
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.fileName").value("passwd.pdf"));
  }

  @Test
  void anotherCompanysInvoiceCannotBeAttachedTo() throws Exception {
    String owner = registerAndGetToken("attach-owner@myvision.dev", "Attach Owner Co");
    String stranger = registerAndGetToken("attach-stranger@myvision.dev", "Attach Stranger Co");
    String invoiceId = invoice(owner);

    mockMvc.perform(multipart("/api/invoices/{id}/attachments", invoiceId)
            .file(new MockMultipartFile(
                "file", "x.pdf", MediaType.APPLICATION_PDF_VALUE, "%PDF".getBytes()))
            .header("Authorization", "Bearer " + stranger))
        .andExpect(status().isNotFound());

    mockMvc.perform(get("/api/invoices/{id}/attachments", invoiceId)
            .header("Authorization", "Bearer " + stranger))
        .andExpect(status().isNotFound());
  }

  /* --- helpers ------------------------------------------------------------ */

  private String invoice(String token) throws Exception {
    String clientId = createClient(token, "Anhang GmbH");
    MvcResult result = mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","items":[
                  {"description":"Arbeit","quantity":1,"unitPrice":100.00,"taxRate":19}
                ]}
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        .andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
  }
}
