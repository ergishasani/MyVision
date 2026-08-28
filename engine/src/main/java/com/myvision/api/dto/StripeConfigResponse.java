package com.myvision.api.dto;

/**
 * What the frontend needs to know about Stripe before rendering a pay button.
 *
 * <p>Carries only the publishable key, which is safe to expose by design. The secret key never
 * leaves the server.
 */
public record StripeConfigResponse(
    boolean enabled,
    String publishableKey
) {
}
