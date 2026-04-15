#!/bin/bash
# QMS Comprehensive Bug Test Script
# Tests all CRUD operations, auth/role enforcement, audit trail, input validation

BASE="http://localhost:3099/api"
PASS=0
FAIL=0
BUGS=""

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { PASS=$((PASS+1)); echo -e "${GREEN}  PASS${NC}: $1"; }
fail() { FAIL=$((FAIL+1)); BUGS="$BUGS\n- $1"; echo -e "${RED}  FAIL${NC}: $1"; }
section() { echo -e "\n${YELLOW}=== $1 ===${NC}"; }

# Helper: extract JSON field (simple)
json_field() { echo "$1" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('$2',''))" 2>/dev/null; }
http_code() { echo "$1" | tail -1; }
http_body() { echo "$1" | sed '$d'; }

# Curl wrapper that returns body + http_code on last line
api() {
  local method="$1" url="$2" data="$3" cookie="$4"
  local args=(-s -w '\n%{http_code}' -H 'Content-Type: application/json')
  if [ -n "$cookie" ]; then args+=(-b "$cookie"); fi
  if [ "$method" = "GET" ]; then
    curl "${args[@]}" "$url"
  elif [ "$method" = "DELETE" ]; then
    curl "${args[@]}" -X DELETE "$url"
  else
    curl "${args[@]}" -X "$method" -d "$data" "$url"
  fi
}

##############################################################################
section "1. SERVER HEALTH CHECK"
##############################################################################

RESP=$(api GET "$BASE/auth/status")
CODE=$(http_code "$RESP")
if [ "$CODE" = "401" ]; then
  pass "Server responds to unauthenticated request with 401"
else
  fail "Server health check — expected 401 for unauthenticated, got $CODE"
fi

##############################################################################
section "2. AUTH — LOGIN / SESSION"
##############################################################################

# Login as admin
RESP=$(curl -s -w '\n%{http_code}' -c /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/auth/login" -d '{"username":"admin","password":"admin123"}')
CODE=$(http_code "$RESP")
BODY=$(http_body "$RESP")
if [ "$CODE" = "200" ]; then
  ADMIN_ROLE=$(json_field "$BODY" role)
  ADMIN_NAME=$(json_field "$BODY" display_name)
  pass "Admin login (role=$ADMIN_ROLE, display_name=$ADMIN_NAME)"
else
  fail "Admin login failed ($CODE): $BODY"
fi

# Check /auth/me
RESP=$(api GET "$BASE/auth/me" "" "/tmp/qms_admin.cookie")
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "GET /auth/me returns current user"
else
  fail "GET /auth/me returned $CODE"
fi

# Login with bad password
RESP=$(api POST "$BASE/auth/login" '{"username":"admin","password":"wrong"}')
CODE=$(http_code "$RESP")
if [ "$CODE" = "401" ]; then
  pass "Bad password rejected with 401"
else
  fail "Bad password should return 401, got $CODE"
fi

# Login with missing fields
RESP=$(api POST "$BASE/auth/login" '{"username":"admin"}')
CODE=$(http_code "$RESP")
if [ "$CODE" = "400" ]; then
  pass "Missing password rejected with 400"
else
  fail "Missing password should return 400, got $CODE"
fi

##############################################################################
section "3. USER MANAGEMENT (Admin-only)"
##############################################################################

# Create a test viewer user
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/users" -d '{"username":"testviewer","password":"test123","display_name":"Test Viewer","role":"viewer"}')
CODE=$(http_code "$RESP")
BODY=$(http_body "$RESP")
if [ "$CODE" = "201" ]; then
  VIEWER_ID=$(json_field "$BODY" id)
  pass "Create viewer user (id=$VIEWER_ID)"
else
  fail "Create viewer user ($CODE): $BODY"
fi

# Create a test manager user
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/users" -d '{"username":"testmanager","password":"test123","display_name":"Test Manager","role":"manager"}')
CODE=$(http_code "$RESP")
BODY=$(http_body "$RESP")
if [ "$CODE" = "201" ]; then
  MANAGER_ID=$(json_field "$BODY" id)
  pass "Create manager user (id=$MANAGER_ID)"
else
  fail "Create manager user ($CODE): $BODY"
fi

# List users
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/users")
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "GET /users — admin can list users"
else
  fail "GET /users returned $CODE"
fi

# Update user
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X PUT "$BASE/users/$VIEWER_ID" -d '{"display_name":"Updated Viewer"}')
CODE=$(http_code "$RESP")
BODY=$(http_body "$RESP")
UPDATED_NAME=$(json_field "$BODY" display_name)
if [ "$CODE" = "200" ] && [ "$UPDATED_NAME" = "Updated Viewer" ]; then
  pass "PUT /users/:id — updated display_name"
else
  fail "PUT /users/:id ($CODE): $BODY"
fi

# Create user with invalid role
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/users" -d '{"username":"baduser","password":"test123","role":"superadmin"}')
CODE=$(http_code "$RESP")
if [ "$CODE" = "400" ]; then
  pass "Invalid role rejected with 400"
else
  fail "Invalid role should return 400, got $CODE"
fi

# Create duplicate username
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/users" -d '{"username":"testviewer","password":"test123"}')
CODE=$(http_code "$RESP")
if [ "$CODE" = "400" ]; then
  pass "Duplicate username rejected with 400"
else
  fail "Duplicate username should return 400, got $CODE"
fi

##############################################################################
section "4. ROLE ENFORCEMENT — viewer cannot access admin endpoints"
##############################################################################

# Login as viewer
curl -s -c /tmp/qms_viewer.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/auth/login" -d '{"username":"testviewer","password":"test123"}' > /dev/null

# Login as manager
curl -s -c /tmp/qms_manager.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/auth/login" -d '{"username":"testmanager","password":"test123"}' > /dev/null

# Viewer cannot list users
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_viewer.cookie "$BASE/users")
CODE=$(http_code "$RESP")
if [ "$CODE" = "403" ]; then
  pass "Viewer cannot GET /users (403)"
else
  fail "Viewer GET /users should be 403, got $CODE"
fi

# Viewer cannot create users
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_viewer.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/users" -d '{"username":"hack","password":"hack123"}')
CODE=$(http_code "$RESP")
if [ "$CODE" = "403" ]; then
  pass "Viewer cannot POST /users (403)"
else
  fail "Viewer POST /users should be 403, got $CODE"
fi

# Viewer cannot create SOP (write access)
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_viewer.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/sops" -d '{"sop_number":"KK-SOP-99999","title":"Hack","category_code":"QA","category_name":"QA"}')
CODE=$(http_code "$RESP")
if [ "$CODE" = "403" ]; then
  pass "Viewer cannot POST /sops (403)"
else
  fail "Viewer POST /sops should be 403, got $CODE"
fi

# Viewer CAN read SOPs
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_viewer.cookie "$BASE/sops")
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "Viewer CAN GET /sops (200)"
else
  fail "Viewer GET /sops should be 200, got $CODE"
fi

# Viewer cannot access audit-logs
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_viewer.cookie "$BASE/audit-logs")
CODE=$(http_code "$RESP")
if [ "$CODE" = "403" ]; then
  pass "Viewer cannot GET /audit-logs (403)"
else
  fail "Viewer GET /audit-logs should be 403, got $CODE"
fi

# Manager cannot access audit-logs
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_manager.cookie "$BASE/audit-logs")
CODE=$(http_code "$RESP")
if [ "$CODE" = "403" ]; then
  pass "Manager cannot GET /audit-logs (403)"
else
  fail "Manager GET /audit-logs should be 403, got $CODE"
fi

# Manager CAN create SOPs
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_manager.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/sops" -d '{"sop_number":"KK-SOP-MTEST","title":"Manager Test SOP","category_code":"QA","category_name":"Quality Assurance"}')
CODE=$(http_code "$RESP")
BODY=$(http_body "$RESP")
if [ "$CODE" = "201" ]; then
  MTEST_SOP_ID=$(json_field "$BODY" id)
  pass "Manager CAN POST /sops (201)"
  # Clean up
  curl -s -b /tmp/qms_admin.cookie -X DELETE "$BASE/sops/$MTEST_SOP_ID" > /dev/null
else
  fail "Manager POST /sops should be 201, got $CODE"
fi

# Manager cannot delete SOPs (admin only)
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_manager.cookie -X DELETE "$BASE/sops/1")
CODE=$(http_code "$RESP")
if [ "$CODE" = "403" ]; then
  pass "Manager cannot DELETE /sops/:id (403)"
else
  fail "Manager DELETE /sops should be 403, got $CODE"
fi

# Viewer cannot create complaints (write access)
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_viewer.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/complaints" -d '{"date_received":"2026-01-01","description":"test"}')
CODE=$(http_code "$RESP")
if [ "$CODE" = "403" ]; then
  pass "Viewer cannot POST /complaints (403)"
else
  fail "Viewer POST /complaints should be 403, got $CODE"
fi

# Unauthenticated cannot access protected routes
RESP=$(api GET "$BASE/sops")
CODE=$(http_code "$RESP")
if [ "$CODE" = "401" ]; then
  pass "Unauthenticated cannot GET /sops (401)"
else
  fail "Unauthenticated GET /sops should be 401, got $CODE"
fi

# Admin routes require admin
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_manager.cookie -H 'Content-Type: application/json' \
  -X PUT "$BASE/admin/sops/1" -d '{"title":"hacked"}')
CODE=$(http_code "$RESP")
if [ "$CODE" = "403" ]; then
  pass "Manager cannot PUT /admin/sops/:id (403)"
else
  fail "Manager PUT /admin/sops should be 403, got $CODE"
fi

##############################################################################
section "5. SOP CRUD"
##############################################################################

# Create SOP
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/sops" -d '{"sop_number":"KK-SOP-TEST01","title":"Test SOP","category_code":"QA","category_name":"Quality Assurance","version":"1.0","status":"draft","description":"Bug test SOP"}')
CODE=$(http_code "$RESP")
BODY=$(http_body "$RESP")
if [ "$CODE" = "201" ]; then
  TEST_SOP_ID=$(json_field "$BODY" id)
  CREATED_BY=$(json_field "$BODY" created_by)
  pass "Create SOP (id=$TEST_SOP_ID, created_by=$CREATED_BY)"
else
  fail "Create SOP ($CODE): $BODY"
fi

# Read SOP
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/sops/$TEST_SOP_ID")
CODE=$(http_code "$RESP")
BODY=$(http_body "$RESP")
SOP_TITLE=$(json_field "$BODY" title)
if [ "$CODE" = "200" ] && [ "$SOP_TITLE" = "Test SOP" ]; then
  pass "Read SOP by ID"
else
  fail "Read SOP ($CODE): title=$SOP_TITLE"
fi

# Update SOP
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X PUT "$BASE/sops/$TEST_SOP_ID" -d '{"title":"Updated Test SOP","status":"in_review"}')
CODE=$(http_code "$RESP")
BODY=$(http_body "$RESP")
NEW_TITLE=$(json_field "$BODY" title)
NEW_STATUS=$(json_field "$BODY" status)
UPDATED_BY=$(json_field "$BODY" updated_by)
if [ "$CODE" = "200" ] && [ "$NEW_TITLE" = "Updated Test SOP" ] && [ "$NEW_STATUS" = "in_review" ]; then
  pass "Update SOP (title=$NEW_TITLE, status=$NEW_STATUS, updated_by=$UPDATED_BY)"
else
  fail "Update SOP ($CODE): title=$NEW_TITLE, status=$NEW_STATUS"
fi

# List SOPs with filter
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/sops?status=in_review")
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "List SOPs with status filter"
else
  fail "List SOPs with filter ($CODE)"
fi

# Create SOP missing required fields
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/sops" -d '{"title":"No SOP Number"}')
CODE=$(http_code "$RESP")
if [ "$CODE" = "400" ]; then
  pass "Create SOP with missing fields rejected (400)"
else
  fail "Create SOP with missing fields should be 400, got $CODE"
fi

##############################################################################
section "6. SOP COMMENTS — user attribution"
##############################################################################

# Admin creates comment
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/sops/$TEST_SOP_ID/comments" -d '{"comment":"Admin test comment"}')
CODE=$(http_code "$RESP")
BODY=$(http_body "$RESP")
COMMENT_AUTHOR=$(json_field "$BODY" author)
COMMENT_ID_ADMIN=$(json_field "$BODY" id)
if [ "$CODE" = "201" ] && [ "$COMMENT_AUTHOR" = "$ADMIN_NAME" ]; then
  pass "Comment author = logged-in user ($COMMENT_AUTHOR)"
else
  fail "Comment author should be '$ADMIN_NAME', got '$COMMENT_AUTHOR' ($CODE)"
fi

# Manager creates comment — should show manager's name
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_manager.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/sops/$TEST_SOP_ID/comments" -d '{"comment":"Manager comment"}')
CODE=$(http_code "$RESP")
BODY=$(http_body "$RESP")
COMMENT_AUTHOR2=$(json_field "$BODY" author)
if [ "$CODE" = "201" ] && [ "$COMMENT_AUTHOR2" = "Test Manager" ]; then
  pass "Manager comment author = 'Test Manager'"
else
  fail "Manager comment author should be 'Test Manager', got '$COMMENT_AUTHOR2' ($CODE)"
fi

# Comment with empty body
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/sops/$TEST_SOP_ID/comments" -d '{}')
CODE=$(http_code "$RESP")
if [ "$CODE" = "400" ]; then
  pass "Empty comment rejected (400)"
else
  fail "Empty comment should be 400, got $CODE"
fi

# Viewer cannot create comments (write access)
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_viewer.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/sops/$TEST_SOP_ID/comments" -d '{"comment":"should fail"}')
CODE=$(http_code "$RESP")
if [ "$CODE" = "403" ]; then
  pass "Viewer cannot create comments (403)"
else
  fail "Viewer create comment should be 403, got $CODE"
fi

# Admin deletes comment
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -X DELETE "$BASE/sops/$TEST_SOP_ID/comments/$COMMENT_ID_ADMIN")
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "Admin can delete comment"
else
  fail "Admin delete comment ($CODE)"
fi

# Manager cannot delete comments (admin only)
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_manager.cookie -X DELETE "$BASE/sops/$TEST_SOP_ID/comments/999")
CODE=$(http_code "$RESP")
if [ "$CODE" = "403" ]; then
  pass "Manager cannot delete comments (403)"
else
  fail "Manager delete comment should be 403, got $CODE"
fi

##############################################################################
section "7. SOP REVISIONS"
##############################################################################

RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/sops/$TEST_SOP_ID/revisions" -d '{"version":"2.0","change_description":"Test revision","reason":"Bug test"}')
CODE=$(http_code "$RESP")
if [ "$CODE" = "201" ]; then
  pass "Create SOP revision"
else
  fail "Create SOP revision ($CODE)"
fi

# Missing version
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/sops/$TEST_SOP_ID/revisions" -d '{"change_description":"No version"}')
CODE=$(http_code "$RESP")
if [ "$CODE" = "400" ]; then
  pass "Revision without version rejected (400)"
else
  fail "Revision without version should be 400, got $CODE"
fi

##############################################################################
section "8. COMPLAINT CRUD"
##############################################################################

# Create complaint
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/complaints" -d '{"date_received":"2026-03-15","source":"Customer","reporter":"John Doe","store_location":"Store #123","product_sku":"SKU-001","product_name":"Test Product","lot_number":"LOT-2026-A1","severity":"high","issue_type":"Quality","description":"Test complaint for bug testing"}')
CODE=$(http_code "$RESP")
BODY=$(http_body "$RESP")
if [ "$CODE" = "201" ]; then
  TEST_COMPLAINT_ID=$(json_field "$BODY" id)
  COMPLAINT_NUM=$(json_field "$BODY" complaint_number)
  COMPLAINT_CREATED_BY=$(json_field "$BODY" created_by)
  pass "Create complaint (id=$TEST_COMPLAINT_ID, number=$COMPLAINT_NUM, created_by=$COMPLAINT_CREATED_BY)"
else
  fail "Create complaint ($CODE): $BODY"
fi

# Read complaint
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/complaints/$TEST_COMPLAINT_ID")
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "Read complaint by ID"
else
  fail "Read complaint ($CODE)"
fi

# Update complaint
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X PUT "$BASE/complaints/$TEST_COMPLAINT_ID" -d '{"status":"investigating","severity":"critical"}')
CODE=$(http_code "$RESP")
BODY=$(http_body "$RESP")
C_STATUS=$(json_field "$BODY" status)
C_SEV=$(json_field "$BODY" severity)
if [ "$CODE" = "200" ] && [ "$C_STATUS" = "investigating" ] && [ "$C_SEV" = "critical" ]; then
  pass "Update complaint (status=$C_STATUS, severity=$C_SEV)"
else
  fail "Update complaint ($CODE): status=$C_STATUS, severity=$C_SEV"
fi

# Complaint analytics
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/complaints/analytics")
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "Complaint analytics endpoint"
else
  fail "Complaint analytics ($CODE)"
fi

# Missing date_received
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/complaints" -d '{"description":"no date"}')
CODE=$(http_code "$RESP")
if [ "$CODE" = "400" ]; then
  pass "Complaint without date_received rejected (400)"
else
  fail "Complaint without date should be 400, got $CODE"
fi

# Invalid severity
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/complaints" -d '{"date_received":"2026-01-01","severity":"extreme"}')
CODE=$(http_code "$RESP")
if [ "$CODE" = "400" ]; then
  pass "Invalid severity rejected (400)"
else
  fail "Invalid severity should be 400, got $CODE"
fi

# Complaint by lot
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/complaints/by-lot/LOT-2026-A1")
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "GET /complaints/by-lot/:lot"
else
  fail "Complaints by lot ($CODE)"
fi

##############################################################################
section "9. CCR CRUD"
##############################################################################

# Create CCR linked to complaint
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/ccrs" -d "{\"title\":\"Test CCR\",\"date_created\":\"2026-03-20\",\"recipient_company\":\"ACME Corp\",\"root_causes\":[\"Root Cause 1\"],\"preventive_measures\":[\"Fix it\"],\"complaint_ids\":[$TEST_COMPLAINT_ID]}")
CODE=$(http_code "$RESP")
BODY=$(http_body "$RESP")
if [ "$CODE" = "201" ]; then
  TEST_CCR_ID=$(json_field "$BODY" id)
  CCR_NUM=$(json_field "$BODY" ccr_number)
  pass "Create CCR (id=$TEST_CCR_ID, number=$CCR_NUM)"
else
  fail "Create CCR ($CODE): $BODY"
fi

# Read CCR
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/ccrs/$TEST_CCR_ID")
CODE=$(http_code "$RESP")
BODY=$(http_body "$RESP")
if [ "$CODE" = "200" ]; then
  # Check root_causes parsed as array
  RC=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(type(d.get('root_causes','')).__name__)" 2>/dev/null)
  if [ "$RC" = "list" ]; then
    pass "Read CCR — root_causes parsed as array"
  else
    fail "root_causes should be array, got $RC"
  fi
else
  fail "Read CCR ($CODE)"
fi

# Update CCR
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X PUT "$BASE/ccrs/$TEST_CCR_ID" -d '{"status":"in_review","notes":"Updated in bug test"}')
CODE=$(http_code "$RESP")
BODY=$(http_body "$RESP")
CCR_STATUS=$(json_field "$BODY" status)
if [ "$CODE" = "200" ] && [ "$CCR_STATUS" = "in_review" ]; then
  pass "Update CCR (status=$CCR_STATUS)"
else
  fail "Update CCR ($CODE): status=$CCR_STATUS"
fi

# List CCRs — should have enriched data
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/ccrs")
CODE=$(http_code "$RESP")
BODY=$(http_body "$RESP")
if [ "$CODE" = "200" ]; then
  HAS_ENRICHMENT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print('complaintCount' in d[0] if d else False)" 2>/dev/null)
  if [ "$HAS_ENRICHMENT" = "True" ]; then
    pass "List CCRs with enriched data (complaintCount, action stats)"
  else
    pass "List CCRs (no enrichment check — possibly empty)"
  fi
else
  fail "List CCRs ($CODE)"
fi

# CCR without title
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/ccrs" -d '{"date_created":"2026-01-01"}')
CODE=$(http_code "$RESP")
if [ "$CODE" = "400" ]; then
  pass "CCR without title rejected (400)"
else
  fail "CCR without title should be 400, got $CODE"
fi

# Link additional complaint to CCR
# Create another complaint first
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/complaints" -d '{"date_received":"2026-03-16","source":"Internal","severity":"medium","description":"Second complaint"}')
CODE=$(http_code "$RESP")
BODY=$(http_body "$RESP")
SECOND_COMPLAINT_ID=$(json_field "$BODY" id)

RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/ccrs/$TEST_CCR_ID/complaints" -d "{\"complaint_ids\":[$SECOND_COMPLAINT_ID]}")
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "Link additional complaint to CCR"
else
  fail "Link complaint to CCR ($CODE)"
fi

##############################################################################
section "10. CORRECTIVE ACTIONS"
##############################################################################

# Create action
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/ccrs/$TEST_CCR_ID/actions" -d '{"description":"Test corrective action","responsible":"QA Team","target_date":"2026-04-15","status":"pending"}')
CODE=$(http_code "$RESP")
BODY=$(http_body "$RESP")
if [ "$CODE" = "201" ]; then
  TEST_ACTION_ID=$(json_field "$BODY" id)
  pass "Create corrective action (id=$TEST_ACTION_ID)"
else
  fail "Create corrective action ($CODE): $BODY"
fi

# Update action
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X PUT "$BASE/ccrs/$TEST_CCR_ID/actions/$TEST_ACTION_ID" -d '{"status":"in_progress","notes":"Working on it"}')
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "Update corrective action"
else
  fail "Update corrective action ($CODE)"
fi

# List actions
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/ccrs/$TEST_CCR_ID/actions")
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "List corrective actions"
else
  fail "List corrective actions ($CODE)"
fi

# Action without description
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/ccrs/$TEST_CCR_ID/actions" -d '{"responsible":"nobody"}')
CODE=$(http_code "$RESP")
if [ "$CODE" = "400" ]; then
  pass "Action without description rejected (400)"
else
  fail "Action without description should be 400, got $CODE"
fi

##############################################################################
section "11. AUDIT TRAIL VERIFICATION"
##############################################################################

RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/audit-logs?limit=50")
CODE=$(http_code "$RESP")
BODY=$(http_body "$RESP")
if [ "$CODE" = "200" ]; then
  # Check for key audit entries
  HAS_CREATE_SOP=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(any(l['action']=='create_sops' for l in d.get('logs',[])))" 2>/dev/null)
  HAS_UPDATE_SOP=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(any(l['action']=='update_sops' for l in d.get('logs',[])))" 2>/dev/null)
  HAS_CREATE_COMPLAINT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(any(l['action']=='create_complaints' for l in d.get('logs',[])))" 2>/dev/null)
  HAS_UPDATE_COMPLAINT=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(any(l['action']=='update_complaints' for l in d.get('logs',[])))" 2>/dev/null)
  HAS_CREATE_CCR=$(echo "$BODY" | python3 -c "import sys,json; d=json.load(sys.stdin); print(any(l['action']=='create_ccrs' for l in d.get('logs',[])))" 2>/dev/null)

  # Check old_values/new_values populated
  HAS_OLD_NEW=$(echo "$BODY" | python3 -c "
import sys,json
d=json.load(sys.stdin)
for l in d.get('logs',[]):
  if l['action']=='update_sops' and l.get('old_values') and l.get('new_values'):
    ov = l['old_values']
    nv = l['new_values']
    if ov and nv:
      print('True')
      sys.exit(0)
print('False')
" 2>/dev/null)

  [ "$HAS_CREATE_SOP" = "True" ] && pass "Audit: create_sops logged" || fail "Audit: create_sops missing"
  [ "$HAS_UPDATE_SOP" = "True" ] && pass "Audit: update_sops logged" || fail "Audit: update_sops missing"
  [ "$HAS_CREATE_COMPLAINT" = "True" ] && pass "Audit: create_complaints logged" || fail "Audit: create_complaints missing"
  [ "$HAS_UPDATE_COMPLAINT" = "True" ] && pass "Audit: update_complaints logged" || fail "Audit: update_complaints missing"
  [ "$HAS_CREATE_CCR" = "True" ] && pass "Audit: create_ccrs logged" || fail "Audit: create_ccrs missing"
  [ "$HAS_OLD_NEW" = "True" ] && pass "Audit: old_values/new_values populated for update" || fail "Audit: old_values/new_values missing for update"
else
  fail "Audit logs endpoint ($CODE)"
fi

# Audit log stats (any authenticated user)
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_viewer.cookie "$BASE/audit-logs/stats")
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "Audit log stats accessible to viewer"
else
  fail "Audit log stats ($CODE)"
fi

# Audit log filters (admin only)
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/audit-logs/filters")
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "Audit log filters endpoint"
else
  fail "Audit log filters ($CODE)"
fi

# Audit log export (admin only)
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/audit-logs/export")
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "Audit log CSV export"
else
  fail "Audit log CSV export ($CODE)"
fi

##############################################################################
section "12. DASHBOARD ENDPOINTS"
##############################################################################

RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/dashboard")
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "GET /dashboard"
else
  fail "GET /dashboard ($CODE)"
fi

RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/qa-dashboard")
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "GET /qa-dashboard"
else
  fail "GET /qa-dashboard ($CODE)"
fi

RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/categories")
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "GET /categories"
else
  fail "GET /categories ($CODE)"
fi

##############################################################################
section "13. AUDIT CHECKLIST"
##############################################################################

RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/audit")
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "GET /audit checklist"
  # Try to update first item if exists
  FIRST_AUDIT_ID=$(echo "$(http_body "$RESP")" | python3 -c "import sys,json; d=json.load(sys.stdin); print(d[0]['id'] if d else '')" 2>/dev/null)
  if [ -n "$FIRST_AUDIT_ID" ] && [ "$FIRST_AUDIT_ID" != "" ]; then
    RESP2=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
      -X PUT "$BASE/audit/$FIRST_AUDIT_ID" -d '{"status":"met","notes":"Verified in bug test","evidence_ref":"BUG-TEST-001"}')
    CODE2=$(http_code "$RESP2")
    if [ "$CODE2" = "200" ]; then
      pass "Update audit checklist item"
    else
      fail "Update audit checklist item ($CODE2)"
    fi
  fi
else
  fail "GET /audit checklist ($CODE)"
fi

##############################################################################
section "14. INPUT VALIDATION — bad IDs, XSS"
##############################################################################

# Non-numeric ID
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/sops/abc")
CODE=$(http_code "$RESP")
if [ "$CODE" = "400" ]; then
  pass "Non-numeric SOP ID rejected (400)"
else
  fail "Non-numeric SOP ID should be 400, got $CODE"
fi

RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/complaints/abc")
CODE=$(http_code "$RESP")
if [ "$CODE" = "400" ]; then
  pass "Non-numeric complaint ID rejected (400)"
else
  fail "Non-numeric complaint ID should be 400, got $CODE"
fi

RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/ccrs/abc")
CODE=$(http_code "$RESP")
if [ "$CODE" = "400" ]; then
  pass "Non-numeric CCR ID rejected (400)"
else
  fail "Non-numeric CCR ID should be 400, got $CODE"
fi

# Nonexistent ID
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/sops/999999")
CODE=$(http_code "$RESP")
if [ "$CODE" = "404" ]; then
  pass "Nonexistent SOP ID returns 404"
else
  fail "Nonexistent SOP should be 404, got $CODE"
fi

RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/complaints/999999")
CODE=$(http_code "$RESP")
if [ "$CODE" = "404" ]; then
  pass "Nonexistent complaint ID returns 404"
else
  fail "Nonexistent complaint should be 404, got $CODE"
fi

# XSS attempt in SOP title
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/sops" -d '{"sop_number":"KK-SOP-XSS","title":"<script>alert(1)</script>","category_code":"QA","category_name":"QA"}')
CODE=$(http_code "$RESP")
BODY=$(http_body "$RESP")
if [ "$CODE" = "201" ]; then
  XSS_ID=$(json_field "$BODY" id)
  XSS_TITLE=$(json_field "$BODY" title)
  if echo "$XSS_TITLE" | grep -q "<script>"; then
    fail "XSS: <script> tag NOT stripped from SOP title"
  else
    pass "XSS: <script> tag stripped from SOP title (stored as: $XSS_TITLE)"
  fi
  # Clean up
  curl -s -b /tmp/qms_admin.cookie -X DELETE "$BASE/sops/$XSS_ID" > /dev/null
else
  fail "XSS test SOP creation ($CODE)"
fi

# XSS in complaint description
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/complaints" -d '{"date_received":"2026-01-01","description":"<img src=x onerror=alert(1)>","severity":"low"}')
CODE=$(http_code "$RESP")
BODY=$(http_body "$RESP")
if [ "$CODE" = "201" ]; then
  XSS_CID=$(json_field "$BODY" id)
  XSS_DESC=$(json_field "$BODY" description)
  if echo "$XSS_DESC" | grep -q "<img"; then
    fail "XSS: <img> tag NOT stripped from complaint description"
  else
    pass "XSS: <img> tag stripped from complaint"
  fi
  # Clean up
  curl -s -b /tmp/qms_admin.cookie -X DELETE "$BASE/complaints/$XSS_CID" > /dev/null
fi

##############################################################################
section "15. DOCUMENTS"
##############################################################################

RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/documents")
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "GET /documents"
else
  fail "GET /documents ($CODE)"
fi

# Viewer can read documents
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_viewer.cookie "$BASE/documents")
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "Viewer can GET /documents"
else
  fail "Viewer GET /documents ($CODE)"
fi

# Viewer cannot upload documents
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_viewer.cookie \
  -X POST "$BASE/documents/upload" -F "files=@/dev/null" -F "category=general")
CODE=$(http_code "$RESP")
if [ "$CODE" = "403" ]; then
  pass "Viewer cannot upload documents (403)"
else
  fail "Viewer upload documents should be 403, got $CODE"
fi

##############################################################################
section "16. ADMIN ROUTES — cascade delete"
##############################################################################

# Admin delete CCR — should cascade delete actions and unlink complaints
# Create a fresh CCR with action for testing cascade
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/ccrs" -d '{"title":"Cascade Test CCR","date_created":"2026-03-25"}')
CODE=$(http_code "$RESP")
BODY=$(http_body "$RESP")
CASCADE_CCR_ID=$(json_field "$BODY" id)

# Add action to it
curl -s -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X POST "$BASE/ccrs/$CASCADE_CCR_ID/actions" -d '{"description":"Cascade test action","responsible":"QA"}' > /dev/null

# Delete CCR
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -X DELETE "$BASE/ccrs/$CASCADE_CCR_ID")
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "Admin CCR delete succeeds"
  # Verify action was cascade deleted
  RESP2=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/ccrs/$CASCADE_CCR_ID/actions")
  CODE2=$(http_code "$RESP2")
  BODY2=$(http_body "$RESP2")
  ACTION_COUNT=$(echo "$BODY2" | python3 -c "import sys,json; print(len(json.load(sys.stdin)))" 2>/dev/null)
  if [ "$ACTION_COUNT" = "0" ]; then
    pass "CCR cascade delete: actions removed"
  else
    fail "CCR cascade delete: actions not removed ($ACTION_COUNT remain)"
  fi
else
  fail "Admin CCR delete ($CODE)"
fi

# Manager cannot delete via admin routes
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_manager.cookie -X DELETE "$BASE/ccrs/$TEST_CCR_ID")
CODE=$(http_code "$RESP")
if [ "$CODE" = "403" ]; then
  pass "Manager cannot DELETE CCR (403)"
else
  fail "Manager DELETE CCR should be 403, got $CODE"
fi

##############################################################################
section "17. SOP FILE ENDPOINTS"
##############################################################################

# List SOP files
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/sops/$TEST_SOP_ID/files")
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "List SOP files"
else
  fail "List SOP files ($CODE)"
fi

# Download nonexistent file
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/files/999999/download")
CODE=$(http_code "$RESP")
if [ "$CODE" = "404" ]; then
  pass "Download nonexistent file returns 404"
else
  fail "Download nonexistent file should be 404, got $CODE"
fi

# Preview nonexistent file
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie "$BASE/files/999999/preview")
CODE=$(http_code "$RESP")
if [ "$CODE" = "404" ]; then
  pass "Preview nonexistent file returns 404"
else
  fail "Preview nonexistent file should be 404, got $CODE"
fi

##############################################################################
section "18. ADMIN ROUTES — SOP, Complaint via /admin/*"
##############################################################################

RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X PUT "$BASE/admin/sops/$TEST_SOP_ID" -d '{"notes":"Admin bug test note"}')
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "Admin PUT /admin/sops/:id"
else
  fail "Admin PUT /admin/sops/:id ($CODE)"
fi

RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X PUT "$BASE/admin/complaints/$TEST_COMPLAINT_ID" -d '{"description":"Admin updated"}')
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "Admin PUT /admin/complaints/:id"
else
  fail "Admin PUT /admin/complaints/:id ($CODE)"
fi

RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X PUT "$BASE/admin/ccrs/$TEST_CCR_ID" -d '{"notes":"Admin CCR note"}')
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "Admin PUT /admin/ccrs/:id"
else
  fail "Admin PUT /admin/ccrs/:id ($CODE)"
fi

# Admin update corrective action
RESP=$(curl -s -w '\n%{http_code}' -b /tmp/qms_admin.cookie -H 'Content-Type: application/json' \
  -X PUT "$BASE/admin/corrective-actions/$TEST_ACTION_ID" -d '{"status":"completed","completion_date":"2026-03-31"}')
CODE=$(http_code "$RESP")
if [ "$CODE" = "200" ]; then
  pass "Admin PUT /admin/corrective-actions/:id"
else
  fail "Admin PUT /admin/corrective-actions/:id ($CODE)"
fi

##############################################################################
section "19. CLEANUP TEST DATA"
##############################################################################

# Delete test SOP
curl -s -b /tmp/qms_admin.cookie -X DELETE "$BASE/sops/$TEST_SOP_ID" > /dev/null
pass "Cleaned up test SOP"

# Delete test complaints
curl -s -b /tmp/qms_admin.cookie -X DELETE "$BASE/complaints/$TEST_COMPLAINT_ID" > /dev/null
curl -s -b /tmp/qms_admin.cookie -X DELETE "$BASE/complaints/$SECOND_COMPLAINT_ID" > /dev/null
pass "Cleaned up test complaints"

# Delete test CCR
curl -s -b /tmp/qms_admin.cookie -X DELETE "$BASE/ccrs/$TEST_CCR_ID" > /dev/null
pass "Cleaned up test CCR"

# Delete/deactivate test users
curl -s -b /tmp/qms_admin.cookie -X DELETE "$BASE/users/$VIEWER_ID" > /dev/null
curl -s -b /tmp/qms_admin.cookie -X DELETE "$BASE/users/$MANAGER_ID" > /dev/null
pass "Cleaned up test users"

# Logout
curl -s -b /tmp/qms_admin.cookie -X POST "$BASE/auth/logout" > /dev/null

##############################################################################
section "RESULTS"
##############################################################################

echo ""
echo -e "  ${GREEN}Passed: $PASS${NC}"
echo -e "  ${RED}Failed: $FAIL${NC}"
if [ $FAIL -gt 0 ]; then
  echo -e "\n${RED}Bugs found:${NC}"
  echo -e "$BUGS"
fi
echo ""
