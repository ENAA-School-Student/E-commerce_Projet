package com.luxemart.api.controller;

import com.luxemart.api.dto.AuthRequest;
import com.luxemart.api.dto.AuthResponse;
import com.luxemart.api.dto.RegisterRequest;
import com.luxemart.api.service.AuthService;
import com.luxemart.api.service.IssuedTokens;
import com.luxemart.api.security.RefreshTokenCookie;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private final RefreshTokenCookie refreshTokenCookie;
    private final CsrfTokenRepository csrfTokenRepository;

    @PostMapping("/register")
    public ResponseEntity<AuthResponse> register(@Valid @RequestBody RegisterRequest request,
                                                 HttpServletResponse response) {
        return ResponseEntity.status(HttpStatus.CREATED).body(issue(authService.register(request), response));
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody AuthRequest request,
                                              HttpServletResponse response) {
        return ResponseEntity.ok(issue(authService.login(request), response));
    }

    /**
     * Reads the HttpOnly refresh cookie and rotates it. The body never carries a refresh token, so the
     * only thing an XSS payload or a leaked response can obtain is a short-lived access token.
     */
    @PostMapping("/refresh")
    public ResponseEntity<AuthResponse> refresh(HttpServletRequest request, HttpServletResponse response) {
        return ResponseEntity.ok(issue(authService.refresh(refreshTokenCookie.read(request)), response));
    }

    @PostMapping("/logout")
    public ResponseEntity<Void> logout(HttpServletResponse response) {
        refreshTokenCookie.clear(response);
        return ResponseEntity.noContent().build();
    }

    /**
     * Hands out the CSRF token and materializes the JS-readable XSRF-TOKEN cookie, for the two endpoints
     * above that authenticate with an ambient cookie. Called once when the SPA boots.
     */
    @GetMapping("/csrf")
    public Map<String, String> csrf(HttpServletRequest request, HttpServletResponse response) {
        CsrfToken token = csrfTokenRepository.loadToken(request);
        if (token == null) {
            token = csrfTokenRepository.generateToken(request);
            csrfTokenRepository.saveToken(token, request, response);
        }
        return Map.of("token", token.getToken());
    }

    private AuthResponse issue(IssuedTokens tokens, HttpServletResponse response) {
        refreshTokenCookie.write(response, tokens.refreshToken());
        return AuthResponse.of(tokens.accessToken(), tokens.user());
    }
}
