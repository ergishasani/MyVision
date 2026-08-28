package com.myvision.api.dto;

import com.myvision.api.entity.ContactDetailKind;
import com.myvision.api.entity.ContactDetailLabel;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

/** One labelled phone, email, or website supplied when saving a contact. */
public record ContactDetailInput(
    @NotNull ContactDetailKind kind,
    ContactDetailLabel label,
    // Not @NotBlank: the form sends empty rows, which the service drops rather than
    // rejecting the whole request.
    @Size(max = 320) String value
) {
}
