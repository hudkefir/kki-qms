#!/bin/bash
# Daily SQLite backup for QMS Dashboard
DB="/Users/kefirbot/Projects/kki-qms/server/data/qms.db"
BACKUP_DIR="/Users/kefirbot/Projects/kki-qms/backups"
TIMESTAMP=$(date +%Y-%m-%d_%H%M)

mkdir -p "$BACKUP_DIR"

# Use SQLite .backup for a safe, consistent copy
sqlite3 "$DB" ".backup ${BACKUP_DIR}/qms-${TIMESTAMP}.db" 2>&1

# Keep only last 14 backups
ls -t "$BACKUP_DIR"/qms-*.db 2>/dev/null | tail -n +15 | xargs rm -f 2>/dev/null

echo "[qms-backup] $(date) — backed up to qms-${TIMESTAMP}.db ($(du -h "${BACKUP_DIR}/qms-${TIMESTAMP}.db" | cut -f1))"
