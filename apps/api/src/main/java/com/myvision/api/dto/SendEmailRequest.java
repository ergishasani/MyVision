package com.myvision.api.dto;

import java.util.List;

public record SendEmailRequest(
    String from,
    List<String> to,
    String subject,
    String html
) {
}
