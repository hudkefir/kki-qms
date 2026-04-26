#!/bin/bash
# ALWAYS use this script to restart QMS. Never run node directly.
export PATH=/opt/homebrew/bin:/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/System/Cryptexes/App/usr/bin:/usr/bin:/bin:/usr/sbin:/sbin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/local/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/bin:/var/run/com.apple.security.cryptexd/codex.system/bootstrap/usr/appleinternal/bin:/opt/pkg/env/active/bin:/opt/pmk/env/global/bin:/Users/hudsonbay/.cargo/bin:/opt/homebrew/Cellar/node/25.8.1_1/bin:/opt/homebrew/opt/node/bin:/Users/hudsonbay/.local/bin:/Users/hudsonbay/.npm-global/bin:/Users/hudsonbay/bin:/Users/hudsonbay/.volta/bin:/Users/hudsonbay/.asdf/shims:/Users/hudsonbay/.bun/bin:/Users/hudsonbay/Library/Application Support/fnm/aliases/default/bin:/Users/hudsonbay/.fnm/aliases/default/bin:/Users/hudsonbay/Library/pnpm:/Users/hudsonbay/.local/share/pnpm
export KKI_DATA_DIR=/Users/kefirbot/KKI/Databases
export KKI_DOCS_DIR=/Users/kefirbot/KKI/QMS/SOPs

echo "[QMS] Stopping server..."
kill $(lsof -ti:3002) 2>/dev/null
sleep 2

echo "[QMS] Starting server with KKI_DATA_DIR=$KKI_DATA_DIR"
cd /Users/kefirbot/Projects/kki-qms
nohup node server/src/index.js > /tmp/kki-qms.log 2>&1 &
sleep 3

# Verify it's using the right DB
STATUS=$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3002)
DB_SIZE=$(stat -f%z $KKI_DATA_DIR/qms.db 2>/dev/null)

if [ "$STATUS" = "200" ] && [ "$DB_SIZE" -gt 1000000 ]; then
    echo "[QMS] ✅ Server running on correct DB (${DB_SIZE} bytes)"
else
    echo "[QMS] ❌ WARNING: Server may be on wrong DB! Status=$STATUS DB_SIZE=$DB_SIZE"
    echo "[QMS] Falling back to launchctl..."
    kill $(lsof -ti:3002) 2>/dev/null
    launchctl kickstart -k gui/$(id -u)/com.kefir.qms-server
fi
