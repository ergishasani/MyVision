package com.myvision.api.product;

import com.myvision.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Archiving versus deleting a product.
 *
 * <p>Unlike a contact, a product can always be deleted: an invoice line copies the description and
 * price it was written with rather than pointing at the catalogue entry, so removing the entry
 * cannot alter a document already issued.
 */
class ProductDeletionIntegrationTest extends AbstractIntegrationTest {

  @Test
  void aProductCanBeDeletedOutright() throws Exception {
    String token = registerAndGetToken("product-delete@myvision.dev", "Product Delete Co");

    MvcResult created = mockMvc.perform(post("/api/products")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Tippfehler\",\"units\":[{\"unit\":\"pcs\",\"factor\":10}]}"))
        .andExpect(status().isCreated())
        .andReturn();
    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

    mockMvc.perform(delete("/api/products/{id}/permanent", id)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());

    mockMvc.perform(get("/api/products/{id}", id).header("Authorization", "Bearer " + token))
        .andExpect(status().isNotFound());
  }

  @Test
  void deletingAProductLeavesAnAlreadyIssuedInvoiceIntact() throws Exception {
    String token = registerAndGetToken("product-invoiced@myvision.dev", "Product Invoiced Co");

    MvcResult product = mockMvc.perform(post("/api/products")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Fensterbank\",\"sellingPriceNet\":250.00}"))
        .andExpect(status().isCreated())
        .andReturn();
    String productId = objectMapper.readTree(product.getResponse().getContentAsString())
        .get("id").asText();

    MvcResult client = mockMvc.perform(post("/api/clients")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"type\":\"business\",\"name\":\"Kunde GmbH\"}"))
        .andExpect(status().isCreated())
        .andReturn();
    String clientId = objectMapper.readTree(client.getResponse().getContentAsString())
        .get("id").asText();

    // The line is written from the product but does not point at it.
    MvcResult invoice = mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {"clientId":"%s","items":[
                  {"description":"Fensterbank","quantity":1,"unitPrice":250.00}
                ]}
                """.formatted(clientId)))
        .andExpect(status().isCreated())
        .andReturn();
    String invoiceId = objectMapper.readTree(invoice.getResponse().getContentAsString())
        .get("id").asText();

    mockMvc.perform(delete("/api/products/{id}/permanent", productId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());

    // The invoice still reads exactly as it was issued.
    mockMvc.perform(get("/api/invoices/{id}", invoiceId).header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.items[0].description").value("Fensterbank"))
        .andExpect(jsonPath("$.items[0].unitPrice").value(250.00));
  }

  @Test
  void archivingHidesTheProductButKeepsIt() throws Exception {
    String token = registerAndGetToken("product-archive2@myvision.dev", "Product Archive Co");

    MvcResult created = mockMvc.perform(post("/api/products")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Auslaufartikel\"}"))
        .andExpect(status().isCreated())
        .andReturn();
    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

    mockMvc.perform(delete("/api/products/{id}", id).header("Authorization", "Bearer " + token))
        .andExpect(status().isNoContent());

    mockMvc.perform(get("/api/products").header("Authorization", "Bearer " + token))
        .andExpect(jsonPath("$.length()").value(0));

    // Gone from the catalogue, still fetchable: that is the difference from a delete.
    mockMvc.perform(get("/api/products/{id}", id).header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.archivedAt").exists());
  }

  @Test
  void anotherCompanysProductCannotBeDeleted() throws Exception {
    String owner = registerAndGetToken("product-del-owner@myvision.dev", "Product Del Owner Co");
    String stranger = registerAndGetToken("product-del-stranger@myvision.dev", "Product Del Stranger");

    MvcResult created = mockMvc.perform(post("/api/products")
            .header("Authorization", "Bearer " + owner)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"name\":\"Geheim\"}"))
        .andExpect(status().isCreated())
        .andReturn();
    String id = objectMapper.readTree(created.getResponse().getContentAsString()).get("id").asText();

    mockMvc.perform(delete("/api/products/{id}/permanent", id)
            .header("Authorization", "Bearer " + stranger))
        .andExpect(status().isNotFound());

    mockMvc.perform(get("/api/products/{id}", id).header("Authorization", "Bearer " + owner))
        .andExpect(status().isOk());
  }
}
