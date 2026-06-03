import { Router } from 'express';
import { requireAuth } from '../../authMiddleware.js';
import db from '../../database-pg.js';
const router = Router();

const SOS_BASE = 'https://api.sosinventory.com';
const TOKEN_URL = `${SOS_BASE}/oauth2/token`;
const REFRESH_BUFFER_MS = 24 * 60 * 60 * 1000; // refresh proactively when <1 day left

// Simple in-memory response cache (5 min TTL)
const cache = new Map();
const CACHE_TTL = 5 * 60 * 1000;
function getCached(key) {
  const entry = cache.get(key);
  if (entry && Date.now() - entry.ts < CACHE_TTL) return entry.data;
  cache.delete(key);
  return null;
}
function setCache(key, data) {
  cache.set(key, { data, ts: Date.now() });
}

// ─── OAuth token store (DB-backed so the rotated refresh_token survives restarts) ───
// SOS rotates the refresh_token on EVERY refresh. Cloud Run containers are ephemeral,
// so the rotated token must be persisted in Postgres, not just held in memory.
let tableReady = null;
async function ensureTable() {
  if (tableReady) return tableReady;
  tableReady = db.exec(`
    CREATE TABLE IF NOT EXISTS sos_oauth (
      provider TEXT PRIMARY KEY,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      client_id TEXT NOT NULL,
      client_secret TEXT NOT NULL,
      expires_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );
  `).then(async () => {
    // One-time seed from env if the row is missing (creds are normally seeded directly).
    const row = await db.get(`SELECT provider FROM sos_oauth WHERE provider = 'sos'`);
    if (!row && process.env.SOS_API_KEY && process.env.SOS_REFRESH_TOKEN &&
        process.env.SOS_CLIENT_ID && process.env.SOS_CLIENT_SECRET) {
      await db.run(
        `INSERT INTO sos_oauth (provider, access_token, refresh_token, client_id, client_secret, expires_at)
         VALUES ('sos', ?, ?, ?, ?, CURRENT_TIMESTAMP + INTERVAL '80 days')
         ON CONFLICT (provider) DO NOTHING`,
        [process.env.SOS_API_KEY, process.env.SOS_REFRESH_TOKEN,
         process.env.SOS_CLIENT_ID, process.env.SOS_CLIENT_SECRET]
      );
    }
  });
  return tableReady;
}

async function postRefresh(creds) {
  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    refresh_token: creds.refresh_token,
    client_id: creds.client_id,
    client_secret: creds.client_secret,
  });
  const res = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SOS token refresh failed ${res.status}: ${text}`);
  }
  return res.json(); // { access_token, refresh_token, expires_in, ... }
}

// Refresh under a row lock with double-checked expiry, so concurrent containers
// don't both rotate (which would invalidate each other's refresh_token).
let inFlight = null;
async function refreshToken() {
  if (inFlight) return inFlight; // dedupe within this process
  inFlight = (async () => {
    const client = await db.pool.connect();
    try {
      await client.query('BEGIN');
      const { rows } = await client.query(
        `SELECT * FROM sos_oauth WHERE provider = 'sos' FOR UPDATE`
      );
      const cur = rows[0];
      if (!cur) throw new Error('SOS credentials not seeded (sos_oauth row missing)');

      // Another container may have refreshed while we waited for the lock.
      if (cur.expires_at && new Date(cur.expires_at).getTime() - Date.now() > REFRESH_BUFFER_MS) {
        await client.query('COMMIT');
        return cur.access_token;
      }

      const t = await postRefresh(cur);
      const expiresAt = new Date(Date.now() + (t.expires_in ? t.expires_in * 1000 : 80 * 86400 * 1000));
      await client.query(
        `UPDATE sos_oauth SET access_token = $1, refresh_token = $2, expires_at = $3,
         updated_at = CURRENT_TIMESTAMP WHERE provider = 'sos'`,
        [t.access_token, t.refresh_token || cur.refresh_token, expiresAt]
      );
      await client.query('COMMIT');
      console.log('SOS access token refreshed; expires', expiresAt.toISOString());
      return t.access_token;
    } catch (e) {
      await client.query('ROLLBACK').catch(() => {});
      throw e;
    } finally {
      client.release();
    }
  })().finally(() => { inFlight = null; });
  return inFlight;
}

async function getAccessToken() {
  await ensureTable();
  const cur = await db.get(`SELECT access_token, expires_at FROM sos_oauth WHERE provider = 'sos'`);
  if (!cur) return null;
  if (!cur.expires_at || new Date(cur.expires_at).getTime() - Date.now() <= REFRESH_BUFFER_MS) {
    return refreshToken();
  }
  return cur.access_token;
}

// SOS API call with one automatic refresh-and-retry on 401 (token expired early/revoked).
async function sosApiFetch(path, { retried = false } = {}) {
  const token = await getAccessToken();
  if (!token) { const e = new Error('SOS credentials not configured'); e.status = 503; throw e; }
  const res = await fetch(`${SOS_BASE}${path}`, {
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
  });
  if (res.status === 401 && !retried) {
    await refreshToken();
    return sosApiFetch(path, { retried: true });
  }
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`SOS API ${res.status}: ${text}`);
  }
  return res.json();
}

// GET /api/sos/lot/:lot — lookup lot info from SOS Inventory
router.get('/sos/lot/:lot', requireAuth, async (req, res) => {
  try {
    const lot = req.params.lot;
    const forceRefresh = req.query.refresh === 'true';

    if (!forceRefresh) {
      const cached = getCached(`lot:${lot}`);
      if (cached) return res.json({ ...cached, cached: true });
    }

    let lotData = null;
    let items = [];
    let error = null;

    // Try 1: Search lots
    try {
      const lotResult = await sosApiFetch(`/api/v2/lot?number=${encodeURIComponent(lot)}`);
      if (lotResult && (lotResult.data?.length > 0 || lotResult.length > 0)) {
        lotData = lotResult.data || lotResult;
      }
    } catch (e) {
      if (e.status === 503) throw e;
      error = e.message;
    }

    // Try 2: Search items with lot filter
    try {
      const itemResult = await sosApiFetch(`/api/v2/item?lotnumber=${encodeURIComponent(lot)}`);
      if (itemResult && (itemResult.data?.length > 0 || itemResult.length > 0)) {
        items = itemResult.data || itemResult;
      }
    } catch (e) {
      if (!error) error = e.message;
    }

    // Try 3: Search serial/lot numbers
    if (!lotData && !items.length) {
      try {
        const serialResult = await sosApiFetch(`/api/v2/serial?number=${encodeURIComponent(lot)}`);
        if (serialResult && (serialResult.data?.length > 0 || serialResult.length > 0)) {
          lotData = serialResult.data || serialResult;
        }
      } catch (e) {
        // silent
      }
    }

    const result = {
      lot_number: lot,
      lot_info: lotData,
      items: items,
      found: !!(lotData || items.length),
      error: (!lotData && !items.length) ? error : null,
    };

    setCache(`lot:${lot}`, result);
    res.json(result);
  } catch (err) {
    console.error('SOS lot lookup error:', err);
    res.status(err.status || 500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
