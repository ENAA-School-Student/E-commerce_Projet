package com.luxemart.api.service;

import com.luxemart.api.dto.ProductResponse;
import com.luxemart.api.exception.BadRequestException;
import com.luxemart.api.exception.ResourceNotFoundException;
import com.luxemart.api.model.User;
import com.luxemart.api.model.WishlistItem;
import com.luxemart.api.repository.WishlistItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class WishlistService {

    private final WishlistItemRepository wishlistItemRepository;
    private final ProductService productService;
    private final UserService userService;

    public List<ProductResponse> getWishlist(Long userId) {
        return wishlistItemRepository.findByUserId(userId).stream()
            .map(item -> productService.toResponse(item.getProduct()))
            .toList();
    }

    @Transactional
    public List<ProductResponse> addToWishlist(Long userId, Long productId) {
        User user = userService.getUserById(userId);
        var product = productService.getProductById(productId);

        if (!wishlistItemRepository.existsByUserIdAndProductId(userId, productId)) {
            WishlistItem item = WishlistItem.builder()
                .user(user)
                .product(product)
                .build();
            wishlistItemRepository.save(item);
        }
        return getWishlist(userId);
    }

    @Transactional
    public List<ProductResponse> removeFromWishlist(Long userId, Long productId) {
        WishlistItem item = wishlistItemRepository.findByUserIdAndProductId(userId, productId)
            .orElseThrow(() -> new ResourceNotFoundException("Wishlist item not found"));
        wishlistItemRepository.delete(item);
        return getWishlist(userId);
    }
}