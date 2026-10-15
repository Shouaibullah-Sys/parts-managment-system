#!/usr/bin/env bash
set -euo pipefail

# Restore a dump produced by scripts/backup-db.sh into a database.
#
# Usage:
#   ./scripts/restore-db.sh backups/db-20260101-023000.sql.gz          # prompts
#   RESTORE_DATABASE_URL=postgres://... ./scripts/restore-db.sh <file> --yes
#
# Defaults to DATABASE_URL from .env. Use RESTORE_DATABASE_URL to target a
# scratch DB first (strongly recommended — restore is destructive).

cd "$(dirname "$0")/.."

FILE="${1:-}"
YES="${2:-}"
if [ -z "$FILE" ] || [ ! -f "$FILE" ]; then
  echo "Usage: $0 <dump.sql[.gz]> [--yes]" >&2
  echo "Available:" >&2
  ls -1t backups/db-*.sql.gz 2>/dev/null | head -10 >&2 || true
  exit 1
fi

env_get() { [ -f .env ] && grep -E "^$1=" .env | head -1 | cut -d= -f2- || true; }
DB_URL="${RESTORE_DATABASE_URL:-$(env_get DATABASE_URL)}"
[ -n "$DB_URL" ] || { echo "ERROR: no DATABASE_URL (set RESTORE_DATABASE_URL)" >&2; exit 1; }

find_psql() {
  local c v
  for c in "$(command -v psql || echo /nonexistent)" /usr/lib/postgresql/*/bin/psql; do
    [ -x "$c" ] || continue
    v="$("$c" --version | sed -n 's/^[^0-9]*\([0-9][0-9]*\).*/\1/p')"
    if [ -n "$v" ] && [ "$v" -ge 17 ] 2>/dev/null; then echo "$c"; return 0; fi
  done
  return 1
}
PSQL="$(find_psql)" || { echo "ERROR: need psql >= 17" >&2; exit 1; }

TARGET="$(printf '%s' "$DB_URL" | sed -E 's#(://[^:]+):[^@]*@#\1:***@#')"
echo "About to RESTORE $FILE"
echo "  into: $TARGET"
echo "  psql: $PSQL ($("$PSQL" --version | awk '{print $3}'))"
if [ "$YES" != "--yes" ]; then
  read -r -p "This will overwrite data. Type 'yes' to continue: " ans
  [ "$ans" = "yes" ] || { echo "aborted"; exit 1; }
fi

case "$FILE" in
  *.gz) gunzip -c "$FILE" | "$PSQL" --dbname="$DB_URL" -v ON_ERROR_STOP=1 ;;
  *)    "$PSQL" --dbname="$DB_URL" -v ON_ERROR_STOP=1 -f "$FILE" ;;
esac
echo "Restore complete."
