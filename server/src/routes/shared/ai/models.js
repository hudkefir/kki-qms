export const AI_MODELS = [
  { id: 'claude-sonnet-5-5', label: 'Sonnet 5.5', tier: 'everyday' },
  { id: 'opus-5-5', label: 'Opus 5.5', tier: 'premium' },
];

export function effectiveModels(role, override) {
  const requested = Array.isArray(override) ? override : AI_MODELS.map(m => m.id);
  return AI_MODELS.filter(m => requested.includes(m.id) && (m.tier !== 'premium' || role === 'admin')).map(m => m.id);
}

export function defaultModel(allowed) {
  return allowed.includes('claude-sonnet-5-5') ? 'claude-sonnet-5-5' : allowed[0] || null;
}

export async function allowedModelsFor(db, user) {
  if (!user?.id) return [];
  const live = await db.get('SELECT role, active FROM users WHERE id=$1', [user.id]);
  if (live?.active !== true && live?.active !== 1) return [];
  const access = await db.get('SELECT allowed_models FROM ai_model_access WHERE user_id=$1', [user.id]);
  const liveModels = effectiveModels(live.role, access?.allowed_models);
  return effectiveModels(user.role, access?.allowed_models).filter(id => liveModels.includes(id));
}

export async function selectModel(db, user, model) {
  const allowed = await allowedModelsFor(db, user);
  if (!allowed.length) throw Object.assign(new Error('AI model access denied'), { status: 403 });
  if (model !== undefined && !allowed.includes(model)) {
    throw Object.assign(new Error('Model not allowed'), { status: 400 });
  }
  return model || defaultModel(allowed);
}

export async function catalogFor(db, user) {
  const allowed = await allowedModelsFor(db, user);
  return { models: AI_MODELS.filter(m => allowed.includes(m.id)), default: defaultModel(allowed) };
}
