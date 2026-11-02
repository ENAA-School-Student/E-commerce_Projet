package com.luxemart.api;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;

import java.math.BigDecimal;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/** Checkout pricing rules, stock reservation and the cart lifecycle. */
class CheckoutTest extends ApiTestSupport {

    private static final String MERINO = "ribbed-merino-turtleneck";

    @Test
    void checkoutReservesStockAndAppliesShippingAndTax() throws Exception {
        String customer = newCustomerToken();
        JsonNode product = productBySlug(MERINO);
        long productId = product.get("id").asLong();
        JsonNode variant = product.get("variants").get(0);
        long variantId = variant.get("id").asLong();
        int stockBefore = variant.get("stock").asInt();

        JsonNode order = checkout(customer, productId, variantId, 1);

        // Merino turtleneck is 98.00: under the 150.00 free-shipping threshold, 20 % tax.
        assertMoney(order.get("subtotal"), "98.00");
        assertMoney(order.get("shippingCost"), "9.90");
        assertMoney(order.get("tax"), "19.60");
        assertMoney(order.get("total"), "127.50");
        assertThat(order.get("status").asText()).isEqualTo("PENDING");
        assertThat(order.get("orderNumber").asText()).startsWith("LX-");

        JsonNode after = variantById(productBySlug(MERINO), variantId);
        assertThat(after.get("stock").asInt()).isEqualTo(stockBefore - 1);
    }

    @Test
    void ordersAtOrAboveTheThresholdShipFree() throws Exception {
        String customer = newCustomerToken();
        JsonNode product = productBySlug(MERINO);
        long productId = product.get("id").asLong();
        long variantId = product.get("variants").get(0).get("id").asLong();

        JsonNode order = checkout(customer, productId, variantId, 2);

        assertMoney(order.get("subtotal"), "196.00");
        assertMoney(order.get("shippingCost"), "0");
        assertMoney(order.get("total"), "235.20");
    }

    @Test
    void oversellingIsRefusedAndReservesNothing() throws Exception {
        String customer = newCustomerToken();
        JsonNode product = productBySlug(MERINO);
        long productId = product.get("id").asLong();
        JsonNode variant = product.get("variants").get(0);
        long variantId = variant.get("id").asLong();
        int stockBefore = variant.get("stock").asInt();

        mvc.perform(post("/api/orders/checkout")
                .header("Authorization", "Bearer " + customer)
                .contentType(MediaType.APPLICATION_JSON)
                .content(checkoutPayload(productId, variantId, stockBefore + 100)))
            .andExpect(status().isBadRequest());

        assertThat(variantById(productBySlug(MERINO), variantId).get("stock").asInt()).isEqualTo(stockBefore);
    }

    @Test
    void cartRoundTripAddsUpdatesAndClears() throws Exception {
        String customer = newCustomerToken();
        JsonNode product = productBySlug(MERINO);
        long productId = product.get("id").asLong();
        long variantId = product.get("variants").get(0).get("id").asLong();

        mvc.perform(post("/api/cart/items")
                .header("Authorization", "Bearer " + customer)
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"productId\":%d,\"variantId\":%d,\"quantity\":1}".formatted(productId, variantId)))
            .andExpect(status().isOk());

        JsonNode cart = read(mvc.perform(get("/api/cart")
                .header("Authorization", "Bearer " + customer))
            .andExpect(status().isOk())
            .andReturn());
        assertThat(cart.get("items")).hasSize(1);
        long cartItemId = cart.get("items").get(0).get("id").asLong();

        mvc.perform(put("/api/cart/items/" + cartItemId + "?quantity=3")
                .header("Authorization", "Bearer " + customer))
            .andExpect(status().isOk());
        assertThat(read(mvc.perform(get("/api/cart").header("Authorization", "Bearer " + customer))
            .andExpect(status().isOk()).andReturn()).get("items").get(0).get("quantity").asInt()).isEqualTo(3);

        mvc.perform(delete("/api/cart").header("Authorization", "Bearer " + customer))
            .andExpect(status().isNoContent());
        mvc.perform(get("/api/cart").header("Authorization", "Bearer " + customer))
            .andExpect(status().isOk())
            .andExpect(jsonPath("$.itemCount").value(0));
    }

    private JsonNode checkout(String token, long productId, long variantId, int quantity) throws Exception {
        return read(mvc.perform(post("/api/orders/checkout")
                .header("Authorization", "Bearer " + token)
                .contentType(MediaType.APPLICATION_JSON)
                .content(checkoutPayload(productId, variantId, quantity)))
            .andExpect(status().isCreated())
            .andReturn());
    }

    private void assertMoney(JsonNode node, String expected) {
        assertThat(new BigDecimal(node.asText())).isEqualByComparingTo(expected);
    }
}
