package com.myvision.api.stripe;

import com.fasterxml.jackson.databind.JsonNode;
import com.myvision.api.AbstractIntegrationTest;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.HexFormat;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MvcResult;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The rest of the Stripe lifecycle: refunds, declines, abandoned sessions and disputes.
 *
 * <p>Refunds are exercised through {@code charge.refunded} rather than the app's own refund
 * endpoint, because issuing a refund calls Stripe and no secret key exists in tests. That is the
 * more valuable path anyway: it is the one that reconciles a refund somebody issued from the
 * Stripe dashboard, where the app is not the actor.
 */
class StripeRefundIntegrationTest extends AbstractIntegrationTest {

  private static final String WEBHOOK_SECRET = "whsec_test_secret_for_refund_tests";

  @DynamicPropertySource
  static void stripeProperties(DynamicPropertyRegistry registry) {
    registry.add("stripe.webhook-secret", () -> WEBHOOK_SECRET);
  }

  @Test
  void aFullRefundReturnsTheInvoiceToUnpaid() throws Exception {
    Fixture fixture = paidInvoice("refund-full@myvision.dev", "Refund Full Co", "pi_refund_full");

    send(chargeRefundedEvent("evt_refund_full", "ch_full", "pi_refund_full", 23800L));

    mockMvc.perform(get("/api/invoices/{id}", fixture.invoiceId())
            .header("Authorization", "Bearer " + fixture.token()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("sent"))
        .andExpect(jsonPath("$.amountPaid").value(0))
        .andExpect(jsonPath("$.balanceDue").value(238.00))
        // A refund undoes the payment, not the fact that the invoice was issued.
        .andExpect(jsonPath("$.paidAt").doesNotExist());

    mockMvc.perform(get("/api/invoices/{id}/refunds", fixture.invoiceId())
            .header("Authorization", "Bearer " + fixture.token()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].amount").value(238.00));
  }

  @Test
  void aPartialRefundLeavesTheInvoicePartiallyPaid() throws Exception {
    Fixture fixture = paidInvoice("refund-part@myvision.dev", "Refund Part Co", "pi_refund_part");

    send(chargeRefundedEvent("evt_refund_part", "ch_part", "pi_refund_part", 10000L));

    mockMvc.perform(get("/api/invoices/{id}", fixture.invoiceId())
            .header("Authorization", "Bearer " + fixture.token()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("partially_paid"))
        .andExpect(jsonPath("$.amountPaid").value(138.00))
        .andExpect(jsonPath("$.balanceDue").value(100.00));
  }

  @Test
  void successivePartialRefundsAccumulateRatherThanDoubleCount() throws Exception {
    Fixture fixture = paidInvoice("refund-multi@myvision.dev", "Refund Multi Co", "pi_refund_multi");

    // Stripe reports amount_refunded cumulatively, so the second event carries the running total.
    send(chargeRefundedEvent("evt_multi_1", "ch_multi", "pi_refund_multi", 10000L));
    send(chargeRefundedEvent("evt_multi_2", "ch_multi", "pi_refund_multi", 23800L));

    mockMvc.perform(get("/api/invoices/{id}", fixture.invoiceId())
            .header("Authorization", "Bearer " + fixture.token()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.amountPaid").value(0))
        .andExpect(jsonPath("$.status").value("sent"));

    // Two refunds totalling the invoice, not 100 + 238.
    mockMvc.perform(get("/api/invoices/{id}/refunds", fixture.invoiceId())
            .header("Authorization", "Bearer " + fixture.token()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(2));
  }

  @Test
  void aRedeliveredRefundEventDoesNotReverseTwice() throws Exception {
    Fixture fixture = paidInvoice("refund-replay@myvision.dev", "Refund Replay Co", "pi_refund_replay");

    String payload = chargeRefundedEvent("evt_refund_replay", "ch_replay", "pi_refund_replay", 10000L);
    for (int attempt = 0; attempt < 3; attempt++) {
      send(payload);
    }

    mockMvc.perform(get("/api/invoices/{id}", fixture.invoiceId())
            .header("Authorization", "Bearer " + fixture.token()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.amountPaid").value(138.00));

    mockMvc.perform(get("/api/invoices/{id}/refunds", fixture.invoiceId())
            .header("Authorization", "Bearer " + fixture.token()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1));
  }

  @Test
  void aDeclineIsRecordedAgainstTheInvoice() throws Exception {
    Fixture fixture = sentInvoice("decline@myvision.dev", "Decline Co");

    String payload = """
        {
          "id": "evt_declined",
          "object": "event",
          "api_version": "2024-06-20",
          "type": "payment_intent.payment_failed",
          "data": {
            "object": {
              "id": "pi_declined",
              "object": "payment_intent",
              "currency": "eur",
              "metadata": { "invoiceId": "%s", "companyId": "%s" },
              "last_payment_error": {
                "message": "Your card was declined.",
                "code": "card_declined",
                "decline_code": "insufficient_funds"
              }
            }
          }
        }
        """.formatted(fixture.invoiceId(), fixture.companyId());

    send(payload);

    mockMvc.perform(get("/api/invoices/{id}", fixture.invoiceId())
            .header("Authorization", "Bearer " + fixture.token()))
        .andExpect(status().isOk())
        // Still unpaid, but now it says why.
        .andExpect(jsonPath("$.status").value("sent"))
        .andExpect(jsonPath("$.amountPaid").value(0))
        .andExpect(jsonPath("$.lastPaymentError").value("Your card was declined. (insufficient_funds)"))
        .andExpect(jsonPath("$.lastPaymentErrorAt").isNotEmpty());
  }

  @Test
  void anExpiredSessionDoesNotSettleAnything() throws Exception {
    Fixture fixture = sentInvoice("expired@myvision.dev", "Expired Session Co");

    String payload = """
        {
          "id": "evt_expired",
          "object": "event",
          "api_version": "2024-06-20",
          "type": "checkout.session.expired",
          "data": {
            "object": {
              "id": "cs_expired",
              "object": "checkout.session",
              "amount_total": 23800,
              "currency": "eur",
              "payment_status": "unpaid",
              "metadata": { "invoiceId": "%s", "companyId": "%s" }
            }
          }
        }
        """.formatted(fixture.invoiceId(), fixture.companyId());

    send(payload);

    mockMvc.perform(get("/api/invoices/{id}", fixture.invoiceId())
            .header("Authorization", "Bearer " + fixture.token()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("sent"))
        .andExpect(jsonPath("$.amountPaid").value(0));
  }

  @Test
  void aDisputeIsRecordedButDoesNotReverseTheBalance() throws Exception {
    Fixture fixture = paidInvoice("dispute@myvision.dev", "Dispute Co", "pi_disputed");

    String payload = """
        {
          "id": "evt_dispute",
          "object": "event",
          "api_version": "2024-06-20",
          "type": "charge.dispute.created",
          "data": {
            "object": {
              "id": "dp_1",
              "object": "dispute",
              "amount": 23800,
              "charge": "ch_disputed",
              "payment_intent": "pi_disputed",
              "reason": "fraudulent",
              "status": "needs_response"
            }
          }
        }
        """;

    send(payload);

    // The money is held, not returned, and the dispute may be won. Reversing here would misstate
    // the invoice for the whole dispute window.
    mockMvc.perform(get("/api/invoices/{id}", fixture.invoiceId())
            .header("Authorization", "Bearer " + fixture.token()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("paid"))
        .andExpect(jsonPath("$.amountPaid").value(238.00));

    mockMvc.perform(get("/api/invoices/{id}/refunds", fixture.invoiceId())
            .header("Authorization", "Bearer " + fixture.token()))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(0));
  }

  @Test
  void configReportsStripeDisabledWithoutAnApiKey() throws Exception {
    String token = registerAndGetToken("stripe-config@myvision.dev", "Config Co");

    mockMvc.perform(get("/api/stripe/config")
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.enabled").value(false))
        .andExpect(jsonPath("$.publishableKey").doesNotExist());
  }

  @Test
  void issuingARefundNeedsAnApiKey() throws Exception {
    Fixture fixture = paidInvoice("refund-503@myvision.dev", "Refund Unconfigured Co", "pi_503");

    mockMvc.perform(post("/api/invoices/{id}/refunds", fixture.invoiceId())
            .header("Authorization", "Bearer " + fixture.token())
            .contentType(MediaType.APPLICATION_JSON)
            .content("{\"amount\": 10.00}"))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.code").value("STRIPE_NOT_CONFIGURED"));
  }

  // --- helpers ---------------------------------------------------------------------------------

  private record Fixture(String token, String companyId, String invoiceId) {
  }

  private void send(String payload) throws Exception {
    mockMvc.perform(post("/api/stripe/webhook")
            .header("Stripe-Signature", signatureFor(payload, WEBHOOK_SECRET))
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
        .andExpect(status().isOk());
  }

  /** A sent, unpaid 238.00 EUR invoice. */
  private Fixture sentInvoice(String email, String companyName) throws Exception {
    MvcResult registration = mockMvc.perform(post("/api/auth/register")
            .contentType(MediaType.APPLICATION_JSON)
            .content("""
                {
                  "fullName": "Test User",
                  "email": "%s",
                  "password": "Password123!",
                  "companyName": "%s"
                }
                """.formatted(email, companyName)))
        .andExpect(status().isOk())
        .andReturn();

    JsonNode auth = objectMapper.readTree(registration.getResponse().getContentAsString());
    String token = auth.get("token").asText();
    String companyId = auth.get("company").get("id").asText();
    String clientId = createClient(token, "Refund Client");

    MvcResult result = mockMvc.perform(post("/api/invoices")
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
        .andReturn();

    String invoiceId = objectMapper.readTree(result.getResponse().getContentAsString())
        .get("id").asText();

    mockMvc.perform(post("/api/invoices/{id}/mark-sent", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk());

    return new Fixture(token, companyId, invoiceId);
  }

  /** A 238.00 EUR invoice settled through Stripe under the given PaymentIntent. */
  private Fixture paidInvoice(String email, String companyName, String paymentIntentId)
      throws Exception {
    Fixture fixture = sentInvoice(email, companyName);

    String payload = """
        {
          "id": "evt_paid_%s",
          "object": "event",
          "api_version": "2024-06-20",
          "type": "checkout.session.completed",
          "data": {
            "object": {
              "id": "cs_%s",
              "object": "checkout.session",
              "amount_total": 23800,
              "currency": "eur",
              "payment_intent": "%s",
              "payment_status": "paid",
              "metadata": { "invoiceId": "%s", "companyId": "%s" }
            }
          }
        }
        """.formatted(paymentIntentId, paymentIntentId, paymentIntentId,
        fixture.invoiceId(), fixture.companyId());

    send(payload);
    return fixture;
  }

  private static String chargeRefundedEvent(
      String eventId, String chargeId, String paymentIntentId, long amountRefunded) {
    return """
        {
          "id": "%s",
          "object": "event",
          "api_version": "2024-06-20",
          "type": "charge.refunded",
          "data": {
            "object": {
              "id": "%s",
              "object": "charge",
              "currency": "eur",
              "amount": 23800,
              "amount_refunded": %d,
              "payment_intent": "%s",
              "refunded": true
            }
          }
        }
        """.formatted(eventId, chargeId, amountRefunded, paymentIntentId);
  }

  /** Reproduces Stripe's {@code Stripe-Signature} header scheme. */
  private static String signatureFor(String payload, String secret) throws Exception {
    long timestamp = Instant.now().getEpochSecond();
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    byte[] digest = mac.doFinal((timestamp + "." + payload).getBytes(StandardCharsets.UTF_8));
    return "t=" + timestamp + ",v1=" + HexFormat.of().formatHex(digest);
  }
}
