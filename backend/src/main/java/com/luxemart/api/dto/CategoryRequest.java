package com.luxemart.api.dto;

import jakarta.validation.constraints.NotBlank;

public record CategoryRequest(
    @NotBlank String name,
    String description,
    String imageUrl,
    Long parentId,
    Boolean active
) {}