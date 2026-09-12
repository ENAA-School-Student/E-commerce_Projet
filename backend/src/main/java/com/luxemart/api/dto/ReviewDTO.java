package com.luxemart.api.dto;

import com.luxemart.api.model.Review;

import java.time.LocalDateTime;

public record ReviewDTO(
    Long id,
    Long productId,
    Long userId,
    String userFirstName,
    String userLastName,
    String userAvatar,
    Integer rating,
    String title,
    String comment,
    Boolean verified,
    LocalDateTime createdAt
) {
    public static ReviewDTO from(Review review) {
        return new ReviewDTO(
            review.getId(),
            review.getProduct().getId(),
            review.getUser().getId(),
            review.getUser().getFirstName(),
            review.getUser().getLastName(),
            review.getUser().getAvatarUrl(),
            review.getRating(),
            review.getTitle(),
            review.getComment(),
            review.getVerified(),
            review.getCreatedAt()
        );
    }
}