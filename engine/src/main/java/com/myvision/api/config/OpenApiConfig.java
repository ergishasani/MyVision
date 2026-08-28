package com.myvision.api.config;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class OpenApiConfig {

  private static final String BEARER_SCHEME = "bearerAuth";

  @Bean
  public OpenAPI myVisionOpenApi() {
    return new OpenAPI()
        .info(new Info()
            .title("MyVision API")
            .description("""
                Backend API for MyVision - a B2B SaaS for small construction/service \
                businesses. Manages companies, users, clients, projects, quotes, \
                invoices and payments.

                Authenticate via `POST /api/auth/register` or `POST /api/auth/login`, \
                then click "Authorize" and paste the returned JWT token.""")
            .version("0.1.0")
            .contact(new Contact().name("MyVision")))
        .components(new Components()
            .addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")
                .description("JWT token from /api/auth/register or /api/auth/login")))
        .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME));
  }
}
