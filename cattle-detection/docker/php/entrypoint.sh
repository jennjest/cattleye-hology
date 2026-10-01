#!/bin/sh
#
# CATTLEYE container entrypoint.
#
# With RUN_PREPARE=true the container blocks until MariaDB accepts connections,
# then compiles the runtime config cache and links storage. Only the one-shot
# `migrate` service should set it, so migrations never race between replicas.
#
set -eu

APP_DIR="${APP_DIR:-/var/www/html}"
cd "$APP_DIR"

if [ "${RUN_PREPARE:-false}" = "true" ]; then
    echo '[cattleye] waiting for database...'

    attempts=0
    until php -r '
        $host = getenv("DB_HOST") ?: "127.0.0.1";
        $port = getenv("DB_PORT") ?: "3306";
        $name = getenv("DB_DATABASE");
        $user = getenv("DB_USERNAME");
        $pass = getenv("DB_PASSWORD") ?: "";
        try {
            new PDO("mysql:host={$host};port={$port};dbname={$name}", $user, $pass, [
                PDO::ATTR_TIMEOUT => 3,
            ]);
        } catch (Throwable $e) {
            exit(1);
        }
    '; do
        attempts=$((attempts + 1))
        if [ "$attempts" -ge 60 ]; then
            echo "[cattleye] database unreachable after ${attempts} attempts" >&2
            exit 1
        fi
        sleep 2
    done

    echo '[cattleye] database ready'

    mkdir -p \
        storage/app/public \
        storage/framework/cache/data \
        storage/framework/sessions \
        storage/framework/views \
        storage/logs \
        bootstrap/cache
    chmod -R ug+rwX storage bootstrap/cache

    # APP_KEY must exist before config:cache, otherwise every encrypted
    # session/cookie comes back undecryptable.
    if [ -z "${APP_KEY:-}" ]; then
        echo '[cattleye] APP_KEY empty - generating a new one'
        php artisan key:generate --force --no-interaction
    fi

    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    php artisan event:cache
    php artisan storage:link --force --no-interaction || true

    echo '[cattleye] prepare complete'
fi

exec "$@"
