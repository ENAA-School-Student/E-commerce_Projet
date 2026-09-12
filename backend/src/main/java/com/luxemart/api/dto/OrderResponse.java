package com.luxemart.api.dto;

import com.luxemart.api.model.Order;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record OrderResponse(
    Long id,
    String orderNumber,
    Long userId,
    String customerName,
    BigDecimal subtotal,
    BigDecimal shippingCost,
    BigDecimal tax,
    BigDecimal discount,
    BigDecimal total,
    String promoCode,
    Order.OrderStatus status,
    Order.PaymentStatus paymentStatus,
    String paymentMethod,
    ShippingAddress shippingAddress,
    String trackingNumber,
    LocalDateTime createdAt,
    List<OrderItemResponse> items
) {
    public record ShippingAddress(
        String firstName,
        String lastName,
        String street,
        String apartment,
        String city,
        String state,
        String zipCode,
        String country,
        String phone
    ) {}

    public record OrderItemResponse(
        Long id,
        Long productId,
        String productName,
        String imageUrl,
        String size,
        String color,
        Integer quantity,
        BigDecimal unitPrice,
        BigDecimal totalPrice
    ) {}
}