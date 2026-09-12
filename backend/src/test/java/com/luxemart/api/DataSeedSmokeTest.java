package com.luxemart.api;

import com.luxemart.api.repository.CategoryRepository;
import com.luxemart.api.repository.ProductRepository;
import com.luxemart.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest
@ActiveProfiles("dev")
class DataSeedSmokeTest {

    @Autowired private UserRepository userRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private ProductRepository productRepository;

    @Test
    void seedDataExists() {
        assertTrue(userRepository.count() > 0, "users should be seeded");
        assertTrue(categoryRepository.count() > 0, "categories should be seeded");
        assertTrue(productRepository.count() > 0, "products should be seeded");
    }
}