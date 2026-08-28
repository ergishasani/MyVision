package com.myvision.api.maintenance;

import com.fasterxml.jackson.databind.JsonNode;
import com.myvision.api.AbstractIntegrationTest;
import com.myvision.api.entity.Invoice;
import com.myvision.api.repository.InvoiceRepository;
import com.myvision.api.service.InvoiceOverdueService;
import java.time.LocalDate;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The overdue sweep. Scheduling is disabled in tests, so the sweep is driven explicitly with a
 * fixed date rather than waiting for cron.
 */
class InvoiceOverdueIntegrationTest extends AbstractIntegrationTest {

  @Autowired
  private InvoiceOverdueService invoiceOverdueService;

  @Autowired
  private InvoiceRepository invoiceRepository;

  @Test
  void aSentInvoicePastItsDueDateBecomesOverdue() throws Exception {
    String token = registerAndGetToken("overdue-1@myvision.dev", "Overdue Co");
    String clientId = createClient(token, "Late Payer");
    String invoiceId = createInvoice(token, clientId, "2026-01-31");

    markSent(token, invoiceId);

    invoiceOverdueService.markOverdue(LocalDate.parse("2026-03-01"));

    mockMvc.perform(get("/api/invoices/{id}", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("overdue"));
  }

  @Test
  void theSweepIsIdempotent() throws Exception {
    String token = registerAndGetToken("overdue-idem@myvision.dev", "Idempotent Co");
    String clientId = createClient(token, "Late Payer");
    String invoiceId = createInvoice(token, clientId, "2026-01-31");
    markSent(token, invoiceId);

    int first = invoiceOverdueService.markOverdue(LocalDate.parse("2026-03-01"));
    int second = invoiceOverdueService.markOverdue(LocalDate.parse("2026-03-01"));

    assertThat(first).isPositive();
    // Already-overdue invoices are no longer candidates, so a second run changes nothing.
    assertThat(second).isZero();
  }

  @Test
  void draftPaidAndCancelledInvoicesAreNeverMarkedOverdue() throws Exception {
    String token = registerAndGetToken("overdue-skip@myvision.dev", "Skip Co");
    String clientId = createClient(token, "Various States");

    // Never issued, so it cannot be late however old the due date is.
    String draftId = createInvoice(token, clientId, "2026-01-31");

    String paidId = createInvoice(token, clientId, "2026-01-31");
    markSent(token, paidId);
    mockMvc.perform(post("/api/invoices/{id}/mark-paid", paidId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());

    String cancelledId = createInvoice(token, clientId, "2026-01-31");
    markSent(token, cancelledId);
    mockMvc.perform(post("/api/invoices/{id}/cancel", cancelledId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());

    invoiceOverdueService.markOverdue(LocalDate.parse("2026-03-01"));

    expectStatus(token, draftId, "draft");
    expectStatus(token, paidId, "paid");
    expectStatus(token, cancelledId, "cancelled");
  }

  @Test
  void anInvoiceNotYetDueIsLeftAlone() throws Exception {
    String token = registerAndGetToken("overdue-future@myvision.dev", "Not Yet Due Co");
    String clientId = createClient(token, "Pays On Time");
    String invoiceId = createInvoice(token, clientId, "2030-01-01");
    markSent(token, invoiceId);

    invoiceOverdueService.markOverdue(LocalDate.parse("2026-03-01"));

    expectStatus(token, invoiceId, "sent");
  }

  @Test
  void anInvoiceWithNoDueDateIsNeverLate() throws Exception {
    String token = registerAndGetToken("overdue-nodue@myvision.dev", "No Due Date Co");
    String clientId = createClient(token, "Open Ended");
    String invoiceId = createInvoice(token, clientId, null);
    markSent(token, invoiceId);

    // Creating an invoice always defaults dueDate from the company's payment terms, so the null
    // case cannot be produced through the API. Clearing it directly is the only way to exercise
    // the sweep query's null-safety, which is what stops a due-date-less invoice going overdue.
    Invoice invoice = invoiceRepository.findById(UUID.fromString(invoiceId)).orElseThrow();
    invoice.setDueDate(null);
    invoiceRepository.save(invoice);

    invoiceOverdueService.markOverdue(LocalDate.parse("2030-01-01"));

    expectStatus(token, invoiceId, "sent");
  }

  @Test
  void anOverdueInvoiceCanStillBePaid() throws Exception {
    String token = registerAndGetToken("overdue-pay@myvision.dev", "Overdue Payment Co");
    String clientId = createClient(token, "Late But Paying");
    String invoiceId = createInvoice(token, clientId, "2026-01-31");
    markSent(token, invoiceId);

    invoiceOverdueService.markOverdue(LocalDate.parse("2026-03-01"));
    expectStatus(token, invoiceId, "overdue");

    // Regression guard: the new status must not block the payment path.
    mockMvc.perform(post("/api/invoices/{id}/payments", invoiceId)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"amount\": 238.00, \"method\": \"bank_transfer\"}"))
        .andExpect(status().isCreated());

    expectStatus(token, invoiceId, "paid");
  }

  private void expectStatus(String token, String invoiceId, String expected) throws Exception {
    mockMvc.perform(get("/api/invoices/{id}", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value(expected));
  }

  private void markSent(String token, String invoiceId) throws Exception {
    mockMvc.perform(post("/api/invoices/{id}/mark-sent", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());
  }

  /** Creates a 238.00 EUR invoice, optionally with a due date. */
  private String createInvoice(String token, String clientId, String dueDate) throws Exception {
    String dueDateField = dueDate == null ? "" : "\"dueDate\": \"%s\",".formatted(dueDate);
    MvcResult result = mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "clientId": "%s",
                  %s
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
                """.formatted(clientId, dueDateField)))
        .andExpect(status().isCreated())
        .andReturn();

    JsonNode invoice = objectMapper.readTree(result.getResponse().getContentAsString());
    return invoice.get("id").asText();
  }
}
