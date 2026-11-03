-- LUXEMART baseline schema.
-- Generated from the entities as Hibernate built them against MySQL 8.4, then ordered so every
-- referenced table exists before the foreign keys that point at it, and renamed for readability.
-- Tables appear in dependency order: roles/users before their dependants, products before variants,
-- orders before order items.

CREATE TABLE roles (
    id   BIGINT      NOT NULL AUTO_INCREMENT,
    name ENUM ('ROLE_ADMIN','ROLE_CUSTOMER') NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_roles_name UNIQUE (name)
) ENGINE = InnoDB;

CREATE TABLE users (
    id             BIGINT       NOT NULL AUTO_INCREMENT,
    first_name     VARCHAR(255) NOT NULL,
    last_name      VARCHAR(255) NOT NULL,
    email          VARCHAR(255) NOT NULL,
    password       VARCHAR(255) NOT NULL,
    phone          VARCHAR(255),
    avatar_url     VARCHAR(255),
    enabled        BIT(1)       NOT NULL,
    loyalty_points INT,
    created_at     DATETIME(6),
    updated_at     DATETIME(6),
    PRIMARY KEY (id),
    CONSTRAINT uk_users_email UNIQUE (email)
) ENGINE = InnoDB;

CREATE TABLE user_roles (
    user_id BIGINT NOT NULL,
    role_id BIGINT NOT NULL,
    PRIMARY KEY (user_id, role_id),
    CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles (id)
) ENGINE = InnoDB;

CREATE TABLE addresses (
    id         BIGINT       NOT NULL AUTO_INCREMENT,
    first_name VARCHAR(255) NOT NULL,
    last_name  VARCHAR(255) NOT NULL,
    phone      VARCHAR(255),
    street     VARCHAR(255) NOT NULL,
    apartment  VARCHAR(255),
    city       VARCHAR(255) NOT NULL,
    state      VARCHAR(255),
    zip_code   VARCHAR(255) NOT NULL,
    country    VARCHAR(255) NOT NULL,
    is_default BIT(1),
    created_at DATETIME(6),
    user_id    BIGINT       NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_addresses_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB;

CREATE TABLE categories (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    name        VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL,
    description VARCHAR(255),
    image_url   VARCHAR(255),
    active      BIT(1),
    parent_id   BIGINT,
    PRIMARY KEY (id),
    CONSTRAINT uk_categories_name UNIQUE (name),
    CONSTRAINT uk_categories_slug UNIQUE (slug),
    CONSTRAINT fk_categories_parent FOREIGN KEY (parent_id) REFERENCES categories (id)
) ENGINE = InnoDB;

CREATE TABLE products (
    id               BIGINT       NOT NULL AUTO_INCREMENT,
    name             VARCHAR(255) NOT NULL,
    slug             VARCHAR(255) NOT NULL,
    description      TEXT,
    price            DECIMAL(10, 2) NOT NULL,
    compare_at_price DECIMAL(10, 2),
    brand            VARCHAR(255),
    collection       VARCHAR(255),
    badge            VARCHAR(255),
    featured         BIT(1),
    active           BIT(1),
    created_at       DATETIME(6),
    updated_at       DATETIME(6),
    category_id      BIGINT,
    PRIMARY KEY (id),
    CONSTRAINT uk_products_slug UNIQUE (slug),
    CONSTRAINT fk_products_category FOREIGN KEY (category_id) REFERENCES categories (id)
) ENGINE = InnoDB;

CREATE TABLE product_variants (
    id         BIGINT   NOT NULL AUTO_INCREMENT,
    size       VARCHAR(255),
    color      VARCHAR(255),
    color_hex  VARCHAR(255),
    sku        VARCHAR(255),
    stock      INT      NOT NULL,
    active     BIT(1),
    version    BIGINT   NOT NULL,
    product_id BIGINT   NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_product_variants_product FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE = InnoDB;

CREATE TABLE product_images (
    id          BIGINT       NOT NULL AUTO_INCREMENT,
    image_url   VARCHAR(255) NOT NULL,
    alt_text    VARCHAR(255),
    is_primary  BIT(1),
    sort_order  INT,
    product_id  BIGINT       NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_product_images_product FOREIGN KEY (product_id) REFERENCES products (id)
) ENGINE = InnoDB;

CREATE TABLE cart_items (
    id         BIGINT     NOT NULL AUTO_INCREMENT,
    quantity   INT        NOT NULL,
    created_at DATETIME(6),
    user_id    BIGINT     NOT NULL,
    product_id BIGINT     NOT NULL,
    variant_id BIGINT,
    PRIMARY KEY (id),
    CONSTRAINT fk_cart_items_user FOREIGN KEY (user_id) REFERENCES users (id),
    CONSTRAINT fk_cart_items_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT fk_cart_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants (id)
) ENGINE = InnoDB;

CREATE TABLE orders (
    id                  BIGINT       NOT NULL AUTO_INCREMENT,
    order_number        VARCHAR(255) NOT NULL,
    status              ENUM ('PENDING','PROCESSING','SHIPPED','DELIVERED','CANCELLED') NOT NULL,
    payment_status      ENUM ('PENDING','AUTHORIZED','CAPTURED','FAILED','REFUNDED'),
    payment_method      VARCHAR(255),
    promo_code          VARCHAR(255),
    tracking_number     VARCHAR(255),
    subtotal            DECIMAL(10, 2) NOT NULL,
    shipping_cost       DECIMAL(10, 2) NOT NULL,
    tax                 DECIMAL(10, 2) NOT NULL,
    discount            DECIMAL(10, 2),
    total               DECIMAL(10, 2) NOT NULL,
    shipping_first_name VARCHAR(255),
    shipping_last_name  VARCHAR(255),
    shipping_phone      VARCHAR(255),
    shipping_street     VARCHAR(255),
    shipping_apartment  VARCHAR(255),
    shipping_city       VARCHAR(255),
    shipping_state      VARCHAR(255),
    shipping_zip_code   VARCHAR(255),
    shipping_country    VARCHAR(255),
    created_at          DATETIME(6),
    updated_at          DATETIME(6),
    shipped_at          DATETIME(6),
    delivered_at        DATETIME(6),
    user_id             BIGINT       NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_orders_number UNIQUE (order_number),
    CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB;

CREATE TABLE order_items (
    id            BIGINT       NOT NULL AUTO_INCREMENT,
    product_name  VARCHAR(255) NOT NULL,
    product_image VARCHAR(255),
    size          VARCHAR(255),
    color         VARCHAR(255),
    quantity      INT          NOT NULL,
    unit_price    DECIMAL(10, 2) NOT NULL,
    total_price   DECIMAL(10, 2) NOT NULL,
    order_id      BIGINT       NOT NULL,
    product_id    BIGINT       NOT NULL,
    variant_id    BIGINT,
    PRIMARY KEY (id),
    CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders (id),
    CONSTRAINT fk_order_items_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT fk_order_items_variant FOREIGN KEY (variant_id) REFERENCES product_variants (id)
) ENGINE = InnoDB;

CREATE TABLE reviews (
    id         BIGINT   NOT NULL AUTO_INCREMENT,
    rating     INT      NOT NULL,
    title      VARCHAR(255),
    comment    TEXT,
    verified   BIT(1),
    created_at DATETIME(6),
    product_id BIGINT   NOT NULL,
    user_id    BIGINT   NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_reviews_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT fk_reviews_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB;

CREATE TABLE wishlist_items (
    id         BIGINT     NOT NULL AUTO_INCREMENT,
    created_at DATETIME(6),
    product_id BIGINT     NOT NULL,
    user_id    BIGINT     NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_wishlist_items_product FOREIGN KEY (product_id) REFERENCES products (id),
    CONSTRAINT fk_wishlist_items_user FOREIGN KEY (user_id) REFERENCES users (id)
) ENGINE = InnoDB;
