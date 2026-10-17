#!/usr/bin/env bash
set -euo pipefail
# Start the shop app (Next.js standalone server) on 127.0.0.1:3000.
# Also used by com.diplomasi.app.plist as a login/boot agent.

REPO="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$REPO"
export PATH="/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin"

if [ ! -f .next/standalone/server.js ]; then
  echo "First run: installing dependencies and building (this takes a few minutes)..."
  # The repo is locked with pnpm (pnpm-lock.yaml). Corepack ships with Node 20+
  # and activates the version pinned in package.json ("packageManager").
  corepack enable >/dev/null 2>&1 || true
  if command -v pnpm >/dev/null 2>&1; then
    pnpm install --frozen-lockfile
    pnpm build
  else
    npx --yes pnpm@10.27.0 install --frozen-lockfile
    npx --yes pnpm@10.27.0 build
  fi
fi

# Bind all interfaces so LAN clients get full read/write; the Cloudflare
# Tunnel still connects via localhost. Public hostnames stay read-only.
exec env PORT="${PORT:-3000}" HOSTNAME=0.0.0.0 \
  node .next/standalone/server.js
