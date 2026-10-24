package com.luxemart.api.dto;

import java.math.BigDecimal;

public record StoreConfigResponse(
    BigDecimal freeShippingThreshold,
    BigDecimal shippingCost,
    BigDecimal taxRate,
    int lowStockThreshold,
    String currency
) {}
