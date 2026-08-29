package com.myvision.api.report;

import com.myvision.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The advance-return layout.
 *
 * <p>The rule this file exists to defend is that the Zahllast is never a number. A VAT return is
 * output tax less deductible input tax; this system records sales and not purchases, so the
 * subtraction cannot be performed. Emitting nought there would be a figure someone could
 * transcribe onto a filed form, and it would be wrong for anyone who buys anything.
 */
class VatReturnIntegrationTest extends AbstractIntegrationTest {

  @Test
  void salesAreSplitOntoTheStandardAndReducedRateLines() throws Exception {
    String token = registerAndGetToken("vatreturn-rates@myvision.dev", "Vat Return Rates Co");
    String clientId = createClient(token, "Steuer GmbH");

    // 1.000 at 19% and 2.000 at 7% -> Kz 81 carries 1.000/190, Kz 86 carries 2.000/140.
    issue(token, clientId, """
        [{"description":"Voll","quantity":1,"unitPrice":1000.00,"taxRate":19},
         {"description":"Ermaessigt","quantity":1,"unitPrice":2000.00,"taxRate":7}]
        """);

    mockMvc.perform(get("/api/reports/vat-return")
            .param("from", "2020-01-01").param("to", "2099-12-31")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.groups[0].lines[0].basisCode").value("81"))
        .andExpect(jsonPath("$.groups[0].lines[0].basis").value(1000.00))
        .andExpect(jsonPath("$.groups[0].lines[0].tax").value(190.00))
        .andExpect(jsonPath("$.groups[0].lines[0].available").value(true))
        .andExpect(jsonPath("$.groups[0].lines[1].basisCode").value("86"))
        .andExpect(jsonPath("$.groups[0].lines[1].basis").value(2000.00))
        .andExpect(jsonPath("$.groups[0].lines[1].tax").value(140.00))
        .andExpect(jsonPath("$.outputTaxTotal").value(330.00));
  }

  @Test
  void theZahllastIsNeverANumberWhileInputTaxIsUnknown() throws Exception {
    String token = registerAndGetToken("vatreturn-zahllast@myvision.dev", "Vat Return Zahllast Co");
    String clientId = createClient(token, "Zahllast GmbH");
    issue(token, clientId, """
        [{"description":"Arbeit","quantity":1,"unitPrice":5000.00,"taxRate":19}]
        """);

    mockMvc.perform(get("/api/reports/vat-return")
            .param("from", "2020-01-01").param("to", "2099-12-31")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        // Output tax is real and reported.
        .andExpect(jsonPath("$.outputTaxTotal").value(950.00))
        // The amount owed is not, and must stay absent rather than defaulting to nought.
        .andExpect(jsonPath("$.payable").doesNotExist())
        .andExpect(jsonPath("$.inputTaxAvailable").value(false));
  }

  @Test
  void categoriesThisSystemCannotSourceAreNamedButNeverNumbered() throws Exception {
    String token = registerAndGetToken("vatreturn-gaps@myvision.dev", "Vat Return Gaps Co");

    MvcResult result = mockMvc.perform(get("/api/reports/vat-return")
            .param("from", "2020-01-01").param("to", "2099-12-31")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andReturn();

    var groups = objectMapper.readTree(result.getResponse().getContentAsString()).get("groups");
    int untrackedGroups = 0;
    for (var group : groups) {
      if (group.get("derived").asBoolean()) {
        continue;
      }
      untrackedGroups++;
      // A block with no source carries no totals...
      org.junit.jupiter.api.Assertions.assertTrue(group.get("basis").isNull());
      org.junit.jupiter.api.Assertions.assertTrue(group.get("tax").isNull());
      for (var line : group.get("lines")) {
        // ...and neither do its lines. Nought would assert the box was checked and found empty,
        // which for a business with EU purchases would be false on a tax form.
        org.junit.jupiter.api.Assertions.assertTrue(line.get("basis").isNull());
        org.junit.jupiter.api.Assertions.assertTrue(line.get("tax").isNull());
        org.junit.jupiter.api.Assertions.assertFalse(line.get("available").asBoolean());
      }
    }
    org.junit.jupiter.api.Assertions.assertEquals(7, untrackedGroups);

    // The form is present in full, nil lines included: someone checking a return needs to see the
    // boxes that are empty as well as the ones that are not.
    org.junit.jupiter.api.Assertions.assertEquals(8, groups.size());
  }

  @Test
  void draftsAndCancelledInvoicesStayOutOfTheReturn() throws Exception {
    String token = registerAndGetToken("vatreturn-scope@myvision.dev", "Vat Return Scope Co");
    String clientId = createClient(token, "Umfang GmbH");

    // Issued: counts.
    issue(token, clientId, """
        [{"description":"Gezaehlt","quantity":1,"unitPrice":1000.00,"taxRate":19}]
        """);
    // Draft: never issued, so no supply and no tax point.
    create(token, clientId, """
        [{"description":"Entwurf","quantity":1,"unitPrice":9999.00,"taxRate":19}]
        """);
    // Issued then cancelled: withdrawn, so it leaves the return again.
    String cancelled = issue(token, clientId, """
        [{"description":"Storniert","quantity":1,"unitPrice":4000.00,"taxRate":19}]
        """);
    mockMvc.perform(post("/api/invoices/{id}/cancel", cancelled)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());

    mockMvc.perform(get("/api/reports/vat-return")
            .param("from", "2020-01-01").param("to", "2099-12-31")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.groups[0].lines[0].basis").value(1000.00))
        .andExpect(jsonPath("$.outputTaxTotal").value(190.00))
        .andExpect(jsonPath("$.invoiceCount").value(1));
  }

  @Test
  void theReturnAgreesWithThePlainVatReportForTheSamePeriod() throws Exception {
    String token = registerAndGetToken("vatreturn-agree@myvision.dev", "Vat Return Agree Co");
    String clientId = createClient(token, "Einig GmbH");
    issue(token, clientId, """
        [{"description":"A","quantity":3,"unitPrice":333.33,"taxRate":19},
         {"description":"B","quantity":1,"unitPrice":80.00,"taxRate":7}]
        """);

    MvcResult plain = mockMvc.perform(get("/api/reports/vat")
            .param("from", "2020-01-01").param("to", "2099-12-31")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andReturn();
    String vat = objectMapper.readTree(plain.getResponse().getContentAsString())
        .get("vatAmount").asText();

    // One computation behind both screens: the form cannot drift from the report it is built on.
    mockMvc.perform(get("/api/reports/vat-return")
            .param("from", "2020-01-01").param("to", "2099-12-31")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.outputTaxTotal").value(Double.parseDouble(vat)));
  }

  /* --- helpers ------------------------------------------------------------ */

  private String create(String token, String clientId, String items) throws Exception {
    MvcResult result = mockMvc.perform(post("/api/invoices")
            .header("Authorization", "Bearer " + token)
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"clientId\":\"%s\",\"items\":%s}".formatted(clientId, items)))
        .andExpect(status().isCreated())
        .andReturn();
    return objectMapper.readTree(result.getResponse().getContentAsString()).get("id").asText();
  }

  /** Creates an invoice and sends it, so it counts as issued supply. */
  private String issue(String token, String clientId, String items) throws Exception {
    String id = create(token, clientId, items);
    mockMvc.perform(post("/api/invoices/{id}/mark-sent", id)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());
    return id;
  }
}
