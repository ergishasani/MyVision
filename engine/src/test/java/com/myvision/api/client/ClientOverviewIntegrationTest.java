package com.myvision.api.client;

import com.myvision.api.AbstractIntegrationTest;
import java.time.LocalDate;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The contact detail screen's data: one contact with everything issued to them, and the figures
 * printed above it.
 *
 * <p>Those figures are the point of the endpoint, so the arithmetic is pinned here. A total that
 * quietly counts a draft or a cancelled invoice tells the operator they are owed money they are
 * not, which is a worse failure than the screen not loading at all.
 *
 * <p>Line items are created at 0% tax throughout so a total is simply the price — the VAT
 * arithmetic has its own tests, and mixing it in here would only obscure what is being asserted.
 */
class ClientOverviewIntegrationTest extends AbstractIntegrationTest {

  @Test
  void overviewGathersTheContactsWholeBillingHistory() throws Exception {
    String token = registerAndGetToken("overview-history@myvision.dev", "Overview History Co");
    String clientId = createClient(token, "Bauherr GmbH");

    // Issued and still owed.
    markSent(token, createInvoice(token, clientId, "1000.00", null));
    // Issued and settled.
    markPaid(token, markSent(token, createInvoice(token, clientId, "500.00", null)));
    // Never issued: a draft is not revenue and nobody owes it.
    createInvoice(token, clientId, "250.00", null);

    createQuote(token, clientId, "2000.00");
    createProject(token, clientId, "Dachsanierung");

    mockMvc.perform(get("/api/clients/{id}/overview", clientId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.client.id").value(clientId))
        .andExpect(jsonPath("$.client.name").value("Bauherr GmbH"))

        .andExpect(jsonPath("$.stats.currency").value("EUR"))
        .andExpect(jsonPath("$.stats.totalInvoiced").value(1500.00))
        .andExpect(jsonPath("$.stats.totalPaid").value(500.00))
        .andExpect(jsonPath("$.stats.outstanding").value(1000.00))
        .andExpect(jsonPath("$.stats.invoiceCount").value(3))
        .andExpect(jsonPath("$.stats.draftInvoiceCount").value(1))
        .andExpect(jsonPath("$.stats.openInvoiceCount").value(1))
        .andExpect(jsonPath("$.stats.quoteCount").value(1))
        .andExpect(jsonPath("$.stats.openQuoteCount").value(1))
        .andExpect(jsonPath("$.stats.openQuoteValue").value(2000.00))
        .andExpect(jsonPath("$.stats.projectCount").value(1))
        .andExpect(jsonPath("$.stats.lastInvoiceDate").exists())

        .andExpect(jsonPath("$.invoices.length()").value(3))
        .andExpect(jsonPath("$.invoices[0].invoiceNumber").exists())
        .andExpect(jsonPath("$.quotes.length()").value(1))
        .andExpect(jsonPath("$.projects.length()").value(1))
        .andExpect(jsonPath("$.projects[0].name").value("Dachsanierung"));
  }

  @Test
  void draftsAndCancelledInvoicesAreNotCountedAsRevenue() throws Exception {
    String token = registerAndGetToken("overview-excluded@myvision.dev", "Overview Excluded Co");
    String clientId = createClient(token, "Storniert GmbH");

    String cancelled = markSent(token, createInvoice(token, clientId, "1000.00", null));
    mockMvc.perform(post("/api/invoices/{id}/cancel", cancelled)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());

    createInvoice(token, clientId, "400.00", null);

    // Both invoices are listed — they exist and the operator should see them — but neither is
    // money the business earned or is owed.
    mockMvc.perform(get("/api/clients/{id}/overview", clientId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.stats.totalInvoiced").value(0))
        .andExpect(jsonPath("$.stats.outstanding").value(0))
        .andExpect(jsonPath("$.stats.overdue").value(0))
        .andExpect(jsonPath("$.stats.invoiceCount").value(2))
        .andExpect(jsonPath("$.stats.openInvoiceCount").value(0))
        .andExpect(jsonPath("$.stats.firstInvoiceDate").doesNotExist())
        .andExpect(jsonPath("$.invoices.length()").value(2));
  }

  @Test
  void latenessComesFromTheDueDateNotTheStoredStatus() throws Exception {
    String token = registerAndGetToken("overview-overdue@myvision.dev", "Overview Overdue Co");
    String clientId = createClient(token, "Säumig GmbH");

    // The overdue sweep is disabled in tests, exactly as it is between its daily runs in
    // production, so this invoice is still stored as `sent`. It is late regardless.
    markSent(token,
        createInvoice(token, clientId, "750.00", LocalDate.now().minusDays(10).toString()));
    // Not yet due, so it must not be counted as late.
    markSent(token,
        createInvoice(token, clientId, "300.00", LocalDate.now().plusDays(10).toString()));

    mockMvc.perform(get("/api/clients/{id}/overview", clientId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.stats.outstanding").value(1050.00))
        .andExpect(jsonPath("$.stats.overdue").value(750.00))
        .andExpect(jsonPath("$.stats.overdueInvoiceCount").value(1));
  }

  @Test
  void aContactWithNoDocumentsReportsZeroesAndAnUnknownPaymentSpeed() throws Exception {
    String token = registerAndGetToken("overview-empty@myvision.dev", "Overview Empty Co");
    String clientId = createClient(token, "Neu GmbH");

    mockMvc.perform(get("/api/clients/{id}/overview", clientId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.stats.totalInvoiced").value(0))
        .andExpect(jsonPath("$.stats.invoiceCount").value(0))
        // Null rather than zero: "we do not know yet" is not "pays immediately".
        .andExpect(jsonPath("$.stats.averageDaysToPay").doesNotExist())
        .andExpect(jsonPath("$.stats.firstInvoiceDate").doesNotExist())
        // Falls back to the company default so the screen still has a unit for its zeroes.
        .andExpect(jsonPath("$.stats.currency").value("EUR"))
        .andExpect(jsonPath("$.stats.excludedCurrencies.length()").value(0))
        .andExpect(jsonPath("$.invoices.length()").value(0))
        .andExpect(jsonPath("$.quotes.length()").value(0))
        .andExpect(jsonPath("$.projects.length()").value(0));
  }

  @Test
  void paymentSpeedIsAveragedOverSettledInvoices() throws Exception {
    String token = registerAndGetToken("overview-speed@myvision.dev", "Overview Speed Co");
    String clientId = createClient(token, "Prompt GmbH");

    // Issued today and settled today: nought days, which is a real answer rather than a missing one.
    markPaid(token, markSent(token, createInvoice(token, clientId, "100.00", null)));

    mockMvc.perform(get("/api/clients/{id}/overview", clientId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.stats.averageDaysToPay").value(0))
        .andExpect(jsonPath("$.stats.totalPaid").value(100.00));
  }

  @Test
  void anotherCompanysContactHasNoOverview() throws Exception {
    String owner = registerAndGetToken("overview-owner@myvision.dev", "Overview Owner Co");
    String stranger = registerAndGetToken("overview-stranger@myvision.dev", "Overview Stranger Co");
    String clientId = createClient(owner, "Fremd GmbH");

    mockMvc.perform(get("/api/clients/{id}/overview", clientId)
            .header("Authorization", "Bearer " + stranger))
        .andExpect(status().isNotFound());
  }

  /* --- helpers ------------------------------------------------------------ */

  /** Creates a draft invoice at 0% tax and returns its id. */
  private String createInvoice(String token, String clientId, String amount, String dueDate)
      throws Exception {
    String due = dueDate == null ? "" : "\"dueDate\":\"" + dueDate + "\",";
    MvcResult result = mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s",%s"items":[
                  {"description":"Arbeit","quantity":1,"unitPrice":%s,"taxRate":0}
                ]}
                """.formatted(clientId, due, amount)))
        .andExpect(status().isCreated())
        .andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
  }

  private String markSent(String token, String invoiceId) throws Exception {
    mockMvc.perform(post("/api/invoices/{id}/mark-sent", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());
    return invoiceId;
  }

  private String markPaid(String token, String invoiceId) throws Exception {
    mockMvc.perform(post("/api/invoices/{id}/mark-paid", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());
    return invoiceId;
  }

  private String createQuote(String token, String clientId, String amount) throws Exception {
    MvcResult result = mockMvc.perform(post("/api/quotes")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","items":[
                  {"description":"Angebot","quantity":1,"unitPrice":%s,"taxRate":0}
                ]}
                """.formatted(clientId, amount)))
        .andExpect(status().isCreated())
        .andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
  }

  private String createProject(String token, String clientId, String name) throws Exception {
    MvcResult result = mockMvc.perform(post("/api/projects")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","name":"%s"}
                """.formatted(clientId, name)))
        .andExpect(status().isCreated())
        .andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
  }
}
