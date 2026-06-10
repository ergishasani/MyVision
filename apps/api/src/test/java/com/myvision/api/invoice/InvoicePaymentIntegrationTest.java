package com.myvision.api.invoice;

import com.fasterxml.jackson.databind.JsonNode;
import com.myvision.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class InvoicePaymentIntegrationTest extends AbstractIntegrationTest {

  @Test
  void invoicePaymentsUpdateBalanceAndStatus() throws Exception {
    String token = registerAndGetToken("payments-1@myvision.dev", "Payments Co");
    String clientId = createClient(token, "Paying Client");

    // 2 x 100.00 at 19% tax: subtotal 200.00, tax 38.00, total 238.00
    MvcResult invoiceResult = mockMvc.perform(post("/api/invoices")
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
        .andExpect(jsonPath("$.invoiceNumber").isNotEmpty())
        .andExpect(jsonPath("$.status").value("draft"))
        .andExpect(jsonPath("$.subtotalAmount").value(200.00))
        .andExpect(jsonPath("$.taxAmount").value(38.00))
        .andExpect(jsonPath("$.totalAmount").value(238.00))
        .andExpect(jsonPath("$.balanceDue").value(238.00))
        .andReturn();

    JsonNode invoice = objectMapper.readTree(invoiceResult.getResponse().getContentAsString());
    String invoiceId = invoice.get("id").asText();

    // Payments are rejected while the invoice is a draft.
    mockMvc.perform(post("/api/invoices/{id}/payments", invoiceId)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"amount\": 100.00}"))
        .andExpect(status().isBadRequest());

    mockMvc.perform(post("/api/invoices/{id}/mark-sent", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("sent"));

    // Partial payment -> partially_paid with reduced balance.
    mockMvc.perform(post("/api/invoices/{id}/payments", invoiceId)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"amount\": 100.00, \"method\": \"bank_transfer\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.amount").value(100.00));

    mockMvc.perform(post("/api/invoices/{id}/payments", invoiceId)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"amount\": 500.00}"))
        .andExpect(status().isBadRequest()); // exceeds balance due

    // Remaining payment -> paid with zero balance.
    mockMvc.perform(post("/api/invoices/{id}/payments", invoiceId)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"amount\": 138.00, \"method\": \"cash\"}"))
        .andExpect(status().isCreated());

    mockMvc.perform(get("/api/invoices/{id}", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("paid"))
        .andExpect(jsonPath("$.amountPaid").value(238.00))
        .andExpect(jsonPath("$.balanceDue").value(0.00))
        .andExpect(jsonPath("$.paidAt").isNotEmpty());
  }

  @Test
  void invoiceDiscountReducesTaxableAmount() throws Exception {
    String token = registerAndGetToken("discount-invoice@myvision.dev", "Discount Invoice Co");
    String clientId = createClient(token, "Discount Client");

    mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "clientId": "%s",
                  "discountAmount": 10.00,
                  "items": [
                    {
                      "kind": "service",
                      "description": "Discounted renovation work",
                      "quantity": 1,
                      "unitPrice": 100.00,
                      "taxRate": 19
                    }
                  ]
                }
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.subtotalAmount").value(100.00))
        .andExpect(jsonPath("$.discountAmount").value(10.00))
        .andExpect(jsonPath("$.taxAmount").value(17.10))
        .andExpect(jsonPath("$.totalAmount").value(107.10))
        .andExpect(jsonPath("$.balanceDue").value(107.10));
  }

  @Test
  void quoteDiscountReducesTaxableAmount() throws Exception {
    String token = registerAndGetToken("discount-quote@myvision.dev", "Discount Quote Co");
    String clientId = createClient(token, "Discount Quote Client");

    mockMvc.perform(post("/api/quotes")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "clientId": "%s",
                  "discountAmount": 10.00,
                  "items": [
                    {
                      "kind": "service",
                      "description": "Discounted quote work",
                      "quantity": 1,
                      "unitPrice": 100.00,
                      "taxRate": 19
                    }
                  ]
                }
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.subtotalAmount").value(100.00))
        .andExpect(jsonPath("$.discountAmount").value(10.00))
        .andExpect(jsonPath("$.taxAmount").value(17.10))
        .andExpect(jsonPath("$.totalAmount").value(107.10));
  }

  @Test
  void invoiceRejectsDiscountGreaterThanSubtotal() throws Exception {
    String token = registerAndGetToken("discount-too-large@myvision.dev", "Discount Too Large Co");
    String clientId = createClient(token, "Discount Too Large Client");

    mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "clientId": "%s",
                  "discountAmount": 150.00,
                  "items": [
                    {
                      "kind": "service",
                      "description": "Small job",
                      "quantity": 1,
                      "unitPrice": 100.00,
                      "taxRate": 19
                    }
                  ]
                }
                """.formatted(clientId)))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.code").value("BAD_REQUEST"));
  }

  @Test
  void quoteCanBeConvertedToInvoice() throws Exception {
    String token = registerAndGetToken("quotes-1@myvision.dev", "Quotes Co");
    String clientId = createClient(token, "Quoted Client");

    MvcResult quoteResult = mockMvc.perform(post("/api/quotes")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "clientId": "%s",
                  "items": [
                    {
                      "kind": "materials",
                      "description": "Bricks",
                      "quantity": 10,
                      "unitPrice": 5.00,
                      "taxRate": 19
                    }
                  ]
                }
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.quoteNumber").isNotEmpty())
        .andExpect(jsonPath("$.status").value("draft"))
        .andExpect(jsonPath("$.totalAmount").value(59.50))
        .andReturn();

    String quoteId = objectMapper
        .readTree(quoteResult.getResponse().getContentAsString())
        .get("id").asText();

    mockMvc.perform(post("/api/quotes/{id}/send", quoteId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());

    mockMvc.perform(post("/api/quotes/{id}/accept", quoteId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());

    mockMvc.perform(post("/api/quotes/{id}/convert-to-invoice", quoteId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.sourceQuoteId").value(quoteId))
        .andExpect(jsonPath("$.totalAmount").value(59.50))
        .andExpect(jsonPath("$.status").value("draft"));
  }
}
