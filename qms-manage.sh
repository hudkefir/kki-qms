#!/bin/bash
# QMS Service Management Script

AGENTS=(
    "com.kefir.qms-server"
    "com.kefir.qms-client"
    "com.kefir.qms-tunnel"
)
PLIST_DIR="$HOME/Library/LaunchAgents"

start() {
    echo "Starting QMS services..."
    for agent in "${AGENTS[@]}"; do
        launchctl load "$PLIST_DIR/$agent.plist" 2>/dev/null
        launchctl start "$agent" 2>/dev/null
        echo "  Started $agent"
    done
    echo "Done. Use '$0 status' to check."
}

stop() {
    echo "Stopping QMS services..."
    for agent in "${AGENTS[@]}"; do
        launchctl stop "$agent" 2>/dev/null
        launchctl unload "$PLIST_DIR/$agent.plist" 2>/dev/null
        echo "  Stopped $agent"
    done
    echo "Done."
}

restart() {
    stop
    sleep 2
    start
}

status() {
    echo "=== QMS Service Status ==="
    echo ""
    for agent in "${AGENTS[@]}"; do
        pid=$(launchctl list | grep "$agent" | awk '{print $1}')
        if [ -n "$pid" ] && [ "$pid" != "-" ]; then
            echo "  ✓ $agent (PID: $pid)"
        elif launchctl list | grep -q "$agent"; then
            echo "  ✗ $agent (loaded but not running)"
        else
            echo "  ✗ $agent (not loaded)"
        fi
    done
    echo ""
    echo "=== Port Check ==="
    if lsof -i :3002 -sTCP:LISTEN >/dev/null 2>&1; then
        echo "  ✓ Backend on port 3002"
    else
        echo "  ✗ Backend not listening on 3002"
    fi
    if lsof -i :5174 -sTCP:LISTEN >/dev/null 2>&1; then
        echo "  ✓ Frontend on port 5174"
    else
        echo "  ✗ Frontend not listening on 5174"
    fi
    if pgrep -f "cloudflared tunnel.*kki-qms" >/dev/null 2>&1; then
        echo "  ✓ Cloudflare tunnel running"
    else
        echo "  ✗ Cloudflare tunnel not running"
    fi
}

case "$1" in
    start)   start ;;
    stop)    stop ;;
    restart) restart ;;
    status)  status ;;
    *)
        echo "Usage: $0 {start|stop|restart|status}"
        exit 1
        ;;
esac
