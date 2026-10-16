#!/usr/bin/env bash
#
# setup-tunnel.sh — one-time Cloudflare Tunnel setup for the Diplomasi parts
# system. Run this on the machine that hosts the app (the shop server/MacBook).
#
# Prerequisites:
#   1. cloudflared installed  (brew install cloudflared  |  or the .pkg)
#   2. The domain diplmasiltd.net added to Cloudflare and its nameservers
#      changed at the registrar (Hostinger) to the two Cloudflare NS.
#      See runbook.md §1.
#
# What this does:
#   - logs you into Cloudflare (opens a browser)
#   - creates a named tunnel "diplomasi"
#   - writes ~/.cloudflared/config.yml
#   - creates the DNS records for diplmasiltd.net + www
#   - tells you how to run it now and install it as a boot service
#
set -euo pipefail

DOMAIN="diplmasiltd.net"
WWW="www.${DOMAIN}"
TUNNEL="diplomasi"
APPPORT="${APPPORT:-3000}"
CFG_DIR="${HOME}/.cloudflared"
CFG="${CFG_DIR}/config.yml"

say() { printf '\n\033[1;36m==> %s\033[0m\n' "$*"; }

command -v cloudflared >/dev/null 2>&1 || {
  echo "cloudflared not found. Install it first:"; echo "  brew install cloudflared"; exit 1;
}

mkdir -p "$CFG_DIR"

say "1/5  Log in to Cloudflare (a browser window will open)"
cloudflared tunnel login

say "2/5  Create the tunnel '${TUNNEL}'"
# `create` is idempotent-ish: it errors if it already exists, which is fine.
cloudflared tunnel create "$TUNNEL" || echo "(tunnel may already exist — continuing)"

TUNNEL_ID="$(cloudflared tunnel list -o json | sed -n 's/.*"id":"\([^"]*\)","name":"'"${TUNNEL}"'".*/\1/p')"
if [ -z "${TUNNEL_ID}" ]; then
  echo "Could not determine tunnel id. Run 'cloudflared tunnel list' and set it manually in ${CFG}."
fi

say "3/5  Write ${CFG}"
cat > "$CFG" <<EOF
tunnel: ${TUNNEL}
credentials-file: ${CFG_DIR}/${TUNNEL_ID}.json

ingress:
  - hostname: ${DOMAIN}
    service: http://localhost:${APPPORT}
  - hostname: ${WWW}
    service: http://localhost:${APPPORT}
  - service: http_status:404
EOF
echo "wrote ${CFG}"

say "4/5  Create DNS records"
cloudflared tunnel route dns "$TUNNEL" "$DOMAIN"
cloudflared tunnel route dns "$TUNNEL" "$WWW"

say "5/5  Test it"
echo "Start the app (it must listen on ${APPPORT}), then in another terminal:"
echo "    cloudflared tunnel run ${TUNNEL}"
echo "Then open https://${DOMAIN} — you should see the login page, and once"
echo "signed in, a «حالت مشاهده» (read-only) banner."
echo
echo "Install as a service so it starts at boot:"
echo "    macOS :  sudo cloudflared service install   (uses ${CFG})"
echo "             (or use com.diplomasi.cloudflared.plist in this folder)"
echo "    Linux :  sudo cp cloudflared-tunnel.service /etc/systemd/system/"
echo "             sudo systemctl enable --now cloudflared-tunnel"
echo
echo "Finally, protect the hostname with Cloudflare Access (runbook.md §3)."
