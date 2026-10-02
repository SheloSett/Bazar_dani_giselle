#!/bin/sh
# Backup del catálogo: base de datos (pg_dump) y fotos (uploads/).
#
# Correrlo parado en la carpeta del proyecto (donde está docker-compose.yml):
#   ./scripts/backup.sh
#
# Programado todas las noches a las 04:00 con cron (crontab -e):
#   0 4 * * * cd /srv/bazar-catalogo && ./scripts/backup.sh >> backups/backup.log 2>&1
#
# Guarda en ./backups y borra lo que tenga más de BACKUP_KEEP_DAYS días (14 por
# defecto). Conviene copiar la carpeta backups/ también fuera del VPS cada tanto.

set -eu

DIR="${BACKUP_DIR:-backups}"
KEEP_DAYS="${BACKUP_KEEP_DAYS:-14}"
STAMP="$(date +%Y%m%d-%H%M%S)"

mkdir -p "$DIR"

echo "[backup] $STAMP: base de datos"
docker compose exec -T db pg_dump -U bazar bazar > "$DIR/db-$STAMP.sql"
gzip -f "$DIR/db-$STAMP.sql"

echo "[backup] $STAMP: fotos (uploads)"
docker compose exec -T app tar -czf - -C /app uploads > "$DIR/uploads-$STAMP.tgz"

# Rotación: borra los backups con más días que BACKUP_KEEP_DAYS
find "$DIR" -name 'db-*.sql.gz' -mtime +"$KEEP_DAYS" -delete
find "$DIR" -name 'uploads-*.tgz' -mtime +"$KEEP_DAYS" -delete

echo "[backup] listo: $DIR/db-$STAMP.sql.gz y $DIR/uploads-$STAMP.tgz"
