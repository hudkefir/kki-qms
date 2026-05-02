import { Router } from 'express';
import { requireAuth } from './authMiddleware.js';
const router = Router();

// Simple in-memory cache (5 min TTL)
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

// Load SOS credentials from env vars (required on Cloud Run)
function getSOSConfig() {
  if (process.env.SOS_API_KEY) {
    return { apiKey: process.env.SOS_API_KEY };
  }
  console.error('SOS_API_KEY environment variable not set');
  return null;
}

async function sosApiFetch(path, token) {
  const res = await fetch(`https://api.sosinventory.com${path}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
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

    const config = getSOSConfig();
    if (!config || !config.access_token) {
      return res.status(503).json({ error: 'SOS Inventory credentials not configured' });
    }

    // Try multiple SOS API endpoints to find lot data
    let lotData = null;
    let items = [];
    let error = null;

    // Try 1: Search lots
    try {
      const lotResult = await sosApiFetch(`/api/v2/lot?number=${encodeURIComponent(lot)}`, config.access_token);
      if (lotResult && (lotResult.data?.length > 0 || lotResult.length > 0)) {
        lotData = lotResult.data || lotResult;
      }
    } catch (e) {
      error = e.message;
    }

    // Try 2: Search items with lot filter
    try {
      const itemResult = await sosApiFetch(`/api/v2/item?lotnumber=${encodeURIComponent(lot)}`, config.access_token);
      if (itemResult && (itemResult.data?.length > 0 || itemResult.length > 0)) {
        items = itemResult.data || itemResult;
      }
    } catch (e) {
      if (!error) error = e.message;
    }

    // Try 3: Search serial/lot numbers
    if (!lotData && !items.length) {
      try {
        const serialResult = await sosApiFetch(`/api/v2/serial?number=${encodeURIComponent(lot)}`, config.access_token);
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
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

export default router;
