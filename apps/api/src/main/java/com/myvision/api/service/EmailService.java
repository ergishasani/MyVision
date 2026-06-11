package com.myvision.api.service;

public interface EmailService {

  void sendPasswordResetEmail(String to, String resetUrl);

  void sendEmailVerificationEmail(String to, String verificationUrl);
}
