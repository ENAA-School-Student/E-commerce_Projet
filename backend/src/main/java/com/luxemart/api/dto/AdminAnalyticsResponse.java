package com.luxemart.api.dto;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

public record AdminAnalyticsResponse(
    BigDecimal totalRevenue,
    BigDecimal avgOrderValue,
    Long totalOrders,
    Long activeCustomers,
    Long totalCustomers,
    Long totalProducts,
    Long pendingOrders,
    Long processingOrders,
    Long shippedOrders,
    Long deliveredOrders,
    Long cancelledOrders,
    Map<String, BigDecimal> revenueByDay,
    List<CategorySales> topCategories,
    List<TopProduct> topProducts,
    List<RecentOrder> recentOrders
) {
    public record CategorySales(
        String categoryName,
        BigDecimal revenue,
        Long orderCount
    ) {}

    public record TopProduct(
        Long id,
        String name,
        String imageUrl,
        Long unitsSold,
        BigDecimal revenue
    ) {}

    public record RecentOrder(
        String orderNumber,
        String customerName,
        String status,
        BigDecimal total,
        java.time.LocalDateTime createdAt
    ) {}
}