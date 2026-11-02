package com.luxemart.api.security;

import com.fasterxml.jackson.databind.ObjectMapper;
import io.github.bucket4j.Bandwidth;
import io.github.bucket4j.Bucket;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.servlet.HandlerInterceptor;

import java.io.IOException;
import java.time.Duration;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentMap;

/**
 * Throttles {@code POST /api/auth/login} per client IP to blunt credential stuffing.
 * Idle buckets are dropped once the tracked-IP set grows, so an attacker spraying source
 * addresses cannot make the map unbounded.
 */
@Component
public class LoginRateLimiter implements HandlerInterceptor {

    private static final int MAX_TRACKED_IPS = 10_000;

    private final ConcurrentMap<String, Tracked> buckets = new ConcurrentHashMap<>();
    private final ObjectMapper objectMapper;
    private final int capacity;
    private final long windowSeconds;

    public LoginRateLimiter(
        ObjectMapper objectMapper,
        @Value("${app.security.login-rate-limit.requests-per-window}") int capacity,
        @Value("${app.security.login-rate-limit.window-seconds}") long windowSeconds
    ) {
        this.objectMapper = objectMapper;
        this.capacity = capacity;
        this.windowSeconds = windowSeconds;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler)
        throws IOException {
        if (!"POST".equalsIgnoreCase(request.getMethod())) {
            return true;
        }

        String clientIp = request.getRemoteAddr();
        long now = System.nanoTime();
        if (buckets.size() > MAX_TRACKED_IPS) {
            long idleNanos = Duration.ofSeconds(windowSeconds).toNanos();
            buckets.entrySet().removeIf(entry -> now - entry.getValue().lastSeenNanos > idleNanos);
        }

        Bucket bucket = buckets.compute(clientIp, (key, existing) -> {
            Tracked current = existing != null ? existing : new Tracked(newBucket());
            current.lastSeenNanos = now;
            return current;
        }).bucket;
        if (bucket.tryConsume(1)) {
            return true;
        }

        long retryAfterSeconds = Math.max(1, Math.round((double) windowSeconds / capacity));
        response.setHeader("Retry-After", String.valueOf(retryAfterSeconds));
        ProblemResponses.write(objectMapper, response, HttpStatus.TOO_MANY_REQUESTS, "Too Many Requests",
            "Too many login attempts from this address. Try again in " + retryAfterSeconds + " seconds.");
        return false;
    }

    private Bucket newBucket() {
        Bandwidth limit = Bandwidth.builder()
            .capacity(capacity)
            .refillGreedy(capacity, Duration.ofSeconds(windowSeconds))
            .build();
        return Bucket.builder().addLimit(limit).build();
    }

    private static final class Tracked {
        private final Bucket bucket;
        private volatile long lastSeenNanos;

        private Tracked(Bucket bucket) {
            this.bucket = bucket;
        }
    }
}
