package com.luxemart.api.security;

import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * The refresh token travels only in this cookie: HttpOnly so no script can read it, Path restricted
 * to /api/auth so it is not attached to the rest of the API, SameSite=Strict so a cross-site request
 * never carries it. The access token stays in the JSON body and in frontend memory.
 */
@Component
public class RefreshTokenCookie {

    public static final String NAME = "LUXEMART_REFRESH";

    private static final String PATH = "/api/auth";

    private final boolean secure;
    private final Duration maxAge;

    public RefreshTokenCookie(@Value("${app.security.refresh-cookie.secure}") boolean secure,
                              @Value("${jwt.refresh-expiration-ms}") long refreshExpirationMs) {
        this.secure = secure;
        this.maxAge = Duration.ofMillis(refreshExpirationMs);
    }

    public void write(HttpServletResponse response, String token) {
        response.addHeader(HttpHeaders.SET_COOKIE, build(token, maxAge).toString());
    }

    /** Expired and emptied: the browser drops the cookie on the spot. */
    public void clear(HttpServletResponse response) {
        response.addHeader(HttpHeaders.SET_COOKIE, build("", Duration.ZERO).toString());
    }

    public String read(HttpServletRequest request) {
        if (request.getCookies() == null) {
            return null;
        }
        for (Cookie cookie : request.getCookies()) {
            if (NAME.equals(cookie.getName())) {
                return cookie.getValue();
            }
        }
        return null;
    }

    private ResponseCookie build(String value, Duration lifetime) {
        return ResponseCookie.from(NAME, value)
            .httpOnly(true)
            .secure(secure)
            .sameSite("Strict")
            .path(PATH)
            .maxAge(lifetime)
            .build();
    }
}
