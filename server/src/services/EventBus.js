/**
 * EventBus — in-process pub/sub for cross-domain communication.
 *
 * Usage:
 *   import { EventBus } from '../services/EventBus.js';
 *
 *   EventBus.on('production.batch.status_changed', async (payload) => {
 *     // notify downstream domain
 *   });
 *
 *   await EventBus.emit('production.batch.status_changed', {
 *     batchId: 42, from: 'qa_hold', to: 'released'
 *   });
 *
 *   const recent = EventBus.history(20); // for debugging
 *
 * Event-name convention: `domain.entity.action`
 *   examples:
 *     production.batch.status_changed
 *     quality.capa.created
 *     inventory.stock.adjusted
 *
 * Notes:
 *   - Handlers are awaited in registration order.
 *   - A throw in one handler is caught and logged; remaining handlers still run.
 *   - In-process only; not durable, not cross-instance. Use a real broker if you
 *     need fan-out across Cloud Run replicas.
 */

const HISTORY_LIMIT = 100;

class EventBusImpl {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.handlers = new Map();
    /** @type {Array<{event: string, payload: any, timestamp: string}>} */
    this.recent = [];
  }

  /**
   * Subscribe to an event.
   * @param {string} eventName
   * @param {(payload: any) => (void|Promise<void>)} handler
   * @returns {() => void} Unsubscribe function.
   */
  on(eventName, handler) {
    if (typeof handler !== 'function') {
      throw new TypeError('EventBus.on: handler must be a function');
    }
    if (!this.handlers.has(eventName)) {
      this.handlers.set(eventName, new Set());
    }
    this.handlers.get(eventName).add(handler);
    return () => this.off(eventName, handler);
  }

  /**
   * Unsubscribe a previously-registered handler.
   * @param {string} eventName
   * @param {Function} handler
   */
  off(eventName, handler) {
    const set = this.handlers.get(eventName);
    if (!set) return;
    set.delete(handler);
    if (set.size === 0) this.handlers.delete(eventName);
  }

  /**
   * Broadcast an event to all subscribed handlers.
   * Errors in handlers are caught + logged; they do NOT block other handlers.
   *
   * @param {string} eventName
   * @param {any} [payload]
   * @returns {Promise<void>}
   */
  async emit(eventName, payload) {
    this._record(eventName, payload);
    const subs = this.handlers.get(eventName);
    if (!subs || subs.size === 0) return;

    // Snapshot to avoid mutation-during-iteration if a handler subscribes/unsubscribes.
    const handlers = Array.from(subs);
    await Promise.all(handlers.map(async (h) => {
      try {
        await h(payload);
      } catch (err) {
        console.error(`[EventBus] handler for '${eventName}' threw:`, err?.message || err);
      }
    }));
  }

  /**
   * Recent events in chronological order (oldest → newest), capped to `limit`.
   * @param {number} [limit=HISTORY_LIMIT]
   * @returns {Array<{event: string, payload: any, timestamp: string}>}
   */
  history(limit = HISTORY_LIMIT) {
    const n = Math.max(1, Math.min(HISTORY_LIMIT, Number(limit) || HISTORY_LIMIT));
    return this.recent.slice(-n);
  }

  /**
   * Inspect current subscription counts — useful for tests/diagnostics.
   * @returns {Object<string, number>}
   */
  listenerCounts() {
    const out = {};
    for (const [name, set] of this.handlers.entries()) {
      out[name] = set.size;
    }
    return out;
  }

  /** Remove all subscriptions and clear history. Primarily for tests. */
  reset() {
    this.handlers.clear();
    this.recent = [];
  }

  _record(eventName, payload) {
    this.recent.push({
      event: eventName,
      payload,
      timestamp: new Date().toISOString(),
    });
    if (this.recent.length > HISTORY_LIMIT) {
      this.recent.splice(0, this.recent.length - HISTORY_LIMIT);
    }
  }
}

export const EventBus = new EventBusImpl();
export default EventBus;
