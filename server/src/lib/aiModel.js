// QMS AI model selection with automatic fallback.
// Primary model (QMS_AI_MODEL, e.g. Sonnet 5.5) is tried once; if SubStation
// reports it rate-limited/overloaded/unavailable, the same request is retried on
// QMS_AI_FALLBACK_MODEL (Haiku) so the QMS AI keeps working.
const FALLBACK_STATUSES = new Set([429, 503, 529]);

export async function createMessage(client, params, defaultModel) {
  const primary = process.env.QMS_AI_MODEL || defaultModel;
  const fallback = process.env.QMS_AI_FALLBACK_MODEL;
  try {
    return await client.messages.create({ ...params, model: primary }, fallback ? { maxRetries: 0 } : undefined);
  } catch (err) {
    if (!fallback || fallback === primary || !FALLBACK_STATUSES.has(err?.status)) throw err;
    console.warn(`[qms-ai] ${primary} unavailable (${err.status}); falling back to ${fallback}`);
    return client.messages.create({ ...params, model: fallback });
  }
}
