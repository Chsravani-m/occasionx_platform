#!/bin/sh
# Container entrypoint for the Python services.
#
# Services that own a database ship an alembic.ini; for those, bring the
# schema up to date before the app starts. Set RUN_MIGRATIONS=false to
# skip (e.g. when running several replicas and migrating separately).
set -e

if [ -f alembic.ini ] && [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
    echo "Applying database migrations..."
    alembic upgrade head
fi

exec "$@"
