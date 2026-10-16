#!/usr/bin/env bash
set -euo pipefail
# Start the shop app (Next.js standalone server) on 127.0.0.1:3000.
# Also used by com.diplomasi.app.plist as a login/boot agent.

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

if [ ! -f .next/standalone/server.js ]; then
  echo "First run: installing dependencies and building (this takes a few minutes)..."
  npm install --no-audit --no-fund
  npm run build
fi

# Bind all interfaces so LAN clients get full read/write; the Cloudflare
# Tunnel still connects via localhost. Public hostnames stay read-only.
exec env PORT="${PORT:-3000}" HOSTNAME=0.0.0.0 \
  node .next/standalone/server.js
