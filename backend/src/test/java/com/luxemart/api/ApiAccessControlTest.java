package com.luxemart.api;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * Authorization contract: what is public, what needs a token, what needs the admin role, and that
 * one customer can never reach another customer's order.
 */
class ApiAccessControlTest extends ApiTestSupport {

    @Test
    void catalogueIsPublic() throws Exception {
        mvc.perform(get("/api/products"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.content").isArray());

        mvc.perform(get("/api/categories"))
            .andExpect(status().isOk());

        mvc.perform(get("/api/config"))
            .andExpect(status().isOk());
    }

    @Test
    void cartRequiresAToken() throws Exception {
        mvc.perform(get("/api/cart"))
            .andExpect(status().isUnauthorized())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON));
    }

    @Test
    void customerIsRejectedFromAdminEndpoints() throws Exception {
        mvc.perform(get("/api/admin/analytics")
                .header("Authorization", "Bearer " + newCustomerToken()))
            .andExpect(status().isForbidden())
            .andExpect(jsonPath("$.status").value(403));
    }

    @Test
    void adminReachesAnalytics() throws Exception {
        String adminToken = token("admin@luxemart.com", "admin123");
        mvc.perform(get("/api/admin/analytics").header("Authorization", "Bearer " + adminToken))
            .andExpect(status().isOk());
    }

    @Test
    void anotherCustomerCannotReadMyOrder() throws Exception {
        String owner = newCustomerToken();
        JsonNode product = productBySlug("ribbed-merino-turtleneck");
        long productId = product.get("id").asLong();
        long variantId = product.get("variants").get(0).get("id").asLong();

        JsonNode order = read(mvc.perform(post("/api/orders/checkout")
                .header("Authorization", "Bearer " + owner)
                .contentType(MediaType.APPLICATION_JSON)
                .content(checkoutPayload(productId, variantId, 1)))
            .andExpect(status().isCreated())
            .andReturn());

        String orderId = order.get("id").asText();
        String intruder = token("demo@luxemart.com", "demo123");

        mvc.perform(get("/api/orders/" + orderId).header("Authorization", "Bearer " + intruder))
            .andExpect(status().isNotFound());

        mvc.perform(get("/api/orders/" + orderId).header("Authorization", "Bearer " + owner))
            .andExpect(status().isOk());
    }

    @Test
    void validationFailuresAreReportedPerField() throws Exception {
        mvc.perform(post("/api/auth/register")
                .contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"firstName":"Ann","lastName":"Lee","email":"ann.lee@example.com","password":"short"}
                    """))
            .andExpect(status().isBadRequest())
            .andExpect(content().contentTypeCompatibleWith(MediaType.APPLICATION_PROBLEM_JSON))
            .andExpect(jsonPath("$.errors.password").exists());
    }

    @Test
    void openApiDocumentIsServed() throws Exception {
        mvc.perform(get("/v3/api-docs"))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.info.title").value("LUXEMART API"));
    }
}
