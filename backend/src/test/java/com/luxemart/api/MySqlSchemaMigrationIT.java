package com.luxemart.api;

import com.luxemart.api.repository.CategoryRepository;
import com.luxemart.api.repository.ProductRepository;
import com.luxemart.api.repository.UserRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * Runs the MySQL path that the H2 suite cannot cover: Flyway builds the schema from
 * {@code db/migration}, then Hibernate validates every entity mapping against it. A mismatch in a
 * column, type or table name fails context startup, which is the whole point of this test.
 *
 * <p>Skipped unless {@code MYSQL_IT=true}, so {@code mvn test} stays dependency-free locally.
 */
@SpringBootTest
@ActiveProfiles("mysqlit")
@EnabledIfEnvironmentVariable(named = "MYSQL_IT", matches = "true")
class MySqlSchemaMigrationIT {

    @Autowired private JdbcTemplate jdbc;
    @Autowired private UserRepository userRepository;
    @Autowired private CategoryRepository categoryRepository;
    @Autowired private ProductRepository productRepository;

    @Test
    void baselineMigrationIsAppliedAndHibernateAcceptsTheSchema() {
        List<String> applied = jdbc.queryForList(
            "SELECT version FROM flyway_schema_history WHERE version IS NOT NULL", String.class);
        assertThat(applied).containsExactly("1");

        assertThat(tableNames()).contains(
            "users", "roles", "user_roles", "addresses", "categories", "products",
            "product_variants", "product_images", "cart_items", "orders", "order_items",
            "reviews", "wishlist_items");
    }

    @Test
    void seededCatalogueLandsInRealMysqlTables() {
        assertThat(userRepository.count()).isGreaterThan(0);
        assertThat(categoryRepository.count()).isGreaterThan(0);
        assertThat(productRepository.count()).isGreaterThan(0);
        assertThat(jdbc.queryForObject("SELECT stock FROM product_variants LIMIT 1", Integer.class)).isNotNull();
    }

    private List<String> tableNames() {
        return jdbc.queryForList(
            "SELECT table_name FROM information_schema.tables WHERE table_schema = DATABASE()", String.class);
    }
}
