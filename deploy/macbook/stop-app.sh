#!/usr/bin/env bash
set -euo pipefail
# Stop the shop app started by start-app.sh.
if pkill -f ".next/standalone/server.js"; then
  echo "stopped"
else
  echo "not running"
fi
