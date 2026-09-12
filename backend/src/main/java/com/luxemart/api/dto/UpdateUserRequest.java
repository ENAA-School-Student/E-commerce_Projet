package com.luxemart.api.dto;

public record UpdateUserRequest(
    String firstName,
    String lastName,
    String phone,
    String avatarUrl,
    String currentPassword,
    String newPassword
) {}