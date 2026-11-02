package com.luxemart.api.security;

import org.junit.jupiter.api.Test;
import org.springframework.core.io.ClassPathResource;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.IOException;
import java.nio.charset.StandardCharsets;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/** The default profile must refuse to boot without an externally supplied signing key. */
class JwtSecretGuardTest {

    @Test
    void refusesToStartWithoutASecret() {
        assertThatThrownBy(() -> serviceWithSecret("").validateSecret())
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("JWT_SECRET");
    }

    @Test
    void refusesSecretsShorterThan256Bits() {
        assertThatThrownBy(() -> serviceWithSecret("too-short-secret").validateSecret())
            .isInstanceOf(IllegalStateException.class)
            .hasMessageContaining("too short");
    }

    @Test
    void acceptsASecretOfAtLeast256Bits() {
        assertThatCode(() -> serviceWithSecret("x".repeat(32)).validateSecret())
            .doesNotThrowAnyException();
    }

    @Test
    void defaultProfileShipsNoFallbackSecret() throws IOException {
        String properties = new String(
            new ClassPathResource("application.properties").getInputStream().readAllBytes(),
            StandardCharsets.UTF_8);
        assertThat(properties).contains("jwt.secret=${JWT_SECRET:}");
    }

    private JwtService serviceWithSecret(String secret) {
        JwtService service = new JwtService();
        ReflectionTestUtils.setField(service, "secret", secret);
        return service;
    }
}
