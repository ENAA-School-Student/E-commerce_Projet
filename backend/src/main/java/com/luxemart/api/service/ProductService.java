package com.luxemart.api.service;

import com.luxemart.api.dto.PageResponse;
import com.luxemart.api.dto.ProductRequest;
import com.luxemart.api.dto.ProductResponse;
import com.luxemart.api.exception.ResourceNotFoundException;
import com.luxemart.api.model.Category;
import com.luxemart.api.model.Product;
import com.luxemart.api.model.ProductImage;
import com.luxemart.api.model.ProductVariant;
import com.luxemart.api.repository.CategoryRepository;
import com.luxemart.api.repository.ProductRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProductService {

    private final ProductRepository productRepository;
    private final CategoryRepository categoryRepository;

    public PageResponse<ProductResponse> getAll(int page, int size, String sort, Long categoryId,
                                                BigDecimal minPrice, BigDecimal maxPrice, String search) {
        Pageable pageable = buildPageable(page, size, sort);
        Page<Product> products;

        if (categoryId != null || minPrice != null || maxPrice != null) {
            products = productRepository.findByFilters(categoryId, minPrice, maxPrice, pageable);
        } else if (search != null && !search.isBlank()) {
            products = productRepository.search(search, pageable);
        } else {
            products = productRepository.findByActiveTrue(pageable);
        }

        return PageResponse.from(products.map(this::toResponse));
    }

    public PageResponse<ProductResponse> getFeatured(int page, int size) {
        return PageResponse.from(productRepository.findByFeaturedTrueAndActiveTrue(PageRequest.of(page, size))
            .map(this::toResponse));
    }

    public ProductResponse getBySlug(String slug) {
        Product product = productRepository.findBySlug(slug)
            .filter(Product::getActive)
            .orElseThrow(() -> new ResourceNotFoundException("Product not found: " + slug));
        return toResponse(product);
    }

    public ProductResponse getById(Long id) {
        return toResponse(getProductById(id));
    }

    public Product getProductById(Long id) {
        return productRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Product not found"));
    }

    public long countActive() {
        return productRepository.countByActiveTrue();
    }

    @Transactional
    public ProductResponse create(ProductRequest request) {
        Product product = Product.builder()
            .name(request.name())
            .slug(toSlug(request.name()))
            .description(request.description())
            .price(request.price())
            .compareAtPrice(request.compareAtPrice())
            .brand(request.brand())
            .collection(request.collection())
            .badge(request.badge())
            .active(request.active() == null || request.active())
            .featured(request.featured() != null && request.featured())
            .build();

        if (request.categoryId() != null) {
            product.setCategory(categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found")));
        }

        if (request.variants() != null) {
            request.variants().forEach(v -> {
                ProductVariant variant = ProductVariant.builder()
                    .size(v.size())
                    .color(v.color())
                    .colorHex(v.colorHex())
                    .stock(v.stock())
                    .sku(v.sku() != null ? v.sku() : request.name() + "-" + UUID.randomUUID().toString().substring(0, 6))
                    .active(true)
                    .product(product)
                    .build();
                product.getVariants().add(variant);
            });
        }

        if (request.images() != null) {
            request.images().forEach(img -> {
                ProductImage image = ProductImage.builder()
                    .imageUrl(img.imageUrl())
                    .altText(img.altText() != null ? img.altText() : request.name())
                    .isPrimary(img.isPrimary() != null && img.isPrimary())
                    .sortOrder(img.sortOrder() != null ? img.sortOrder() : 0)
                    .product(product)
                    .build();
                product.getImages().add(image);
            });
        }

        return toResponse(productRepository.save(product));
    }

    @Transactional
    public ProductResponse update(Long id, ProductRequest request) {
        Product product = getProductById(id);

        product.setName(request.name());
        product.setSlug(toSlug(request.name(), id));
        product.setDescription(request.description());
        product.setPrice(request.price());
        product.setCompareAtPrice(request.compareAtPrice());
        product.setBrand(request.brand());
        product.setCollection(request.collection());
        product.setBadge(request.badge());
        if (request.active() != null) product.setActive(request.active());
        if (request.featured() != null) product.setFeatured(request.featured());

        if (request.categoryId() != null) {
            product.setCategory(categoryRepository.findById(request.categoryId())
                .orElseThrow(() -> new ResourceNotFoundException("Category not found")));
        }

        if (request.variants() != null) {
            product.getVariants().clear();
            request.variants().forEach(v -> {
                ProductVariant variant = ProductVariant.builder()
                    .size(v.size())
                    .color(v.color())
                    .colorHex(v.colorHex())
                    .stock(v.stock())
                    .sku(v.sku() != null ? v.sku() : request.name() + "-" + UUID.randomUUID().toString().substring(0, 6))
                    .active(true)
                    .product(product)
                    .build();
                product.getVariants().add(variant);
            });
        }

        if (request.images() != null) {
            product.getImages().clear();
            request.images().forEach(img -> {
                ProductImage image = ProductImage.builder()
                    .imageUrl(img.imageUrl())
                    .altText(img.altText() != null ? img.altText() : request.name())
                    .isPrimary(img.isPrimary() != null && img.isPrimary())
                    .sortOrder(img.sortOrder() != null ? img.sortOrder() : 0)
                    .product(product)
                    .build();
                product.getImages().add(image);
            });
        }

        return toResponse(productRepository.save(product));
    }

    @Transactional
    public void delete(Long id) {
        Product product = getProductById(id);
        product.setActive(false);
        productRepository.save(product);
    }

    public ProductResponse toResponse(Product product) {
        double avgRating = product.getReviews().stream()
            .mapToInt(r -> r.getRating())
            .average().orElse(0.0);
        long reviewCount = product.getReviews().size();

        return new ProductResponse(
            product.getId(),
            product.getName(),
            product.getSlug(),
            product.getDescription(),
            product.getPrice(),
            product.getCompareAtPrice(),
            product.getCategory() != null ? product.getCategory().getId() : null,
            product.getCategory() != null ? product.getCategory().getName() : null,
            product.getBrand(),
            product.getCollection(),
            product.getBadge(),
            product.getFeatured(),
            product.getActive(),
            product.getVariants().stream()
                .filter(ProductVariant::getActive)
                .map(v -> new ProductResponse.VariantResponse(
                    v.getId(), v.getSize(), v.getColor(), v.getColorHex(), v.getStock(), v.getSku(), v.getActive()))
                .sorted((a, b) -> {
                    if (a.size() == null) return b.size() == null ? 0 : -1;
                    if (b.size() == null) return 1;
                    return a.size().compareTo(b.size());
                })
                .toList(),
            product.getImages().stream()
                .sorted((a, b) -> {
                    int p = Boolean.compare(b.getIsPrimary(), a.getIsPrimary());
                    if (p != 0) return p;
                    return Integer.compare(a.getSortOrder(), b.getSortOrder());
                })
                .map(img -> new ProductResponse.ImageResponse(
                    img.getId(), img.getImageUrl(), img.getAltText(), img.getIsPrimary(), img.getSortOrder()))
                .toList(),
            Math.round(avgRating * 10) / 10.0,
            reviewCount
        );
    }

    private Pageable buildPageable(int page, int size, String sort) {
        int safePage = Math.max(page, 0);
        int safeSize = Math.min(Math.max(size, 1), 100);
        if (sort == null || sort.isBlank()) {
            return PageRequest.of(safePage, safeSize);
        }
        String[] parts = sort.split(",");
        String field = parts[0];
        Sort.Direction direction = parts.length > 1 && parts[1].equalsIgnoreCase("desc")
            ? Sort.Direction.DESC : Sort.Direction.ASC;
        return PageRequest.of(safePage, safeSize, Sort.by(direction, field));
    }

    private String toSlug(String name) {
        return toSlug(name, null);
    }

    private String toSlug(String name, Long excludeId) {
        String base = name.toLowerCase().trim()
            .replaceAll("[^a-z0-9\\s-]", "")
            .replaceAll("\\s+", "-");
        String slug = base;
        int counter = 1;
        while (productRepository.findBySlug(slug).filter(p -> !p.getId().equals(excludeId)).isPresent()) {
            slug = base + "-" + counter++;
        }
        return slug;
    }
}