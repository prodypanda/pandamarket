#!/usr/bin/env bash
# ─────────────────────────────────────────────────────────────────
# PandaMarket — Database Restore Script
# ─────────────────────────────────────────────────────────────────
# Restores a PostgreSQL backup created by backup.sh.
#
# Usage:
#   ./scripts/restore.sh backups/postgres/pandamarket_20260503_020000.sql.gz
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

if [ $# -lt 1 ]; then
  echo "Usage: $0 <backup-file.sql.gz>"
  echo "Example: $0 backups/postgres/pandamarket_20260503_020000.sql.gz"
  exit 1
fi

BACKUP_FILE="$1"

if [ ! -f "$BACKUP_FILE" ]; then
  echo "ERROR: Backup file not found: $BACKUP_FILE"
  exit 1
fi

# PostgreSQL config
PG_HOST="${PD_PG_HOST:-localhost}"
PG_PORT="${PD_PG_PORT:-5432}"
PG_USER="${PD_PG_USER:-pd_user}"
PG_DB="${PD_PG_DB:-pandamarket}"
PGPASSWORD="${PD_PG_PASSWORD:-password}"
export PGPASSWORD

log() { echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"; }

log "═══════════════════════════════════════════════════"
log "PandaMarket Database Restore"
log "File: $BACKUP_FILE"
log "Target: $PG_USER@$PG_HOST:$PG_PORT/$PG_DB"
log "═══════════════════════════════════════════════════"

echo ""
echo "WARNING: This will OVERWRITE the current database '$PG_DB'."
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
  echo "Restore cancelled."
  exit 0
fi

log "Restoring database..."

if command -v psql &>/dev/null; then
  gunzip -c "$BACKUP_FILE" | psql -h "$PG_HOST" -p "$PG_PORT" -U "$PG_USER" -d "$PG_DB" --quiet
elif command -v docker &>/dev/null; then
  gunzip -c "$BACKUP_FILE" | docker compose exec -T postgres psql -U "$PG_USER" -d "$PG_DB" --quiet
else
  echo "ERROR: psql not found and Docker not available."
  exit 1
fi

log "═══════════════════════════════════════════════════"
log "Restore complete!"
log "═══════════════════════════════════════════════════"
