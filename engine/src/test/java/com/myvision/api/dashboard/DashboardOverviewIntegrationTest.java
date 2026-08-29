package com.myvision.api.dashboard;

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
 * The overview screen's data.
 *
 * <p>The receivables buckets are the part worth pinning: they are what an operator reads as "what
 * I am owed", they must not overlap, and they must add up to the total printed above them. An
 * invoice counted in two buckets would inflate that total silently.
 *
 * <p>Items are created at 0% tax except where VAT is the subject, so a total is simply the price.
 */
class DashboardOverviewIntegrationTest extends AbstractIntegrationTest {

  @Test
  void receivablesBucketsAreExclusiveAndSumToTheTotal() throws Exception {
    String token = registerAndGetToken("dashboard-buckets@myvision.dev", "Overview Buckets Co");
    String clientId = createClient(token, "Bucket GmbH");

    // Late: past its due date.
    markSent(token, invoice(token, clientId, "1000.00", LocalDate.now().minusDays(5)));
    // Open: issued, not yet due.
    markSent(token, invoice(token, clientId, "400.00", LocalDate.now().plusDays(20)));
    // Draft: never issued, so owed by nobody.
    invoice(token, clientId, "999.00", null);

    mockMvc.perform(get("/api/dashboard/overview").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.receivables.total").value(1400.00))
        .andExpect(jsonPath("$.receivables.overdue.amount").value(1000.00))
        .andExpect(jsonPath("$.receivables.overdue.count").value(1))
        .andExpect(jsonPath("$.receivables.open.amount").value(400.00))
        .andExpect(jsonPath("$.receivables.open.count").value(1))
        .andExpect(jsonPath("$.receivables.partiallyPaid.amount").value(0))
        .andExpect(jsonPath("$.receivables.partiallyPaid.count").value(0))
        .andExpect(jsonPath("$.draftInvoiceCount").value(1));
  }

  @Test
  void aLatePartPaidInvoiceIsCountedOnceUnderOverdue() throws Exception {
    String token = registerAndGetToken("dashboard-partial@myvision.dev", "Overview Partial Co");
    String clientId = createClient(token, "Teilweise GmbH");

    String id = markSent(token, invoice(token, clientId, "1000.00", LocalDate.now().minusDays(3)));
    mockMvc.perform(post("/api/invoices/{id}/payments", id)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"amount\":400.00}"))
        .andExpect(status().isCreated());

    // It is both part-paid and late. Overdue wins, and it must not also swell the part-paid
    // bucket — otherwise 600 would be counted twice in a 600 total.
    mockMvc.perform(get("/api/dashboard/overview").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.receivables.total").value(600.00))
        .andExpect(jsonPath("$.receivables.overdue.amount").value(600.00))
        .andExpect(jsonPath("$.receivables.overdue.count").value(1))
        .andExpect(jsonPath("$.receivables.partiallyPaid.count").value(0));
  }

  @Test
  void theRevenueSeriesEmitsEveryMonthIncludingEmptyOnes() throws Exception {
    String token = registerAndGetToken("dashboard-series@myvision.dev", "Overview Series Co");
    String clientId = createClient(token, "Reihe GmbH");
    markSent(token, invoice(token, clientId, "250.00", null));

    mockMvc.perform(get("/api/dashboard/overview")
            .param("revenueMonths", "12")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.revenue.length()").value(12))
        // Oldest first, newest last, so the client can render it straight onto an axis.
        .andExpect(jsonPath("$.revenue[11].invoiced").value(250.00))
        .andExpect(jsonPath("$.revenue[0].month").exists())
        .andExpect(jsonPath("$.revenue[0].label").exists())
        .andExpect(jsonPath("$.revenueInvoicedTotal").value(250.00));
  }

  @Test
  void theRequestedWindowIsClampedToSomethingDrawable() throws Exception {
    String token = registerAndGetToken("dashboard-clamp@myvision.dev", "Overview Clamp Co");

    mockMvc.perform(get("/api/dashboard/overview")
            .param("revenueMonths", "9000")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.revenue.length()").value(36));

    mockMvc.perform(get("/api/dashboard/overview")
            .param("revenueMonths", "-4")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.revenue.length()").value(1));
  }

  @Test
  void vatCoversTheCurrentQuarterAndFallsDueOnTheTenth() throws Exception {
    String token = registerAndGetToken("dashboard-vat@myvision.dev", "Overview Vat Co");
    String clientId = createClient(token, "Steuer GmbH");

    // 1.000,00 net at 19% = 190,00 output tax.
    mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","items":[
                  {"description":"Arbeit","quantity":1,"unitPrice":1000.00,"taxRate":19}
                ]}
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        .andReturn();
    markSentAll(token);

    LocalDate today = LocalDate.now();
    LocalDate start = LocalDate.of(today.getYear(), ((today.getMonthValue() - 1) / 3) * 3 + 1, 1);
    LocalDate due = start.plusMonths(3).withDayOfMonth(10);

    mockMvc.perform(get("/api/dashboard/overview").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.vat.periodStart").value(start.toString()))
        .andExpect(jsonPath("$.vat.dueDate").value(due.toString()))
        .andExpect(jsonPath("$.vat.outputVat").value(190.00))
        .andExpect(jsonPath("$.vat.netRevenue").value(1000.00))
        // Purchases are not modelled, so the screen must not read this as a complete return.
        .andExpect(jsonPath("$.vat.inputVatAvailable").value(false))
        .andExpect(jsonPath("$.expensesAvailable").value(false))
        .andExpect(jsonPath("$.bankAvailable").value(false));
  }

  @Test
  void customersAreRankedByWhatTheyWereBilled() throws Exception {
    String token = registerAndGetToken("dashboard-top@myvision.dev", "Overview Top Co");
    String big = createClient(token, "Gross GmbH");
    String small = createClient(token, "Klein GmbH");

    markSent(token, invoice(token, big, "5000.00", null));
    markSent(token, invoice(token, small, "300.00", null));

    mockMvc.perform(get("/api/dashboard/overview").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.topClients.length()").value(2))
        .andExpect(jsonPath("$.topClients[0].name").value("Gross GmbH"))
        .andExpect(jsonPath("$.topClients[0].amount").value(5000.00))
        .andExpect(jsonPath("$.topClients[1].name").value("Klein GmbH"))
        .andExpect(jsonPath("$.clientCount").value(2));
  }

  @Test
  void lineDescriptionsAreGroupedCaseInsensitively() throws Exception {
    String token = registerAndGetToken("dashboard-lines@myvision.dev", "Overview Lines Co");
    String clientId = createClient(token, "Zeilen GmbH");

    mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","items":[
                  {"description":"Arbeitsstunde","quantity":2,"unitPrice":50.00,"taxRate":0},
                  {"description":"arbeitsstunde ","quantity":1,"unitPrice":50.00,"taxRate":0},
                  {"description":"Material","quantity":1,"unitPrice":20.00,"taxRate":0}
                ]}
                """.formatted(clientId)))
        .andExpect(status().isCreated());
    markSentAll(token);

    // The three "Arbeitsstunde" hours collapse into one row worth 150, ahead of Material.
    mockMvc.perform(get("/api/dashboard/overview").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.topProducts.length()").value(2))
        .andExpect(jsonPath("$.topProducts[0].description").value("Arbeitsstunde"))
        .andExpect(jsonPath("$.topProducts[0].amount").value(150.00))
        .andExpect(jsonPath("$.topProducts[0].quantity").value(3))
        .andExpect(jsonPath("$.topProducts[1].description").value("Material"));
  }

  @Test
  void aBrandNewCompanySeesZeroesRatherThanAnError() throws Exception {
    String token = registerAndGetToken("dashboard-empty@myvision.dev", "Overview Empty Co");

    mockMvc.perform(get("/api/dashboard/overview").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.currency").value("EUR"))
        .andExpect(jsonPath("$.greetingName").value("Test"))
        .andExpect(jsonPath("$.receivables.total").value(0))
        .andExpect(jsonPath("$.topClients.length()").value(0))
        .andExpect(jsonPath("$.topProducts.length()").value(0))
        .andExpect(jsonPath("$.revenue.length()").value(12));
  }

  @Test
  void theActivityFeedResolvesActorsAndDocuments() throws Exception {
    String token = registerAndGetToken("dashboard-activity@myvision.dev", "Overview Activity Co");
    String clientId = createClient(token, "Verlauf GmbH");
    String id = invoice(token, clientId, "100.00", null);
    markSent(token, id);

    mockMvc.perform(get("/api/dashboard/activity")
            .param("size", "10")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        // Newest first: the send is more recent than the creation.
        .andExpect(jsonPath("$.entries[0].action").value("marked_sent"))
        .andExpect(jsonPath("$.entries[0].actorName").value("Test User"))
        .andExpect(jsonPath("$.entries[0].entityType").value("invoice"))
        .andExpect(jsonPath("$.entries[0].documentLabel").exists())
        .andExpect(jsonPath("$.entries[0].clientName").value("Verlauf GmbH"))
        .andExpect(jsonPath("$.entries[1].action").value("created"))
        .andExpect(jsonPath("$.total").value(2));
  }

  @Test
  void quotesAppearInTheActivityFeed() throws Exception {
    String token = registerAndGetToken("dashboard-quotefeed@myvision.dev", "Overview Quote Co");
    String clientId = createClient(token, "Angebot GmbH");

    mockMvc.perform(post("/api/quotes")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","items":[
                  {"description":"Angebot","quantity":1,"unitPrice":500.00,"taxRate":0}
                ]}
                """.formatted(clientId)))
        .andExpect(status().isCreated());

    mockMvc.perform(get("/api/dashboard/activity").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.entries[0].entityType").value("quote"))
        .andExpect(jsonPath("$.entries[0].action").value("created"))
        .andExpect(jsonPath("$.entries[0].documentLabel").exists())
        .andExpect(jsonPath("$.entries[0].clientName").value("Angebot GmbH"));
  }

  @Test
  void theActivityFeedIsPagedAndScopedToTheCompany() throws Exception {
    String token = registerAndGetToken("dashboard-paging@myvision.dev", "Overview Paging Co");
    String stranger = registerAndGetToken("dashboard-outsider@myvision.dev", "Overview Outsider Co");
    String clientId = createClient(token, "Seiten GmbH");
    for (int i = 0; i < 3; i++) {
      invoice(token, clientId, "10.00", null);
    }

    mockMvc.perform(get("/api/dashboard/activity")
            .param("page", "0").param("size", "2")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.entries.length()").value(2))
        .andExpect(jsonPath("$.page").value(0))
        .andExpect(jsonPath("$.total").value(3));

    mockMvc.perform(get("/api/dashboard/activity")
            .param("page", "1").param("size", "2")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.entries.length()").value(1));

    // Another company's audit trail is none of their business.
    mockMvc.perform(get("/api/dashboard/activity").header("Authorization", "Bearer " + stranger))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.total").value(0));
  }

  /* --- helpers ------------------------------------------------------------ */

  /** Creates a draft invoice at 0% tax and returns its id. */
  private String invoice(String token, String clientId, String amount, LocalDate dueDate)
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

  /** Sends every draft the company holds, for tests that create invoices inline. */
  private void markSentAll(String token) throws Exception {
    MvcResult listed = mockMvc.perform(get("/api/invoices")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andReturn();
    var body = objectMapper.readTree(listed.getResponse().getContentAsString());
    for (var node : body) {
      if ("draft".equals(node.get("status").asText())) {
        markSent(token, node.get("id").asText());
      }
    }
  }
}
