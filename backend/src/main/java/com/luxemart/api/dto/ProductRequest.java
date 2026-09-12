package com.luxemart.api.dto;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;

import java.math.BigDecimal;
import java.util.List;

public record ProductRequest(
    @NotBlank String name,
    String description,
    @NotNull @Min(0) BigDecimal price,
    BigDecimal compareAtPrice,
    Long categoryId,
    String brand,
    String collection,
    Boolean featured,
    Boolean active,
    List<VariantRequest> variants,
    List<ImageRequest> images
) {
    public record VariantRequest(
        String size,
        String color,
        String colorHex,
        @NotNull @Min(0) Integer stock,
        String sku,
        Boolean active
    ) {}

    public record ImageRequest(
        String imageUrl,
        String altText,
        Boolean isPrimary,
        Integer sortOrder
    ) {}
}