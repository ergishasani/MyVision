package com.myvision.api.util;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletResponse;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import static org.assertj.core.api.Assertions.assertThat;

class ApiRateLimitFilterTest {

  @Test
  void limitsRepeatedApiRequestsByIpAndPath() throws Exception {
    ApiRateLimitFilter filter = new ApiRateLimitFilter(objectMapper(), true, 1, 60_000);
    FilterChain okChain = (request, response) -> ((ServletResponse) response).getWriter().write("ok");

    MockHttpServletResponse firstResponse = new MockHttpServletResponse();
    filter.doFilter(request("/api/clients"), firstResponse, okChain);
    assertThat(firstResponse.getStatus()).isEqualTo(200);

    MockHttpServletResponse secondResponse = new MockHttpServletResponse();
    filter.doFilter(request("/api/clients"), secondResponse, okChain);
    assertThat(secondResponse.getStatus()).isEqualTo(429);
    assertThat(secondResponse.getContentAsString()).contains("RATE_LIMITED");
  }

  @Test
  void skipsAuthEndpoints() throws Exception {
    ApiRateLimitFilter filter = new ApiRateLimitFilter(objectMapper(), true, 0, 60_000);
    MockHttpServletResponse response = new MockHttpServletResponse();

    filter.doFilter(request("/api/auth/login"), response, (request, servletResponse) ->
        ((ServletResponse) servletResponse).getWriter().write("ok"));

    assertThat(response.getStatus()).isEqualTo(200);
    assertThat(response.getContentAsString()).isEqualTo("ok");
  }

  private MockHttpServletRequest request(String uri) {
    MockHttpServletRequest request = new MockHttpServletRequest("GET", uri);
    request.setRequestURI(uri);
    request.setRemoteAddr("203.0.113.10");
    return request;
  }

  private ObjectMapper objectMapper() {
    return new ObjectMapper().findAndRegisterModules();
  }
}
