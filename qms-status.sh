#!/bin/bash
# QMS System Status CLI - Quick access for Hudson
# Created by QMS Specialist Agent

echo "🎯 KKI QMS SYSTEM STATUS"
echo "========================="
echo "Time: $(date)"
echo ""

# System Health
echo "🔥 CRITICAL SYSTEMS:"
if nc -z localhost 3002 >/dev/null 2>&1; then
    echo "✅ Backend API (3002): RUNNING"
else
    echo "❌ Backend API (3002): DOWN"
fi

if nc -z localhost 5174 >/dev/null 2>&1; then
    echo "✅ Frontend UI (5174): RUNNING" 
else
    echo "❌ Frontend UI (5174): DOWN"
fi

# Database Health
DB_STATUS=$(sqlite3 /Users/kefirbot/KKI/Databases/qms.db "PRAGMA integrity_check;" 2>&1)
if [[ "$DB_STATUS" == "ok" ]]; then
    echo "✅ Database: HEALTHY"
else
    echo "❌ Database: ISSUES DETECTED"
fi

# Process Status  
if pgrep -f "kki-qms" > /dev/null; then
    echo "✅ QMS Processes: RUNNING"
else
    echo "❌ QMS Processes: NOT FOUND"
fi

echo ""
echo "📊 SYSTEM STATISTICS:"
STATS=$(sqlite3 /Users/kefirbot/KKI/Databases/qms.db "SELECT COUNT(*) FROM sops; SELECT COUNT(*) FROM users; SELECT COUNT(*) FROM complaints;" 2>/dev/null)
if [[ $? -eq 0 ]]; then
    SOP_COUNT=$(echo "$STATS" | sed -n '1p')
    USER_COUNT=$(echo "$STATS" | sed -n '2p') 
    COMPLAINT_COUNT=$(echo "$STATS" | sed -n '3p')
    echo "   SOPs: $SOP_COUNT"
    echo "   Users: $USER_COUNT"  
    echo "   Complaints: $COMPLAINT_COUNT"
else
    echo "   Unable to retrieve statistics"
fi

echo ""
echo "🌐 REMOTE ACCESS:"
if [[ -f ~/Projects/kki-qms/tunnel_url.txt ]]; then
    echo "   $(grep https ~/Projects/kki-qms/tunnel_url.txt)"
else
    echo "   Tunnel URL file not found"
fi

echo ""
echo "📁 QUICK ACTIONS:"
echo "   View logs:     tail -f /Users/kefirbot/KKI/logs/qms_health_\$(date +%Y%m%d).log"
echo "   Restart QMS:   launchctl restart com.kki.qms"
echo "   Health check:  ~/Projects/kki-qms/scripts/daily_health_check.sh"
echo "   Full report:   cat ~/Projects/kki-qms/QMS_SYSTEM_ASSESSMENT.md"