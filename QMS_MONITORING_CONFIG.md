# QMS System Monitoring Configuration

## Monitoring Schedule
- **Frequency:** Every 6 hours (4 times daily)
- **Times:** 04:00, 10:00, 16:00, 22:00 EDT (approximately)
- **Cron Job ID:** 3e2fd42a-8a30-44cd-9fcd-b959d021a903
- **Updated:** March 24, 2026 at 16:41 EDT (changed from 4-hour to 6-hour intervals)

## Health Check Components
1. **Frontend Server** - Port 5174 accessibility and response
2. **Backend API** - Port 3002 functionality and authentication
3. **Authentication System** - Login system working correctly
4. **Tunnel Connectivity** - Cloudflare tunnel active and accessible
5. **Database Connection** - SQLite database accessible and responding
6. **Document Storage** - File system and document directories accessible
7. **Current Tunnel URL** - Active URL testing and accessibility
8. **System Performance** - Overall responsiveness and health metrics

## Alert System
- **Delivery:** Telegram messages to Hudson
- **Trigger:** Any component failure or performance issue
- **Content:** Diagnostic information, current status, and action needed
- **Frequency:** Immediate alerts + regular 6-hour status updates

## Current System URLs
- **Active Tunnel:** https://watch-creatures-adrian-magnitude.trycloudflare.com
- **Local Access:** http://localhost:5174
- **Login:** admin / admin123

## System Status (Last Check: March 24, 2026 16:41 EDT)
- ✅ Frontend: ONLINE
- ✅ Backend: ONLINE  
- ✅ Tunnel: ACTIVE
- ✅ Authentication: WORKING
- ✅ Database: CONNECTED

## Management Commands
- **List cron jobs:** `cron list`
- **Manual status check:** `@qms status`
- **Disable monitoring:** `cron remove 3e2fd42a-8a30-44cd-9fcd-b959d021a903`

## Schedule Changes
- **Previous:** Every 4 hours (6 times daily)
- **Current:** Every 6 hours (4 times daily) - Updated Mar 24, 2026
- **Reason:** Reduced frequency per Hudson's request

## Notes
- 6-hour monitoring provides adequate coverage while reducing notification frequency
- Critical for SGS audit preparation (April 23, 2026)
- Proactive issue detection prevents downtime
- Full system health visibility 4 times daily
- Monitoring times will naturally drift but maintain 6-hour intervals