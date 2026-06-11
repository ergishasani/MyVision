package com.myvision.api.service;

import com.myvision.api.dto.SendEmailRequest;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

@Service
public class ProviderEmailService implements EmailService {

  private static final Logger log = LoggerFactory.getLogger(ProviderEmailService.class);

  private final RestClient restClient;
  private final String provider;
  private final String from;
  private final String resendApiKey;
  private final String resendEndpoint;

  public ProviderEmailService(
      RestClient.Builder restClientBuilder,
      @Value("${mail.provider}") String provider,
      @Value("${mail.from}") String from,
      @Value("${mail.resend.api-key}") String resendApiKey,
      @Value("${mail.resend.endpoint}") String resendEndpoint
  ) {
    this.restClient = restClientBuilder.build();
    this.provider = provider;
    this.from = from;
    this.resendApiKey = resendApiKey;
    this.resendEndpoint = resendEndpoint;
  }

  @Override
  public void sendPasswordResetEmail(String to, String resetUrl) {
    send(to, "Reset your MyVision password", """
        <p>Use this link to reset your MyVision password:</p>
        <p><a href="%s">Reset password</a></p>
        <p>If you did not request this, you can ignore this email.</p>
        """.formatted(escapeHtml(resetUrl)));
  }

  @Override
  public void sendEmailVerificationEmail(String to, String verificationUrl) {
    send(to, "Verify your MyVision email", """
        <p>Welcome to MyVision.</p>
        <p><a href="%s">Verify your email address</a></p>
        """.formatted(escapeHtml(verificationUrl)));
  }

  private void send(String to, String subject, String html) {
    if (!"resend".equalsIgnoreCase(provider)) {
      log.info("Email provider is '{}'; skipping send to {} with subject '{}'", provider, to, subject);
      log.debug("Email body: {}", html);
      return;
    }
    if (resendApiKey == null || resendApiKey.isBlank()) {
      throw new IllegalStateException("RESEND_API_KEY is required when MAIL_PROVIDER=resend");
    }

    restClient.post()
        .uri(resendEndpoint)
        .header(HttpHeaders.AUTHORIZATION, "Bearer " + resendApiKey)
        .contentType(MediaType.APPLICATION_JSON)
        .body(new SendEmailRequest(from, List.of(to), subject, html))
        .retrieve()
        .toBodilessEntity();
  }

  private String escapeHtml(String value) {
    return value
        .replace("&", "&amp;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
        .replace("\"", "&quot;");
  }
}
