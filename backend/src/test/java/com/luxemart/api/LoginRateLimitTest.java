package com.luxemart.api;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import static org.hamcrest.Matchers.notNullValue;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Standalone context: it needs a throttle far tighter than the one the other API tests share. */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@TestPropertySource(properties = "app.security.login-rate-limit.requests-per-window=2")
class LoginRateLimitTest {

    @Autowired private MockMvc mvc;

    @Test
    void tooManyLoginAttemptsFromOneIpAreRefusedWith429() throws Exception {
        String payload = "{\"email\":\"nobody@example.com\",\"password\":\"wrong-password\"}";

        for (int attempt = 0; attempt < 2; attempt++) {
            mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(payload))
                .andExpect(status().isUnauthorized());
        }

        mvc.perform(post("/api/auth/login").contentType(MediaType.APPLICATION_JSON).content(payload))
            .andExpect(status().isTooManyRequests())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
            .andExpect(header().string("Retry-After", notNullValue()))
            .andExpect(jsonPath("$.status").value(429));
    }

    @Test
    void registrationIsNotThrottledByTheLoginBucket() throws Exception {
        String payload = """
            {"firstName":"Free","lastName":"Quota","email":"free.quota@example.com","password":"secret123"}
            """;
        mvc.perform(post("/api/auth/register").contentType(MediaType.APPLICATION_JSON).content(payload))
            .andExpect(status().isCreated())
            .andExpect(jsonPath("$.token").isNotEmpty());
    }
}
