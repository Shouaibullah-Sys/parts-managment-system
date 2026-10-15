#!/usr/bin/env bash
set -euo pipefail

# Uptime probe for the public site, reporting to healthchecks.io.
#
# Run periodically (launchd/systemd timer, every ~5 min). It GETs the public
# URL and pings the healthchecks check: success if the site answers with an
# expected status, /fail otherwise. If this machine is off, the check simply
# stops receiving pings and healthchecks.io alerts you.
#
# Config (environment or ~/.diplomasi-backup.env):
#   PUBLIC_URL          default https://diplmasiltd.net
#   UPTIME_HEALTHCHECK_URL   healthchecks.io ping URL for this probe

CONFIG="${BACKUP_CONFIG:-$HOME/.diplomasi-backup.env}"
[ -f "$CONFIG" ] && . "$CONFIG"

cd "$(dirname "$0")/.."
env_get() { [ -f .env ] && grep -E "^$1=" .env | head -1 | cut -d= -f2- || true; }
: "${PUBLIC_URL:=$(env_get PUBLIC_URL)}"
: "${PUBLIC_URL:=https://diplmasiltd.net}"
: "${UPTIME_HEALTHCHECK_URL:=$(env_get UPTIME_HEALTHCHECK_URL)}"

hc() {
  [ -n "${UPTIME_HEALTHCHECK_URL:-}" ] || return 0
  curl -fsS -m 10 -o /dev/null "${UPTIME_HEALTHCHECK_URL}${1:-}" 2>/dev/null || true
}

code="$(curl -s -o /dev/null -m 20 -w '%{http_code}' "$PUBLIC_URL" 2>/dev/null || echo 000)"

case "$code" in
  200|301|302|307|401|403) echo "OK: $PUBLIC_URL -> $code"; hc ;;
  *) echo "FAIL: $PUBLIC_URL -> $code" >&2; hc /fail; exit 1 ;;
esac
