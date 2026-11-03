# LUXEMART — Plateforme e-commerce

Application e-commerce complète : front React/Vite + back Spring Boot REST, avec authentification JWT, catalogue, panier, commande (checkout), wishlist, avis clients et back-office administrateur.

## Stack

| Couche | Technologies |
| --- | --- |
| Frontend | React 18, TypeScript 5, Vite 6, Tailwind CSS 3, React Router 6, Axios, lucide-react, react-hot-toast |
| Backend | Java 17, Spring Boot 3.3.3, Spring Web, Spring Data JPA / Hibernate, Spring Security, JWT (jjwt 0.12.6), Bean Validation, Lombok |
| Observabilité / API | springdoc-openapi 2.6 (Swagger UI), Actuator (sonde de santé), Bucket4j (anti-brute-force) |
| Base de données | MySQL 8 (profil par défaut) ou H2 en mémoire (profil `dev`), schéma versionné par Flyway 10 |
| Conteneurs | Docker multi-stage, docker-compose (mysql + api + web derrière nginx) |
| Build / CI | Maven, npm, GitHub Actions (`.github/workflows/ci.yml`) |

## Arborescence

```
E-commerce_Projet/
├── .github/workflows/ci.yml      # CI : tests backend, build frontend, validation compose
├── docker-compose.yml            # mysql + api + web (nginx) avec healthchecks
├── .env.example                  # variables requises par compose
├── backend/                      # API Spring Boot (com.luxemart.api)
│   ├── Dockerfile
│   ├── pom.xml
│   └── src/
│       ├── main/java/com/luxemart/api/
│       │   ├── config/           # DataInitializer (seed), StoreProperties, WebMvcConfig, OpenApiConfig
│       │   ├── controller/       # 10 contrôleurs REST (/api/**)
│       │   ├── dto/              # Objets d'échange requête/réponse
│       │   ├── exception/        # GlobalExceptionHandler (RFC 7807) + exceptions métier
│       │   ├── model/            # 11 entités JPA
│       │   ├── repository/       # Spring Data JPA
│       │   ├── security/         # JWT, SecurityConfig, LoginRateLimiter, ProblemResponses
│       │   └── service/          # Logique métier (dont CheckoutService : retry sur contention)
│       ├── main/resources/       # application.properties, application-dev.properties, db/migration/
│       └── test/java/com/luxemart/api/   # tests d'accès, checkout, rate limiting, secret JWT, migration MySQL
└── frontend/                     # SPA React
    ├── Dockerfile, nginx.conf
    └── src/
        ├── components/           # Layout, ProductCard, SmartImage, Primitives…
        ├── context/              # AuthContext, CartContext, WishlistContext
        ├── hooks/                # useStoreConfig, useRecentlyViewed
        ├── lib/                  # api.ts (Axios + interceptors), csv.ts, format.ts
        └── pages/                # 10 pages (storefront + admin)
```

## Prérequis

- **JDK 17 ou supérieur** — vérifier : `java -version`
- **Maven 3.8+** — vérifier : `mvn -v`
- **Node.js 18+ et npm** — vérifier : `node -v && npm -v`
- **Docker Desktop** pour `docker compose` (optionnel en développement local)
- **MySQL 8** uniquement si vous lancez l'API hors conteneur sans le profil `dev`

## Démarrage rapide (mode `dev`, sans MySQL)

Le profil `dev` démarre sur une base H2 en mémoire, recrée le schéma au lancement et injecte les données de démonstration.

**Terminal 1 — backend (port 8080 par défaut)**

```bash
cd backend
mvn spring-boot:run -Dspring-boot.run.profiles=dev
```

Si le port 8080 est déjà pris (autre projet en cours d'exécution), forcez-en un autre :

```bash
mvn spring-boot:run -Dspring-boot.run.profiles=dev -Dspring-boot.run.arguments=--server.port=8090
```

**Terminal 2 — frontend (port 5173)**

```bash
cd frontend
npm install
npm run dev
```

Ouvrir **http://localhost:5173**. Le proxy Vite (`frontend/vite.config.ts`) redirige `/api` vers `http://localhost:8080` ; si vous avez changé le port du backend, ajustez `target` dans ce fichier. Le premier `mvn spring-boot:run` télécharge les dépendances Maven : la construction peut être longue.

**Documentation API** : http://localhost:8080/swagger-ui.html (JSON brut sur `/v3/api-docs`). Bouton *Authorize* → coller le jeton renvoyé par `POST /api/auth/login`.

## Tout lancer avec Docker

```bash
cp .env.example .env        # puis renseigner DB_PASSWORD et JWT_SECRET (32 caractères minimum)
docker compose up --build
```

| Service | URL | Rôle |
| --- | --- | --- |
| `web` | http://localhost:3000 | SPA servie par nginx, qui proxifie `/api` vers l'API |
| `api` | http://localhost:8080 | Spring Boot, profil par défaut (MySQL), Swagger et `/actuator/health` |
| `mysql` | localhost:3306 | Base `luxemart_db`, données persistées dans le volume `mysql-data` |

`docker compose` refuse de démarrer sans `DB_PASSWORD` ni `JWT_SECRET` : c'est voulu, l'API ne sait plus démarrer sans clé de signature. Le healthcheck de l'API repose sur `/actuator/health`, et `web` n'attend `api` que lorsque celui-ci est `healthy`.

## Démarrage avec MySQL installé en local

1. Créer la base (elle peut aussi être créée automatiquement grâce à `createDatabaseIfNotExist=true`) :

   ```sql
   CREATE DATABASE luxemart_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

2. Renseigner les variables puis lancer sans profil :

   ```bash
   # Git Bash
   export DB_PASSWORD="votre_mot_de_passe"
   export JWT_SECRET="une_chaine_aleatoire_de_32_caracteres_ou_plus"

   # PowerShell
   $env:DB_PASSWORD="votre_mot_de_passe"
   $env:JWT_SECRET="une_chaine_aleatoire_de_32_caracteres_ou_plus"
   ```

   ```bash
   cd backend
   mvn spring-boot:run
   ```

Sans `JWT_SECRET`, l'application refuse de démarrer (`IllegalStateException: jwt.secret is not set`, vérifié par `JwtSecretGuardTest`). En profil par défaut, Flyway applique les migrations de `backend/src/main/resources/db/migration`, puis Hibernate se borne à vérifier que les entités collent au schéma (`ddl-auto=validate`) : plus aucune table créée ni modifiée par l'ORM. Le seed de `DataInitializer` s'exécute ensuite. Le profil `dev` (H2) conserve `create-drop` et désactive Flyway, les scripts MySQL n'étant pas portables sur H2.

Console H2 (mode `dev` uniquement) : http://localhost:8080/h2-console — JDBC URL `jdbc:h2:mem:luxemart`, utilisateur `sa`, mot de passe vide.

## Comptes de démonstration

Créés par `backend/src/main/java/com/luxemart/api/config/DataInitializer.java` :

| Rôle | Email | Mot de passe |
| --- | --- | --- |
| Admin | `admin@luxemart.com` | `admin123` |
| Client | `demo@luxemart.com` | `demo123` |

Le seed contient aussi 5 catégories principales (+ 5 sous-catégories), 12 produits avec variantes (taille/couleur/stock), images et badges. Il est idempotent : il n'insère que les données absentes.

## Fonctionnalités

**Storefront**
- Page d'accueil avec collections et produits mis en avant
- Liste de produits : pagination, tri, filtres par catégorie / prix / recherche
- Fiche produit : variantes, galerie d'images, avis, produits liés
- Panier persistant côté serveur, quantités et total recalculés
- Checkout avec adresse de livraison, réservation du stock et calcul livraison/TVA
- Wishlist et espace client (profil, adresses, historique de commandes)
- Avis clients : création, modification et suppression par leur auteur
- « Récemment consultés », badges stock faible / nouveautés, animations d'apparition

**Back-office** (`/admin`, rôle `ROLE_ADMIN`)
- Tableau de bord analytique sur N jours + export CSV
- Gestion des commandes et changement de statut
- CRUD produits et gestion des catégories

## Routes frontend

| Route | Accès |
| --- | --- |
| `/`, `/products`, `/product/:slug`, `/login` | Public |
| `/cart`, `/checkout`, `/wishlist`, `/profile` | Authentifié |
| `/admin`, `/admin/products` | Admin |

## API REST

Préfixe `/api`. « Public » = `GET` autorisé sans jeton ; « Bearer » = en-tête `Authorization: Bearer <token>` requis ; « Admin » = `ROLE_ADMIN`.

| Méthode | Endpoint | Accès |
| --- | --- | --- |
| POST | `/auth/register`, `/auth/login` | Public (login limité à 10 essais/min par IP) |
| GET | `/auth/csrf` | Public — pose le cookie `XSRF-TOKEN` que le front renvoie en `X-XSRF-TOKEN` |
| POST | `/auth/refresh` | Cookie `LUXEMART_REFRESH` + en-tête `X-XSRF-TOKEN` obligatoires |
| POST | `/auth/logout` | Cookie `LUXEMART_REFRESH` — sans CSRF : il ne peut que purger le cookie de son propre appelant |
| GET | `/products` (`page,size,sort,categoryId,minPrice,maxPrice,search`), `/products/featured`, `/products/{slug}` | Public |
| GET | `/categories`, `/categories/{slug}`, `/config` | Public |
| GET/POST/PUT/DELETE | `/products/{productId}/reviews[/{reviewId}]` | Bearer |
| GET/POST/PUT/DELETE | `/cart`, `/cart/items[/{cartItemId}]` | Bearer |
| GET/POST | `/orders`, `/orders/checkout`, `/orders/{orderId}` | Bearer |
| GET/POST/DELETE | `/wishlist[/{productId}]` | Bearer |
| GET/PUT | `/users/me`, `/users/me/addresses[/{addressId}]` | Bearer |
| GET/POST/PUT/PATCH/DELETE | `/admin/analytics`, `/admin/orders`, `/admin/orders/{id}/status`, `/admin/products`, `/admin/categories` | Admin |
| GET | `/v3/api-docs`, `/swagger-ui.html` | Public |
| GET | `/actuator/health` | Public (seule exposition actuator) |

**Format d'erreur** : toutes les réponses d'erreur suivent la RFC 7807 (`application/problem+json`), avec `type`, `title`, `status`, `detail`, `instance` et un champ additionnel `timestamp` ; les échecs de validation ajoutent un objet `errors` (champ → message).

| Status | Déclencheur |
| --- | --- |
| 400 | `BadRequestException`, payload invalide (`errors` par champ) |
| 401 | Absence/jeton invalide de `Authorization`, identifiants erronés, cookie `LUXEMART_REFRESH` absent ou invalide |
| 403 | Rôle insuffisant (ex. client sur `/api/admin/**`), `X-XSRF-TOKEN` manquant sur `/auth/refresh` |
| 404 | `ResourceNotFoundException`, ordre d'un autre client |
| 409 | Conflit d'optimistic locking sur le stock après 3 tentatives |
| 429 | Plus de 10 tentatives de connexion depuis la même IP en 60 s (`Retry-After`) |

## Configuration

`backend/src/main/resources/application.properties` :

| Clé | Défaut | Description |
| --- | --- | --- |
| `server.port` | `8080` | Port de l'API |
| `server.forward-headers-strategy` | `framework` | Lit `X-Forwarded-*` : l'IP client vue par le rate limiter est la bonne derrière nginx |
| `spring.datasource.url` | `jdbc:mysql://localhost:3306/luxemart_db?...` | Passage en H2 via le profil `dev` |
| `DB_PASSWORD` (env) | `root` | Mot de passe base de données |
| `spring.jpa.hibernate.ddl-auto` | `validate` (`dev` : `create-drop`) | Hibernate contrôle le schéma, il ne le génère plus |
| `spring.flyway.enabled` | `true` (`dev` : `false`) | Migrations appliquées au démarrage depuis `db/migration` |
| `spring.flyway.baseline-on-migrate` / `baseline-version` | `true` / `1` | Une base déjà bâtie par l'ancien `ddl-auto=update` est baselinée en V1 au lieu d'être rejouée |
| `JWT_SECRET` (env) | **aucun repli** | Obligatoire : `JwtService` refuse de démarrer sous 32 octets. Le repli n'existe que dans `application-dev.properties` |
| `jwt.expiration-ms` | `86400000` (24 h) | Expiration du jeton d'accès |
| `jwt.refresh-expiration-ms` | `604800000` (7 j) | Expiration du jeton de rafraîchissement, égal à la durée du cookie |
| `app.security.refresh-cookie.secure` | `true` (`dev` : `false`) | Attribut `Secure` du cookie `LUXEMART_REFRESH` ; à désactiver seulement en HTTP simple sur une IP |
| `app.cors.allowed-origins` | `localhost:5173,5174,3000` | Origines autorisées |
| `app.security.login-rate-limit.requests-per-window` | `10` | Tentatives de connexion autorisées par IP |
| `app.security.login-rate-limit.window-seconds` | `60` | Fenêtre du rate limiting |
| `app.commerce.free-shipping-threshold` | `150.00` | Livraison offerte au-delà |
| `app.commerce.shipping-cost` | `9.90` | Frais de livraison |
| `app.commerce.tax-rate` | `0.20` | Taux de TVA appliqué au checkout |
| `app.commerce.low-stock-threshold` | `5` | Seuil d'affichage « stock faible » |
| `management.endpoints.web.exposure.include` | `health,info` | Seules expositions actuator HTTP |

Le frontend lit les règles de commerce via `GET /api/config` (hook `useStoreConfig`) : elles ne sont pas codées en dur côté React.

## Modèle de données

`User` (avec `Role` et `Address`) — `Category` (hiérarchique, `parent`) — `Product` (1:N `ProductImage`, 1:N `ProductVariant`) — `CartItem` — `Order` (1:N `OrderItem`, statuts `PENDING / PROCESSING / SHIPPED / DELIVERED / CANCELLED` et `PENDING / AUTHORIZED / CAPTURED / FAILED / REFUNDED`) — `Review` — `WishlistItem`.

`ProductVariant` porte une colonne `version` (`@Version`) : deux checkouts simultanés sur la même variante ne peuvent pas vendre plus que le stock réel. La transaction perdante est rejouée jusqu'à 3 fois par `CheckoutService`, puis renvoie un `409`.

## Qualité : tests, CI, conteneurs

**Backend** — `mvn test` (profil `dev`, H2, aucune installation externe requise) :

| Classe | Ce qu'elle verrouille |
| --- | --- |
| `ApiAccessControlTest` | Catalogue public, panier sans jeton → 401, client sur `/api/admin/**` → 403, admin → 200, **IDOR** : l'ordre d'un autre client → 404, validation → `errors` par champ, `/v3/api-docs` servi |
| `CheckoutTest` | Réservation du stock, TVA/livraison (98,00 → 127,50 ; 196,00 → frais de port 0), survente refusée sans réservation partielle, cycle complet du panier |
| `LoginRateLimitTest` | 429 + `Retry-After` + `problem+json` au-delà du quota, `/auth/register` non compté |
| `RefreshTokenFlowTest` | Cookie `HttpOnly`/`SameSite=Strict`/`Path=/api/auth`, rotation à chaque refresh, refresh token refusé comme `Bearer` et inversement, absence de cookie → 401, `X-XSRF-TOKEN` manquant → 403, logout accepté sans CSRF → cookie expiré |
| `JwtSecretGuardTest` | Démarrage refusé sans `JWT_SECRET` ou sous 256 bits, et absence de repli dans le profil par défaut |
| `DataSeedSmokeTest` | Le seed utilisateurs/catégories/produits s'exécute |
| `MySqlSchemaMigrationIT` | Flyway applique `V1__baseline_schema.sql` sur un vrai MySQL 8, puis Hibernate valide chaque entité contre le schéma obtenu. Sauté hors `MYSQL_IT=true` (exécuté par le job `mysql-schema` de la CI) |

**CI** — `.github/workflows/ci.yml`, sur chaque push et PR vers `main` : `mvn -B verify` (JDK 17, cache Maven), `npm ci && npm run build` (Node 20, `tsc -b` inclut le type-check), `mvn -B test -Dtest=MySqlSchemaMigrationIT` contre un service `mysql:8.4` (job `mysql-schema`), et `docker compose config -q`.

**Build manuel** :

```bash
cd frontend && npm run build       # type-check + dist/ statique
cd backend && mvn clean package    # jar dans backend/target/ (les tests s'exécutent)
```

## Dépannage

| Symptôme | Cause et correctif |
| --- | --- |
| `Port 8080 was already in use` | Un autre service écoute déjà (vérifier : `netstat -ano \| grep :8080`). Soit arrêter le processus, soit `--server.port=8090` et ajuster le proxy Vite |
| `IllegalStateException: jwt.secret is not set` | Profil par défaut sans `JWT_SECRET` : le définir, ou lancer en `dev` |
| `Access denied for user 'root'` | `DB_PASSWORD` incorrect ou non exporté dans le shell lancé ; ou utiliser le profil `dev` |
| `Communications link failure` | Service MySQL non démarré ; passer en `dev` pour H2 |
| 429 sur la connexion | Quota anti-brute-force atteint pour cette IP ; attendre `Retry-After` secondes ou relever `app.security.login-rate-limit.requests-per-window` |
| 409 sur le checkout | Le stock a changé entre deux tentatives concurrentes : relancer la commande |
| `Validate error ... missing column` au démarrage | Le schéma ne correspond plus aux entités : ajouter une migration `V<n>__....sql` dans `db/migration`, Hibernate ne corrige plus rien |
| `Migration checksum mismatch for baseline version 1` | `V1__baseline_schema.sql` a été modifié après application. Sur une base de développement, repartir d'une base vide ; sinon `mvn flyway:repair` |
| Erreurs CORS depuis le front | Vérifier le port réel du backend, la cible du proxy Vite et `app.cors.allowed-origins` |
| `npm install` très lent / build Maven long | Normal sur ce poste ; les dépendances sont ensuite en cache |
| Le seed ne recrée pas les données | C'est volontaire : il n'insère que ce qui manque. Vider la base — ou rester sur le profil `dev`, recréé à chaque démarrage — pour le rejouer |

## Sécurité : état actuel et limites

- **Anti-brute-force** : 10 tentatives de connexion/min par IP, réponse `429` avec `Retry-After`. En mémoire et propre aux IP inactives : un déploiement multi-instance nécessiterait un store partagé (Redis).
- **Secret de signature** : plus aucun repli en profil par défaut ; `JWT_SECRET` est requis au démarrage et doit faire ≥ 32 octets.
- **Autorisation vérifiée par tests** : IDOR sur les commandes, séparation client/admin, ouverture assumée du catalogue.
- **Cohérence du stock** : verrouillage optimiste + retry borné.
- **Session** : le refresh token ne quitte jamais le serveur que dans le cookie `LUXEMART_REFRESH` (`HttpOnly`, `SameSite=Strict`, `Path=/api/auth`, `Secure` hors `dev`), roté à chaque `/auth/refresh`. L'access token vit en mémoire dans le module `lib/api.ts` et n'est jamais écrit dans `localStorage` : une injection XSS n'a plus de jeton long durée à lire. `POST /auth/refresh` exige l'en-tête `X-XSRF-TOKEN` que le front recopie du cookie posé par `GET /auth/csrf` (jeton en clair, handler `CsrfTokenRequestAttributeHandler`) ; `POST /auth/logout` en est volontairement dispensé — un refus CSRF y laisserait la session vivante, et ce call ne peut que purger le cookie de son propre appelant. Le reste de l'API reste hors CSRF puisqu'il n'accepte que l'en-tête `Authorization`, qu'un site tiers ne peut pas produire.
- **Ce que la session ne couvre pas encore** : aucune révocation côté serveur (le `jti` du refresh token n'est stocké nulle part, pas de version de jeton en base), donc un refresh cookie volé reste valide jusqu'à son expiration — la détection de réutilisation et la liste de révocation en Redis sont la suite logique. La suppression de compte n'invalide pas non plus les jetons émis.
- **Paiement simulé** : aucune passerelle (Stripe/PayPal), `paymentStatus` reste `PENDING` tant qu'un webhook n'existe pas.
- **Images produits** : URLs externes (Unsplash), pas d'endpoint d'upload malgré la limite multipart de 10 MB configurée.
- **Pas de journal d'audit, ni de rôles intermédiaires** : un seul rôle `ROLE_ADMIN`.

## Roadmap court terme

1. Stripe Payment Intents + webhooks idempotents, emails transactionnels, mot de passe oublié
2. Panier invité + coupons, recherche facettes, Redis pour le catalogue, les compteurs de rate limiting et la révocation des refresh tokens
3. Journal d'audit, rôles fins, machine à états stricte sur les commandes

## Remote

`https://github.com/ENAA-School-Student/E-commerce_Projet.git` (branche `main`).
