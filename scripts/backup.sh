#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# PandaMarket — Automated Backup Script
# ─────────────────────────────────────────────────────────────────
# Backs up:
#   1. PostgreSQL (pg_dump → compressed SQL)
#   2. Redis (RDB snapshot trigger)
#   3. Meilisearch (snapshot API)
#   4. MinIO files (mc mirror to backup location)
#
# Usage:
#   ./scripts/backup.sh                    # Full backup
#   ./scripts/backup.sh --db-only          # PostgreSQL only
#   ./scripts/backup.sh --dir /mnt/backup  # Custom backup directory
#
# Schedule via cron (daily at 02:00):
#   0 2 * * * /opt/pandamarket/scripts/backup.sh >> /var/log/pandamarket-backup.log 2>&1
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

# ─── Configuration (override via env vars) ───────────────────────

BACKUP_DIR="${BACKUP_DIR:-./backups}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# PostgreSQL
PG_HOST="${PD_PG_HOST:-localhost}"
PG_PORT="${PD_PG_PORT:-5432}"
PG_USER="${PD_PG_USER:-pd_user}"
PG_DB="${PD_PG_DB:-pandamarket}"
PGPASSWORD="${PD_PG_PASSWORD:-password}"
export PGPASSWORD

# Redis
REDIS_HOST="${PD_REDIS_HOST:-localhost}"
REDIS_PORT="${PD_REDIS_PORT:-6379}"

# Meilisearch
MEILI_HOST="${PD_MEILI_HOST:-http://localhost:7700}"
MEILI_KEY="${PD_MEILI_MASTER_KEY:-}"

# MinIO
MINIO_ALIAS="${MINIO_ALIAS:-local}"
MINIO_BACKUP_DEST="${MINIO_BACKUP_DEST:-}"

# Flags
DB_ONLY=false

for arg in "$@"; do
  case $arg in
    --db-only) DB_ONLY=true ;;
    --dir) shift; BACKUP_DIR="$2" ;;
  esac
done

# ─── Helpers ─────────────────────────────────────────────────────

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }
err() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] ERROR: $1" >&2; }

mkdir -p "$BACKUP_DIR"/{postgres,redis,meilisearch,minio}

# ─── 1. PostgreSQL Backup ────────────────────────────────────────

backup_postgres() {
  local file="$BACKUP_DIR/postgres/pandamarket_${TIMESTAMP}.sql.gz"
  log "Backing up PostgreSQL → $file"

  if command -v pg_dump &>/dev/null; then
    pg_dump -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" \
      --no-owner --no-privileges --clean --if-exists \
      | gzip > "$file"
    log "PostgreSQL backup complete ($(du -h "$file" | cut -f1))"
  elif command -v docker &>/dev/null; then
    docker compose exec -T postgres pg_dump -U "$PG_USER" -d "$PG_DB" \
      --no-owner --no-privileges --clean --if-exists \
      | gzip > "$file"
    log "PostgreSQL backup complete via Docker ($(du -h "$file" | cut -f1))"
  else
    err "pg_dump not found and Docker not available. Skipping PostgreSQL backup."
    return 1
  fi
}

# ─── 2. Redis Backup ────────────────────────────────────────────

backup_redis() {
  local file="$BACKUP_DIR/redis/dump_${TIMESTAMP}.rdb"
  log "Triggering Redis BGSAVE..."

  if command -v redis-cli &>/dev/null; then
    redis-cli -h "$REDIS_HOST" -p "$REDIS_PORT" BGSAVE
    sleep 2
    # Copy the dump file if accessible
    if [ -f /var/lib/redis/dump.rdb ]; then
      cp /var/lib/redis/dump.rdb "$file"
      log "Redis backup complete → $file"
    else
      log "Redis BGSAVE triggered. Manual copy of dump.rdb may be needed."
    fi
  elif command -v docker &>/dev/null; then
    docker compose exec -T redis redis-cli BGSAVE
    sleep 2
    docker compose cp redis:/data/dump.rdb "$file" 2>/dev/null || \
      log "Redis BGSAVE triggered. Copy dump.rdb from container volume manually."
  else
    err "redis-cli not found. Skipping Redis backup."
  fi
}

# ─── 3. Meilisearch Backup ──────────────────────────────────────

backup_meilisearch() {
  log "Triggering Meilisearch snapshot..."

  local auth_header=""
  if [ -n "$MEILI_KEY" ]; then
    auth_header="Authorization: Bearer $MEILI_KEY"
  fi

  local response
  response=$(curl -s -w "%{http_code}" -o /dev/null \
    -X POST "$MEILI_HOST/snapshots" \
    ${auth_header:+-H "$auth_header"})

  if [ "$response" = "202" ]; then
    log "Meilisearch snapshot triggered successfully (async)."
  else
    err "Meilisearch snapshot failed (HTTP $response)."
  fi
}

# ─── 4. MinIO Backup ────────────────────────────────────────────

backup_minio() {
  if [ -z "$MINIO_BACKUP_DEST" ]; then
    log "MINIO_BACKUP_DEST not set. Skipping MinIO file backup."
    return 0
  fi

  if ! command -v mc &>/dev/null; then
    err "MinIO client (mc) not found. Skipping file backup."
    return 1
  fi

  log "Mirroring MinIO buckets → $MINIO_BACKUP_DEST"
  mc mirror --overwrite "$MINIO_ALIAS/pd-product-images" "$MINIO_BACKUP_DEST/pd-product-images/"
  mc mirror --overwrite "$MINIO_ALIAS/pd-private-files" "$MINIO_BACKUP_DEST/pd-private-files/"
  log "MinIO backup complete."
}

# ─── 5. Cleanup old backups ─────────────────────────────────────

cleanup_old() {
  log "Cleaning up backups older than $RETENTION_DAYS days..."
  find "$BACKUP_DIR" -type f -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true
  log "Cleanup complete."
}

# ─── Execute ─────────────────────────────────────────────────────

log "═══════════════════════════════════════════════════"
log "PandaMarket Backup — $TIMESTAMP"
log "═══════════════════════════════════════════════════"

backup_postgres

if [ "$DB_ONLY" = false ]; then
  backup_redis
  backup_meilisearch
  backup_minio
fi

cleanup_old

log "═══════════════════════════════════════════════════"
log "Backup complete!"
log "═══════════════════════════════════════════════════"
