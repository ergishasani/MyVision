package com.myvision.api.company;

import com.myvision.api.AbstractIntegrationTest;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.web.servlet.request.MockMvcRequestBuilders;

import static org.hamcrest.Matchers.containsString;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CompanyAssetIntegrationTest extends AbstractIntegrationTest {

  @Test
  void companyLogoCanBeUploadedToPublicStorage() throws Exception {
    String token = registerAndGetToken("logo-test@myvision.dev", "Logo Co");
    MockMultipartFile logo = new MockMultipartFile(
        "file",
        "logo.png",
        "image/png",
        new byte[] {(byte) 0x89, 'P', 'N', 'G'});

    mockMvc.perform(MockMvcRequestBuilders.multipart("/api/company/logo")
            .file(logo)
            .header("Authorization", "Bearer " + token))
        .andExpect(status().isOk())
        .andExpect(jsonPath("$.logoUrl", containsString("/companies/")))
        .andExpect(jsonPath("$.storagePath", containsString("logo.png")));
  }
}
