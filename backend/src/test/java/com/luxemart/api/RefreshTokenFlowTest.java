package com.luxemart.api;

import com.luxemart.api.security.RefreshTokenCookie;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.test.web.servlet.ResultActions;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Session plumbing: the refresh token only ever travels as an HttpOnly cookie scoped to /api/auth, it
 * is rotated on every refresh, and the endpoint that reads that cookie demands the CSRF header. Logout
 * is the one cookie-backed call that skips CSRF, since it can only harm its own caller. The access
 * token is the only credential that appears in a response body.
 */
class RefreshTokenFlowTest extends ApiTestSupport {

    @Test
    void loginPutsTheRefreshTokenInAnHttpOnlyCookieAndNeverInTheBody() throws Exception {
        MvcResult login = loginAs("demo@luxemart.com", "demo123");

        assertThat(login.getResponse().getContentAsString()).doesNotContain("refreshToken");
        assertThat(setCookieOf(login))
            .contains("HttpOnly")
            .contains("SameSite=Strict")
            .contains("Path=/api/auth")
            .contains("Max-Age=604800");
    }

    @Test
    void refreshReturnsAnAccessTokenAndRotatesTheCookie() throws Exception {
        MvcResult login = loginAs("demo@luxemart.com", "demo123");
        MvcResult refreshed = refreshWithCookieOf(login).andExpect(status().isOk()).andReturn();

        // The rotated cookie is the one that proves a new refresh token was minted; two access tokens
        // signed in the same second are byte-identical by design, so they cannot show rotation.
        assertThat(setCookieOf(refreshed)).isNotEqualTo(setCookieOf(login));
        assertThat(setCookieOf(refreshed)).contains("HttpOnly").contains("Max-Age=604800");
    }

    @Test
    void theRefreshedAccessTokenOpensTheApi() throws Exception {
        MvcResult login = loginAs("demo@luxemart.com", "demo123");
        String accessToken = read(refreshWithCookieOf(login).andExpect(status().isOk()).andReturn())
            .get("token").asText();

        mvc.perform(get("/api/cart").header("Authorization", "Bearer " + accessToken))
            .andExpect(status().isOk());
    }

    @Test
    void aRefreshTokenIsNotAcceptedAsBearerToken() throws Exception {
        String refreshToken = refreshCookie(loginAs("demo@luxemart.com", "demo123")).getValue();

        mvc.perform(get("/api/cart").header("Authorization", "Bearer " + refreshToken))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void anAccessTokenCannotBeUsedToRefresh() throws Exception {
        String accessToken = read(loginAs("demo@luxemart.com", "demo123")).get("token").asText();

        refreshWith(accessToken).andExpect(status().isUnauthorized());
    }

    @Test
    void aForgedCookieValueIsRejected() throws Exception {
        refreshWith("not-a-signed-jwt").andExpect(status().isUnauthorized());
    }

    @Test
    void refreshingWithoutTheCookieIsUnauthorized() throws Exception {
        Csrf csrf = csrf();

        mvc.perform(post("/api/auth/refresh")
                .cookie(csrf.cookie())
                .header("X-XSRF-TOKEN", csrf.token()))
            .andExpect(status().isUnauthorized());
    }

    @Test
    void theCookieAloneIsNotEnoughWithoutTheCsrfHeader() throws Exception {
        mvc.perform(post("/api/auth/refresh")
                .cookie(refreshCookie(loginAs("demo@luxemart.com", "demo123"))))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void logoutClearsTheCookieWithoutAnyCsrfHandshake() throws Exception {
        MvcResult logout = mvc.perform(post("/api/auth/logout")
                .cookie(refreshCookie(loginAs("demo@luxemart.com", "demo123"))))
            .andExpect(status().isNoContent())
            .andReturn();

        assertThat(setCookieOf(logout)).contains(RefreshTokenCookie.NAME + "=").contains("Max-Age=0");
    }

    private MvcResult loginAs(String email, String password) throws Exception {
        return mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password)))
            .andExpect(status().isOk())
            .andReturn();
    }

    private ResultActions refreshWithCookieOf(MvcResult login) throws Exception {
        return refreshWith(refreshCookie(login).getValue());
    }

    private ResultActions refreshWith(String cookieValue) throws Exception {
        Csrf csrf = csrf();
        return mvc.perform(post("/api/auth/refresh")
            .cookie(csrf.cookie(), new Cookie(RefreshTokenCookie.NAME, cookieValue))
            .header("X-XSRF-TOKEN", csrf.token()));
    }

    /** Runs the same handshake the SPA does on boot: read the CSRF cookie, echo it in the header. */
    private Csrf csrf() throws Exception {
        MvcResult boot = mvc.perform(get("/api/auth/csrf"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.token").isNotEmpty())
            .andReturn();

        Cookie cookie = boot.getResponse().getCookie("XSRF-TOKEN");
        assertThat(cookie).as("XSRF-TOKEN cookie is written by /api/auth/csrf").isNotNull();
        assertThat(cookie.getValue()).isEqualTo(read(boot).get("token").asText());
        return new Csrf(cookie, cookie.getValue());
    }

    private Cookie refreshCookie(MvcResult result) {
        Cookie cookie = result.getResponse().getCookie(RefreshTokenCookie.NAME);
        assertThat(cookie).as("refresh cookie present on login").isNotNull();
        assertThat(cookie.getValue()).isNotEmpty();
        return cookie;
    }

    private String setCookieOf(MvcResult result) {
        String header = result.getResponse().getHeader(HttpHeaders.SET_COOKIE);
        assertThat(header).as("Set-Cookie header").isNotNull();
        return header;
    }

    private record Csrf(Cookie cookie, String token) {
    }
}
