package com.luxemart.api.service;

import com.luxemart.api.dto.CheckoutRequest;
import com.luxemart.api.dto.OrderResponse;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.orm.ObjectOptimisticLockingFailureException;
import org.springframework.stereotype.Service;

/**
 * Replays checkout when concurrent buyers collide on a variant's stock row. Each attempt gets a
 * fresh transaction, so a lost race reserves nothing and simply reads the stock again.
 */
@Service
@RequiredArgsConstructor
public class CheckoutService {

    private static final Logger log = LoggerFactory.getLogger(CheckoutService.class);
    private static final int MAX_ATTEMPTS = 3;

    private final OrderService orderService;

    public OrderResponse submit(Long userId, CheckoutRequest request) {
        for (int attempt = 1; ; attempt++) {
            try {
                return orderService.createOrder(userId, request);
            } catch (ObjectOptimisticLockingFailureException ex) {
                if (attempt == MAX_ATTEMPTS) {
                    throw ex;
                }
                log.warn("Stock contention on checkout for user {}, attempt {}", userId, attempt);
                sleepBeforeRetry(attempt);
            }
        }
    }

    private void sleepBeforeRetry(int attempt) {
        try {
            Thread.sleep(25L * attempt);
        } catch (InterruptedException ex) {
            Thread.currentThread().interrupt();
            throw new IllegalStateException("Interrupted while retrying checkout", ex);
        }
    }
}
