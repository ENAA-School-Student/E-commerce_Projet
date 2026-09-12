package com.luxemart.api.service;

import com.luxemart.api.dto.CategoryRequest;
import com.luxemart.api.dto.CategoryResponse;
import com.luxemart.api.exception.ResourceNotFoundException;
import com.luxemart.api.model.Category;
import com.luxemart.api.repository.CategoryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;

    public List<CategoryResponse> getAll() {
        return categoryRepository.findByActiveTrue().stream()
            .map(this::toResponse)
            .collect(Collectors.toList());
    }

    public CategoryResponse getBySlug(String slug) {
        Category category = categoryRepository.findBySlug(slug)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found: " + slug));
        return toResponse(category);
    }

    public Category getById(Long id) {
        return categoryRepository.findById(id)
            .orElseThrow(() -> new ResourceNotFoundException("Category not found"));
    }

    @Transactional
    public CategoryResponse create(CategoryRequest request) {
        Category category = Category.builder()
            .name(request.name())
            .slug(toSlug(request.name()))
            .description(request.description())
            .imageUrl(request.imageUrl())
            .active(request.active() == null || request.active())
            .build();
        if (request.parentId() != null) {
            category.setParent(getById(request.parentId()));
        }
        return toResponse(categoryRepository.save(category));
    }

    @Transactional
    public CategoryResponse update(Long id, CategoryRequest request) {
        Category category = getById(id);
        category.setName(request.name());
        category.setSlug(toSlug(request.name()));
        category.setDescription(request.description());
        category.setImageUrl(request.imageUrl());
        if (request.active() != null) category.setActive(request.active());
        if (request.parentId() != null) category.setParent(getById(request.parentId()));
        return toResponse(categoryRepository.save(category));
    }

    private CategoryResponse toResponse(Category category) {
        return new CategoryResponse(
            category.getId(),
            category.getName(),
            category.getSlug(),
            category.getDescription(),
            category.getImageUrl(),
            category.getParent() != null ? category.getParent().getId() : null,
            (long) category.getProducts().size(),
            category.getActive()
        );
    }

    private String toSlug(String name) {
        String base = name.toLowerCase().trim()
            .replaceAll("[^a-z0-9\\s-]", "")
            .replaceAll("\\s+", "-");
        String slug = base;
        int counter = 1;
        while (categoryRepository.findBySlug(slug).isPresent()) {
            slug = base + "-" + counter++;
        }
        return slug;
    }
}