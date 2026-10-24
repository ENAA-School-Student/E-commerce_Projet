package com.luxemart.api.config;

import com.luxemart.api.model.*;
import com.luxemart.api.repository.*;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.Map;
import java.util.Set;

@Component
@RequiredArgsConstructor
public class DataInitializer implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataInitializer.class);

    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final CategoryRepository categoryRepository;
    private final ProductRepository productRepository;
    private final ReviewRepository reviewRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public void run(String... args) {
        seedRoles();
        seedUsers();
        seedCategories();
        seedProducts();
        assignBadges();
        log.info("LUXEMART data initialization completed");
    }

    private void seedRoles() {
        if (roleRepository.count() > 0) {
            log.info("Roles already present, skipping role seed");
            return;
        }
        roleRepository.save(Role.builder().name(Role.RoleName.ROLE_ADMIN).build());
        roleRepository.save(Role.builder().name(Role.RoleName.ROLE_CUSTOMER).build());
        log.info("Seeded roles");
    }

    private void seedUsers() {
        Role adminRole = roleRepository.findByName(Role.RoleName.ROLE_ADMIN).orElseThrow();
        Role customerRole = roleRepository.findByName(Role.RoleName.ROLE_CUSTOMER).orElseThrow();

        if (!userRepository.existsByEmail("admin@luxemart.com")) {
            userRepository.save(User.builder()
                .firstName("Alex")
                .lastName("Morgan")
                .email("admin@luxemart.com")
                .password(passwordEncoder.encode("admin123"))
                .enabled(true)
                .roles(Set.of(adminRole))
                .build());
        }

        if (!userRepository.existsByEmail("demo@luxemart.com")) {
            userRepository.save(User.builder()
                .firstName("Camille")
                .lastName("Dupont")
                .email("demo@luxemart.com")
                .password(passwordEncoder.encode("demo123"))
                .phone("+33 6 12 34 56 78")
                .loyaltyPoints(1450)
                .enabled(true)
                .roles(Set.of(customerRole))
                .build());
        }
    }

    private void seedCategories() {
        Category women = saveCategory("Women", "women", "Elevated wardrobe essentials for her.", "https://images.unsplash.com/photo-1445205170230-053b83016050?q=80&w=1400&auto=format&fit=crop", null);
        Category men = saveCategory("Men", "men", "Refined staples for him.", "https://images.unsplash.com/photo-1490481651871-ab68de25d43d?q=80&w=1400&auto=format&fit=crop", null);
        Category accessories = saveCategory("Accessories", "accessories", "The finishing touches.", "https://images.unsplash.com/photo-1523170335258-f5ed11844a49?q=80&w=1400&auto=format&fit=crop", null);
        Category shoes = saveCategory("Shoes", "shoes", "Step forward in comfort.", "https://images.unsplash.com/photo-1560343090-f0409e92791a?q=80&w=1400&auto=format&fit=crop", null);
        Category home = saveCategory("Home", "home", "Objects for a considered home.", "https://images.unsplash.com/photo-1555041469-a586c61ea9bc?q=80&w=1400&auto=format&fit=crop", null);

        saveCategory("Outerwear", "outerwear", null, null, women);
        saveCategory("Knitwear", "knitwear", null, null, women);
        saveCategory("Tailoring", "tailoring", null, null, men);
        saveCategory("Bags", "bags", null, null, accessories);
        saveCategory("Footwear", "footwear", null, null, shoes);
    }

    private Category saveCategory(String name, String slug, String description, String imageUrl, Category parent) {
        return categoryRepository.findBySlug(slug).orElseGet(() -> categoryRepository.save(Category.builder()
            .name(name)
            .slug(slug)
            .description(description)
            .imageUrl(imageUrl)
            .parent(parent)
            .active(true)
            .build()));
    }

    private void seedProducts() {
        if (productRepository.count() > 0) {
            log.info("Products already present, skipping product seed");
            return;
        }

        Category women = categoryRepository.findBySlug("women").orElseThrow();
        Category knitwear = categoryRepository.findBySlug("knitwear").orElseThrow();
        Category outerwear = categoryRepository.findBySlug("outerwear").orElseThrow();
        Category men = categoryRepository.findBySlug("men").orElseThrow();
        Category accessories = categoryRepository.findBySlug("accessories").orElseThrow();
        Category bags = categoryRepository.findBySlug("bags").orElseThrow();
        Category home = categoryRepository.findBySlug("home").orElseThrow();

        createProduct(
            "Oversized Wool Blend Coat", "A sculptural coat in a warm camel tone, cut to drape loosely over knitwear.",
            new BigDecimal("289.00"), new BigDecimal("340.00"), outerwear, "LUXEMART", "FW Collection", true,
            "https://images.unsplash.com/photo-1539533018447-63fcce2678e3?q=80&w=1200&auto=format&fit=crop",
            new String[][]{{"S", "Camel", "#C19A6B", "12"}, {"M", "Camel", "#C19A6B", "10"}, {"L", "Camel", "#C19A6B", "8"}}
        );

        createProduct(
            "Ribbed Merino Turtleneck", "A fine-gauge merino turtleneck with a soft, body-skimming silhouette.",
            new BigDecimal("98.00"), null, knitwear, "LUXEMART", "FW Collection", true,
            "https://images.unsplash.com/photo-1434389677669-e08b4cac3105?q=80&w=1200&auto=format&fit=crop",
            new String[][]{{"S", "Ecru", "#EAE3D2", "20"}, {"M", "Ecru", "#EAE3D2", "18"}, {"L", "Ecru", "#EAE3D2", "14"}}
        );

        createProduct(
            "Wide Leg Linen Trouser", "A high-rise trouser in washed linen with a relaxed, fluid leg.",
            new BigDecimal("129.00"), new BigDecimal("150.00"), women, "LUXEMART", "SS Edit", true,
            "https://images.unsplash.com/photo-1506629082955-511b1aa562c8?q=80&w=1200&auto=format&fit=crop",
            new String[][]{{"S", "Off White", "#F3EFE6", "15"}, {"M", "Off White", "#F3EFE6", "12"}}
        );

        createProduct(
            "Structured Leather Tote", "A clean-lined leather tote with a removable inner pouch.",
            new BigDecimal("198.00"), null, bags, "LUXEMART", "Accessories", true,
            "https://images.unsplash.com/photo-1548036328-c9fa89d128fa?q=80&w=1200&auto=format&fit=crop",
            new String[][]{{"One Size", "Tan", "#B77B52", "9"}}
        );

        createProduct(
            "Minimal Ceramic Vase", "A hand-glazed ceramic vase with a matte stone finish.",
            new BigDecimal("54.00"), new BigDecimal("65.00"), home, "LUXEMART", "Home Objects", true,
            "https://images.unsplash.com/photo-1578500494198-246f612d3b3d?q=80&w=1200&auto=format&fit=crop",
            new String[][]{{"One Size", "Stone", "#D6D3CB", "25"}}
        );

        createProduct(
            "Quad-Buckle Chelsea Boot", "A polished chelsea boot on a stacked-leather heel.",
            new BigDecimal("178.00"), null, men, "LUXEMART", "FW Collection", true,
            "https://images.unsplash.com/photo-1520639888713-7851133b1ed0?q=80&w=1200&auto=format&fit=crop",
            new String[][]{{"40", "Black", "#2B2B2B", "7"}, {"41", "Black", "#2B2B2B", "6"}, {"42", "Black", "#2B2B2B", "8"}, {"43", "Black", "#2B2B2B", "5"}}
        );

        createProduct(
            "Wool Straight Cut Overcoat (Men)", "A single-breasted overcoat in dense virgin wool.",
            new BigDecimal("299.00"), null, men, "LUXEMART", "FW Collection", true,
            "https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=1200&auto=format&fit=crop",
            new String[][]{{"S", "Charcoal", "#3C4048", "10"}, {"M", "Charcoal", "#3C4048", "12"}, {"L", "Charcoal", "#3C4048", "9"}}
        );

        createProduct(
            "Silk Twill Scarf", "A riverbearing graphic silk twill scarf, hand-rolled edges.",
            new BigDecimal("45.00"), new BigDecimal("60.00"), accessories, "LUXEMART", "Accessories", true,
            "https://images.unsplash.com/photo-1601924994987-69e26d50dc26?q=80&w=1200&auto=format&fit=crop",
            new String[][]{{"One Size", "Ivory", "#F6F1E7", "30"}}
        );

        createProduct(
            "Satin Column Skirt", "A bias-cut satin skirt that skims the knees.",
            new BigDecimal("89.00"), null, women, "LUXEMART", "SS Edit", true,
            "https://images.unsplash.com/photo-1566174053879-31528523f8ae?q=80&w=1200&auto=format&fit=crop",
            new String[][]{{"S", "Champagne", "#E8D5B7", "10"}, {"M", "Champagne", "#E8D5B7", "8"}}
        );

        createProduct(
            "Hoops & Chain Necklace", "A brushed-gold set of linked hoops and a pendant chain.",
            new BigDecimal("34.00"), null, accessories, "LUXEMART", "Accessories", false,
            "https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1200&auto=format&fit=crop",
            new String[][]{{"One Size", "Gold", "#D4AF37", "15"}}
        );

        createProduct(
            "Linen Blend Shirt (Men)", "A relaxed linen-cotton shirt, garment-washed for softness.",
            new BigDecimal("76.00"), new BigDecimal("90.00"), men, "LUXEMART", "SS Edit", true,
            "https://images.unsplash.com/photo-1598033129183-c4f50c736f10?q=80&w=1200&auto=format&fit=crop",
            new String[][]{{"S", "Ivory", "#F4EEE4", "12"}, {"M", "Ivory", "#F4EEE4", "10"}, {"L", "Ivory", "#F4EEE4", "8"}}
        );

        createProduct(
            "Alpaca Throw Blanket", "A cloud-soft alpaca throw, loom-woven in small batches.",
            new BigDecimal("139.00"), null, home, "LUXEMART", "Home Objects", true,
            "https://i.pinimg.com/originals/19/1d/6f/191d6f8b8696d666a28324b90c944d16.jpg",
            new String[][]{{"One Size", "Oat", "#E7DFCE", "20"}}
        );
    }

    private void assignBadges() {
        Map<String, String> badges = Map.of(
            "Oversized Wool Blend Coat", "Bestseller",
            "Ribbed Merino Turtleneck", "New",
            "Structured Leather Tote", "Limited",
            "Quad-Buckle Chelsea Boot", "Bestseller",
            "Silk Twill Scarf", "Sustainable"
        );
        for (Product product : productRepository.findAll()) {
            String badge = badges.get(product.getName());
            if (badge != null && product.getBadge() == null) {
                product.setBadge(badge);
                productRepository.save(product);
            }
        }
    }

    private void createProduct(String name, String description, BigDecimal price, BigDecimal compareAt,
                               Category category, String brand, String collection, boolean featured,
                               String imageUrl, String[][] variants) {
        Product product = productRepository.save(Product.builder()
            .name(name)
            .slug(slugify(name))
            .description(description)
            .price(price)
            .compareAtPrice(compareAt)
            .category(category)
            .brand(brand)
            .collection(collection)
            .featured(featured)
            .active(true)
            .build());

        int sort = 0;
        for (String[] v : variants) {
            ProductVariant variant = ProductVariant.builder()
                .product(product)
                .size(v[0])
                .color(v[1])
                .colorHex(v[2])
                .stock(Integer.parseInt(v[3]))
                .sku(name.replaceAll("[^A-Za-z0-9]", "").toUpperCase().substring(0, Math.min(8, name.length()))
                    + "-" + v[0].toUpperCase().replaceAll(" ", ""))
                .active(true)
                .build();
            product.getVariants().add(variant);
        }

        int imageSort = 0;
        product.getImages().add(ProductImage.builder()
            .product(product)
            .imageUrl(imageUrl)
            .altText(name)
            .isPrimary(true)
            .sortOrder(imageSort++)
            .build());
        product.getImages().add(ProductImage.builder()
            .product(product)
            .imageUrl(imageUrl + (imageUrl.contains("?") ? "&" : "?") + "t=" + System.currentTimeMillis())
            .altText(name + " detail")
            .isPrimary(false)
            .sortOrder(imageSort)
            .build());

        productRepository.save(product);
    }

    private String slugify(String text) {
        return text.toLowerCase().trim().replaceAll("[^a-z0-9\\s-]", "").replaceAll("\\s+", "-");
    }
}