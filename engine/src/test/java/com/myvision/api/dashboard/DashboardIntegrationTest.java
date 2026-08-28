package com.myvision.api.dashboard;

import com.myvision.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class DashboardIntegrationTest extends AbstractIntegrationTest {

  @Test
  void summaryReturnsCompanyScopedMetrics() throws Exception {
    String token = registerAndGetToken("dashboard-1@myvision.dev", "Dashboard Co");
    String clientId = createClient(token, "Dashboard Client");

    mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "clientId": "%s",
                  "items": [
                    {"description": "Work", "quantity": 1, "unitPrice": 100.00, "taxRate": 19}
                  ]
                }
                """.formatted(clientId)))
        .andExpect(status().isCreated());

    mockMvc.perform(get("/api/dashboard/summary")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.totalInvoicedThisMonth").isNumber())
        .andExpect(jsonPath("$.paidAmountThisMonth").isNumber())
        .andExpect(jsonPath("$.unpaidAmount").isNumber())
        .andExpect(jsonPath("$.overdueAmount").isNumber())
        .andExpect(jsonPath("$.overdueInvoiceCount").value(0))
        .andExpect(jsonPath("$.activeProjectCount").value(0))
        .andExpect(jsonPath("$.recentInvoices.length()").value(1))
        .andExpect(jsonPath("$.recentClients.length()").value(1));
  }
}
