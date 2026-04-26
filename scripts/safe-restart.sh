#!/bin/bash
# Safe QMS restart — ALWAYS backs up DB first
echo "[SAFE-RESTART] Backing up database before restart..."
bash ~/Projects/kki-qms/scripts/backup-db.sh

echo "[SAFE-RESTART] Restarting server..."
bash ~/Projects/kki-qms/restart-server.sh
