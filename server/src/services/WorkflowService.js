/**
 * WorkflowService — generic state-machine for entity status transitions.
 *
 * Usage:
 *   import { WorkflowService } from '../services/WorkflowService.js';
 *
 *   const check = await WorkflowService.transition('batch', 'qa_hold', 'released', { batch });
 *   if (!check.allowed) return res.status(409).json({ error: check.reason });
 *
 *   const next = WorkflowService.getAvailableTransitions('batch', 'ready');
 *   // → ['flavouring', 'qa_hold']
 *
 *   WorkflowService.registerWorkflow({ name: 'shipment', states: [...], transitions: [...] });
 *
 * Guards are named functions registered alongside the workflow that receive the
 * caller-supplied context and return { allowed: boolean, reason: string }.
 */

/**
 * @typedef {(context: object) => Promise<{allowed: boolean, reason: string}> | {allowed: boolean, reason: string}} GuardFn
 */

/**
 * @typedef {object} WorkflowTransition
 * @property {string} from
 * @property {string} to
 * @property {string|null} [guard]   Name of a registered guard function, or null.
 */

/**
 * @typedef {object} WorkflowConfig
 * @property {string} name
 * @property {string[]} states
 * @property {WorkflowTransition[]} transitions
 * @property {Object<string, GuardFn>} [guards]   Map of guard name → function.
 */

// ─── Built-in guards ─────────────────────────────────────────────────────────

/**
 * Guard: batch may only leave qa_hold → released when QC checks have passed.
 * Expects context.batch with either `qc_status === 'pass'` or `qc_passed === true`,
 * OR context.qcPassed === true.
 */
function requiresQCPass(context = {}) {
  const batch = context.batch || {};
  const passed =
    context.qcPassed === true ||
    batch.qc_status === 'pass' ||
    batch.qc_passed === true;
  return passed
    ? { allowed: true, reason: '' }
    : { allowed: false, reason: 'QC checks must pass before release (qc_status must be "pass")' };
}

/**
 * Guard: CAPA verification → closed requires a verifier and effectiveness check.
 * Expects context.capa with `verified_by` and `effectiveness_verified === true`.
 */
function requiresVerification(context = {}) {
  const capa = context.capa || {};
  if (!capa.verified_by) {
    return { allowed: false, reason: 'CAPA must have verified_by set before closing' };
  }
  if (!capa.effectiveness_verified) {
    return { allowed: false, reason: 'CAPA effectiveness must be verified before closing' };
  }
  return { allowed: true, reason: '' };
}

/**
 * Guard: change_request review → approved requires an approver.
 * Expects context.changeRequest.approved_by.
 */
function requiresApprover(context = {}) {
  const cr = context.changeRequest || context.change_request || {};
  return cr.approved_by
    ? { allowed: true, reason: '' }
    : { allowed: false, reason: 'Change request requires approved_by before moving to approved' };
}

// ─── Workflow definitions ────────────────────────────────────────────────────

const BATCH_WORKFLOW = {
  name: 'batch',
  states: ['planned', 'fermenting', 'ready', 'flavouring', 'pouring', 'packing', 'qa_hold', 'released', 'shipped'],
  transitions: [
    { from: 'planned',    to: 'fermenting', guard: null },
    { from: 'fermenting', to: 'ready',      guard: null },
    { from: 'ready',      to: 'flavouring', guard: null },
    { from: 'ready',      to: 'qa_hold',    guard: null },
    { from: 'flavouring', to: 'pouring',    guard: null },
    { from: 'pouring',    to: 'packing',    guard: null },
    { from: 'packing',    to: 'qa_hold',    guard: null },
    { from: 'qa_hold',    to: 'released',   guard: 'requiresQCPass' },
    { from: 'released',   to: 'shipped',    guard: null },
  ],
  guards: { requiresQCPass },
};

const CAPA_WORKFLOW = {
  name: 'capa',
  states: ['open', 'investigating', 'action_required', 'verification', 'closed'],
  transitions: [
    { from: 'open',             to: 'investigating',    guard: null },
    { from: 'investigating',    to: 'action_required',  guard: null },
    { from: 'action_required',  to: 'verification',     guard: null },
    { from: 'verification',     to: 'closed',           guard: 'requiresVerification' },
  ],
  guards: { requiresVerification },
};

const DEVIATION_WORKFLOW = {
  name: 'deviation',
  states: ['open', 'investigating', 'corrective_action', 'closed'],
  transitions: [
    { from: 'open',              to: 'investigating',     guard: null },
    { from: 'investigating',     to: 'corrective_action', guard: null },
    { from: 'corrective_action', to: 'closed',            guard: null },
  ],
  guards: {},
};

const CHANGE_REQUEST_WORKFLOW = {
  name: 'change_request',
  states: ['draft', 'review', 'approved', 'implementing', 'closed', 'rejected'],
  transitions: [
    { from: 'draft',        to: 'review',       guard: null },
    { from: 'review',       to: 'approved',     guard: 'requiresApprover' },
    { from: 'review',       to: 'rejected',     guard: null },
    { from: 'approved',     to: 'implementing', guard: null },
    { from: 'implementing', to: 'closed',       guard: null },
  ],
  guards: { requiresApprover },
};

// ─── Implementation ──────────────────────────────────────────────────────────

class WorkflowServiceImpl {
  constructor() {
    /** @type {Map<string, WorkflowConfig>} */
    this.workflows = new Map();
  }

  /**
   * Register (or overwrite) a workflow.
   * @param {WorkflowConfig} config
   */
  registerWorkflow(config) {
    if (!config?.name) throw new Error('Workflow config must have a name');
    if (!Array.isArray(config.states) || config.states.length === 0) {
      throw new Error(`Workflow '${config.name}' must declare states[]`);
    }
    if (!Array.isArray(config.transitions)) {
      throw new Error(`Workflow '${config.name}' must declare transitions[]`);
    }
    this.workflows.set(config.name, {
      name: config.name,
      states: config.states.slice(),
      transitions: config.transitions.slice(),
      guards: { ...(config.guards || {}) },
    });
  }

  /**
   * Get the registered workflow config (read-only).
   * @param {string} name
   * @returns {WorkflowConfig|null}
   */
  getWorkflow(name) {
    return this.workflows.get(name) || null;
  }

  /**
   * List all valid next states from `currentState`.
   * @param {string} workflowName
   * @param {string} currentState
   * @returns {string[]}
   */
  getAvailableTransitions(workflowName, currentState) {
    const wf = this.workflows.get(workflowName);
    if (!wf) return [];
    return wf.transitions
      .filter(t => t.from === currentState)
      .map(t => t.to);
  }

  /**
   * Validate a transition and run its guard if any.
   * Does NOT mutate state — callers persist the new state themselves.
   *
   * @param {string} workflowName
   * @param {string} currentState
   * @param {string} targetState
   * @param {object} [context]  Passed to the guard function.
   * @returns {Promise<{allowed: boolean, reason: string}>}
   */
  async transition(workflowName, currentState, targetState, context = {}) {
    const wf = this.workflows.get(workflowName);
    if (!wf) {
      return { allowed: false, reason: `Unknown workflow: ${workflowName}` };
    }
    if (!wf.states.includes(currentState)) {
      return { allowed: false, reason: `Invalid current state '${currentState}' for workflow '${workflowName}'` };
    }
    if (!wf.states.includes(targetState)) {
      return { allowed: false, reason: `Invalid target state '${targetState}' for workflow '${workflowName}'` };
    }
    if (currentState === targetState) {
      return { allowed: false, reason: `No-op transition: already in '${currentState}'` };
    }

    const rule = wf.transitions.find(t => t.from === currentState && t.to === targetState);
    if (!rule) {
      return {
        allowed: false,
        reason: `Transition not allowed: ${currentState} → ${targetState}`,
      };
    }

    if (rule.guard) {
      const guardFn = wf.guards?.[rule.guard];
      if (typeof guardFn !== 'function') {
        return { allowed: false, reason: `Guard '${rule.guard}' is not registered for workflow '${workflowName}'` };
      }
      try {
        const result = await guardFn(context);
        if (!result || result.allowed !== true) {
          return { allowed: false, reason: result?.reason || `Guard '${rule.guard}' rejected the transition` };
        }
      } catch (err) {
        return { allowed: false, reason: `Guard '${rule.guard}' threw: ${err.message}` };
      }
    }

    return { allowed: true, reason: '' };
  }
}

export const WorkflowService = new WorkflowServiceImpl();

// Pre-register built-in workflows on import.
WorkflowService.registerWorkflow(BATCH_WORKFLOW);
WorkflowService.registerWorkflow(CAPA_WORKFLOW);
WorkflowService.registerWorkflow(DEVIATION_WORKFLOW);
WorkflowService.registerWorkflow(CHANGE_REQUEST_WORKFLOW);

export default WorkflowService;
