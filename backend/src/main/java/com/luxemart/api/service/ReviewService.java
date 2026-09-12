package com.luxemart.api.service;

import com.luxemart.api.dto.ReviewDTO;
import com.luxemart.api.dto.ReviewRequest;
import com.luxemart.api.exception.BadRequestException;
import com.luxemart.api.exception.ResourceNotFoundException;
import com.luxemart.api.model.Review;
import com.luxemart.api.model.User;
import com.luxemart.api.repository.ReviewRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class ReviewService {

    private final ReviewRepository reviewRepository;
    private final ProductService productService;
    private final UserService userService;

    public List<ReviewDTO> getProductReviews(Long productId) {
        return reviewRepository.findByProductIdOrderByCreatedAtDesc(productId).stream()
            .map(ReviewDTO::from)
            .collect(Collectors.toList());
    }

    @Transactional
    public ReviewDTO addReview(Long userId, Long productId, ReviewRequest request) {
        User user = userService.getUserById(userId);
        productService.getProductById(productId);

        if (reviewRepository.existsByUserIdAndProductId(userId, productId)) {
            throw new BadRequestException("You have already reviewed this product");
        }

        Review review = Review.builder()
            .user(user)
            .product(productService.getProductById(productId))
            .rating(request.rating())
            .title(request.title())
            .comment(request.comment())
            .verified(false)
            .build();

        return ReviewDTO.from(reviewRepository.save(review));
    }

    @Transactional
    public ReviewDTO updateReview(Long userId, Long reviewId, ReviewRequest request) {
        Review review = getReviewForUser(userId, reviewId);
        review.setRating(request.rating());
        review.setTitle(request.title());
        review.setComment(request.comment());
        return ReviewDTO.from(reviewRepository.save(review));
    }

    @Transactional
    public void deleteReview(Long userId, Long reviewId) {
        Review review = getReviewForUser(userId, reviewId);
        reviewRepository.delete(review);
    }

    private Review getReviewForUser(Long userId, Long reviewId) {
        return reviewRepository.findById(reviewId)
            .filter(r -> r.getUser().getId().equals(userId))
            .orElseThrow(() -> new ResourceNotFoundException("Review not found"));
    }
}