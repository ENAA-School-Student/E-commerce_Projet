package com.luxemart.api.service;

import com.luxemart.api.dto.AddToCartRequest;
import com.luxemart.api.dto.CartResponse;
import com.luxemart.api.exception.BadRequestException;
import com.luxemart.api.exception.ResourceNotFoundException;
import com.luxemart.api.model.CartItem;
import com.luxemart.api.model.Product;
import com.luxemart.api.model.ProductImage;
import com.luxemart.api.model.ProductVariant;
import com.luxemart.api.model.User;
import com.luxemart.api.repository.CartItemRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicReference;

@Service
@RequiredArgsConstructor
public class CartService {

    private final CartItemRepository cartItemRepository;
    private final ProductService productService;
    private final UserService userService;

    public CartResponse getCart(Long userId) {
        List<CartItem> items = cartItemRepository.findByUserId(userId);
        return toResponse(userId, items);
    }

    @Transactional
    public CartResponse addToCart(Long userId, AddToCartRequest request) {
        User user = userService.getUserById(userId);
        Product product = productService.getProductById(request.productId());

        if (!product.getActive()) {
            throw new BadRequestException("Product is not available");
        }

        ProductVariant variant = null;
        if (request.variantId() != null) {
            variant = product.getVariants().stream()
                .filter(v -> v.getId().equals(request.variantId()))
                .findFirst()
                .orElseThrow(() -> new ResourceNotFoundException("Variant not found"));
            if (variant.getStock() < request.quantity()) {
                throw new BadRequestException("Insufficient stock for selected variant");
            }
        } else {
            int availableStock = product.getVariants().stream().mapToInt(ProductVariant::getStock).sum();
            if (availableStock < request.quantity()) {
                throw new BadRequestException("Insufficient stock");
            }
        }

        Optional<CartItem> existing = cartItemRepository.findByUserIdAndProductId(userId, request.productId());
        if (existing.isPresent()) {
            CartItem item = existing.get();
            item.setQuantity(item.getQuantity() + request.quantity());
            cartItemRepository.save(item);
        } else {
            CartItem item = CartItem.builder()
                .user(user)
                .product(product)
                .variant(variant)
                .quantity(request.quantity())
                .build();
            cartItemRepository.save(item);
        }

        return getCart(userId);
    }

    @Transactional
    public CartResponse updateQuantity(Long userId, Long cartItemId, int quantity) {
        CartItem item = getCartItemForUser(userId, cartItemId);
        if (quantity <= 0) {
            throw new BadRequestException("Quantity must be positive");
        }
        item.setQuantity(quantity);
        cartItemRepository.save(item);
        return getCart(userId);
    }

    @Transactional
    public CartResponse removeItem(Long userId, Long cartItemId) {
        CartItem item = getCartItemForUser(userId, cartItemId);
        cartItemRepository.delete(item);
        return getCart(userId);
    }

    @Transactional
    public void clearCart(Long userId) {
        cartItemRepository.deleteByUserId(userId);
    }

    private CartItem getCartItemForUser(Long userId, Long cartItemId) {
        return cartItemRepository.findById(cartItemId)
            .filter(i -> i.getUser().getId().equals(userId))
            .orElseThrow(() -> new ResourceNotFoundException("Cart item not found"));
    }

    private CartResponse toResponse(Long userId, List<CartItem> items) {
        long[] itemCount = {0};
        AtomicReference<BigDecimal> subtotal = new AtomicReference<>(BigDecimal.ZERO);

        List<CartResponse.CartItemResponse> itemResponses = items.stream().map(item -> {
            Product product = item.getProduct();
            ProductImage primaryImage = product.getImages().stream()
                .filter(ProductImage::getIsPrimary)
                .findFirst()
                .orElse(null);
            BigDecimal price = product.getPrice();
            BigDecimal lineTotal = price.multiply(BigDecimal.valueOf(item.getQuantity()));
            subtotal.set(subtotal.get().add(lineTotal));
            itemCount[0] += item.getQuantity();
            return new CartResponse.CartItemResponse(
                item.getId(),
                product.getId(),
                product.getName(),
                product.getSlug(),
                primaryImage != null ? primaryImage.getImageUrl() : null,
                price,
                item.getVariant() != null ? item.getVariant().getId() : null,
                item.getVariant() != null ? item.getVariant().getSize() : null,
                item.getVariant() != null ? item.getVariant().getColor() : null,
                item.getQuantity(),
                lineTotal
            );
        }).toList();

        return new CartResponse(userId, itemCount[0], subtotal.get(), itemResponses);
    }
}