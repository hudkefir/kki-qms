#!/bin/bash
# QMS Database Backup Script
# Backs up production database with timestamp
# Keeps last 30 daily backups + weekly backups for 12 weeks

DB_PATH="/Users/kefirbot/KKI/Databases/qms.db"
BACKUP_DIR="/Users/kefirbot/KKI/Databases/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DAY_OF_WEEK=$(date +%u)

mkdir -p "$BACKUP_DIR/daily" "$BACKUP_DIR/weekly"

# Checkpoint WAL first to ensure consistency
sqlite3 "$DB_PATH" "PRAGMA wal_checkpoint(FULL);"

# Daily backup
cp "$DB_PATH" "$BACKUP_DIR/daily/qms-${TIMESTAMP}.db"
echo "[BACKUP] Daily: qms-${TIMESTAMP}.db ($(stat -f%z "$BACKUP_DIR/daily/qms-${TIMESTAMP}.db") bytes)"

# Weekly backup on Sundays
if [ "$DAY_OF_WEEK" = "7" ]; then
    cp "$DB_PATH" "$BACKUP_DIR/weekly/qms-weekly-${TIMESTAMP}.db"
    echo "[BACKUP] Weekly: qms-weekly-${TIMESTAMP}.db"
fi

# Prune: keep last 30 daily
cd "$BACKUP_DIR/daily"
ls -t qms-*.db 2>/dev/null | tail -n +31 | xargs rm -f 2>/dev/null

# Prune: keep last 12 weekly
cd "$BACKUP_DIR/weekly"
ls -t qms-weekly-*.db 2>/dev/null | tail -n +13 | xargs rm -f 2>/dev/null

# Verify backup integrity
ORIG_COUNT=$(sqlite3 "$DB_PATH" "SELECT COUNT(*) FROM suppliers;")
BACKUP_COUNT=$(sqlite3 "$BACKUP_DIR/daily/qms-${TIMESTAMP}.db" "SELECT COUNT(*) FROM suppliers;")
if [ "$ORIG_COUNT" = "$BACKUP_COUNT" ]; then
    echo "[BACKUP] ✅ Integrity check passed (${ORIG_COUNT} suppliers)"
else
    echo "[BACKUP] ❌ INTEGRITY MISMATCH! Original=${ORIG_COUNT} Backup=${BACKUP_COUNT}"
fi
