package com.myvision.api.product;

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
 * The product catalogue.
 *
 * <p>The rule with real consequence is that only the net price is stored. Gross is derived on
 * every read, so the two can never disagree — which is what makes the price safe to put on an
 * invoice.
 */
class ProductIntegrationTest extends AbstractIntegrationTest {

  @Test
  void aProductRoundTripsWithItsDerivedGrossPrice() throws Exception {
    String token = registerAndGetToken("products-basic@myvision.dev", "Products Co");

    MvcResult created = mockMvc.perform(post("/api/products")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "name": "Rehau 80mm windows + roller shutters",
                  "category": "article",
                  "unit": "pcs",
                  "taxRate": 19.00,
                  "sellingPriceNet": 1000.00,
                  "purchasePriceNet": 700.00,
                  "description": "Supplied and fitted.",
                  "internalNote": "Margin is thin on this one."
                }
                """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.name").value("Rehau 80mm windows + roller shutters"))
        .andExpect(jsonPath("$.sellingPriceNet").value(1000.00))
        // 1000 * 1.19, computed rather than stored.
        .andExpect(jsonPath("$.sellingPriceGross").value(1190.00))
        .andExpect(jsonPath("$.purchasePriceNet").value(700.00))
        .andExpect(jsonPath("$.purchasePriceGross").value(833.00))
        .andReturn();

    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();
    mockMvc.perform(get("/api/products/{id}", id).header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sellingPriceGross").value(1190.00))
        .andExpect(jsonPath("$.internalNote").value("Margin is thin on this one."));
  }

  @Test
  void aGrossPriceIsConvertedBackToNet() throws Exception {
    String token = registerAndGetToken("products-gross@myvision.dev", "Gross Price Co");

    // Someone quoting a customer thinks in gross. 119 gross at 19% is 100 net.
    mockMvc.perform(post("/api/products")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"name":"Brutto Artikel","taxRate":19.00,"sellingPriceGross":119.00}
                """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.sellingPriceNet").value(100.00))
        .andExpect(jsonPath("$.sellingPriceGross").value(119.00));
  }

  @Test
  void theNetFigureWinsWhenBothAreSent() throws Exception {
    String token = registerAndGetToken("products-both@myvision.dev", "Both Prices Co");

    // Net is the column that exists, so what is stored is what was sent. A contradictory gross
    // is ignored rather than silently overwriting it.
    mockMvc.perform(post("/api/products")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"name":"Widerspruch","taxRate":19.00,
                 "sellingPriceNet":100.00,"sellingPriceGross":500.00}
                """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.sellingPriceNet").value(100.00))
        .andExpect(jsonPath("$.sellingPriceGross").value(119.00));
  }

  @Test
  void changingTheTaxRateMovesTheGrossPriceNotTheNetOne() throws Exception {
    String token = registerAndGetToken("products-rate@myvision.dev", "Rate Change Co");

    MvcResult created = mockMvc.perform(post("/api/products")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Steuersatz\",\"taxRate\":19.00,\"sellingPriceNet\":100.00}"))
        .andExpect(status().isCreated())
        .andReturn();
    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

    // Dropping to the reduced rate must not quietly reprice what we charge before tax.
    mockMvc.perform(patch("/api/products/{id}", id)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"taxRate\":7.00}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.sellingPriceNet").value(100.00))
        .andExpect(jsonPath("$.sellingPriceGross").value(107.00));
  }

  @Test
  void articleNumbersAreAssignedInSequence() throws Exception {
    String token = registerAndGetToken("products-numbering@myvision.dev", "Numbering Co");

    mockMvc.perform(get("/api/products/next-number").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.nextArticleNumber").value(1000));

    mockMvc.perform(post("/api/products")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Erster\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.articleNumber").value(1000));

    mockMvc.perform(post("/api/products")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Zweiter\"}"))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.articleNumber").value(1001));
  }

  @Test
  void aTakenArticleNumberIsRejected() throws Exception {
    String token = registerAndGetToken("products-dupe@myvision.dev", "Duplicate Number Co");

    mockMvc.perform(post("/api/products")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Belegt\",\"articleNumber\":5000}"))
        .andExpect(status().isCreated());

    mockMvc.perform(post("/api/products")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Auch belegt\",\"articleNumber\":5000}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void alternativeUnitsArePricedFromTheBaseProduct() throws Exception {
    String token = registerAndGetToken("products-units@myvision.dev", "Units Co");

    MvcResult created = mockMvc.perform(post("/api/products")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "name": "Schrauben",
                  "unit": "pcs",
                  "sellingPriceNet": 2.50,
                  "units": [
                    { "unit": "pcs", "factor": 100 },
                    { "unit": "kg", "factor": 12.5 }
                  ]
                }
                """))
        .andExpect(status().isCreated())
        .andExpect(jsonPath("$.units.length()").value(2))
        // 2.50 x 100, derived rather than typed, so it cannot go stale.
        .andExpect(jsonPath("$.units[0].priceNet").value(250.00))
        .andExpect(jsonPath("$.units[1].priceNet").value(31.25))
        .andReturn();
    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

    // Repricing the product reprices every alternative unit with it.
    mockMvc.perform(patch("/api/products/{id}", id)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"sellingPriceNet\":5.00}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.units[0].priceNet").value(500.00))
        .andExpect(jsonPath("$.units[1].priceNet").value(62.50));
  }

  @Test
  void omittingTheUnitListLeavesExistingUnitsAlone() throws Exception {
    String token = registerAndGetToken("products-keep-units@myvision.dev", "Keep Units Co");

    MvcResult created = mockMvc.perform(post("/api/products")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"name":"Behalten","sellingPriceNet":10.00,
                 "units":[{"unit":"pcs","factor":10}]}
                """))
        .andExpect(status().isCreated())
        .andReturn();
    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

    // PATCH semantics: an absent field means "unchanged", not "clear".
    mockMvc.perform(patch("/api/products/{id}", id)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Behalten GmbH\"}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.units.length()").value(1));

    // An explicit empty list does clear them.
    mockMvc.perform(patch("/api/products/{id}", id)
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"units\":[]}"))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.units.length()").value(0));
  }

  @Test
  void aZeroFactorIsRejected() throws Exception {
    String token = registerAndGetToken("products-zero@myvision.dev", "Zero Factor Co");

    // A factor of zero would price the alternative unit at nothing.
    mockMvc.perform(post("/api/products")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Null\",\"units\":[{\"unit\":\"pcs\",\"factor\":0}]}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void anImpossibleTaxRateIsRejected() throws Exception {
    String token = registerAndGetToken("products-badrate@myvision.dev", "Bad Rate Co");

    mockMvc.perform(post("/api/products")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Zuviel\",\"taxRate\":150.00}"))
        .andExpect(status().isBadRequest());

    mockMvc.perform(post("/api/products")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Negativ\",\"sellingPriceNet\":-5.00}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void archivingHidesAProductFromTheList() throws Exception {
    String token = registerAndGetToken("products-archive@myvision.dev", "Archive Co");

    MvcResult created = mockMvc.perform(post("/api/products")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Auslaufmodell\"}"))
        .andExpect(status().isCreated())
        .andReturn();
    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

    mockMvc.perform(delete("/api/products/{id}", id).header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());

    mockMvc.perform(get("/api/products").header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(0));

    // Archived, not deleted: still reachable by id, because documents may reference it.
    mockMvc.perform(get("/api/products/{id}", id).header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.archivedAt").exists());
  }

  @Test
  void anotherCompanysProductIsNotVisible() throws Exception {
    String owner = registerAndGetToken("products-owner@myvision.dev", "Owner Co");
    String stranger = registerAndGetToken("products-stranger@myvision.dev", "Stranger Co");

    MvcResult created = mockMvc.perform(post("/api/products")
            .header("Authorization", "Bearer " + owner)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Geheim\"}"))
        .andExpect(status().isCreated())
        .andReturn();
    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

    mockMvc.perform(get("/api/products/{id}", id).header("Authorization", "Bearer " + stranger))
        .andExpect(status().isNotFound());
  }
}
