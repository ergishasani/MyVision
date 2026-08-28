package com.myvision.api.settings;

import com.myvision.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Accounting settings.
 *
 * <p>The rule that carries legal weight is that a numbering counter may be moved forward but never
 * back. §14 UStG requires invoice numbers to be unique and continuous, so reissuing one that is
 * already on a customer's invoice is not a preference the settings screen gets to offer.
 */
class AccountingSettingsIntegrationTest extends AbstractIntegrationTest {

  @Test
  void everyCounterIsListedEvenBeforeItIsUsed() throws Exception {
    String token = registerAndGetToken("ranges-list@myvision.dev", "Ranges Co");

    mockMvc.perform(get("/api/settings/accounting/number-ranges")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        // All nine, so the screen shows the full set rather than only what has been touched.
        .andExpect(jsonPath("$.length()").value(9))
        .andExpect(jsonPath("$[?(@.type=='invoice')].format").value("INV-%NUMBER"))
        .andExpect(jsonPath("$[?(@.type=='invoice')].preview").value("INV-0001"))
        .andExpect(jsonPath("$[?(@.type=='delivery_note')].format").value("LI-%NUMBER"))
        .andExpect(jsonPath("$[?(@.type=='creditor')].nextNumber").value(70000));
  }

  @Test
  void aCounterCanBeMovedForward() throws Exception {
    String token = registerAndGetToken("ranges-forward@myvision.dev", "Forward Co");

    // The legitimate case: a business migrating from another system carries on where it left off.
    mockMvc.perform(patch("/api/settings/accounting/number-ranges/{type}", "invoice")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"format\":\"RE-%NUMBER\",\"padding\":0,\"nextNumber\":1133}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nextNumber").value(1133))
        .andExpect(jsonPath("$.preview").value("RE-1133"));
  }

  @Test
  void aCounterCannotBeRewound() throws Exception {
    String token = registerAndGetToken("ranges-rewind@myvision.dev", "Rewind Co");

    mockMvc.perform(patch("/api/settings/accounting/number-ranges/{type}", "invoice")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"nextNumber\":500}"))
        .andExpect(status().isOk());

    // Going back would hand out a number that is already on an invoice a customer holds.
    mockMvc.perform(patch("/api/settings/accounting/number-ranges/{type}", "invoice")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"nextNumber\":100}"))
        .andExpect(status().isBadRequest());

    mockMvc.perform(get("/api/settings/accounting/number-ranges")
            .header("Authorization", "Bearer " + token))
        .andExpect(jsonPath("$[?(@.type=='invoice')].nextNumber").value(500));
  }

  @Test
  void aFormatWithoutThePlaceholderIsRejected() throws Exception {
    String token = registerAndGetToken("ranges-format@myvision.dev", "Format Co");

    // Without %NUMBER every document would be given the same string.
    mockMvc.perform(patch("/api/settings/accounting/number-ranges/{type}", "invoice")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"format\":\"RECHNUNG\"}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void theConfiguredFormatReachesTheInvoice() throws Exception {
    String token = registerAndGetToken("ranges-applied@myvision.dev", "Applied Co");

    mockMvc.perform(patch("/api/settings/accounting/number-ranges/{type}", "invoice")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"format\":\"RE-2026-%NUMBER\",\"padding\":4,\"nextNumber\":42}"))
        .andExpect(status().isOk());

    MvcResult client = mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"type\":\"business\",\"name\":\"Kunde GmbH\"}"))
        .andExpect(status().isCreated())
        .andReturn();
    String clientId = objectMapper.readTree(client.getResponse().getContentAsString())
        .get("id").asText();

    // The settings screen is not decorative: what is configured there is what the document gets.
    mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","items":[
                  {"description":"Arbeit","quantity":1,"unitPrice":100.00}
                ]}
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.invoiceNumber").value("RE-2026-0042"));

    // And the counter advanced, rather than the next invoice repeating it.
    mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","items":[
                  {"description":"Mehr Arbeit","quantity":1,"unitPrice":50.00}
                ]}
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.invoiceNumber").value("RE-2026-0043"));
  }

  @Test
  void contactAndProductCountersFeedTheirOwnNumbering() throws Exception {
    String token = registerAndGetToken("ranges-shared@myvision.dev", "Shared Counter Co");

    mockMvc.perform(patch("/api/settings/accounting/number-ranges/{type}", "product")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"nextNumber\":5000}"))
        .andExpect(status().isOk());

    // The product screen and the settings screen are reading the same counter, not two copies.
    mockMvc.perform(post("/api/products")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Nach Umstellung\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.articleNumber").value(5000));

    mockMvc.perform(get("/api/products/next-number").header("Authorization", "Bearer " + token))
        .andExpect(jsonPath("$.nextArticleNumber").value(5001));
  }

  @Test
  void bookingAccountsAndCostCentresRoundTrip() throws Exception {
    String token = registerAndGetToken("accounting-crud@myvision.dev", "Accounting CRUD Co");

    MvcResult account = mockMvc.perform(post("/api/settings/accounting/booking-accounts")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"displayName":"Revenue 19%","name":"Erlöse 19% USt","skrAccount":"8400"}
                """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.skrAccount").value("8400"))
        .andReturn();
    String accountId = objectMapper.readTree(account.getResponse().getContentAsString())
        .get("id").asText();

    MvcResult center = mockMvc.perform(post("/api/settings/accounting/cost-centers")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Baustelle Fulda\",\"number\":\"K100\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.number").value("K100"))
        .andReturn();
    String centerId = objectMapper.readTree(center.getResponse().getContentAsString())
        .get("id").asText();

    // A second centre on the same number would make the reporting split meaningless.
    mockMvc.perform(post("/api/settings/accounting/cost-centers")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Baustelle Kassel\",\"number\":\"K100\"}"))
        .andExpect(status().isBadRequest());

    mockMvc.perform(delete("/api/settings/accounting/booking-accounts/{id}", accountId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());
    mockMvc.perform(delete("/api/settings/accounting/cost-centers/{id}", centerId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());

    mockMvc.perform(get("/api/settings/accounting/booking-accounts")
            .header("Authorization", "Bearer " + token))
        .andExpect(jsonPath("$.length()").value(0));
  }

  @Test
  void anotherCompanysSettingsAreNotVisible() throws Exception {
    String owner = registerAndGetToken("accounting-owner@myvision.dev", "Accounting Owner Co");
    String stranger = registerAndGetToken("accounting-stranger@myvision.dev", "Accounting Stranger Co");

    MvcResult created = mockMvc.perform(post("/api/settings/accounting/cost-centers")
            .header("Authorization", "Bearer " + owner)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Geheime Stelle\",\"number\":\"K900\"}"))
        .andExpect(status().isCreated())
        .andReturn();
    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

    mockMvc.perform(patch("/api/settings/accounting/cost-centers/{id}", id)
            .header("Authorization", "Bearer " + stranger)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Übernommen\"}"))
        .andExpect(status().isNotFound());

    mockMvc.perform(get("/api/settings/accounting/cost-centers")
            .header("Authorization", "Bearer " + stranger))
        .andExpect(jsonPath("$.length()").value(0));
  }
}
