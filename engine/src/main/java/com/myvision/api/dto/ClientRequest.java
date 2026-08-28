package com.myvision.api.dto;

import com.myvision.api.controller.*;
import com.myvision.api.dto.*;
import com.myvision.api.entity.*;
import com.myvision.api.exception.*;
import com.myvision.api.repository.*;
import com.myvision.api.service.*;
import com.myvision.api.util.*;

import com.myvision.api.entity.ContactRole;
import com.myvision.api.entity.DiscountUnit;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.PositiveOrZero;
import java.math.BigDecimal;
import jakarta.validation.constraints.Size;

public record ClientRequest(
    ClientType type,

    @NotBlank
    @Size(max = 200)
    String name,

    @Size(max = 160)
    String contactName,

    @Size(max = 120)
    String salutation,

    @Size(max = 120)
    String academicTitle,

    @Size(max = 120)
    String firstName,

    @Size(max = 120)
    String lastName,

    @Size(max = 120)
    String nameSuffix,

    @Size(max = 120)
    String position,

    ContactRole contactRole,

    @Positive
    Integer customerNumber,

    @Size(max = 64)
    String debtorNumber,

    @Size(max = 64)
    String creditorNumber,

    @Size(max = 34)
    String iban,

    @Size(max = 11)
    String bic,

    @Size(max = 64)
    String taxNumber,

    Boolean showVatId,

    Boolean einvoiceStandard,

    @Positive
    Integer paymentTermsDays,

    // Skonto: the early-payment window, and the rate that applies inside it.
    @PositiveOrZero
    Integer discountDays,

    @DecimalMin("0.00")
    @DecimalMax("100.00")
    BigDecimal discountPercent,

    // The standing customer discount. Its unit decides whether the number is a share or a sum.
    @PositiveOrZero
    BigDecimal customerDiscount,

    DiscountUnit customerDiscountUnit,

    @Size(max = 5000)
    String terms,

    @jakarta.validation.Valid
    java.util.List<ContactDetailInput> contactDetails,

    @Email
    @Size(max = 255)
    String email,

    @Size(max = 50)
    String phone,

    @Size(max = 50)
    String vatNumber,

    @Size(max = 255)
    String addressLine1,

    @Size(max = 255)
    String addressLine2,

    @Size(max = 120)
    String city,

    @Size(max = 120)
    String region,

    @Size(max = 20)
    String postalCode,

    @Size(min = 2, max = 2)
    String countryCode,

    @Size(max = 5000)
    String notes
) {
}
