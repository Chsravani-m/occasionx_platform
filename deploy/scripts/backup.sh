#!/bin/sh
# Backs up every OccasionX database plus the provider uploads volume.
# Run from the repo root on the server, e.g. nightly via cron:
#   0 2 * * * cd /opt/occasionx && ./deploy/scripts/backup.sh >> backups/backup.log 2>&1
# Copy the backups/ folder off the server regularly (S3, another machine...).
set -eu

STAMP=$(date +%Y%m%d-%H%M%S)
DEST="backups/$STAMP"
KEEP_DAYS=${KEEP_DAYS:-14}
mkdir -p "$DEST"

for db in auth user provider catalog booking collab; do
    name="occasionx_${db}_db"
    echo "Dumping $name"
    docker compose exec -T postgres pg_dump -U postgres -F c "$name" > "$DEST/$name.dump"
done

echo "Archiving provider uploads"
docker compose run --rm --no-deps -T -v "$(pwd)/$DEST:/backup" \
    --user root --entrypoint tar provider-service czf /backup/provider-uploads.tar.gz -C /app uploads

find backups -mindepth 1 -maxdepth 1 -type d -mtime +"$KEEP_DAYS" -exec rm -rf {} +
echo "Backup written to $DEST"
