#!/bin/sh
# Runs once, the first time the Postgres container starts with an empty
# data volume. Creates the application role and one database per service.
# Tables are created afterwards by each service's Alembic migrations.
set -eu

: "${APP_DB_USER:?APP_DB_USER is required}"
: "${APP_DB_PASSWORD:?APP_DB_PASSWORD is required}"

psql -v ON_ERROR_STOP=1 \
     -v app_user="$APP_DB_USER" \
     -v app_password="$APP_DB_PASSWORD" \
     --username "$POSTGRES_USER" --dbname postgres <<'SQL'
CREATE ROLE :"app_user" LOGIN PASSWORD :'app_password';
SQL

for db in auth user provider catalog booking collab; do
    name="occasionx_${db}_db"
    echo "Creating database ${name}"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname postgres \
         -c "CREATE DATABASE \"${name}\" OWNER \"${APP_DB_USER}\";"
    psql -v ON_ERROR_STOP=1 --username "$POSTGRES_USER" --dbname "$name" \
         -c "REVOKE ALL ON SCHEMA public FROM PUBLIC; GRANT ALL ON SCHEMA public TO \"${APP_DB_USER}\";"
done
