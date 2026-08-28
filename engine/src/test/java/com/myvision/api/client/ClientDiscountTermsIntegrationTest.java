package com.myvision.api.client;

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
 * Discount terms agreed with a contact.
 *
 * <p>Two separate arrangements live here and are easily confused. Skonto is conditional — 2% off
 * only if the customer pays within 10 days. A customer discount is unconditional and always
 * applies. The pair that must never drift apart is the customer discount and its unit, because 10
 * and 10% are different sums.
 */
class ClientDiscountTermsIntegrationTest extends AbstractIntegrationTest {

  @Test
  void skontoAndCustomerDiscountRoundTrip() throws Exception {
    String token = registerAndGetToken("discount-terms@myvision.dev", "Discount Terms Co");

    MvcResult created = mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "type": "business",
                  "name": "Skonto GmbH",
                  "paymentTermsDays": 30,
                  "discountDays": 10,
                  "discountPercent": 2.00,
                  "customerDiscount": 5.00,
                  "customerDiscountUnit": "percent"
                }
                """))
        .andExpect(status().isCreated())
        // "2% within 10 days, net 30" — the classic German payment term.
        .andExpect(jsonPath("$.paymentTermsDays").value(30))
        .andExpect(jsonPath("$.discountDays").value(10))
        .andExpect(jsonPath("$.discountPercent").value(2.00))
        .andExpect(jsonPath("$.customerDiscount").value(5.00))
        .andExpect(jsonPath("$.customerDiscountUnit").value("percent"))
        .andReturn();

    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();
    mockMvc.perform(get("/api/clients/{id}", id).header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.discountPercent").value(2.00))
        .andExpect(jsonPath("$.customerDiscountUnit").value("percent"));
  }

  @Test
  void anAbsoluteDiscountKeepsItsUnit() throws Exception {
    String token = registerAndGetToken("discount-absolute@myvision.dev", "Absolute Discount Co");

    // A flat 50 € off, not 50 percent off. Losing the unit here would overcharge or undercharge
    // by an order of magnitude.
    mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"type":"business","name":"Pauschal GmbH",
                 "customerDiscount":50.00,"customerDiscountUnit":"absolute"}
                """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.customerDiscount").value(50.00))
        .andExpect(jsonPath("$.customerDiscountUnit").value("absolute"));
  }

  @Test
  void theUnitDefaultsToPercent() throws Exception {
    String token = registerAndGetToken("discount-default@myvision.dev", "Default Unit Co");

    // Percent is the safer default: it degrades to a small error, while treating a percentage as
    // an absolute amount does not.
    mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"type\":\"business\",\"name\":\"Vorgabe GmbH\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.customerDiscountUnit").value("percent"))
        .andExpect(jsonPath("$.discountDays").doesNotExist())
        .andExpect(jsonPath("$.discountPercent").doesNotExist())
        .andExpect(jsonPath("$.customerDiscount").doesNotExist());
  }

  @Test
  void theUnitCanBeSwitchedWithoutTouchingTheAmount() throws Exception {
    String token = registerAndGetToken("discount-switch@myvision.dev", "Switch Unit Co");

    MvcResult created = mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"type":"business","name":"Wechsel GmbH",
                 "customerDiscount":10.00,"customerDiscountUnit":"percent"}
                """))
        .andExpect(status().isCreated())
        .andReturn();
    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

    mockMvc.perform(patch("/api/clients/{id}", id)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"customerDiscountUnit\":\"absolute\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.customerDiscount").value(10.00))
        .andExpect(jsonPath("$.customerDiscountUnit").value("absolute"));
  }

  @Test
  void aDiscountOverOneHundredPercentIsRejected() throws Exception {
    String token = registerAndGetToken("discount-invalid@myvision.dev", "Invalid Discount Co");

    mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"type\":\"business\",\"name\":\"Zuviel GmbH\",\"discountPercent\":120.00}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void aNegativeDiscountPeriodIsRejected() throws Exception {
    String token = registerAndGetToken("discount-negative@myvision.dev", "Negative Discount Co");

    mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"type\":\"business\",\"name\":\"Negativ GmbH\",\"discountDays\":-3}"))
        .andExpect(status().isBadRequest());
  }
}
