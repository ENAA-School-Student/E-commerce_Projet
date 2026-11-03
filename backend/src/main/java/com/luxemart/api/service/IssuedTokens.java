package com.luxemart.api.service;

import com.luxemart.api.dto.UserResponse;

/**
 * Both tokens minted for one authenticated user. Only {@code accessToken} is ever serialized into a
 * response body; {@code refreshToken} goes out as an HttpOnly cookie and is rotated on every refresh.
 */
public record IssuedTokens(String accessToken, String refreshToken, UserResponse user) {
}
