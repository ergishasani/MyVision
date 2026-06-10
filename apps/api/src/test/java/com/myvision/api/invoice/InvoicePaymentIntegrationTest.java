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
