package com.luxemart.api.dto;

import java.math.BigDecimal;
import java.util.List;

public record CartResponse(
    Long userId,
    Long itemCount,
    BigDecimal subtotal,
    List<CartItemResponse> items
) {
    public record CartItemResponse(
        Long id,
        Long productId,
        String productName,
        String productSlug,
        String imageUrl,
        BigDecimal price,
        Long variantId,
        String size,
        String color,
        Integer quantity,
        BigDecimal lineTotal
    ) {}
}