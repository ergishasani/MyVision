package com.myvision.api.config;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.myvision.api.util.ApiRateLimitFilter;
import com.myvision.api.util.JwtAuthenticationFilter;
import com.myvision.api.util.RequestIdFilter;
import com.myvision.api.dto.ApiError;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Arrays;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.http.MediaType;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.config.Customizer;
import org.springframework.security.config.annotation.authentication.configuration.AuthenticationConfiguration;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.annotation.web.configuration.EnableWebSecurity;
import org.springframework.security.config.annotation.web.configurers.AbstractHttpConfigurer;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.authentication.UsernamePasswordAuthenticationFilter;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;

@Configuration
@EnableWebSecurity
@EnableMethodSecurity
public class SecurityConfig {

  @Bean
  public SecurityFilterChain securityFilterChain(
      HttpSecurity http,
      JwtAuthenticationFilter jwtAuthenticationFilter,
      RequestIdFilter requestIdFilter,
      ApiRateLimitFilter apiRateLimitFilter,
      ObjectMapper objectMapper
  ) throws Exception {
    return http
        .csrf(AbstractHttpConfigurer::disable)
        .cors(Customizer.withDefaults())
        .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
        .authorizeHttpRequests(auth -> auth
            .requestMatchers(HttpMethod.OPTIONS, "/**").permitAll()
            .requestMatchers(
                "/api/health",
                "/actuator/health",
                "/actuator/health/**",
                "/api/auth/register",
                "/api/auth/login",
                "/api/auth/refresh",
                "/api/auth/forgot-password",
                "/api/auth/reset-password",
                "/api/auth/verify-email"
            ).permitAll()
            .anyRequest().authenticated()
        )
        .exceptionHandling(exceptions -> exceptions
            .authenticationEntryPoint((request, response, exception) -> writeError(
                objectMapper, response, HttpServletResponse.SC_UNAUTHORIZED,
                "Authentication required", "UNAUTHORIZED"))
            .accessDeniedHandler((request, response, exception) -> writeError(
                objectMapper, response, HttpServletResponse.SC_FORBIDDEN,
                "Access denied", "FORBIDDEN"))
        )
        .addFilterBefore(requestIdFilter, UsernamePasswordAuthenticationFilter.class)
        .addFilterBefore(apiRateLimitFilter, UsernamePasswordAuthenticationFilter.class)
        .addFilterBefore(jwtAuthenticationFilter, UsernamePasswordAuthenticationFilter.class)
        .build();
  }

  private static void writeError(
      ObjectMapper objectMapper,
      HttpServletResponse response,
      int status,
      String message,
      String code
  ) throws java.io.IOException {
    response.setStatus(status);
    response.setContentType(MediaType.APPLICATION_JSON_VALUE);
    objectMapper.writeValue(response.getOutputStream(), ApiError.of(message, code));
  }

  @Bean
  public PasswordEncoder passwordEncoder() {
    return new BCryptPasswordEncoder();
  }

  @Bean
  public AuthenticationManager authenticationManager(AuthenticationConfiguration configuration)
      throws Exception {
    return configuration.getAuthenticationManager();
  }

  @Bean
  public CorsConfigurationSource corsConfigurationSource(
      @Value("${app.cors.allowed-origins}") String allowedOrigins
  ) {
    CorsConfiguration configuration = new CorsConfiguration();
    configuration.setAllowedOrigins(Arrays.stream(allowedOrigins.split(","))
        .map(String::trim)
        .filter(origin -> !origin.isBlank())
        .toList());
    configuration.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
    configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
    configuration.setAllowCredentials(true);

    UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
    source.registerCorsConfiguration("/**", configuration);
    return source;
  }
}
