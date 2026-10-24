package com.luxemart.api.dto;

import java.math.BigDecimal;
import java.util.List;

public record ProductResponse(
    Long id,
    String name,
    String slug,
    String description,
    BigDecimal price,
    BigDecimal compareAtPrice,
    Long categoryId,
    String categoryName,
    String brand,
    String collection,
    String badge,
    Boolean featured,
    Boolean active,
    List<VariantResponse> variants,
    List<ImageResponse> images,
    Double averageRating,
    Long reviewCount
) {
    public record VariantResponse(
        Long id,
        String size,
        String color,
        String colorHex,
        Integer stock,
        String sku,
        Boolean active
    ) {}

    public record ImageResponse(
        Long id,
        String imageUrl,
        String altText,
        Boolean isPrimary,
        Integer sortOrder
    ) {}
}