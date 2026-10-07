import { createHash } from 'node:crypto';

export const WRITE_TOOLS = Object.freeze({
  update_record_field: 'manager',
  update_action_item_status: 'operator',
  create_action_item: 'manager',
  add_action_item_note: 'operator',
  create_capa_from_deviation: 'manager',
  create_capa: 'manager',
  delete_capa: 'admin',
  link_records: 'manager',
  create_deviation: 'manager',
  update_deviation: 'manager',
});
const roles = ['viewer', 'operator', 'manager', 'admin'];
export function canRun(role, tool) {
  return Object.hasOwn(WRITE_TOOLS, tool) && roles.indexOf(role) >= roles.indexOf(WRITE_TOOLS[tool]);
}
const failure = (status, message, state) => Object.assign(new Error(message), { status, actionStatus: state });

// jsonb normalizes key order; hash the same representation before and after storage.
function canonical(value) {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(k => [k, canonical(value[k])]));
  return value;
}
export const inputHash = input => createHash('sha256').update(JSON.stringify(canonical(input))).digest('hex');

export function summarize(tool, input) {
  const target = input.record_id || input.capa_id || input.deviation_id || input.deviation_identifier || input.action_item_id;
  const detail = tool === 'link_records'
    ? `${input.source_type} #${input.source_id} → ${input.target_type} #${input.target_id}`
    : [target && `#${target}`, input.field, input.status, input.title].filter(Boolean).join(' — ');
  return `${tool.replace(/_/g, ' ')}${detail ? ': ' + detail : ''}`;
}

export async function proposeAction(db, { user, sessionId, tool, input }) {
  const live = user?.id && await db.get('SELECT role, active FROM users WHERE id=$1', [user.id]);
  if (!live || (live.active !== true && live.active !== 1) || !canRun(live.role, tool) || !canRun(user.role, tool)) {
    throw failure(403, 'Your role does not permit this change');
  }
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw failure(400, 'Invalid action input');
  const summary = summarize(tool, input);
  const row = await db.get(`INSERT INTO ai_pending_actions
    (session_id, user_id, tool_name, tool_input, input_hash, summary, expires_at)
    VALUES ($1, $2, $3, $4::jsonb, $5, $6, NOW() + INTERVAL '30 minutes') RETURNING id, expires_at`,
  [sessionId, user.id, tool, JSON.stringify(input), inputHash(input), summary]);
  return { id: row.id, tool, summary, expiresAt: row.expires_at, status: 'pending' };
}

export async function confirmAction(db, { id, req, execute, audit }) {
  const userId = req.session?.user?.id;
  const live = userId && await db.get('SELECT role, active FROM users WHERE id=$1', [userId]);
  if (!live || (live.active !== true && live.active !== 1)) throw failure(403, 'Account is inactive');
  const row = await db.get(`UPDATE ai_pending_actions SET status='running', decided_by=$2, decided_at=NOW()
    WHERE id=$1 AND user_id=$2 AND status='pending' AND expires_at > NOW() RETURNING *`, [id, userId]);
  if (!row) {
    const current = await db.get('SELECT * FROM ai_pending_actions WHERE id=$1 AND user_id=$2', [id, userId]);
    if (current && (current.status === 'expired' || (current.status === 'pending' && new Date(current.expires_at) <= new Date()))) {
      await db.run("UPDATE ai_pending_actions SET status='expired' WHERE id=$1 AND user_id=$2 AND status='pending' AND expires_at <= NOW()", [id, userId]);
      throw failure(410, 'This action has expired', 'expired');
    }
    throw failure(409, 'This action is unavailable or already used', current?.status);
  }
  try {
    if (!canRun(live.role, row.tool_name) || !canRun(req.session.user.role, row.tool_name)) {
      throw failure(403, 'Your role no longer permits this change', 'failed');
    }
    if (inputHash(row.tool_input) !== row.input_hash) throw failure(409, 'Action input changed', 'failed');
    // The shared logAudit is best-effort. Persist an attributed intent BEFORE
    // executing so an audit outage cannot permit an unaudited mutation.
    await db.run(`INSERT INTO audit_logs
      (user_id, username, action, resource_type, resource_id, resource_name, details, ip_address, user_agent, session_id)
      VALUES ($1, $2, 'ai_action_claimed', 'ai_pending_actions', $3, $4, $5, $6, $7, $8)`,
    [userId, req.session.user.username, id, row.tool_name, JSON.stringify({ tool_input: row.tool_input }),
      req.ip || '', req.get?.('user-agent') || '', req.sessionID || '']);
    const result = await execute(row.tool_name, row.tool_input, { userId, role: live.role, req });
    await audit(req, 'ai_action_approved', 'ai_pending_actions', id, row.tool_name, { tool_input: row.tool_input, result });
    const status = result?.success === false ? 'failed' : 'done';
    await db.run('UPDATE ai_pending_actions SET status=$2, result=$3::jsonb WHERE id=$1', [id, status, JSON.stringify(result)]);
    return { id, status, result };
  } catch (err) {
    await db.run("UPDATE ai_pending_actions SET status='failed', result=$2::jsonb WHERE id=$1", [id, JSON.stringify({ error: err.message })]);
    err.actionStatus = 'failed';
    throw err;
  }
}

export async function cancelAction(db, { id, userId }) {
  const row = await db.get(`UPDATE ai_pending_actions SET status=CASE WHEN expires_at <= NOW() THEN 'expired' ELSE 'cancelled' END,
    decided_by=$2, decided_at=NOW() WHERE id=$1 AND user_id=$2 AND status='pending' RETURNING status`, [id, userId]);
  if (!row) throw failure(409, 'This action is unavailable or already used');
  return { id, status: row.status };
}

export async function handleToolUse(block, { db, user, sessionId, req, execute, emit }) {
  try {
    if (Object.hasOwn(WRITE_TOOLS, block.name)) {
      const action = await proposeAction(db, { user, sessionId, tool: block.name, input: block.input });
      emit({ type: 'action_proposed', action });
      return { action, result: { status: 'pending_user_approval', action_id: action.id, summary: action.summary,
        message: 'Nothing has been changed. The user must review the action and click Approve.' } };
    }
    emit({ type: 'tool_start', tool: block.name });
    const result = await execute(block.name, block.input, { userId: user.id, role: user.role, req });
    emit({ type: 'tool_result', tool: block.name, result });
    return { result, isError: result?.success === false };
  } catch (err) {
    const result = { success: false, error: err.message };
    emit({ type: 'tool_result', tool: block.name, result });
    return { result, isError: true };
  }
}
