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
 * Exercises the Stripe webhook without touching the network.
 *
 * <p>Stripe signs a webhook with an HMAC over {@code timestamp + "." + body}, so a valid signature
 * can be produced locally from the shared secret. That makes the whole settle-an-invoice path
 * testable, which matters more here than anywhere else in the app: this is the code that decides
 * an invoice has been paid.
 *
 * <p>{@code stripe.secret-key} is deliberately left empty. It proves the outbound half stays
 * disabled until a key is supplied, while the inbound half still works.
 */
class StripeWebhookIntegrationTest extends AbstractIntegrationTest {

  private static final String WEBHOOK_SECRET = "whsec_test_secret_for_integration_tests";

  @DynamicPropertySource
  static void stripeProperties(DynamicPropertyRegistry registry) {
    registry.add("stripe.webhook-secret", () -> WEBHOOK_SECRET);
  }

  @Test
  void checkoutSessionIsUnavailableUntilAnApiKeyIsConfigured() throws Exception {
    String token = registerAndGetToken("stripe-unconfigured@myvision.dev", "Unconfigured Co");
    String clientId = createClient(token, "Stripe Client");
    String invoiceId = createSentInvoice(token, clientId);

    mockMvc.perform(post("/api/invoices/{id}/checkout-session", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isServiceUnavailable())
        .andExpect(jsonPath("$.code").value("STRIPE_NOT_CONFIGURED"));
  }

  @Test
  void webhookIsReachableWithoutABearerToken() throws Exception {
    // 400 not 401: the endpoint is public by design and rejects on the missing signature instead.
    mockMvc.perform(post("/api/stripe/webhook")
            .contentType(MediaType.APPLICATION_JSON)
            .content("{}"))
        .andExpect(status().isBadRequest());
  }

  @Test
  void webhookRejectsAForgedSignature() throws Exception {
    String payload = "{\"id\":\"evt_forged\",\"object\":\"event\",\"type\":\"checkout.session.completed\"}";

    mockMvc.perform(post("/api/stripe/webhook")
            .header("Stripe-Signature", signatureFor(payload, "whsec_the_wrong_secret"))
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
        .andExpect(status().isBadRequest())
        .andExpect(jsonPath("$.message").value("Invalid Stripe signature"));
  }

  @Test
  void signedWebhookSettlesTheInvoice() throws Exception {
    MvcResult registration = register("stripe-paid@myvision.dev", "Stripe Paid Co");
    JsonNode auth = objectMapper.readTree(registration.getResponse().getContentAsString());
    String token = auth.get("token").asText();
    String companyId = auth.get("company").get("id").asText();

    String clientId = createClient(token, "Paying Client");
    String invoiceId = createSentInvoice(token, clientId);

    String payload = checkoutCompletedEvent("evt_settle_1", "cs_settle_1", "pi_settle_1",
        23800L, invoiceId, companyId);

    mockMvc.perform(post("/api/stripe/webhook")
            .header("Stripe-Signature", signatureFor(payload, WEBHOOK_SECRET))
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
        .andExpect(status().isOk());

    mockMvc.perform(get("/api/invoices/{id}", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("paid"))
        .andExpect(jsonPath("$.amountPaid").value(238.00))
        .andExpect(jsonPath("$.balanceDue").value(0));

    mockMvc.perform(get("/api/invoices/{id}/payments", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1))
        .andExpect(jsonPath("$[0].amount").value(238.00))
        .andExpect(jsonPath("$[0].method").value("stripe"));
  }

  @Test
  void redeliveredWebhookDoesNotChargeTheInvoiceTwice() throws Exception {
    MvcResult registration = register("stripe-replay@myvision.dev", "Stripe Replay Co");
    JsonNode auth = objectMapper.readTree(registration.getResponse().getContentAsString());
    String token = auth.get("token").asText();
    String companyId = auth.get("company").get("id").asText();

    String clientId = createClient(token, "Replay Client");
    String invoiceId = createSentInvoice(token, clientId);

    String payload = checkoutCompletedEvent("evt_replay_1", "cs_replay_1", "pi_replay_1",
        23800L, invoiceId, companyId);
    String signature = signatureFor(payload, WEBHOOK_SECRET);

    // Stripe retries until it sees a 2xx, so the same event legitimately arrives more than once.
    for (int attempt = 0; attempt < 3; attempt++) {
      mockMvc.perform(post("/api/stripe/webhook")
              .header("Stripe-Signature", signature)
              .contentType(MediaType.APPLICATION_JSON)
              .content(payload))
          .andExpect(status().isOk());
    }

    mockMvc.perform(get("/api/invoices/{id}/payments", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.length()").value(1));

    mockMvc.perform(get("/api/invoices/{id}", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.amountPaid").value(238.00))
        .andExpect(jsonPath("$.balanceDue").value(0));
  }

  @Test
  void unpaidCheckoutSessionDoesNotRecordAPayment() throws Exception {
    MvcResult registration = register("stripe-unpaid@myvision.dev", "Stripe Unpaid Co");
    JsonNode auth = objectMapper.readTree(registration.getResponse().getContentAsString());
    String token = auth.get("token").asText();
    String companyId = auth.get("company").get("id").asText();

    String clientId = createClient(token, "Pending Client");
    String invoiceId = createSentInvoice(token, clientId);

    // An asynchronous method such as SEPA debit completes the session while the money is still
    // in flight. Nothing should settle until payment_status flips to paid.
    String payload = """
        {
          "id": "evt_pending_1",
          "object": "event",
          "api_version": "2024-06-20",
          "type": "checkout.session.completed",
          "data": {
            "object": {
              "id": "cs_pending_1",
              "object": "checkout.session",
              "amount_total": 23800,
              "currency": "eur",
              "payment_intent": "pi_pending_1",
              "payment_status": "unpaid",
              "metadata": { "invoiceId": "%s", "companyId": "%s" }
            }
          }
        }
        """.formatted(invoiceId, companyId);

    mockMvc.perform(post("/api/stripe/webhook")
            .header("Stripe-Signature", signatureFor(payload, WEBHOOK_SECRET))
            .contentType(MediaType.APPLICATION_JSON)
            .content(payload))
        .andExpect(status().isOk());

    mockMvc.perform(get("/api/invoices/{id}", invoiceId)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.status").value("sent"))
        .andExpect(jsonPath("$.amountPaid").value(0));
  }

  private MvcResult register(String email, String companyName) throws Exception {
    return mockMvc.perform(post("/api/auth/register")
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
  }

  /** Creates a 238.00 EUR invoice and moves it out of draft so it can be paid. */
  private String createSentInvoice(String token, String clientId) throws Exception {
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

    return invoiceId;
  }

  private static String checkoutCompletedEvent(
      String eventId,
      String sessionId,
      String paymentIntentId,
      long amountTotal,
      String invoiceId,
      String companyId
  ) {
    return """
        {
          "id": "%s",
          "object": "event",
          "api_version": "2024-06-20",
          "type": "checkout.session.completed",
          "data": {
            "object": {
              "id": "%s",
              "object": "checkout.session",
              "amount_total": %d,
              "currency": "eur",
              "payment_intent": "%s",
              "payment_status": "paid",
              "metadata": { "invoiceId": "%s", "companyId": "%s" }
            }
          }
        }
        """.formatted(eventId, sessionId, amountTotal, paymentIntentId, invoiceId, companyId);
  }

  /** Reproduces Stripe's {@code Stripe-Signature} header scheme. */
  private static String signatureFor(String payload, String secret) throws Exception {
    long timestamp = Instant.now().getEpochSecond();
    Mac mac = Mac.getInstance("HmacSHA256");
    mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
    byte[] digest = mac.doFinal(
        (timestamp + "." + payload).getBytes(StandardCharsets.UTF_8));
    return "t=" + timestamp + ",v1=" + HexFormat.of().formatHex(digest);
  }
}
