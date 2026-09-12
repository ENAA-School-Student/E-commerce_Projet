package com.luxemart.api.controller;

import com.luxemart.api.dto.ProductResponse;
import com.luxemart.api.security.SecurityUtils;
import com.luxemart.api.service.WishlistService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/wishlist")
@RequiredArgsConstructor
public class WishlistController {

    private final WishlistService wishlistService;

    @GetMapping
    public ResponseEntity<List<ProductResponse>> getWishlist() {
        return ResponseEntity.ok(wishlistService.getWishlist(SecurityUtils.getCurrentUserId()));
    }

    @PostMapping("/{productId}")
    public ResponseEntity<List<ProductResponse>> add(@PathVariable Long productId) {
        return ResponseEntity.ok(wishlistService.addToWishlist(SecurityUtils.getCurrentUserId(), productId));
    }

    @DeleteMapping("/{productId}")
    public ResponseEntity<List<ProductResponse>> remove(@PathVariable Long productId) {
        return ResponseEntity.ok(wishlistService.removeFromWishlist(SecurityUtils.getCurrentUserId(), productId));
    }
}