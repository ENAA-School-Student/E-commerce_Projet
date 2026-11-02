package com.luxemart.api.controller;

import com.luxemart.api.dto.CheckoutRequest;
import com.luxemart.api.dto.OrderResponse;
import com.luxemart.api.dto.PageResponse;
import com.luxemart.api.security.SecurityUtils;
import com.luxemart.api.service.CheckoutService;
import com.luxemart.api.service.OrderService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/orders")
@RequiredArgsConstructor
public class OrderController {

    private final OrderService orderService;
    private final CheckoutService checkoutService;

    @GetMapping
    public ResponseEntity<PageResponse<OrderResponse>> getMyOrders(
        @RequestParam(defaultValue = "0") int page,
        @RequestParam(defaultValue = "10") int size
    ) {
        return ResponseEntity.ok(orderService.getUserOrders(SecurityUtils.getCurrentUserId(), page, size));
    }

    @PostMapping("/checkout")
    public ResponseEntity<OrderResponse> checkout(@Valid @RequestBody CheckoutRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
            .body(checkoutService.submit(SecurityUtils.getCurrentUserId(), request));
    }

    @GetMapping("/{orderId}")
    public ResponseEntity<OrderResponse> getOrder(@PathVariable Long orderId) {
        return ResponseEntity.ok(orderService.getOrder(SecurityUtils.getCurrentUserId(), orderId));
    }
}