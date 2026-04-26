#!/bin/bash
# QMS Database Restore Script
# Usage: ./restore-db.sh [backup-file]
# Without args: lists available backups

DB_PATH="/Users/kefirbot/KKI/Databases/qms.db"
BACKUP_DIR="/Users/kefirbot/KKI/Databases/backups"

if [ -z "$1" ]; then
    echo "Available backups (newest first):"
    echo ""
    echo "=== Daily ==="
    ls -lt "$BACKUP_DIR/daily/"*.db 2>/dev/null | head -10 | while read line; do
        FILE=$(echo "$line" | awk "{print \$NF}")
        SIZE=$(stat -f%z "$FILE" 2>/dev/null)
        SUPPLIERS=$(sqlite3 "$FILE" "SELECT COUNT(*) FROM suppliers;" 2>/dev/null)
        CCRS=$(sqlite3 "$FILE" "SELECT COUNT(*) FROM ccrs;" 2>/dev/null)
        COMPLAINTS=$(sqlite3 "$FILE" "SELECT COUNT(*) FROM complaints;" 2>/dev/null)
        CAPAS=$(sqlite3 "$FILE" "SELECT COUNT(*) FROM capas;" 2>/dev/null)
        echo "  $(basename $FILE) — ${SIZE} bytes | ${SUPPLIERS} suppliers, ${CCRS} CCRs, ${COMPLAINTS} complaints, ${CAPAS} CAPAs"
    done
    echo ""
    echo "=== Historical ==="
    ls -lt "$DB_PATH".bak-* 2>/dev/null | head -5 | while read line; do
        FILE=$(echo "$line" | awk "{print \$NF}")
        echo "  $(basename $FILE) — $(stat -f%z "$FILE") bytes"
    done
    echo ""
    echo "Usage: $0 <path-to-backup>"
    exit 0
fi

BACKUP="$1"
if [ ! -f "$BACKUP" ]; then
    echo "ERROR: Backup file not found: $BACKUP"
    exit 1
fi

# Safety: backup current DB before restoring
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
echo "[RESTORE] Backing up current DB first..."
sqlite3 "$DB_PATH" "PRAGMA wal_checkpoint(FULL);"
cp "$DB_PATH" "$BACKUP_DIR/daily/qms-pre-restore-${TIMESTAMP}.db"

echo "[RESTORE] Stopping server..."
kill $(lsof -ti:3002) 2>/dev/null
sleep 2

echo "[RESTORE] Restoring from: $(basename $BACKUP)"
cp "$BACKUP" "$DB_PATH"

echo "[RESTORE] Restarting server..."
export KKI_DATA_DIR=/Users/kefirbot/KKI/Databases
cd /Users/kefirbot/Projects/kki-qms
nohup /opt/homebrew/bin/node server/src/index.js > /tmp/kki-qms.log 2>&1 &
sleep 3

# Verify
SUPPLIERS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM suppliers;")
CCRS=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM ccrs;")
echo "[RESTORE] ✅ Done — ${SUPPLIERS} suppliers, ${CCRS} CCRs"
