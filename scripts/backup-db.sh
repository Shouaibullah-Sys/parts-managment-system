#!/usr/bin/env bash
set -euo pipefail

# Dumps DATABASE_URL (.env) to backups/db-<timestamp>.sql.gz, keeps the newest
# BACKUP_RETAIN (default 14) archives, optionally uploads to Cloudflare R2 via
# rclone, and reports to healthchecks.io.
#
# Configuration (all optional; set in the environment, a sourced config file, or .env):
#   BACKUP_CONFIG        path to a shell config to source (default: ~/.diplomasi-backup.env)
#   BACKUP_DATABASE_URL  dump this DB instead of .env's DATABASE_URL (e.g. Neon)
#   R2_REMOTE            rclone remote name (e.g. r2diplomasi) -> enables off-site copy
#   R2_BUCKET            bucket name (default: diplomasi-backups)
#   R2_RETAIN_DAYS       prune remote copies older than this many days (default: 60)
#   HEALTHCHECK_URL      healthchecks.io ping URL -> start/success/fail pings
#   BACKUP_RETAIN        number of local archives to keep (default: 14)
#
# Notes:
# - Requires pg_dump >= 17 (Neon runs PG 17); Ubuntu's default 16 refuses.
#   We auto-discover /usr/lib/postgresql/*/bin/pg_dump if PATH's is too old.
# - Off-site upload needs `rclone` installed and a configured remote.
#
# Usage:
#   ./scripts/backup-db.sh                            # dump DATABASE_URL from .env
#   BACKUP_DATABASE_URL=... ./scripts/backup-db.sh    # dump a specific DB (e.g. Neon)
# Restore: ./scripts/restore-db.sh backups/db-*.sql.gz

cd "$(dirname "$0")/.."

# Optional config: off-site target + monitoring. Never commit (holds secrets).
BACKUP_CONFIG="${BACKUP_CONFIG:-$HOME/.diplomasi-backup.env}"
if [ -f "$BACKUP_CONFIG" ]; then
  # shellcheck disable=SC1090
  . "$BACKUP_CONFIG"
fi

# Fall back to .env for any values not already in the environment.
env_get() { [ -f .env ] && grep -E "^$1=" .env | head -1 | cut -d= -f2- || true; }
: "${R2_REMOTE:=$(env_get R2_REMOTE)}"
: "${R2_BUCKET:=$(env_get R2_BUCKET)}"
: "${HEALTHCHECK_URL:=$(env_get HEALTHCHECK_URL)}"

mkdir -p backups

# healthchecks.io ping (start/success/fail). Never let monitoring break a backup.
hc() {
  [ -n "${HEALTHCHECK_URL:-}" ] || return 0
  curl -fsS -m 10 --retry 3 -o /dev/null "${HEALTHCHECK_URL}${1:-}" 2>/dev/null || true
}

SUCCESS=0
finish() {
  if [ "${SUCCESS}" = 1 ]; then hc; else hc /fail; fi
}
trap finish EXIT

DB_URL="${BACKUP_DATABASE_URL:-}"
if [ -z "${DB_URL}" ]; then
  DB_URL="$(env_get DATABASE_URL)"
fi
if [ -z "${DB_URL}" ]; then
  echo "ERROR: DATABASE_URL not found in .env" >&2
  exit 1
fi

hc /start

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

# Off-site copy to Cloudflare R2 (or any rclone remote), if configured.
if [ -n "${R2_REMOTE:-}" ]; then
  command -v rclone >/dev/null 2>&1 || { echo "ERROR: R2_REMOTE set but rclone not installed" >&2; exit 1; }
  BUCKET="${R2_BUCKET:-diplomasi-backups}"
  DEST="${R2_REMOTE}:${BUCKET}/db/$(basename "$FILE")"
  echo "Uploading to ${DEST} ..."
  rclone copyto "$FILE" "$DEST" --s3-no-check-bucket
  rclone delete "${R2_REMOTE}:${BUCKET}/db" --min-age "${R2_RETAIN_DAYS:-60}d" >/dev/null 2>&1 || true
  echo "Off-site copy OK."
fi

SUCCESS=1

# Keep only the newest BACKUP_RETAIN local backups
ls -1t backups/db-*.sql.gz 2>/dev/null | tail -n +"$(( ${BACKUP_RETAIN:-14} + 1 ))" | xargs -r rm -f
