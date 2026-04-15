#!/bin/bash
# Professional QMS Tunnel Startup Script

echo "🚀 Starting KKI QMS Professional Tunnel..."

# Kill any existing tunnels
pkill -f cloudflared 2>/dev/null
sleep 2

# Start the professional tunnel
cloudflared tunnel --config ~/.cloudflared/config.yml run KKI-QMS-Production > /tmp/professional-qms-tunnel.log 2>&1 &

echo "✅ Professional tunnel started"
echo "📄 Logs: /tmp/professional-qms-tunnel.log"
echo "🌐 URL: https://qms.kefirkultures.com"
