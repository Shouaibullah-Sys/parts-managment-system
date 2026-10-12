#!/usr/bin/env bash
set -euo pipefail

# Phase 0 backup: dumps DATABASE_URL (.env) to backups/db-<timestamp>.sql.gz
# Keeps the newest 14 archives.
#
# Notes:
# - Requires pg_dump >= 17 (Neon runs PG 17); Ubuntu's default 16 refuses.
#   We auto-discover /usr/lib/postgresql/*/bin/pg_dump if PATH's is too old.
# - The office link to Neon is slow/bursty; a full dump took ~103s here, so
#   we allow up to 10 minutes per attempt and retry once.
#
# Usage:
#   ./scripts/backup-db.sh                            # dump DATABASE_URL from .env
#   BACKUP_DATABASE_URL=... ./scripts/backup-db.sh    # dump a specific DB (e.g. Neon)
# Restore: gunzip -c backups/db-*.sql.gz | psql "$LOCAL_DATABASE_URL"

cd "$(dirname "$0")/.."
mkdir -p backups

DB_URL="${BACKUP_DATABASE_URL:-}"
if [ -z "${DB_URL}" ]; then
  DB_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- || true)"
fi
if [ -z "${DB_URL}" ]; then
  echo "ERROR: DATABASE_URL not found in .env" >&2
  exit 1
fi

find_pg_dump() {
  local c v
  for c in "$(command -v pg_dump || echo /nonexistent)" /usr/lib/postgresql/*/bin/pg_dump; do
    [ -x "$c" ] || continue
    v="$("$c" --version | sed -n 's/^[^0-9]*\([0-9][0-9]*\).*/\1/p')"
    if [ -n "$v" ] && [ "$v" -ge 17 ] 2>/dev/null; then
      echo "$c"
      return 0
    fi
  done
  return 1
}

PG_DUMP="$(find_pg_dump)" || {
  echo "ERROR: need pg_dump >= 17 (Neon server version). Install postgresql-client-17+." >&2
  exit 1
}

STAMP="$(date +%Y%m%d-%H%M%S)"
FILE="backups/db-${STAMP}.sql.gz"
ERR="$(mktemp)"
attempt() {
  timeout "${BACKUP_TIMEOUT:-600}" "$PG_DUMP" --dbname="$DB_URL" --no-owner --no-privileges 2>"$ERR" | gzip > "$FILE"
}

echo "Using $PG_DUMP ($("$PG_DUMP" --version | awk '{print $3}'))"
if attempt; then
  rm -f "$ERR"
else
  echo "First attempt failed, retrying once..." >&2
  sleep 5
  attempt || {
    rm -f "$FILE"
    echo "ERROR: pg_dump failed:" >&2
    cat "$ERR" >&2
    rm -f "$ERR"
    exit 1
  }
  rm -f "$ERR"
fi

if [ ! -s "$FILE" ]; then
  rm -f "$FILE"
  echo "ERROR: backup file is empty" >&2
  exit 1
fi

echo "OK: $FILE ($(du -h "$FILE" | cut -f1))"

# Keep only the newest 14 backups
ls -1t backups/db-*.sql.gz 2>/dev/null | tail -n +15 | xargs -r rm -f
