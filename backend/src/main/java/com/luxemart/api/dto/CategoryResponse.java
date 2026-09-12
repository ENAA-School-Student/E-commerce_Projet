package com.luxemart.api.dto;

public record CategoryResponse(
    Long id,
    String name,
    String slug,
    String description,
    String imageUrl,
    Long parentId,
    Long productCount,
    Boolean active
) {}