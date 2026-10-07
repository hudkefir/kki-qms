import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { WRITE_TOOLS, summarize, canRun, proposeAction, confirmAction, cancelAction, handleToolUse } from '../src/routes/shared/ai/actions.js';
import { AI_MODELS, allowedModelsFor, effectiveModels, catalogFor, selectModel } from '../src/routes/shared/ai/models.js';
import { parsePageContext, contextBlock, redact } from '../src/routes/shared/ai/context.js';
import { createMessage } from '../src/lib/aiModel.js';
import { buildPageContext, chatPayload } from '../../client/src/components/pageContext.js';

// No application/database imports: every SQL call is accounted for in this fake.
function fixture(role = 'manager', active = true) {
  const user = { id: 1, role, username: 'approver' };
  const req = { session: { user }, sessionID: 'session', ip: '127.0.0.1', get: () => 'test' };
  const state = { live: { role, active }, rows: new Map(), queries: [], audits: [], override: null };
  const db = {
    async get(sql, args) {
      state.queries.push({ sql, args });
      if (sql.startsWith('SELECT role, active FROM users')) return state.live;
      if (sql.startsWith('SELECT allowed_models')) return state.override === null ? null : { allowed_models: state.override };
      if (sql.startsWith('INSERT INTO ai_pending_actions')) {
        const [session_id, user_id, tool_name, input, input_hash, summary] = args;
        // Mimic jsonb reordering, including nested input properties.
        const tool_input = JSON.parse(input, (_k, v) => v && typeof v === 'object' && !Array.isArray(v)
          ? Object.fromEntries(Object.entries(v).reverse()) : v);
        const row = { id: randomUUID(), session_id, user_id, tool_name, tool_input, input_hash, summary,
          status: 'pending', expires_at: new Date(Date.now() + 1_800_000) };
        state.rows.set(row.id, row);
        return { ...row };
      }
      const row = state.rows.get(args[0]);
      if (sql.startsWith("UPDATE ai_pending_actions SET status='running'")) {
        assert.match(sql, /user_id=\$2 AND status='pending' AND expires_at > NOW\(\)/);
        if (!row || row.user_id !== args[1] || row.status !== 'pending' || row.expires_at <= new Date()) return null;
        row.status = 'running'; row.decided_by = args[1];
        return { ...row };
      }
      if (sql.startsWith('SELECT * FROM ai_pending_actions')) return row?.user_id === args[1] ? { ...row } : null;
      if (sql.startsWith('UPDATE ai_pending_actions SET status=CASE')) {
        if (!row || row.user_id !== args[1] || row.status !== 'pending') return null;
        row.status = row.expires_at <= new Date() ? 'expired' : 'cancelled';
        return { status: row.status };
      }
      throw new Error(`Unexpected SQL: ${sql}`);
    },
    async run(sql, args) {
      state.queries.push({ sql, args });
      if (sql.startsWith('INSERT INTO audit_logs')) {
        if (state.auditFailure) throw new Error('Audit storage unavailable');
        state.audits.push(args); return { changes: 1 };
      }
      const row = state.rows.get(args[0]);
      if (sql.startsWith("UPDATE ai_pending_actions SET status='expired'")) row.status = 'expired';
      else if (sql.startsWith("UPDATE ai_pending_actions SET status='failed'")) { row.status = 'failed'; row.result = JSON.parse(args[1]); }
      else if (sql.startsWith('UPDATE ai_pending_actions SET status=$2')) { row.status = args[1]; row.result = JSON.parse(args[2]); }
      else throw new Error(`Unexpected SQL: ${sql}`);
      return { changes: 1 };
    },
  };
  const propose = (tool = 'create_capa', input = { title: 'Investigate', responsible_person: 'QA', target_date: '2026-11-01' }) =>
    proposeAction(db, { user, sessionId: 'chat', tool, input });
  return { db, user, req, state, propose };
}

for (const tool of Object.keys(WRITE_TOOLS)) {
  test(`${tool}: tool loop stages only, never executes or writes QMS tables`, async () => {
    const f = fixture('admin'); const events = [];
    const outcome = await handleToolUse({ id: 'call', name: tool, input: { title: 'Review', record_id: '1' } }, {
      ...f, sessionId: 'chat', execute: () => assert.fail('Executor must not run'), emit: e => events.push(e),
    });
    assert.equal(events[0].type, 'action_proposed');
    assert.equal(outcome.result.status, 'pending_user_approval');
    assert.equal(f.state.rows.size, 1);
    assert.ok(f.state.queries.every(({ sql }) => sql.startsWith('SELECT ') || sql.startsWith('INSERT INTO ai_pending_actions')));
  });
}

test('role ceilings and denied proposals', async () => {
  assert.equal(Object.keys(WRITE_TOOLS).length, 10);
  assert.equal(canRun('operator', 'add_action_item_note'), true);
  assert.equal(canRun('operator', 'update_action_item_status'), true);
  assert.equal(canRun('operator', 'create_capa'), false);
  assert.equal(canRun('manager', 'delete_capa'), false);
  assert.equal(canRun('admin', 'toString'), false);
  const f = fixture('viewer');
  const outcome = await handleToolUse({ name: 'create_capa', input: {} }, {
    ...f, execute: () => assert.fail(), emit: () => {},
  });
  assert.equal(outcome.isError, true);
  assert.equal(f.state.rows.size, 0);
});

test('four read tools still execute immediately', async () => {
  for (const name of ['consult_specialist', 'query_trends', 'draft_root_cause', 'auto_fill_capa']) {
    const f = fixture(); let calls = 0;
    await handleToolUse({ name, input: {} }, { ...f, emit: () => {}, execute: async () => { calls++; return { success: true }; } });
    assert.equal(calls, 1);
    assert.equal(f.state.rows.size, 0);
  }
});

for (const scenario of ['other user', 'viewer', 'operator deleting', 'inactive', 'stale admin']) {
  test(`confirmation rejects ${scenario}`, async () => {
    const f = fixture('admin'); const action = await f.propose('delete_capa', { capa_id: '1', confirm: true });
    if (scenario === 'other user') f.req.session.user = { ...f.user, id: 2 };
    if (scenario === 'viewer') f.state.live.role = 'viewer';
    if (scenario === 'operator deleting') f.state.live.role = 'operator';
    if (scenario === 'inactive') f.state.live.active = false;
    if (scenario === 'stale admin') f.req.session.user.role = 'manager';
    await assert.rejects(confirmAction(f.db, { id: action.id, req: f.req, execute: () => assert.fail('Unauthorized execution'), audit: () => assert.fail() }),
      e => [403, 409].includes(e.status));
  });
}

test('authorized approval executes once, audits approver, rejects concurrent/replayed calls', async () => {
  const f = fixture(); const action = await f.propose(); let executions = 0; const audits = [];
  const args = { id: action.id, req: f.req, execute: async (_tool, input, ctx) => {
    executions++; assert.equal(ctx.req, f.req); assert.equal(ctx.role, 'manager');
    assert.equal(input.title, 'Investigate'); assert.equal(f.state.audits[0][0], f.user.id);
    return { success: true, message: 'Created' };
  }, audit: (...a) => audits.push(a) };
  const outcomes = await Promise.allSettled([confirmAction(f.db, args), confirmAction(f.db, args)]);
  assert.equal(outcomes.filter(r => r.status === 'fulfilled').length, 1);
  assert.equal(outcomes.find(r => r.status === 'rejected').reason.status, 409);
  assert.equal(executions, 1); assert.equal(audits[0][0], f.req); assert.equal(audits[0][1], 'ai_action_approved');
  assert.equal(f.state.rows.get(action.id).status, 'done');
  await assert.rejects(confirmAction(f.db, args), { status: 409 });
  assert.equal(executions, 1);
});

test('expiry is 410; cancellation is owned, single-use and blocks execution', async () => {
  const f = fixture(); const action = await f.propose(); f.state.rows.get(action.id).expires_at = new Date(0);
  await assert.rejects(confirmAction(f.db, { id: action.id, req: f.req, execute: () => assert.fail() }), { status: 410 });
  assert.equal(f.state.rows.get(action.id).status, 'expired');
  const second = await f.propose();
  await assert.rejects(cancelAction(f.db, { id: second.id, userId: 2 }), { status: 409 });
  assert.equal((await cancelAction(f.db, { id: second.id, userId: 1 })).status, 'cancelled');
  await assert.rejects(confirmAction(f.db, { id: second.id, req: f.req, execute: () => assert.fail() }), { status: 409 });
});

test('hash tampering and audit failure prevent writes', async () => {
  for (const mode of ['tamper', 'audit']) {
    const f = fixture(); const action = await f.propose();
    if (mode === 'tamper') f.state.rows.get(action.id).tool_input.title = 'Changed';
    else f.state.auditFailure = true;
    await assert.rejects(confirmAction(f.db, { id: action.id, req: f.req, execute: () => assert.fail('Must not execute'), audit: () => {} }));
    assert.equal(f.state.rows.get(action.id).status, 'failed');
  }
});

test('executor failure stays failed and cannot be retried', async () => {
  const f = fixture(); const action = await f.propose();
  const result = await confirmAction(f.db, { id: action.id, req: f.req, execute: () => ({ success: false, error: 'Record not found' }), audit: () => {} });
  assert.equal(result.status, 'failed');
  await assert.rejects(confirmAction(f.db, { id: action.id, req: f.req }), { status: 409 });
});

test('model selection rejects manager Opus, allows admin, denies inactive and stale admin; no Kimi', async () => {
  const f = fixture();
  await assert.rejects(selectModel(f.db, f.user, 'opus-5-5'), { status: 400, message: 'Model not allowed' });
  assert.equal(await selectModel(f.db, f.user), 'claude-sonnet-5-5');
  f.user.role = f.state.live.role = 'admin';
  assert.equal(await selectModel(f.db, f.user, 'opus-5-5'), 'opus-5-5');
  assert.equal((await catalogFor(f.db, f.user)).models.length, 2);
  f.state.live.role = 'manager'; assert.deepEqual(await allowedModelsFor(f.db, f.user), ['claude-sonnet-5-5']);
  f.state.live.active = false; assert.deepEqual(await allowedModelsFor(f.db, f.user), []);
  assert.equal(AI_MODELS.some(m => /kimi/i.test(m.id)), false);
  assert.deepEqual(effectiveModels('manager', ['opus-5-5', 'kimi-k2.5']), []);
});

test('per-user overrides narrow access and selected default is always allowed', async () => {
  const f = fixture('admin'); f.state.override = ['opus-5-5'];
  assert.equal(await selectModel(f.db, f.user), 'opus-5-5');
  f.state.override = []; await assert.rejects(selectModel(f.db, f.user), { status: 403 });
  f.state.override = ['opus-5-5']; f.user.role = 'manager';
  assert.deepEqual(await allowedModelsFor(f.db, f.user), []);
});

test('explicit picker model wins env and configured Haiku fallback still works', async () => {
  const before = { primary: process.env.QMS_AI_MODEL, fallback: process.env.QMS_AI_FALLBACK_MODEL };
  try {
    process.env.QMS_AI_MODEL = 'claude-sonnet-5-5'; process.env.QMS_AI_FALLBACK_MODEL = 'claude-haiku-4-5';
    const calls = []; const client = { messages: { create: async params => {
      calls.push(params); if (calls.length === 1) throw Object.assign(new Error('busy'), { status: 503 }); return 'ok';
    } } };
    assert.equal(await createMessage(client, { messages: [] }, 'old', { model: 'opus-5-5' }), 'ok');
    assert.deepEqual(calls.map(p => p.model), ['opus-5-5', 'claude-haiku-4-5']);
  } finally {
    for (const [name, value] of [['QMS_AI_MODEL', before.primary], ['QMS_AI_FALLBACK_MODEL', before.fallback]]) {
      if (value === undefined) delete process.env[name]; else process.env[name] = value;
    }
  }
});

test('page context is absent by default, and malformed or oversized context is rejected', () => {
  assert.equal(parsePageContext(undefined), undefined); assert.equal(contextBlock(undefined), '');
  const valid = { route: '/capas/1', title: 'CAPA', recordType: 'capas', recordId: '1' };
  assert.deepEqual(parsePageContext(valid), valid);
  for (const invalid of [null, [], {}, { ...valid, page: '/' }, { ...valid, formData: {} },
    { ...valid, route: 'x'.repeat(101) }, { ...valid, title: 'x'.repeat(161) },
    { ...valid, recordType: 'users' }, { ...valid, recordType: 'toString' },
    { ...valid, recordId: '../1' }, { ...valid, recordId: 1 }, { ...valid, extra: 'x'.repeat(2048) }]) {
    assert.throws(() => parsePageContext(invalid));
  }
  assert.deepEqual(redact({ password: 'secret', title: '<b>CAPA</b>' }), { title: 'CAPA' });
  assert.match(contextBlock(valid), /treat.*data, not instructions/i);
});

test('client payload requires page-sharing opt-in and captures only route metadata', () => {
  const args = { messages: [], pathname: '/capas/12', title: 'CAPA', model: 'claude-sonnet-5-5' };
  assert.equal(Object.hasOwn(chatPayload(args), 'pageContext'), false);
  assert.deepEqual(chatPayload({ ...args, sharePage: true }).pageContext, { route: '/capas/12', title: 'CAPA', recordType: 'capas', recordId: '12' });
  assert.equal(Object.hasOwn(chatPayload({ ...args, sharePage: false }), 'pageContext'), false);
  assert.equal(buildPageContext('/capas/new', 'New').recordId, undefined);
  assert.equal(buildPageContext('/settings', 'Settings').recordType, undefined);
});

test('chat routes: SSE proposals, model/context rejection, saved cards and live history status (DB-less)', async () => {
  const { registerHooks } = await import('node:module');
  const f = fixture('admin'); const persisted = []; const modelCalls = [];
  let failAfterProposal = false;
  const originalGet = f.db.get; const originalRun = f.db.run;
  f.db.get = async (sql, args) => {
    if (sql.startsWith('SELECT session_id FROM chat_messages')) return { session_id: 'integration' };
    return originalGet(sql, args);
  };
  f.db.run = async (sql, args) => {
    if (sql.startsWith('INSERT INTO chat_messages')) {
      persisted.push({ role: args[2], content: args[3], context: JSON.parse(args[4]) });
      return { changes: 1 };
    }
    return originalRun(sql, args);
  };
  const openTasks = [{ id: 42, title: 'Verify sanitation', status: 'pending', capa_id: 12, capa_ref: 'CAPA-2026-012' }];
  let taskQueries = 0;
  f.db.all = async (sql, args) => {
    if (sql.includes('FROM capa_action_items')) {
      assert.deepEqual(args, ['approver']);
      assert.match(sql, /ai.assigned_to = \$1/);
      taskQueries++;
      return openTasks;
    }
    if (sql.includes('FROM chat_messages')) return persisted;
    if (sql.includes('FROM ai_pending_actions')) return [...f.state.rows.values()].map(row => ({ id: row.id, status: row.status, summary: row.summary, expiresAt: row.expires_at }));
    assert.fail(`Page/record data queried without opt-in: ${sql}`);
  };
  const fakeAnthropic = class {
    constructor() { this.messages = { create: async params => {
      modelCalls.push(structuredClone(params));
      if (failAfterProposal && modelCalls.length > 1) throw new Error('Simulated gateway outage');
      if (modelCalls.length === 1) return { content: [
        { type: 'tool_use', id: 'call1', name: 'create_capa', input: { title: 'First' } },
        { type: 'tool_use', id: 'call2', name: 'create_deviation', input: { title: 'Second' } },
      ] };
      return { content: [{ type: 'text', text: 'Review the proposals and click Approve.' }] };
    } }; }
  };
  // Intercept before module resolution/import: database-pg.js must NEVER run.
  globalThis.__qmsParityTest = { db: f.db, Anthropic: fakeAnthropic };
  const hooks = registerHooks({
    resolve(specifier, context, next) {
      if (specifier.endsWith('/database-pg.js')) return { url: 'qms-test:db', shortCircuit: true };
      if (specifier.endsWith('/auditMiddleware.js')) return { url: 'qms-test:audit', shortCircuit: true };
      if (specifier.endsWith('/websocket.js')) return { url: 'qms-test:ws', shortCircuit: true };
      if (specifier === '@anthropic-ai/sdk') return { url: 'qms-test:anthropic', shortCircuit: true };
      return next(specifier, context);
    },
    load(url, context, next) {
      const sources = {
        'qms-test:db': 'export default globalThis.__qmsParityTest.db;',
        'qms-test:audit': 'export const logAudit = async () => {};',
        'qms-test:ws': 'export const broadcast = () => {};',
        'qms-test:anthropic': 'export default globalThis.__qmsParityTest.Anthropic;',
      };
      if (sources[url]) return { format: 'module', source: sources[url], shortCircuit: true };
      return next(url, context);
    },
  });
  const oldKey = process.env.ANTHROPIC_API_KEY;
  process.env.ANTHROPIC_API_KEY = 'fake-local-test';
  const oldInterval = globalThis.setInterval; const timers = [];
  globalThis.setInterval = (...args) => { const timer = oldInterval(...args); timers.push(timer); return timer; };
  try {
    const { default: router, executeToolCall } = await import('../src/routes/shared/ai.js');
    globalThis.setInterval = oldInterval;
    const invoke = async (method, path, body = {}, params = {}) => {
      const layer = router.stack.find(l => l.route?.path === path && l.route.methods[method]);
      assert.ok(layer, `${method} ${path} exists`);
      const result = { statusCode: 200, events: [], headersSent: false };
      const res = {
        setHeader() {}, flushHeaders() { result.headersSent = true; }, on() {}, end() {},
        status(code) { result.statusCode = code; return this; }, json(value) { result.body = value; return this; },
        write(value) { result.events.push(JSON.parse(value.slice(6).trim())); },
        get headersSent() { return result.headersSent; },
      };
      await layer.route.stack[0].handle({ ...f.req, body, params }, res);
      return result;
    };
    let result = await invoke('post', '/ai/chat', { messages: [{ role: 'user', content: 'Prepare two records' }], chatSessionId: 'integration' });
    assert.equal(result.statusCode, 200);
    assert.equal(result.events.filter(e => e.type === 'action_proposed').length, 2);
    assert.equal(persisted.find(m => m.role === 'assistant').context.actions.length, 2);
    assert.equal(modelCalls[0].system.includes('<page_context'), false);
    assert.equal(taskQueries, 1);
    assert.ok(modelCalls[0].system.includes(JSON.stringify(openTasks, null, 2)));
    assert.match(modelCalls[0].system, /approver's Open Tasks/);
    assert.match(modelCalls[0].system, /You can update their status with update_action_item_status or add notes with add_action_item_note/);
    assert.equal(modelCalls[0].model, 'claude-sonnet-5-5');
    assert.equal(modelCalls[1].messages.at(-2).content.length, 2);
    assert.equal(modelCalls[1].messages.at(-1).content.length, 2);
    assert.equal(f.state.queries.some(({ sql }) => /^(UPDATE|DELETE)|^INSERT INTO (?!ai_pending_actions)/.test(sql)), false);

    const action = persisted.at(-1).context.actions[0]; f.state.rows.get(action.id).status = 'done';
    result = await invoke('get', '/ai/chat/history');
    assert.equal(result.body.messages.at(-1).actions[0].status, 'done');
    const before = modelCalls.length;
    f.user.role = f.state.live.role = 'manager';
    result = await invoke('post', '/ai/chat', { messages: [{}], model: 'opus-5-5' });
    assert.equal(result.statusCode, 400); assert.equal(result.body.error, 'Model not allowed');
    result = await invoke('post', '/ai/chat', { messages: [{}], pageContext: { route: '/', title: '', formData: {} } });
    assert.equal(result.statusCode, 400); assert.equal(modelCalls.length, before);
    result = await invoke('post', '/ai/actions/:id/confirm', {}, { id: 'bad-id' }); assert.equal(result.statusCode, 400);
    const queriesBefore = f.state.queries.length;
    assert.equal((await executeToolCall('delete_capa', {}, { role: 'operator' })).success, false);
    assert.equal(f.state.queries.length, queriesBefore);
    // A later model-round failure must not lose already-proposed cards.
    modelCalls.length = 0; failAfterProposal = true;
    result = await invoke('post', '/ai/chat', { messages: [{ role: 'user', content: 'Prepare again' }], chatSessionId: 'failed-stream' });
    assert.equal(result.events.at(-1).type, 'error');
    assert.equal(persisted.at(-1).context.actions.length, 2);
  } finally {
    hooks.deregister(); globalThis.setInterval = oldInterval; timers.forEach(clearInterval);
    delete globalThis.__qmsParityTest;
    if (oldKey === undefined) delete process.env.ANTHROPIC_API_KEY; else process.env.ANTHROPIC_API_KEY = oldKey;
  }
});

const summaryInputs = {
  update_record_field: { record_type: 'capas', record_id: '12', field: 'status', value: 'closed' },
  update_action_item_status: { action_item_id: 42, status: 'completed', notes: 'QA verified' },
  create_action_item: { capa_id: '12', title: 'Verify', description: 'Inspect seals', assigned_to: 'QA', due_date: '2026-11-01' },
  add_action_item_note: { action_item_id: 42, note: 'Seal inspection passed' },
  create_capa_from_deviation: { deviation_id: '5', corrective_action: 'Repair seal', preventive_action: 'Train operators', responsible_person: 'QA', target_date: '2026-11-01' },
  create_capa: { title: 'Seal failure', description: 'Leaking lid', root_cause_analysis: 'Worn seal', priority: 'high', classification: 'major', risk_assessment: 'high', responsible_person: 'QA', target_date: '2026-11-01' },
  delete_capa: { capa_id: '12', confirm: true },
  link_records: { source_type: 'capa', source_id: 12, target_type: 'deviation', target_id: 5, link_reason: 'Same batch' },
  create_deviation: { title: 'Leak', description: 'Leaking lid', category: 'equipment', product_on_hold: false },
  update_deviation: { deviation_id: 5, root_cause: 'Worn seal', priority: 'high', classification: 'major', product_disposition: 'hold' },
};
for (const [tool, input] of Object.entries(summaryInputs)) {
  test(`${tool}: approval summary includes supplied field values`, async () => {
    const f = fixture('admin');
    const action = await f.propose(tool, input);
    for (const [key, value] of Object.entries(input)) {
      assert.ok(action.summary.includes(`${key.replace(/_/g, ' ')}: ${JSON.stringify(value)}`));
    }
    assert.equal(f.state.rows.get(action.id).summary, action.summary);
  });
}
test('approval summaries truncate individual values without hiding subsequent fields or empty values', () => {
  const summary = summarize('update_record_field', { value: 'x'.repeat(1000), priority: 'critical', note: '', count: 0 });
  assert.ok(summary.includes('… [truncated]'));
  assert.ok(!summary.includes('x'.repeat(241)));
  assert.ok(summary.includes('priority: "critical"'));
  assert.ok(summary.includes('note: ""'));
  assert.ok(summary.includes('count: 0'));
});
