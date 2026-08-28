package com.myvision.api.config;

import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

/**
 * Enables the background sweeps (overdue invoices, expired token cleanup).
 *
 * <p>Kept separate from the application class so it can be switched off with
 * {@code app.scheduling.enabled=false}. Tests disable it so a sweep never races an assertion, and
 * it gives an operator a way to stop background writes without redeploying.
 *
 * <p>Note for multi-instance deployments: these run on every instance. Both sweeps are idempotent,
 * so concurrent runs converge on the same result rather than corrupting anything, but if you scale
 * out and want them to run exactly once, put a lock in front of them.
 */
@Configuration
@EnableScheduling
@ConditionalOnProperty(name = "app.scheduling.enabled", havingValue = "true", matchIfMissing = true)
public class SchedulingConfig {
}
