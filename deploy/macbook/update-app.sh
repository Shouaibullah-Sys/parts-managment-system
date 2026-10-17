#!/usr/bin/env bash
set -euo pipefail
# Update the shop app to the latest code and restart it.
#
#   ./deploy/macbook/update-app.sh          pull + install + build + migrate + restart
#   UPDATE_SKIP_MIGRATE=1 ...               skip the DB migration step
#
# Safe to run while the old build is serving: the app is only restarted after
# the new standalone build has finished successfully.

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

echo "==> Pulling latest code"
git pull --ff-only

echo "==> Installing dependencies (pnpm, locked)"
corepack enable >/dev/null 2>&1 || true
if command -v pnpm >/dev/null 2>&1; then
  pnpm install --frozen-lockfile
  pnpm build
else
  npx --yes pnpm@10.27.0 install --frozen-lockfile
  npx --yes pnpm@10.27.0 build
fi

if [ "${UPDATE_SKIP_MIGRATE:-0}" != "1" ]; then
  echo "==> Applying database migrations"
  bash scripts/migrate.sh
fi

echo "==> Restarting the app"
launchctl kickstart -k "gui/$(id -u)/com.diplomasi.app" 2>/dev/null || {
  launchctl unload ~/Library/LaunchAgents/com.diplomasi.app.plist 2>/dev/null || true
  launchctl load -w ~/Library/LaunchAgents/com.diplomasi.app.plist
}

echo "==> Done. Check: curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:3000/login"
