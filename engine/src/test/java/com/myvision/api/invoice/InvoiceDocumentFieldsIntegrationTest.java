package com.myvision.api.invoice;

import com.myvision.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The fields that make an invoice a compliant document.
 *
 * <p>Two rules here are worth more than the rest. A supply that is not domestically taxable must
 * not carry VAT — charging 19% on a reverse-charge invoice is an error that reaches a tax office.
 * And the recipient block is a snapshot: the invoice keeps the address it was issued to even after
 * the contact moves, which is the whole reason an invoiced contact cannot be deleted.
 */
class InvoiceDocumentFieldsIntegrationTest extends AbstractIntegrationTest {

  @Test
  void theDeliveryDateDefaultsToTheIssueDate() throws Exception {
    String token = registerAndGetToken("invdoc-delivery@myvision.dev", "Inv Doc Delivery Co");
    String clientId = createClient(token, "Leistung GmbH");

    // Sec. 14 UStG wants a date of supply. Work invoiced today was almost always done today, so
    // the field is filled rather than left blank for the operator to forget.
    mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","issueDate":"2026-05-04","items":[
                  {"description":"Arbeit","quantity":1,"unitPrice":100.00,"taxRate":19}
                ]}
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.deliveryDate").value("2026-05-04"));

    // An explicit one wins, including a service period instead of a single day.
    mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","issueDate":"2026-05-04","deliveryDate":"2026-04-30",
                 "servicePeriodStart":"2026-04-01","servicePeriodEnd":"2026-04-30",
                 "items":[{"description":"Arbeit","quantity":1,"unitPrice":100.00,"taxRate":19}]}
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.deliveryDate").value("2026-04-30"))
        .andExpect(jsonPath("$.servicePeriodStart").value("2026-04-01"))
        .andExpect(jsonPath("$.servicePeriodEnd").value("2026-04-30"));
  }

  @Test
  void aReverseChargeInvoiceCarriesNoVatWhateverTheLinesAsked() throws Exception {
    String token = registerAndGetToken("invdoc-reverse@myvision.dev", "Inv Doc Reverse Co");
    String clientId = createClient(token, "Umkehr GmbH");

    // The caller asks for 19% and the scheme forbids it. The scheme wins.
    mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","taxScheme":"reverse_charge_13b","items":[
                  {"description":"Bauleistung","quantity":1,"unitPrice":5000.00,"taxRate":19}
                ]}
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.taxScheme").value("reverse_charge_13b"))
        .andExpect(jsonPath("$.subtotalAmount").value(5000.00))
        .andExpect(jsonPath("$.taxAmount").value(0))
        .andExpect(jsonPath("$.totalAmount").value(5000.00))
        .andExpect(jsonPath("$.items[0].taxRate").value(0));
  }

  @Test
  void aDomesticInvoiceStillChargesVatNormally() throws Exception {
    String token = registerAndGetToken("invdoc-domestic@myvision.dev", "Inv Doc Domestic Co");
    String clientId = createClient(token, "Inland GmbH");

    mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","items":[
                  {"description":"Arbeit","quantity":1,"unitPrice":1000.00,"taxRate":19}
                ]}
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        // The default scheme, and the one that must keep behaving exactly as before.
        .andExpect(jsonPath("$.taxScheme").value("domestic_taxable"))
        .andExpect(jsonPath("$.taxAmount").value(190.00))
        .andExpect(jsonPath("$.totalAmount").value(1190.00));
  }

  @Test
  void theRecipientIsSnapshottedFromTheContactAndCanBeOverridden() throws Exception {
    String token = registerAndGetToken("invdoc-recipient@myvision.dev", "Inv Doc Recipient Co");

    MvcResult created = mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"type":"business","name":"Anschrift GmbH","addressLine1":"Hauptstrasse 1",
                 "postalCode":"10115","city":"Berlin","countryCode":"DE"}
                """))
        .andExpect(status().isCreated())
        .andReturn();
    String clientId = objectMapper.readTree(created.getResponse().getContentAsString())
        .get("id").asText();

    String invoiceId = objectMapper.readTree(mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","items":[
                  {"description":"Arbeit","quantity":1,"unitPrice":100.00,"taxRate":19}
                ]}
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.recipientName").value("Anschrift GmbH"))
        .andExpect(jsonPath("$.recipientCity").value("Berlin"))
        .andReturn().getResponse().getContentAsString()).get("id").asText();

    // Move the contact. The issued invoice must not follow it.
    mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
            .patch("/api/clients/{id}", clientId)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"city\":\"Hamburg\",\"addressLine1\":\"Neue Strasse 9\"}"))
        .andExpect(status().isOk());

    mockMvc.perform(get("/api/invoices/{id}", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.recipientCity").value("Berlin"))
        .andExpect(jsonPath("$.recipientAddressLine1").value("Hauptstrasse 1"));

    // An explicit recipient wins over the contact's own.
    mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","recipientName":"Anschrift GmbH, Werk Sued",
                 "recipientCity":"Muenchen","items":[
                  {"description":"Arbeit","quantity":1,"unitPrice":100.00,"taxRate":19}
                ]}
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.recipientName").value("Anschrift GmbH, Werk Sued"))
        .andExpect(jsonPath("$.recipientCity").value("Muenchen"));
  }

  @Test
  void anEInvoiceIsRefusedWithoutARecipientEmail() throws Exception {
    String token = registerAndGetToken("invdoc-einvoice@myvision.dev", "Inv Doc EInvoice Co");

    MvcResult created = mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"type\":\"business\",\"name\":\"Ohne Mail GmbH\"}"))
        .andExpect(status().isCreated())
        .andReturn();
    String clientId = objectMapper.readTree(created.getResponse().getContentAsString())
        .get("id").asText();

    // XRechnung has nowhere to put a document without an address to send it to. Refused up front
    // rather than at export time, when the operator has moved on.
    mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","eInvoice":true,"items":[
                  {"description":"Arbeit","quantity":1,"unitPrice":100.00,"taxRate":19}
                ]}
                """.formatted(clientId)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message")
            .value(org.hamcrest.Matchers.containsString("recipient email")));

    // With one supplied it goes through.
    mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","eInvoice":true,"recipientEmail":"rechnung@kunde.de","items":[
                  {"description":"Arbeit","quantity":1,"unitPrice":100.00,"taxRate":19}
                ]}
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.eInvoice").value(true))
        .andExpect(jsonPath("$.recipientEmail").value("rechnung@kunde.de"));
  }

  @Test
  void skontoFallsBackToTheContactsAgreedTerms() throws Exception {
    String token = registerAndGetToken("invdoc-skonto@myvision.dev", "Inv Doc Skonto Co");

    MvcResult created = mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"type":"business","name":"Skonto GmbH","discountDays":10,"discountPercent":2.5}
                """))
        .andExpect(status().isCreated())
        .andReturn();
    String clientId = objectMapper.readTree(created.getResponse().getContentAsString())
        .get("id").asText();

    // The discount the customer was promised should not have to be retyped per invoice.
    mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","items":[
                  {"description":"Arbeit","quantity":1,"unitPrice":100.00,"taxRate":19}
                ]}
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.skontoDays").value(10))
        .andExpect(jsonPath("$.skontoPercent").value(2.5));
  }
}
