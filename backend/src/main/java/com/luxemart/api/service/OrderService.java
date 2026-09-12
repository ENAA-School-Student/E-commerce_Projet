package com.luxemart.api.service;

import com.luxemart.api.dto.AddressDTO;
import com.luxemart.api.dto.CheckoutRequest;
import com.luxemart.api.dto.OrderResponse;
import com.luxemart.api.dto.PageResponse;
import com.luxemart.api.exception.BadRequestException;
import com.luxemart.api.exception.ResourceNotFoundException;
import com.luxemart.api.model.Order;
import com.luxemart.api.model.OrderItem;
import com.luxemart.api.model.Product;
import com.luxemart.api.model.ProductVariant;
import com.luxemart.api.model.User;
import com.luxemart.api.repository.OrderRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class OrderService {

    private static final BigDecimal FREE_SHIPPING_THRESHOLD = new BigDecimal("150.00");
    private static final BigDecimal SHIPPING_COST = new BigDecimal("9.90");
    private static final BigDecimal TAX_RATE = new BigDecimal("0.20");

    private final OrderRepository orderRepository;
    private final ProductService productService;
    private final UserService userService;
    private final CartService cartService;

    public PageResponse<OrderResponse> getUserOrders(Long userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        Page<Order> orders = orderRepository.findByUserIdOrderByCreatedAtDesc(userId, pageable);
        return PageResponse.from(orders.map(this::toResponse));
    }

    public PageResponse<OrderResponse> getAllOrders(int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"));
        return PageResponse.from(orderRepository.findAll(pageable).map(this::toResponse));
    }

    public OrderResponse getOrder(Long userId, Long orderId) {
        return toResponse(getOrderForUser(userId, orderId));
    }

    public Order getOrderById(Long orderId) {
        return orderRepository.findById(orderId)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
    }

    public Order getOrderByNumber(String orderNumber) {
        return orderRepository.findByOrderNumber(orderNumber)
            .orElseThrow(() -> new ResourceNotFoundException("Order not found: " + orderNumber));
    }

    @Transactional
    public OrderResponse createOrder(Long userId, CheckoutRequest request) {
        User user = userService.getUserById(userId);

        BigDecimal subtotal = BigDecimal.ZERO;
        java.util.Set<OrderItem> orderItems = new java.util.HashSet<>();

        for (CheckoutRequest.ItemRequest itemReq : request.items()) {
            Product product = productService.getProductById(itemReq.productId());

            ProductVariant variant = null;
            if (itemReq.variantId() != null) {
                variant = product.getVariants().stream()
                    .filter(v -> v.getId().equals(itemReq.variantId()))
                    .findFirst()
                    .orElseThrow(() -> new BadRequestException("Variant not found for " + product.getName()));
                if (variant.getStock() < itemReq.quantity()) {
                    throw new BadRequestException("Insufficient stock for " + product.getName());
                }
            } else {
                int totalStock = product.getVariants().stream().mapToInt(ProductVariant::getStock).sum();
                if (totalStock < itemReq.quantity()) {
                    throw new BadRequestException("Insufficient stock for " + product.getName());
                }
            }

            OrderItem orderItem = OrderItem.builder()
                .product(product)
                .productName(product.getName())
                .productImage(product.getImages().stream()
                    .filter(img -> img.getIsPrimary() != null && img.getIsPrimary())
                    .findFirst().map(img -> img.getImageUrl()).orElse(null))
                .quantity(itemReq.quantity())
                .unitPrice(product.getPrice())
                .totalPrice(product.getPrice().multiply(BigDecimal.valueOf(itemReq.quantity())))
                .size(variant != null ? variant.getSize() : null)
                .color(variant != null ? variant.getColor() : null)
                .build();

            subtotal = subtotal.add(product.getPrice().multiply(BigDecimal.valueOf(itemReq.quantity())));
            orderItems.add(orderItem);

            if (variant != null) {
                variant.setStock(variant.getStock() - itemReq.quantity());
            }
        }

        BigDecimal shipping = subtotal.compareTo(FREE_SHIPPING_THRESHOLD) >= 0 ? BigDecimal.ZERO : SHIPPING_COST;
        BigDecimal tax = subtotal.multiply(TAX_RATE).setScale(2, RoundingMode.HALF_UP);
        BigDecimal total = subtotal.add(shipping).add(tax);

        Order order = Order.builder()
            .orderNumber(generateOrderNumber())
            .user(user)
            .items(orderItems)
            .subtotal(subtotal)
            .shippingCost(shipping)
            .tax(tax)
            .total(total)
            .discount(BigDecimal.ZERO)
            .status(Order.OrderStatus.PENDING)
            .paymentStatus(Order.PaymentStatus.PENDING)
            .paymentMethod(request.paymentMethod() != null ? request.paymentMethod() : "CARD")
            .shippingFirstName(request.shippingFirstName())
            .shippingLastName(request.shippingLastName())
            .shippingStreet(request.shippingStreet())
            .shippingApartment(request.shippingApartment())
            .shippingCity(request.shippingCity())
            .shippingState(request.shippingState())
            .shippingZipCode(request.shippingZipCode())
            .shippingCountry(request.shippingCountry())
            .shippingPhone(request.shippingPhone())
            .build();

        orderItems.forEach(item -> item.setOrder(order));

        Order saved = orderRepository.save(order);

        if (Boolean.TRUE.equals(request.saveAddress())) {
            userService.addAddress(userId, new AddressDTO(
                null, request.shippingFirstName(), request.shippingLastName(), request.shippingPhone(),
                request.shippingStreet(), request.shippingApartment(), request.shippingCity(),
                request.shippingState(), request.shippingZipCode(), request.shippingCountry(), false
            ));
        }

        cartService.clearCart(userId);

        return toResponse(saved);
    }

    @Transactional
    public OrderResponse updateStatus(Long orderId, Order.OrderStatus newStatus) {
        Order order = getOrderById(orderId);
        order.setStatus(newStatus);
        if (newStatus == Order.OrderStatus.DELIVERED) {
            order.setDeliveredAt(LocalDateTime.now());
        }
        return toResponse(orderRepository.save(order));
    }

    private Order getOrderForUser(Long userId, Long orderId) {
        return orderRepository.findById(orderId)
            .filter(o -> o.getUser().getId().equals(userId))
            .orElseThrow(() -> new ResourceNotFoundException("Order not found"));
    }

    private String generateOrderNumber() {
        return "LX-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd"))
            + "-" + UUID.randomUUID().toString().substring(0, 6).toUpperCase();
    }

    private OrderResponse toResponse(Order order) {
        return new OrderResponse(
            order.getId(),
            order.getOrderNumber(),
            order.getUser().getId(),
            order.getUser().getFirstName() + " " + order.getUser().getLastName(),
            order.getSubtotal(),
            order.getShippingCost(),
            order.getTax(),
            order.getDiscount(),
            order.getTotal(),
            order.getPromoCode(),
            order.getStatus(),
            order.getPaymentStatus(),
            order.getPaymentMethod(),
            new OrderResponse.ShippingAddress(
                order.getShippingFirstName(), order.getShippingLastName(),
                order.getShippingStreet(), order.getShippingApartment(),
                order.getShippingCity(), order.getShippingState(),
                order.getShippingZipCode(), order.getShippingCountry(), order.getShippingPhone()
            ),
            order.getTrackingNumber(),
            order.getCreatedAt(),
            order.getItems().stream().map(item -> new OrderResponse.OrderItemResponse(
                item.getId(),
                item.getProduct().getId(),
                item.getProductName(),
                item.getProductImage(),
                item.getSize(),
                item.getColor(),
                item.getQuantity(),
                item.getUnitPrice(),
                item.getTotalPrice()
            )).toList()
        );
    }
}