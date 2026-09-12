package com.luxemart.api.dto;

import com.luxemart.api.model.User;

import java.time.LocalDateTime;
import java.util.Set;

public record UserResponse(
    Long id,
    String firstName,
    String lastName,
    String email,
    String phone,
    String avatarUrl,
    Boolean enabled,
    Set<String> roles,
    LocalDateTime createdAt
) {
    public static UserResponse from(User user) {
        return new UserResponse(
            user.getId(),
            user.getFirstName(),
            user.getLastName(),
            user.getEmail(),
            user.getPhone(),
            user.getAvatarUrl(),
            user.getEnabled(),
            user.getRoles().stream().map(r -> r.getName().name()).collect(java.util.stream.Collectors.toSet()),
            user.getCreatedAt()
        );
    }
}