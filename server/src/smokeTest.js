/**
 * Deploy smoke test — verifies critical API endpoints are responding.
 * Can be called programmatically via /api/admin/smoke-test or run standalone.
 *
 * Usage (standalone):
 *   node server/src/smokeTest.js [BASE_URL]
 *   Default BASE_URL: http://localhost:3002
 */

const DEFAULT_BASE_URL = 'http://localhost:3002';

/**
 * List of critical endpoints to verify.
 * Each entry: { method, path, description, expectStatus, requiresAuth }
 */
const CRITICAL_ENDPOINTS = [
  { method: 'GET', path: '/api/health', description: 'Health check', expectStatus: 200, requiresAuth: false },
  { method: 'GET', path: '/api/dashboard', description: 'Dashboard data', expectStatus: 200, requiresAuth: true },
  { method: 'GET', path: '/api/sops', description: 'SOP listing', expectStatus: 200, requiresAuth: true },
  { method: 'GET', path: '/api/complaints', description: 'Complaints listing', expectStatus: 200, requiresAuth: true },
  { method: 'GET', path: '/api/batch-tests', description: 'Batch tests listing', expectStatus: 200, requiresAuth: true },
  { method: 'GET', path: '/api/daily-tasks', description: 'Daily tasks listing', expectStatus: 200, requiresAuth: true },
  { method: 'GET', path: '/api/categories', description: 'Category listing', expectStatus: 200, requiresAuth: true },
  { method: 'GET', path: '/api/change-control', description: 'Change control listing', expectStatus: 200, requiresAuth: true },
  { method: 'GET', path: '/api/equipment', description: 'Equipment listing', expectStatus: 200, requiresAuth: true },
  { method: 'GET', path: '/api/recall', description: 'Recall module', expectStatus: 200, requiresAuth: true },
  { method: 'GET', path: '/api/suppliers', description: 'Suppliers listing', expectStatus: 200, requiresAuth: true },
  { method: 'GET', path: '/api/inventory/counts', description: 'Inventory counts', expectStatus: 200, requiresAuth: true },
  { method: 'GET', path: '/api/environmental/samples', description: 'Environmental samples', expectStatus: 200, requiresAuth: true },
];

/**
 * Run smoke tests against the given base URL.
 * @param {string} baseUrl - The base URL to test against (e.g. https://qms.kefirkultures.com)
 * @param {string|null} sessionCookie - Optional session cookie for authenticated endpoints
 * @returns {Promise<{passed: number, failed: number, skipped: number, total: number, results: Array, duration_ms: number}>}
 */
export async function runSmokeTests(baseUrl, sessionCookie = null) {
  const startTime = Date.now();
  const results = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  for (const endpoint of CRITICAL_ENDPOINTS) {
    const { method, path, description, expectStatus, requiresAuth } = endpoint;
    const url = `${baseUrl}${path}`;

    // Skip auth-required endpoints if no session cookie
    if (requiresAuth && !sessionCookie) {
      results.push({
        endpoint: `${method} ${path}`,
        description,
        status: 'skipped',
        reason: 'No session cookie — auth required',
      });
      skipped++;
      continue;
    }

    try {
      const headers = { 'Accept': 'application/json' };
      if (sessionCookie) {
        headers['Cookie'] = sessionCookie;
      }

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(url, {
        method,
        headers,
        signal: controller.signal,
        redirect: 'follow',
      });
      clearTimeout(timeout);

      const statusOk = response.status === expectStatus;
      // For auth endpoints without a valid session, 401 is expected
      const authDenied = requiresAuth && response.status === 401;

      if (statusOk) {
        // Response body validation — check it's valid JSON with data
        let bodyWarning = null;
        try {
          const body = await response.clone().json();
          if (Array.isArray(body) && body.length === 0 && !path.includes('health')) {
            bodyWarning = 'Empty array response — table may have no data';
          } else if (body.error) {
            bodyWarning = `Response contains error: ${body.error}`;
          }
        } catch {
          // Not JSON or parse error — might be OK for some endpoints
        }

        passed++;
        const result = {
          endpoint: `${method} ${path}`,
          description,
          status: bodyWarning ? 'warn' : 'pass',
          http_status: response.status,
          response_time_ms: Date.now() - startTime,
        };
        if (bodyWarning) result.warning = bodyWarning;
        results.push(result);
      } else if (authDenied && sessionCookie) {
        // We had a cookie but got 401 — session may be invalid
        failed++;
        results.push({
          endpoint: `${method} ${path}`,
          description,
          status: 'fail',
          http_status: response.status,
          reason: `Expected ${expectStatus}, got ${response.status} (session may be expired)`,
        });
      } else if (authDenied && !sessionCookie) {
        skipped++;
        results.push({
          endpoint: `${method} ${path}`,
          description,
          status: 'skipped',
          reason: 'Auth required, no session',
        });
      } else {
        failed++;
        results.push({
          endpoint: `${method} ${path}`,
          description,
          status: 'fail',
          http_status: response.status,
          reason: `Expected ${expectStatus}, got ${response.status}`,
        });
      }
    } catch (err) {
      failed++;
      results.push({
        endpoint: `${method} ${path}`,
        description,
        status: 'fail',
        reason: err.name === 'AbortError' ? 'Timeout (10s)' : err.message,
      });
    }
  }

  return {
    overall: failed === 0 ? 'PASS' : 'FAIL',
    passed,
    failed,
    skipped,
    total: CRITICAL_ENDPOINTS.length,
    duration_ms: Date.now() - startTime,
    results,
    tested_at: new Date().toISOString(),
    base_url: baseUrl,
  };
}

// ─── Standalone CLI runner ──────────────────────────────────────────────────
const isMainModule = process.argv[1]?.endsWith('smokeTest.js');
if (isMainModule) {
  const baseUrl = process.argv[2] || DEFAULT_BASE_URL;
  console.log(`\n🔥 Running smoke tests against ${baseUrl}\n`);

  const result = await runSmokeTests(baseUrl);

  for (const r of result.results) {
    const icon = r.status === 'pass' ? '✅' : r.status === 'skipped' ? '⏭️' : '❌';
    const detail = r.reason ? ` — ${r.reason}` : ` (${r.http_status})`;
    console.log(`  ${icon} ${r.endpoint} [${r.description}]${detail}`);
  }

  console.log(`\n  Result: ${result.overall} | ${result.passed} passed, ${result.failed} failed, ${result.skipped} skipped | ${result.duration_ms}ms\n`);
  process.exit(result.failed > 0 ? 1 : 0);
}
