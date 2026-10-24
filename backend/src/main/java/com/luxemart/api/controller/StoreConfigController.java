package com.luxemart.api.controller;

import com.luxemart.api.config.StoreProperties;
import com.luxemart.api.dto.StoreConfigResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/config")
@RequiredArgsConstructor
public class StoreConfigController {

    private final StoreProperties store;

    @GetMapping
    public StoreConfigResponse getConfig() {
        return new StoreConfigResponse(
            store.getFreeShippingThreshold(),
            store.getShippingCost(),
            store.getTaxRate(),
            store.getLowStockThreshold(),
            "USD"
        );
    }
}
