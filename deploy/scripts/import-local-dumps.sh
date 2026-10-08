#!/bin/sh
# Optional: load databases dumped from a local/dev machine into the
# production Postgres container instead of starting empty.
#
# 1. On the source machine, for each database:
#      pg_dump -U postgres -F c -d occasionx_auth_db -f occasionx_auth_db.dump
# 2. Copy the .dump files to the server, into ./dumps/
# 3. With only postgres running (docker compose up -d postgres), run:
#      ./deploy/scripts/import-local-dumps.sh
# 4. docker compose up -d
#
# The dumps were created without Alembic, so after restoring, each
# database is "stamped" as being at the baseline migration. Run
# `alembic check` afterwards (see DEPLOYMENT.md) if the local schema may
# have drifted from the models.
set -eu

DUMPS=${1:-dumps}
DB_USER=${DB_USER:-occasionx}

for db in auth user provider catalog booking collab; do
    name="occasionx_${db}_db"
    file="$DUMPS/$name.dump"
    if [ ! -f "$file" ]; then
        echo "Skipping $name (no $file)"
        continue
    fi
    echo "Restoring $name"
    docker compose exec -T postgres pg_restore -U postgres --clean --if-exists \
        --no-owner --role="$DB_USER" -d "$name" < "$file"
    docker compose run --rm --no-deps -e RUN_MIGRATIONS=false \
        "${db}-service" alembic stamp head
done

echo "Done. Start the stack with: docker compose up -d"
