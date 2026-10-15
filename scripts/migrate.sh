#!/usr/bin/env bash
set -euo pipefail

# Applies migrations/*.sql in order, once each, tracked in schema_migrations.
#
# Usage:
#   ./scripts/migrate.sh              apply pending migrations
#   ./scripts/migrate.sh --status     list applied / pending (no changes)
#   ./scripts/migrate.sh --baseline   mark all existing .sql as applied WITHOUT
#                                     running them (use on a DB that already has
#                                     the schema, e.g. a restored dump)
#
# Reads DATABASE_URL from .env (or MIGRATE_DATABASE_URL). Requires psql >= 17.
# For a brand-new database, restore a dump first (scripts/restore-db.sh) and
# then `--baseline`; migrations only cover incremental changes since.

cd "$(dirname "$0")/.."

env_get() { [ -f .env ] && grep -E "^$1=" .env | head -1 | cut -d= -f2- || true; }
DB_URL="${MIGRATE_DATABASE_URL:-$(env_get DATABASE_URL)}"
[ -n "$DB_URL" ] || { echo "ERROR: no DATABASE_URL (set MIGRATE_DATABASE_URL)" >&2; exit 1; }

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

MODE="apply"
case "${1:-}" in
  --status)   MODE="status" ;;
  --baseline) MODE="baseline" ;;
  "")         MODE="apply" ;;
  *) echo "unknown option: $1" >&2; exit 1 ;;
esac

"$PSQL" "$DB_URL" -v ON_ERROR_STOP=1 -q \
  -c "CREATE TABLE IF NOT EXISTS schema_migrations (filename text PRIMARY KEY, applied_at timestamptz NOT NULL DEFAULT now());"

shopt -s nullglob
mapfile -t FILES < <(printf '%s\n' migrations/*.sql | sort)
[ "${#FILES[@]}" -gt 0 ] || { echo "no migrations/*.sql found"; exit 0; }

for f in "${FILES[@]}"; do
  name="$(basename "$f")"
  applied="$("$PSQL" "$DB_URL" -tAc "SELECT 1 FROM schema_migrations WHERE filename = '${name//\'/}' LIMIT 1")"

  if [ "$MODE" = "status" ]; then
    printf '%-42s %s\n' "$name" "$([ -n "$applied" ] && echo applied || echo PENDING)"
    continue
  fi

  if [ -n "$applied" ]; then echo "skip (applied): $name"; continue; fi

  if [ "$MODE" = "baseline" ]; then
    "$PSQL" "$DB_URL" -v ON_ERROR_STOP=1 -q \
      -c "INSERT INTO schema_migrations(filename) VALUES ('${name//\'/}') ON CONFLICT DO NOTHING"
    echo "baselined: $name"
    continue
  fi

  echo "applying: $name"
  "$PSQL" "$DB_URL" -v ON_ERROR_STOP=1 -f "$f"
  "$PSQL" "$DB_URL" -v ON_ERROR_STOP=1 -q \
    -c "INSERT INTO schema_migrations(filename) VALUES ('${name//\'/}')"
done

echo "done ($MODE)"
