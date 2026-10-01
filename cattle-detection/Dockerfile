# syntax=docker/dockerfile:1.7

# =============================================================================
# CATTLEYE - production image
#
# PHP must be >= 8.4.1: composer.lock resolves symfony/* 8.1 which declares
# "php >= 8.4.1". Building on 8.3 fails with a lock-file mismatch.
# =============================================================================

# -----------------------------------------------------------------------------
# Stage 1 - Composer dependencies
# -----------------------------------------------------------------------------
FROM composer:2.8 AS vendor

WORKDIR /app

ENV COMPOSER_ALLOW_SUPERUSER=1 \
    COMPOSER_MEMORY_LIMIT=-1

COPY composer.json composer.lock ./

# Resolve first, without scripts/artifacts, so the layer caches independently
# of application source changes.
RUN composer install \
        --no-dev \
        --no-scripts \
        --no-autoloader \
        --prefer-dist \
        --no-interaction

COPY . .

# artisan package:discover (post-autoload-dump) boots the framework, so it
# needs a parseable .env present. The real .env is never in the build context.
RUN cp .env.example .env \
 && composer dump-autoload --optimize --no-dev \
 && composer run-script --no-dev post-autoload-dump \
 && rm -f .env

# -----------------------------------------------------------------------------
# Stage 2 - Frontend assets
#
# Order matters: @laravel/vite-plugin-wayfinder shells out to
# `php artisan wayfinder:generate --with-form`, which needs vendor/autoload.php.
# Installing Composer dependencies BEFORE npm run build is what keeps the
# build from dying on a missing autoloader.
# -----------------------------------------------------------------------------
# -----------------------------------------------------------------------------
# Stage 2a - Node dependencies
#
# Split out purely so the npm install layer caches without PHP or app source.
# -----------------------------------------------------------------------------
FROM node:22-bookworm-slim AS node_modules

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY package.json package-lock.json ./

# Retry aggressively: a single ECONNRESET mid-download otherwise fails the whole
# build. The cache mount keeps the tarball store between attempts.
RUN --mount=type=cache,target=/root/.npm \
    npm ci \
        --no-audit \
        --no-fund \
        --fetch-retries=5 \
        --fetch-retry-mintimeout=20000 \
        --fetch-retry-maxtimeout=120000

# -----------------------------------------------------------------------------
# Stage 2b - Frontend assets
#
# Order matters, and so does the base image. The Wayfinder plugin shells out to
# `php artisan wayfinder:generate --with-form`, which needs BOTH:
#   1. vendor/autoload.php          -> satisfied by the vendor stage
#   2. a php binary on PATH         -> satisfied by basing this on php:8.4-cli
# A node-only base gives "sh: 1: php: not found"; Debian's stock php:8.2 is
# rejected by the app's own ^8.3 platform check.
# -----------------------------------------------------------------------------
FROM php:8.4-cli-bookworm AS assets

WORKDIR /app

RUN apt-get update \
 && apt-get install -y --no-install-recommends ca-certificates unzip \
 && rm -rf /var/lib/apt/lists/*

# node ships npm alongside the binary in /usr/local/lib/node_modules; both are
# needed because the package.json scripts are dispatched through npm.
COPY --from=node:22-bookworm-slim /usr/local/bin/node /usr/local/bin/node
COPY --from=node:22-bookworm-slim /usr/local/lib/node_modules /usr/local/lib/node_modules

COPY --from=vendor /app /app
COPY --from=node_modules /app/node_modules /app/node_modules

# Assembles public/build plus the generated resources/js/{routes,actions,wayfinder}.
# Requires outbound network: the bunny() font plugin fetches Instrument Sans.
RUN node /usr/local/lib/node_modules/npm/bin/npm-cli.js run build \
 && rm -rf node_modules

# -----------------------------------------------------------------------------
# Stage 3 - Runtime (PHP-FPM)
# -----------------------------------------------------------------------------
FROM php:8.4-fpm-bookworm AS runtime

RUN apt-get update \
 && apt-get install -y --no-install-recommends \
        libpng-dev \
        libjpeg62-turbo-dev \
        libfreetype6-dev \
        libwebp-dev \
        libicu-dev \
        libonig-dev \
        libzip-dev \
        libxml2-dev \
 && docker-php-ext-configure gd --with-jpeg --with-freetype --with-webp \
 && docker-php-ext-install -j"$(nproc)" \
        bcmath \
        gd \
        intl \
        mbstring \
        opcache \
        pcntl \
        pdo_mysql \
        zip \
 && apt-get purge -y --auto-remove \
 && rm -rf /var/lib/apt/lists/*

COPY docker/php/php.ini /usr/local/etc/php/conf.d/99-cattleye.ini

# Retune the stock [www] pool in place. The image ships pm=dynamic with five
# children, which is too eager for a 1 GB host shared with MariaDB and nginx.
# Editing www.conf avoids defining a duplicate [www] pool in a second file.
RUN set -eux; \
    pool=/usr/local/etc/php-fpm.d/www.conf; \
    sed -i -E \
        -e 's/^[[:space:]]*;?[[:space:]]*pm[[:space:]]*=.*/pm = ondemand/' \
        -e 's/^[[:space:]]*;?[[:space:]]*pm\.max_children[[:space:]]*=.*/pm.max_children = 6/' \
        -e 's/^[[:space:]]*;?[[:space:]]*pm\.process_idle_timeout[[:space:]]*=.*/pm.process_idle_timeout = 30s/' \
        -e 's/^[[:space:]]*;?[[:space:]]*pm\.max_requests[[:space:]]*=.*/pm.max_requests = 500/' \
        "$pool"; \
    grep -E '^pm' "$pool"

# public/build, vendor and the Wayfinder output all come from the assets stage.
COPY --from=assets --chown=www-data:www-data /app /var/www/html

RUN set -eux; \
    mkdir -p \
        storage/app/public \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache; \
    chown -R www-data:www-data storage bootstrap/cache; \
    chmod -R 775 storage bootstrap/cache; \
    rm -rf tests .phpunit.cache phpstan.neon .phpstan.cache

COPY docker/php/entrypoint.sh /usr/local/bin/cattleye-entrypoint
RUN chmod +x /usr/local/bin/cattleye-entrypoint

USER www-data
WORKDIR /var/www/html

# The image ships no procps, so pgrep is unavailable. Probe the FPM listener
# with PHP's own socket support instead. This assumes the stock TCP :9000
# listener, which is also what docker/nginx/default.conf targets; switch both
# together if you move the pool to a unix socket.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD php -r 'exit(@fsockopen("127.0.0.1", 9000, $e, $m, 2) ? 0 : 1);'

ENTRYPOINT ["cattleye-entrypoint"]
CMD ["php-fpm"]

# -----------------------------------------------------------------------------
# Stage 4 - Web server (Nginx)
# -----------------------------------------------------------------------------
FROM nginx:1.27-alpine AS web

COPY docker/nginx/default.conf /etc/nginx/conf.d/default.conf
COPY --from=assets --chown=nginx:nginx /app/public /var/www/html/public

