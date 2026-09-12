package com.luxemart.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;

import java.util.List;

public record CheckoutRequest(
    @NotEmpty List<ItemRequest> items,

    @NotBlank String shippingFirstName,
    @NotBlank String shippingLastName,
    @NotBlank String shippingStreet,
    String shippingApartment,
    @NotBlank String shippingCity,
    String shippingState,
    @NotBlank String shippingZipCode,
    @NotBlank String shippingCountry,
    String shippingPhone,

    String paymentMethod,
    String promoCode,
    Boolean saveAddress
) {
    public record ItemRequest(
        @NotNull Long productId,
        Long variantId,
        @Min(1) Integer quantity
    ) {}
}