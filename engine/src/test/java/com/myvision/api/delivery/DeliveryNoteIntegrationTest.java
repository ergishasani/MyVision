package com.myvision.api.delivery;

import com.myvision.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Delivery notes.
 *
 * <p>The two things worth pinning are that the VAT arithmetic matches the invoice path — it is
 * copied from it, and a copy is exactly what drifts — and that a note stops being editable once it
 * has gone to the customer. A delivery note is evidence of what arrived; silently rewritable
 * evidence is worth nothing in the dispute it exists for.
 */
class DeliveryNoteIntegrationTest extends AbstractIntegrationTest {

  @Test
  void aDeliveryNoteIsNumberedAndTotalledOnCreation() throws Exception {
    String token = registerAndGetToken("delivery-create@myvision.dev", "Delivery Create Co");
    String clientId = createClient(token, "Empfaenger GmbH");

    mockMvc.perform(post("/api/delivery-notes")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","subject":"Stahlgelaender","items":[
                  {"description":"Gelaender","quantity":3,"unitPrice":1000.00,"taxRate":19}
                ]}
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        // Numbering already existed for this document type; LI-%NUMBER is the configured format.
        .andExpect(jsonPath("$.deliveryNoteNumber").value(org.hamcrest.Matchers.startsWith("LI-")))
        .andExpect(jsonPath("$.status").value("draft"))
        .andExpect(jsonPath("$.subtotalAmount").value(3000.00))
        .andExpect(jsonPath("$.taxAmount").value(570.00))
        .andExpect(jsonPath("$.totalAmount").value(3570.00))
        .andExpect(jsonPath("$.items.length()").value(1));
  }

  @Test
  void aDocumentDiscountIsSpreadAcrossLinesBeforeVatIsCharged() throws Exception {
    String token = registerAndGetToken("delivery-discount@myvision.dev", "Delivery Discount Co");
    String clientId = createClient(token, "Rabatt GmbH");

    // 1.000 at 19% and 1.000 at 7%, less a 200 document discount. The discount is split by each
    // line's share, so 100 comes off each and VAT is 171,00 + 63,00.
    mockMvc.perform(post("/api/delivery-notes")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","discountAmount":200.00,"items":[
                  {"description":"Voll","quantity":1,"unitPrice":1000.00,"taxRate":19},
                  {"description":"Ermaessigt","quantity":1,"unitPrice":1000.00,"taxRate":7}
                ]}
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.subtotalAmount").value(2000.00))
        .andExpect(jsonPath("$.discountAmount").value(200.00))
        .andExpect(jsonPath("$.taxAmount").value(234.00))
        .andExpect(jsonPath("$.totalAmount").value(2034.00));
  }

  @Test
  void aDiscountLargerThanTheLinesIsRefused() throws Exception {
    String token = registerAndGetToken("delivery-toobig@myvision.dev", "Delivery Toobig Co");
    String clientId = createClient(token, "Zuviel GmbH");

    mockMvc.perform(post("/api/delivery-notes")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","discountAmount":500.00,"items":[
                  {"description":"Klein","quantity":1,"unitPrice":100.00,"taxRate":19}
                ]}
                """.formatted(clientId)))
        .andExpect(status().isBadRequest());
  }

  @Test
  void theDeliveryAddressFallsBackToTheContactsOwn() throws Exception {
    String token = registerAndGetToken("delivery-address@myvision.dev", "Delivery Address Co");

    MvcResult created = mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"type":"business","name":"Anschrift GmbH","addressLine1":"Baustelle 1",
                 "postalCode":"20095","city":"Hamburg","countryCode":"DE"}
                """))
        .andExpect(status().isCreated())
        .andReturn();
    String clientId = objectMapper.readTree(created.getResponse().getContentAsString())
        .get("id").asText();

    // No address supplied: the contact's is copied onto the note, not merely referenced, so it
    // survives the contact moving later.
    mockMvc.perform(post("/api/delivery-notes")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","items":[
                  {"description":"Lieferung","quantity":1,"unitPrice":10.00,"taxRate":0}
                ]}
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.deliveryCity").value("Hamburg"))
        .andExpect(jsonPath("$.deliveryAddressLine1").value("Baustelle 1"));

    // An explicit site address wins, because goods go where the work is.
    mockMvc.perform(post("/api/delivery-notes")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","deliveryAddressLine1":"Grossbaustelle 7","deliveryCity":"Bremen",
                 "items":[{"description":"Lieferung","quantity":1,"unitPrice":10.00,"taxRate":0}]}
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.deliveryCity").value("Bremen"))
        .andExpect(jsonPath("$.deliveryAddressLine1").value("Grossbaustelle 7"));
  }

  @Test
  void onlyADraftCanBeEdited() throws Exception {
    String token = registerAndGetToken("delivery-lock@myvision.dev", "Delivery Lock Co");
    String clientId = createClient(token, "Gesperrt GmbH");
    String id = create(token, clientId);

    // Editable as a draft.
    mockMvc.perform(patch("/api/delivery-notes/{id}", id)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"subject\":\"Korrigiert\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.subject").value("Korrigiert"));

    mockMvc.perform(post("/api/delivery-notes/{id}/mark-sent", id)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("sent"))
        .andExpect(jsonPath("$.sentAt").exists());

    // Once it has gone out it is a record of what the customer was told.
    mockMvc.perform(patch("/api/delivery-notes/{id}", id)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"subject\":\"Heimlich geaendert\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void strippingEveryLineIsRefusedButOmittingThemLeavesThemAlone() throws Exception {
    String token = registerAndGetToken("delivery-lines@myvision.dev", "Delivery Lines Co");
    String clientId = createClient(token, "Zeilen GmbH");
    String id = create(token, clientId);

    // A note with no lines says nothing was delivered, which is not a thing to record.
    mockMvc.perform(patch("/api/delivery-notes/{id}", id)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"items\":[]}"))
        .andExpect(status().isBadRequest());

    // Omitting the list entirely is "unchanged", which is what PATCH means.
    mockMvc.perform(patch("/api/delivery-notes/{id}", id)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"reference\":\"BST-99\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.reference").value("BST-99"))
        .andExpect(jsonPath("$.items.length()").value(1));
  }

  @Test
  void theLifecycleRunsDraftToSentToDelivered() throws Exception {
    String token = registerAndGetToken("delivery-life@myvision.dev", "Delivery Life Co");
    String clientId = createClient(token, "Lauf GmbH");
    String id = create(token, clientId);

    mockMvc.perform(post("/api/delivery-notes/{id}/mark-sent", id)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());

    mockMvc.perform(post("/api/delivery-notes/{id}/mark-delivered", id)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("delivered"))
        .andExpect(jsonPath("$.deliveredAt").exists());

    // Delivering twice is a mistake, not an idempotent no-op: it would move the delivery date.
    mockMvc.perform(post("/api/delivery-notes/{id}/mark-delivered", id)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isBadRequest());
  }

  @Test
  void anotherCompanysDeliveryNoteIsInvisible() throws Exception {
    String owner = registerAndGetToken("delivery-owner@myvision.dev", "Delivery Owner Co");
    String stranger = registerAndGetToken("delivery-stranger@myvision.dev", "Delivery Stranger Co");
    String clientId = createClient(owner, "Fremd GmbH");
    String id = create(owner, clientId);

    mockMvc.perform(get("/api/delivery-notes/{id}", id)
            .header("Authorization", "Bearer " + stranger))
        .andExpect(status().isNotFound());

    mockMvc.perform(get("/api/delivery-notes").header("Authorization", "Bearer " + stranger))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(0));
  }

  @Test
  void theNextNumberCanBePreviewedBeforeSaving() throws Exception {
    String token = registerAndGetToken("delivery-number@myvision.dev", "Delivery Number Co");

    mockMvc.perform(get("/api/delivery-notes/next-number")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nextNumber").value(org.hamcrest.Matchers.startsWith("LI-")));
  }

  /* --- helpers ------------------------------------------------------------ */

  private String create(String token, String clientId) throws Exception {
    MvcResult result = mockMvc.perform(post("/api/delivery-notes")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","items":[
                  {"description":"Lieferung","quantity":1,"unitPrice":100.00,"taxRate":19}
                ]}
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        .andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
  }
}
