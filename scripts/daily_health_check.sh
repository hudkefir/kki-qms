#!/bin/bash
# QMS Daily Health Check Script
# Created by QMS Specialist - March 24, 2026

LOG_FILE="/Users/kefirbot/KKI/logs/qms_health_$(date +%Y%m%d).log"
ALERT_FILE="/Users/kefirbot/KKI/logs/qms_alerts.log"
DATE=$(date '+%Y-%m-%d %H:%M:%S')

echo "[$DATE] Starting QMS Daily Health Check" >> "$LOG_FILE"

# Function to log and alert
alert() {
    echo "[$DATE] ALERT: $1" >> "$ALERT_FILE"
    echo "[$DATE] ALERT: $1" >> "$LOG_FILE"
    # TODO: Add Telegram notification
    echo "QMS Alert: $1" | mail -s "QMS System Alert" hudson@kefirkultures.com 2>/dev/null || true
}

log() {
    echo "[$DATE] $1" >> "$LOG_FILE"
}

# Check if QMS API is responding
log "Checking API health..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3002/api/auth/status)
if [[ "$HTTP_STATUS" == "401" ]] || [[ "$HTTP_STATUS" == "200" ]]; then
    log "✓ API is healthy (HTTP $HTTP_STATUS)"
else
    alert "API is not responding on port 3002 (HTTP $HTTP_STATUS)"
    # Try to restart the service
    log "Attempting to restart QMS service..."
    launchctl stop com.kki.qms
    sleep 5
    launchctl start com.kki.qms
    sleep 10
    
    if curl -f -s http://localhost:3002/api/health > /dev/null; then
        log "✓ API restarted successfully"
    else
        alert "CRITICAL: API restart failed - manual intervention required"
    fi
fi

# Check database integrity
log "Checking database integrity..."
INTEGRITY=$(sqlite3 /Users/kefirbot/KKI/Databases/qms.db "PRAGMA integrity_check;" 2>&1)
if [[ "$INTEGRITY" == "ok" ]]; then
    log "✓ Database integrity check passed"
else
    alert "Database integrity check failed: $INTEGRITY"
fi

# Check document storage
log "Checking document storage..."
if [[ -d "/Users/kefirbot/KKI/QMS/SOPs" ]]; then
    SOP_COUNT=$(find /Users/kefirbot/KKI/QMS/SOPs -name "*.docx" | wc -l)
    log "✓ Document storage accessible, $SOP_COUNT SOP documents found"
else
    alert "Document storage directory not accessible"
fi

# Check available disk space
log "Checking disk space..."
DISK_USAGE=$(df -h /Users/kefirbot/KKI | awk 'NR==2 {print $5}' | sed 's/%//')
if [[ $DISK_USAGE -lt 90 ]]; then
    log "✓ Disk space OK (${DISK_USAGE}% used)"
else
    alert "Low disk space warning: ${DISK_USAGE}% used"
fi

# Check process health
log "Checking process health..."
if pgrep -f "kki-qms" > /dev/null; then
    log "✓ QMS processes are running"
else
    alert "No QMS processes found"
fi

# Check tunnel connectivity (if configured)
log "Checking tunnel connectivity..."
if pgrep -f "cloudflared" > /dev/null; then
    log "✓ Cloudflared tunnel is running"
    # TODO: Test actual tunnel connectivity
else
    log "⚠ No cloudflared tunnel found"
fi

# Database statistics
log "Collecting database statistics..."
SOP_COUNT=$(sqlite3 /Users/kefirbot/KKI/Databases/qms.db "SELECT COUNT(*) FROM sops;")
USER_COUNT=$(sqlite3 /Users/kefirbot/KKI/Databases/qms.db "SELECT COUNT(*) FROM users;")
COMPLAINT_COUNT=$(sqlite3 /Users/kefirbot/KKI/Databases/qms.db "SELECT COUNT(*) FROM complaints;")
log "Statistics: $SOP_COUNT SOPs, $USER_COUNT users, $COMPLAINT_COUNT complaints"

# Log rotation (keep only last 30 days)
find /Users/kefirbot/KKI/logs -name "qms_health_*.log" -mtime +30 -delete 2>/dev/null || true

echo "[$DATE] Health check completed" >> "$LOG_FILE"