package com.luxemart.api.controller;

import com.luxemart.api.dto.AddToCartRequest;
import com.luxemart.api.dto.CartResponse;
import com.luxemart.api.security.SecurityUtils;
import com.luxemart.api.service.CartService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/cart")
@RequiredArgsConstructor
public class CartController {

    private final CartService cartService;

    @GetMapping
    public ResponseEntity<CartResponse> getCart() {
        return ResponseEntity.ok(cartService.getCart(SecurityUtils.getCurrentUserId()));
    }

    @PostMapping("/items")
    public ResponseEntity<CartResponse> addItem(@Valid @RequestBody AddToCartRequest request) {
        return ResponseEntity.ok(cartService.addToCart(SecurityUtils.getCurrentUserId(), request));
    }

    @PutMapping("/items/{cartItemId}")
    public ResponseEntity<CartResponse> updateQuantity(@PathVariable Long cartItemId,
                                                       @RequestParam int quantity) {
        return ResponseEntity.ok(cartService.updateQuantity(SecurityUtils.getCurrentUserId(), cartItemId, quantity));
    }

    @DeleteMapping("/items/{cartItemId}")
    public ResponseEntity<CartResponse> removeItem(@PathVariable Long cartItemId) {
        return ResponseEntity.ok(cartService.removeItem(SecurityUtils.getCurrentUserId(), cartItemId));
    }

    @DeleteMapping
    public ResponseEntity<Void> clearCart() {
        cartService.clearCart(SecurityUtils.getCurrentUserId());
        return ResponseEntity.noContent().build();
    }
}