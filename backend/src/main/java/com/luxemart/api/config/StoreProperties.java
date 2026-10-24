package com.luxemart.api.config;

import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;

/** Commerce rules shared by checkout pricing and the public store config endpoint. */
@Getter
@Component
public class StoreProperties {

    private final BigDecimal freeShippingThreshold;
    private final BigDecimal shippingCost;
    private final BigDecimal taxRate;
    private final int lowStockThreshold;

    public StoreProperties(
        @Value("${app.commerce.free-shipping-threshold}") BigDecimal freeShippingThreshold,
        @Value("${app.commerce.shipping-cost}") BigDecimal shippingCost,
        @Value("${app.commerce.tax-rate}") BigDecimal taxRate,
        @Value("${app.commerce.low-stock-threshold}") int lowStockThreshold
    ) {
        this.freeShippingThreshold = freeShippingThreshold;
        this.shippingCost = shippingCost;
        this.taxRate = taxRate;
        this.lowStockThreshold = lowStockThreshold;
    }
}
