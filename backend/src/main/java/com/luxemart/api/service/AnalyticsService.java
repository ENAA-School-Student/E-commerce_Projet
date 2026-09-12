package com.luxemart.api.service;

import com.luxemart.api.dto.AdminAnalyticsResponse;
import com.luxemart.api.model.Order;
import com.luxemart.api.model.User;
import com.luxemart.api.repository.OrderRepository;
import com.luxemart.api.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final OrderRepository orderRepository;
    private final UserRepository userRepository;
    private final ProductService productService;

    public AdminAnalyticsResponse getAnalytics(int days) {
        int safeDays = days <= 0 ? 30 : Math.min(days, 365);
        LocalDateTime since = LocalDateTime.now().minusDays(safeDays);

        BigDecimal revenue = orderRepository.sumTotalRevenue();
        BigDecimal avgOrder = orderRepository.avgOrderValue();
        long totalOrders = orderRepository.count();
        long activeCustomers = userRepository.count();
        long totalProducts = productService.countActive();

        Map<String, BigDecimal> revenueByDay = getRevenueByDay(since);

        List<AdminAnalyticsResponse.TopProduct> topProducts = orderRepository.findAll(
                PageRequest.of(0, 200)).stream()
            .filter(o -> !o.getStatus().equals(Order.OrderStatus.CANCELLED))
            .flatMap(o -> o.getItems().stream())
            .collect(java.util.stream.Collectors.groupingBy(
                it -> it.getProduct().getId(),
                java.util.stream.Collectors.summingInt(it -> it.getQuantity())
            ))
            .entrySet().stream()
            .sorted(Map.Entry.<Long, Integer>comparingByValue().reversed())
            .limit(5)
            .map(e -> {
                var product = productService.getProductById(e.getKey());
                BigDecimal prodRevenue = orderRepository.findAll(PageRequest.of(0, 200)).stream()
                    .filter(o -> !o.getStatus().equals(Order.OrderStatus.CANCELLED))
                    .flatMap(o -> o.getItems().stream())
                    .filter(it -> it.getProduct().getId().equals(e.getKey()))
                    .map(it -> it.getUnitPrice().multiply(BigDecimal.valueOf(it.getQuantity())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
                return new AdminAnalyticsResponse.TopProduct(
                    product.getId(), product.getName(),
                    product.getImages().stream().findFirst().map(img -> img.getImageUrl()).orElse(null),
                    (long) e.getValue(), prodRevenue
                );
            })
            .toList();

        List<Order> recent = orderRepository.findAll(PageRequest.of(0, 8)).stream()
            .sorted((a, b) -> b.getCreatedAt().compareTo(a.getCreatedAt()))
            .toList();

        return new AdminAnalyticsResponse(
            revenue,
            avgOrder,
            totalOrders,
            activeCustomers,
            activeCustomers,
            totalProducts,
            orderRepository.countByStatus(Order.OrderStatus.PENDING),
            orderRepository.countByStatus(Order.OrderStatus.PROCESSING),
            orderRepository.countByStatus(Order.OrderStatus.SHIPPED),
            orderRepository.countByStatus(Order.OrderStatus.DELIVERED),
            orderRepository.countByStatus(Order.OrderStatus.CANCELLED),
            revenueByDay,
            List.of(),
            topProducts,
            recent.stream().map(o -> new AdminAnalyticsResponse.RecentOrder(
                o.getOrderNumber(),
                o.getUser().getFirstName() + " " + o.getUser().getLastName(),
                o.getStatus().name(),
                o.getTotal(),
                o.getCreatedAt()
            )).toList()
        );
    }

    private Map<String, BigDecimal> getRevenueByDay(LocalDateTime since) {
        Map<LocalDateTime, BigDecimal> daily = new HashMap<>();
        orderRepository.findAll().stream()
            .filter(o -> !o.getStatus().equals(Order.OrderStatus.CANCELLED))
            .filter(o -> !o.getCreatedAt().isBefore(since))
            .forEach(o -> {
                LocalDateTime day = o.getCreatedAt().toLocalDate().atStartOfDay();
                daily.merge(day, o.getTotal(), BigDecimal::add);
            });

        Map<String, BigDecimal> result = new TreeMap<>();
        LocalDateTime cursor = since.toLocalDate().atStartOfDay();
        while (!cursor.isAfter(LocalDateTime.now())) {
            result.put(cursor.toLocalDate().toString(), daily.getOrDefault(cursor, BigDecimal.ZERO));
            cursor = cursor.plusDays(1);
        }
        return result;
    }
}