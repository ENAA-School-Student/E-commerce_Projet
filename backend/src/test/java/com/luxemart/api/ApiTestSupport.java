package com.luxemart.api;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Shared plumbing for the API integration tests. Runs on the {@code dev} profile (H2 in memory,
 * seeded catalogue) and raises the login throttle so unrelated tests never trip it.
 */
@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("dev")
@TestPropertySource(properties = "app.security.login-rate-limit.requests-per-window=1000")
abstract class ApiTestSupport {

    @Autowired
    protected MockMvc mvc;

    @Autowired
    protected ObjectMapper json;

    protected String token(String email, String password) throws Exception {
        MvcResult result = mvc.perform(post("/api/auth/login")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"%s\",\"password\":\"%s\"}".formatted(email, password)))
            .andExpect(status().isOk())
            .andReturn();
        return read(result).get("token").asText();
    }

    /** Signs up a throwaway customer so tests never fight over the demo account's cart and orders. */
    protected String newCustomerToken() throws Exception {
        String email = "shopper." + UUID.randomUUID().toString().substring(0, 8) + "@example.com";
        MvcResult result = mvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"firstName":"Test","lastName":"Shopper","email":"%s","password":"secret123"}
                    """.formatted(email)))
            .andExpect(status().isCreated())
            .andReturn();
        return read(result).get("token").asText();
    }

    protected JsonNode read(MvcResult result) throws Exception {
        return json.readTree(result.getResponse().getContentAsString(StandardCharsets.UTF_8));
    }

    protected JsonNode getJson(String url, String bearerToken) throws Exception {
        var request = get(url).accept(MediaType.APPLICATION_JSON);
        if (bearerToken != null) {
            request = request.header("Authorization", "Bearer " + bearerToken);
        }
        return read(mvc.perform(request).andExpect(status().isOk()).andReturn());
    }

    protected JsonNode productBySlug(String slug) throws Exception {
        return getJson("/api/products/" + slug, null);
    }

    protected JsonNode variantById(JsonNode product, long variantId) {
        for (JsonNode variant : product.get("variants")) {
            if (variant.get("id").asLong() == variantId) {
                return variant;
            }
        }
        throw new IllegalStateException("Variant " + variantId + " missing from product " + product.get("slug").asText());
    }

    protected String checkoutPayload(long productId, long variantId, int quantity) {
        return """
            {
              "items":[{"productId":%d,"variantId":%d,"quantity":%d}],
              "shippingFirstName":"Camille","shippingLastName":"Dupont","shippingStreet":"12 rue Royale",
              "shippingCity":"Paris","shippingZipCode":"75008","shippingCountry":"France",
              "shippingPhone":"+33 6 12 34 56 78","paymentMethod":"CARD"
            }
            """.formatted(productId, variantId, quantity);
    }
}
