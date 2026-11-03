package com.luxemart.api.exception;

/** Missing, expired, forged or already-rotated refresh token. Reported as 401, never as 500. */
public class InvalidRefreshTokenException extends RuntimeException {

    public InvalidRefreshTokenException() {
        super("Invalid refresh token");
    }
}
