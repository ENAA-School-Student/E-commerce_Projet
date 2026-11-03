package com.luxemart.api.security;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.JwtBuilder;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import jakarta.annotation.PostConstruct;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;
import java.util.function.Function;

@Service
public class JwtService {

    private static final int MIN_SECRET_BYTES = 32; // HS256 requires a >= 256-bit key

    public static final String TOKEN_TYPE_CLAIM = "typ";
    public static final String ACCESS_TOKEN = "access";
    public static final String REFRESH_TOKEN = "refresh";

    @Value("${jwt.secret}")
    private String secret;

    @Value("${jwt.expiration-ms}")
    private long expirationMs;

    @Value("${jwt.refresh-expiration-ms}")
    private long refreshExpirationMs;

    @PostConstruct
    void validateSecret() {
        if (secret == null || secret.isBlank()) {
            throw new IllegalStateException(
                "jwt.secret is not set. Provide a JWT_SECRET environment variable (min "
                + MIN_SECRET_BYTES + " bytes).");
        }
        if (secret.getBytes(StandardCharsets.UTF_8).length < MIN_SECRET_BYTES) {
            throw new IllegalStateException(
                "jwt.secret is too short: HS256 requires at least " + MIN_SECRET_BYTES + " bytes.");
        }
    }

    public String extractUsername(String token) {
        return extractClaim(token, Claims::getSubject);
    }

    public String extractTokenType(String token) {
        return extractClaim(token, claims -> claims.get(TOKEN_TYPE_CLAIM, String.class));
    }

    public <T> T extractClaim(String token, Function<Claims, T> claimsResolver) {
        return claimsResolver.apply(extractAllClaims(token));
    }

    public String generateAccessToken(UserDetails userDetails, Long userId) {
        return buildToken(userDetails, userId, ACCESS_TOKEN, expirationMs, null);
    }

    /**
     * Carries a random id so two tokens issued in the same millisecond still differ, which keeps
     * rotation observable by the client and reuse detectable if a denylist is added later.
     */
    public String generateRefreshToken(UserDetails userDetails, Long userId) {
        return buildToken(userDetails, userId, REFRESH_TOKEN, refreshExpirationMs, UUID.randomUUID().toString());
    }

    public boolean isAccessToken(String token) {
        return ACCESS_TOKEN.equals(extractTokenType(token));
    }

    public boolean isTokenValid(String token, UserDetails userDetails) {
        return isAccessToken(token) && subjectMatches(token, userDetails);
    }

    public boolean isRefreshTokenValid(String token, UserDetails userDetails) {
        return REFRESH_TOKEN.equals(extractTokenType(token)) && subjectMatches(token, userDetails);
    }

    private boolean subjectMatches(String token, UserDetails userDetails) {
        return extractUsername(token).equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private String buildToken(UserDetails userDetails, Long userId, String tokenType, long timeToLiveMs, String tokenId) {
        Map<String, Object> claims = new HashMap<>();
        claims.put("uid", userId);
        claims.put(TOKEN_TYPE_CLAIM, tokenType);
        claims.put("roles", userDetails.getAuthorities().stream().map(a -> a.getAuthority()).toList());

        JwtBuilder builder = Jwts.builder()
            .claims(claims)
            .subject(userDetails.getUsername())
            .issuedAt(new Date())
            .expiration(new Date(System.currentTimeMillis() + timeToLiveMs))
            .signWith(getSignInKey());
        if (tokenId != null) {
            builder.id(tokenId);
        }
        return builder.compact();
    }

    private boolean isTokenExpired(String token) {
        return extractExpiration(token).before(new Date());
    }

    private Date extractExpiration(String token) {
        return extractClaim(token, Claims::getExpiration);
    }

    private Claims extractAllClaims(String token) {
        return Jwts.parser()
            .verifyWith(getSignInKey())
            .build()
            .parseSignedClaims(token)
            .getPayload();
    }

    private SecretKey getSignInKey() {
        return Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    }
}
