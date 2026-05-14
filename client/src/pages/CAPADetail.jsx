import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFetch, apiPut, apiPost, apiDelete } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import FormattedText from '../components/FormattedText';
import RecordLinker from '../components/RecordLinker';
import { FieldHelp, RecordInfoTooltip, GMP_HELP } from '../components/GmpFieldHelp';
import AiSuggestButton from '../components/AiSuggestButton';
import {
  ArrowLeft, Save, Printer, Shield, Clock, CheckCircle, XCircle,
  AlertTriangle, FileText, Plus, Send, CalendarDays,
  User, Pencil, X, FlaskConical, MessageSquare,
  RefreshCw, Activity, Tag, Paperclip, Trash2,
  ChevronDown, ChevronRight, ArrowDownCircle, Zap, Upload, Download, Filter,
} from 'lucide-react';

// ── Constants ──────────────────────────────────────────────────────────────

const STATUS_COLORS = {
  open: 'bg-amber-100 text-amber-700 border-amber-200',
  investigating: 'bg-orange-100 text-orange-700 border-orange-200',
  action_defined: 'bg-cyan-100 text-cyan-700 border-cyan-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  pending_review: 'bg-purple-100 text-purple-700 border-purple-200',
  closed: 'bg-green-100 text-green-700 border-green-200',
  overdue: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_OPTIONS = ['open', 'investigating', 'action_defined', 'in_progress', 'pending_review', 'closed'];

const ROOT_CAUSE_LABELS = {
  '5_whys': '5 Whys', fishbone: 'Fishbone / Ishikawa', fault_tree: 'Fault Tree Analysis',
  pareto: 'Pareto Analysis', fmea: 'FMEA', timeline: 'Timeline Analysis', other: 'Other',
};

const SOURCE_COLORS = {
  change_request: 'bg-blue-50 text-blue-700',
  deviation: 'bg-amber-50 text-amber-700',
  ccr: 'bg-teal-50 text-teal-700',
  complaint: 'bg-red-50 text-red-700',
  batch_test: 'bg-amber-50 text-amber-700',
  audit: 'bg-indigo-50 text-indigo-700',
  internal: 'bg-gray-100 text-gray-700',
  supplier: 'bg-orange-50 text-orange-700',
  regulatory: 'bg-purple-50 text-purple-700',
  other: 'bg-gray-100 text-gray-700',
};

const UPDATE_TYPE_COLORS = {
  note: 'bg-gray-100 text-gray-700',
  status_change: 'bg-blue-100 text-blue-700',
  evidence: 'bg-green-100 text-green-700',
  investigation: 'bg-amber-100 text-amber-700',
  effectiveness_review: 'bg-purple-100 text-purple-700',
};

const UPDATE_TYPE_OPTIONS = [
  { value: 'note', label: 'Note' },
  { value: 'status_change', label: 'Status Change' },
  { value: 'evidence', label: 'Evidence' },
  { value: 'investigation', label: 'Investigation' },
  { value: 'effectiveness_review', label: 'Effectiveness Review' },
];

const BATCH_STATUS_COLORS = {
  pass: 'bg-green-100 text-green-700',
  fail: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
};

const TABS = [
  { key: 'overview', label: 'Overview' },
  { key: 'linked', label: 'Linked Records' },
  { key: 'activity', label: 'Activity Log' },
  { key: 'documents', label: 'Documents' },
  { key: 'audit', label: 'Audit Trail' },
];

const LIFECYCLE_STEPS = [
  { key: 'open', label: '1. Opened', desc: 'CAPA initiated. Fill in the problem description, source, and classification.' },
  { key: 'investigating', label: '2. Investigating', desc: 'Conduct root cause analysis. Document findings, evidence, and investigation method.' },
  { key: 'action_defined', label: '3. Actions Defined', desc: 'Define corrective and preventive actions. Assign owners and target dates.' },
  { key: 'in_progress', label: '4. In Progress', desc: 'Corrective and preventive actions are being implemented.' },
  { key: 'pending_review', label: '5. Verify', desc: 'Actions completed. Verify effectiveness — did the fix actually work?' },
  { key: 'closed', label: '6. Closed', desc: 'Effectiveness confirmed. CAPA complete.' },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function formatDate(d) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('en-CA');
}

function formatDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-CA') + ' ' + dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function statusLabel(s) {
  if (!s) return '';
  return s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function lifecycleIndex(status) {
  const idx = LIFECYCLE_STEPS.findIndex(s => s.key === status);
  return idx === -1 ? 0 : idx;
}

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// ── Reusable card shell ────────────────────────────────────────────────────

function Card({ children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-200 ${className}`}>
      {children}
    </div>
  );
}

// ── Editable text field card ───────────────────────────────────────────────

function EditableCard({ icon: Icon, iconColor, title, value, rawValue, placeholder, isAdmin, onSave, aiSuggestProps }) {
  const [editing, setEditing] = useState(false);
  const editableValue = rawValue !== undefined ? rawValue : (typeof value === 'string' ? value : '');
  const [draft, setDraft] = useState(editableValue);
  const [saving, setSaving] = useState(false);

  useEffect(() => { setDraft(rawValue !== undefined ? rawValue : (typeof value === 'string' ? value : '')); }, [value, rawValue]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(draft);
      setEditing(false);
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setDraft(value || '');
    setEditing(false);
  };

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${iconColor}`} />}
          {title}
          {aiSuggestProps && editing && <AiSuggestButton {...aiSuggestProps} onSuggestion={(text) => { setDraft(text); aiSuggestProps.onSuggestion?.(text); }} />}
        </h3>
        {isAdmin && !editing && (
          <button
            onClick={() => setEditing(true)}
            className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            title="Edit"
          >
            <Pencil className="w-4 h-4" />
          </button>
        )}
      </div>
      {editing ? (
        <div>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={5}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            placeholder={placeholder}
          />
          <div className="flex items-center gap-2 mt-2 justify-end">
            <button
              onClick={handleCancel}
              className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-4 min-h-[80px]">
          {value || <span className="text-gray-400 italic">{placeholder}</span>}
        </p>
      )}
    </Card>
  );
}

// ── Collapsible section ───────────────────────────────────────────────────

function CollapsibleSection({ icon: Icon, iconColor, title, defaultOpen = false, children, badge }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm transition-all duration-200">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
      >
        <div className="flex items-center gap-2">
          {Icon && <Icon className={`w-4 h-4 ${iconColor || 'text-gray-500'}`} />}
          <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</span>
          {badge && <span className="ml-2">{badge}</span>}
        </div>
        {open
          ? <ChevronDown className="w-4 h-4 text-gray-400 transition-transform duration-200" />
          : <ChevronRight className="w-4 h-4 text-gray-400 transition-transform duration-200" />
        }
      </button>
      <div className={`transition-all duration-200 ease-in-out ${open ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0 overflow-hidden'}`}>
        <div className="p-5">
          {children}
        </div>
      </div>
    </div>
  );
}

// ── Progress bar ───────────────────────────────────────────────────────────

// Stage gate requirements — what must be filled before advancing
const STAGE_GATES = {
  open: {
    next: 'investigating',
    label: 'Advance to Investigating',
    required: [
      { field: 'title', label: 'Title' },
      { field: 'description', label: 'Description — what happened' },
      { field: 'category', label: 'Category' },
      { field: 'responsible_person', label: 'Responsible person assigned' },
    ],
    guidance: 'Before investigating, you need: a clear title, description of the issue, category selected, and a responsible person assigned.',
  },
  investigating: {
    next: 'action_defined',
    label: 'Advance to Actions Defined',
    required: [
      { field: 'root_cause_analysis', label: 'Root cause analysis documented' },
      { field: 'classification', label: 'Classification (Critical/Major/Minor)' },
    ],
    optional: [
      { field: 'investigation_details', label: 'Investigation details / evidence' },
    ],
    guidance: 'Before defining actions, you need: root cause analysis completed and classification set. Investigation details are recommended.',
  },
  action_defined: {
    next: 'in_progress',
    label: 'Advance to In Progress',
    required: [
      { field: 'corrective_action', label: 'Corrective action(s) defined' },
      { field: 'preventive_action', label: 'Preventive action(s) defined' },
      { field: 'target_date', label: 'Target completion date set' },
    ],
    guidance: 'Before starting implementation, you need: corrective actions, preventive actions, and a target date.',
  },
  in_progress: {
    next: 'pending_review',
    label: 'Advance to Verification',
    required: [
      { field: 'verification_method', label: 'Verification method defined — how will you check effectiveness?' },
    ],
    guidance: 'Before verification, define how you will check if the actions were effective (e.g. reduced complaints, test results, audit).',
  },
  pending_review: {
    next: 'closed',
    label: 'Close CAPA',
    required: [
      { field: 'effectiveness_result', label: 'Effectiveness check result recorded' },
    ],
    guidance: 'Before closing, record whether the corrective/preventive actions were effective. Use the Effectiveness Check button.',
  },
};

function LifecycleBar({ status, onAdvance, isAdmin, capa, onQuickEdit }) {
  const current = lifecycleIndex(status);
  const currentStep = LIFECYCLE_STEPS[current];
  const nextStep = current < LIFECYCLE_STEPS.length - 1 ? LIFECYCLE_STEPS[current + 1] : null;
  const gate = STAGE_GATES[status];

  // Check which requirements are met/unmet
  const checkGate = () => {
    if (!gate) return { canAdvance: false, met: [], unmet: [] };
    const met = [];
    const unmet = [];
    for (const req of gate.required) {
      const val = capa[req.field];
      if (val && String(val).trim().length > 0) {
        met.push(req);
      } else {
        unmet.push(req);
      }
    }
    return { canAdvance: unmet.length === 0, met, unmet };
  };

  const { canAdvance, met, unmet } = checkGate();
  const optionalFields = gate?.optional || [];
  const optionalMet = optionalFields.filter(f => capa[f.field] && String(capa[f.field]).trim().length > 0);
  return (
    <Card className="p-5">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">CAPA Lifecycle</h3>
      <div className="flex items-center gap-1 mb-4">
        {LIFECYCLE_STEPS.map((step, i) => {
          const isComplete = i <= current;
          const isCurrent = i === current;
          return (
            <React.Fragment key={step.key}>
              {i > 0 && (
                <div className={`flex-1 h-1 rounded transition-all duration-500 ${i <= current ? 'bg-indigo-500' : 'bg-gray-200'}`} />
              )}
              <div className="flex flex-col items-center gap-1.5">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-all duration-300 ${
                    isCurrent
                      ? 'bg-indigo-600 text-white border-indigo-600 ring-4 ring-indigo-100 scale-110 shadow-md shadow-indigo-200'
                      : isComplete
                        ? 'bg-green-500 text-white border-green-500'
                        : 'bg-white text-gray-400 border-gray-200'
                  }`}
                  style={isCurrent ? { animation: 'pulse 2s ease-in-out infinite' } : {}}
                >
                  {isComplete && i < current ? <CheckCircle className="w-4 h-4" /> : i + 1}
                </div>
                <span className={`text-[11px] font-medium whitespace-nowrap ${isCurrent ? 'text-indigo-700' : isComplete ? 'text-gray-700' : 'text-gray-400'}`}>
                  {step.label}
                </span>
              </div>
            </React.Fragment>
          );
        })}
      </div>
      {/* Current stage info + gate requirements */}
      <div className="mt-4 space-y-3">
        <div className="p-4 bg-indigo-50 border border-indigo-100 rounded-lg">
          <p className="text-sm font-semibold text-indigo-800">
            Current Stage: {currentStep?.label || status}
          </p>
          <p className="text-sm text-indigo-700 mt-1">
            {currentStep?.desc || ''}
          </p>
        </div>

        {/* Gate requirements checklist */}
        {gate && isAdmin && (
          <div className={`p-4 rounded-lg border ${canAdvance ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
            <p className={`text-sm font-semibold mb-2 ${canAdvance ? 'text-green-800' : 'text-amber-800'}`}>
              {canAdvance ? '✅ All requirements met — ready to advance' : '⚠️ Requirements to advance:'}
            </p>
            <p className="text-xs text-gray-600 mb-3">{gate.guidance}</p>
            <div className="space-y-1.5">
              {gate.required.map(req => {
                const isMet = met.some(m => m.field === req.field);
                return (
                  <div key={req.field} className="flex items-center gap-2">
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                      isMet ? 'bg-green-500 text-white' : 'bg-gray-300 text-white'
                    }`}>
                      {isMet ? '✓' : '○'}
                    </span>
                    <span className={`text-sm ${isMet ? 'text-green-700 line-through' : 'text-gray-800 font-medium'}`}>
                      {req.label}
                    </span>
                    {!isMet && <span className="text-xs text-red-500 font-semibold">Required</span>}
                    {!isMet && onQuickEdit && (
                      <button
                        onClick={() => onQuickEdit(req.field, req.label)}
                        className="ml-auto px-3 py-1 text-xs font-medium text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors border border-indigo-200"
                      >
                        ✏️ Fill Now
                      </button>
                    )}
                  </div>
                );
              })}
              {optionalFields.map(req => {
                const isMet = optionalMet.some(m => m.field === req.field);
                return (
                  <div key={req.field} className="flex items-center gap-2">
                    <span className={`flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs ${
                      isMet ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                    }`}>
                      {isMet ? '✓' : '○'}
                    </span>
                    <span className={`text-sm ${isMet ? 'text-green-700 line-through' : 'text-gray-500'}`}>
                      {req.label}
                    </span>
                    <span className="text-xs text-gray-400">Optional</span>
                  </div>
                );
              })}
            </div>

            {/* Advance button — only enabled when all required fields are met */}
            {nextStep && onAdvance && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                {canAdvance ? (
                  <button
                    onClick={() => onAdvance(nextStep.key)}
                    className="px-5 py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors flex items-center gap-2"
                  >
                    ✓ {gate.label} →
                  </button>
                ) : (
                  <div>
                    <button disabled
                      className="px-5 py-2.5 bg-gray-300 text-gray-500 text-sm font-medium rounded-lg cursor-not-allowed flex items-center gap-2"
                    >
                      🔒 {gate.label}
                    </button>
                    <p className="text-xs text-gray-500 mt-1">Complete the required fields above to unlock this button.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}

// ── Link picker dropdown ───────────────────────────────────────────────────

function LinkPicker({ open, onClose, items, loading, onSelect, renderItem, emptyLabel, suggestedIds }) {
  if (!open) return null;

  const sorted = suggestedIds && suggestedIds.length > 0
    ? [...items].sort((a, b) => (suggestedIds.includes(a.id) ? 0 : 1) - (suggestedIds.includes(b.id) ? 0 : 1))
    : items;

  return (
    <React.Fragment>
      <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={onClose} />
      <div style={{ position: 'absolute', zIndex: 50, marginTop: 4, minWidth: 450, maxWidth: 600, background: 'white', border: '1px solid #e5e7eb', borderRadius: 12, boxShadow: '0 10px 25px rgba(0,0,0,0.15)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 16px', borderBottom: '1px solid #f3f4f6', background: '#f9fafb', borderRadius: '12px 12px 0 0' }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase' }}>Select to link</span>
          <button onClick={onClose} style={{ fontSize: 12, color: '#9ca3af', cursor: 'pointer', border: 'none', background: 'none' }}>✕ Close</button>
        </div>
        <div style={{ maxHeight: 260, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>Loading...</div>
          ) : sorted.length === 0 ? (
            <div style={{ padding: 16, textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>{emptyLabel}</div>
          ) : (
            sorted.map((item) => {
              const isSuggested = suggestedIds && suggestedIds.includes(item.id);
              return (
                <button key={item.id} onClick={() => { onSelect(item); onClose(); }}
                  style={{ width: '100%', textAlign: 'left', padding: '10px 16px', border: 'none', borderBottom: '1px solid #f9fafb', cursor: 'pointer', background: isSuggested ? '#fffbeb' : 'white', borderLeft: isSuggested ? '3px solid #f59e0b' : '3px solid transparent', display: 'flex', alignItems: 'center', gap: 8 }}
                  onMouseEnter={(e) => e.currentTarget.style.background = '#eef2ff'}
                  onMouseLeave={(e) => e.currentTarget.style.background = isSuggested ? '#fffbeb' : 'white'}
                >
                  {isSuggested && <span style={{ fontSize: 9, padding: '2px 6px', background: '#fef3c7', color: '#92400e', borderRadius: 4, fontWeight: 700 }}>AI SUGGESTED</span>}
                  <div style={{ flex: 1 }}>{renderItem(item)}</div>
                </button>
              );
            })
          )}
        </div>
      </div>
    </React.Fragment>
  );
}


// ── Main Component ─────────────────────────────────────────────────────────


function AuditTrailSection({ capaId }) {
  const [logs, setLogs] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  
  React.useEffect(() => {
    fetch(`/api/audit-trail/capa/${capaId}`, { credentials: 'include' })
      .then(r => r.json())
      .then(data => { setLogs(Array.isArray(data) ? data : []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [capaId]);
  
  if (loading) return <div className="text-center py-8 text-gray-400">Loading audit trail...</div>;
  
  const actionColors = {
    create: 'bg-green-100 text-green-700', update: 'bg-blue-100 text-blue-700',
    delete: 'bg-red-100 text-red-700', view: 'bg-gray-100 text-gray-600',
    parse: 'bg-purple-100 text-purple-700', upload: 'bg-sky-100 text-sky-700',
  };
  
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-500 uppercase mb-3">Audit Trail — {logs.length} entries</h3>
      {logs.length === 0 ? (
        <div className="text-center py-8 text-gray-400">No audit log entries found for this CAPA.</div>
      ) : (
        <div className="border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead><tr className="bg-gray-50 border-b">
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Timestamp</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Action</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">User</th>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500">Details</th>
            </tr></thead>
            <tbody>
              {logs.map((log, i) => {
                const action = (log.action || '').replace(/_/g, ' ');
                const color = Object.entries(actionColors).find(([k]) => log.action?.includes(k))?.[1] || 'bg-gray-100 text-gray-600';
                let details = '';
                try {
                  const d = JSON.parse(log.details || '{}');
                  if (d.new_values) details = JSON.stringify(d.new_values).slice(0, 100);
                  else if (d.old_values) details = 'Removed: ' + JSON.stringify(d.old_values).slice(0, 80);
                } catch(e) { details = log.details || ''; }
                return (
                  <tr key={i} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2 text-xs text-gray-500 whitespace-nowrap">{log.timestamp}</td>
                    <td className="px-4 py-2"><span className={"px-2 py-0.5 rounded-full text-[10px] font-bold " + color}>{action}</span></td>
                    <td className="px-4 py-2 text-xs text-gray-600">{log.username || 'system'}</td>
                    <td className="px-4 py-2 text-xs text-gray-500 max-w-xs truncate">{details}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default function CAPADetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const canEditContent = user?.role === 'admin' || user?.role === 'operator';

  const { data: capa, loading, error, refetch } = useFetch(`/api/capas/${id}`);

  // Tabs
  const [activeTab, setActiveTab] = useState('overview');
  const [quickEditField, setQuickEditField] = useState(null);
  const [quickEditValue, setQuickEditValue] = useState('');

  const handleQuickSave = async () => {
    if (!quickEditField) return;
    try {
      await apiPut(`/api/capas/${capa.id}`, { [quickEditField.field]: quickEditValue });
      refetch();
      setQuickEditField(null);
      setQuickEditValue('');
    } catch (err) { alert('Error: ' + err.message); }
  };

  // Header field editing
  const [editingField, setEditingField] = useState(null); // 'status' | 'responsible' | 'target_date' | 'completion_date' | 'effectiveness_date'
  const [fieldDraft, setFieldDraft] = useState('');
  const [savingField, setSavingField] = useState(false);

  // Activity log
  const [updateContent, setUpdateContent] = useState('');
  const [updateType, setUpdateType] = useState('note');
  const [attachments, setAttachments] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [sectionComments, setSectionComments] = useState({});
  const [commentInputs, setCommentInputs] = useState({});
  const [timelineFilter, setTimelineFilter] = useState('all');
  const [submittingUpdate, setSubmittingUpdate] = useState(false);

  // Linked records
  const [showBatchPicker, setShowBatchPicker] = useState(false);
  const [showComplaintPicker, setShowComplaintPicker] = useState(false);
  const [availableBatches, setAvailableBatches] = useState([]);
  const [availableComplaints, setAvailableComplaints] = useState([]);
  const [loadingBatches, setLoadingBatches] = useState(false);
  const [loadingComplaints, setLoadingComplaints] = useState(false);
  const [suggestedBatchIds, setSuggestedBatchIds] = useState([]);
  const [suggestedComplaintIds, setSuggestedComplaintIds] = useState([]);

  // Fetch AI suggestions
  React.useEffect(() => {
    if (id) {
      fetch(`/api/capas/${id}/suggest-links`, { credentials: 'include' })
        .then(r => r.json())
        .then(d => {
          setSuggestedBatchIds(d.suggestedBatchIds || []);
          setSuggestedComplaintIds(d.suggestedComplaintIds || []);
        })
        .catch(() => {});
    }
  }, [id]);
  const [linkingId, setLinkingId] = useState(null);

  // ── Field editing helpers ──────────────────────────────────────────────

  const startFieldEdit = (field, currentValue) => {
    setEditingField(field);
    setFieldDraft(currentValue || '');
  };

  const cancelFieldEdit = () => {
    setEditingField(null);
    setFieldDraft('');
  };

  const saveField = async (fieldName, value) => {
    setSavingField(true);
    try {
      await apiPut(`/api/capas/${id}`, { [fieldName]: value });
      setEditingField(null);
      refetch();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSavingField(false);
    }
  };

  const saveTextCard = (fieldName) => async (value) => {
    await apiPut(`/api/capas/${id}`, { [fieldName]: value });
    refetch();
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this CAPA? This action cannot be undone.')) return;
    try {
      await apiDelete(`/api/capas/${id}`);
      navigate('/capas');
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  // ── Activity log ───────────────────────────────────────────────────────

  const handleSubmitUpdate = async () => {
    if (!updateContent.trim()) return;
    setSubmittingUpdate(true);
    try {
      await apiPost(`/api/capas/${id}/updates`, {
        type: updateType,
        content: updateContent.trim(),
      });
      setUpdateContent('');
      setUpdateType('note');
      refetch();
    } catch (err) {
      alert('Failed to add update: ' + err.message);
    } finally {
      setSubmittingUpdate(false);
    }
  };

  // ── Attachment helpers ────────────────────────────────────────────────

  const fetchAttachments = async () => {
    try {
      const res = await fetch(`/api/capas/${id}/attachments`, { credentials: 'include' });
      const data = await res.json();
      setAttachments(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to fetch attachments:', err);
    }
  };

  useEffect(() => {
    if (id) fetchAttachments();
  }, [id]);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/capas/${id}/attachments`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) throw new Error('Upload failed');
      await fetchAttachments();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDeleteAttachment = async (attachmentId) => {
    if (!confirm('Delete this attachment?')) return;
    try {
      const res = await fetch(`/api/capas/${id}/attachments/${attachmentId}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) throw new Error('Delete failed');
      await fetchAttachments();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  // ── Linked record helpers ──────────────────────────────────────────────

  const openBatchPicker = async () => {
    setShowBatchPicker(true);
    setLoadingBatches(true);
    try {
      const res = await fetch(`/api/capas/${id}/available-batches`);
      const data = await res.json();
      setAvailableBatches(Array.isArray(data) ? data : data.batches || []);
    } catch {
      setAvailableBatches([]);
    } finally {
      setLoadingBatches(false);
    }
  };

  const openComplaintPicker = async () => {
    setShowComplaintPicker(true);
    setLoadingComplaints(true);
    try {
      const res = await fetch(`/api/capas/${id}/available-complaints`);
      const data = await res.json();
      setAvailableComplaints(Array.isArray(data) ? data : data.complaints || []);
    } catch {
      setAvailableComplaints([]);
    } finally {
      setLoadingComplaints(false);
    }
  };

  const linkBatch = async (batch) => {
    setLinkingId(batch.id);
    try {
      await apiPut(`/api/capas/${id}/link-batch`, { batch_id: batch.id });
      setShowBatchPicker(false);
      refetch();
    } catch (err) {
      alert('Failed to link batch: ' + err.message);
    } finally {
      setLinkingId(null);
    }
  };

  const linkComplaint = async (complaint) => {
    setLinkingId(complaint.id);
    try {
      await apiPut(`/api/capas/${id}/link-complaint`, { complaint_id: complaint.id });
      setShowComplaintPicker(false);
      refetch();
    } catch (err) {
      alert('Failed to link complaint: ' + err.message);
    } finally {
      setLinkingId(null);
    }
  };

  const unlinkComplaint = async (complaintId) => {
    if (!window.confirm('Unlink this complaint?')) return;
    try {
      await apiDelete(`/api/capas/${id}/link-complaint/${complaintId}`);
      refetch();
    } catch (err) {
      alert('Failed to unlink: ' + err.message);
    }
  };

  // ── Loading / error states ─────────────────────────────────────────────

  if (loading) return <LoadingSpinner message="Loading CAPA..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;
  if (!capa) return <div className="text-center py-16 text-gray-500">CAPA not found</div>;

  const linkedTests = capa.linked_tests || [];
  const linkedComplaints = capa.linked_complaints || [];
  const updates = capa.updates || [];
  const filteredUpdates = timelineFilter === 'all' ? updates :
    updates.filter(u => {
      if (timelineFilter === 'notes') return u.type === 'note';
      if (timelineFilter === 'evidence') return u.type === 'evidence';
      if (timelineFilter === 'investigation') return u.type === 'investigation';
      if (timelineFilter === 'status') return u.type === 'status_change';
      return true;
    });

  // ── Render ─────────────────────────────────────────────────────────────

  return (
    <div className="max-w-5xl mx-auto">
      {/* Pulse animation for current step indicator */}
      <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 0 0 rgba(99, 102, 241, 0.4); }
          50% { box-shadow: 0 0 0 8px rgba(99, 102, 241, 0); }
        }
      `}</style>
      {/* ── Top bar ──────────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={() => navigate('/capas')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to CAPAs
        </button>
        <button
          onClick={() => window.open(`/api/print/capa/${id}`, '_blank')}
          className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-600 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors"
        >
          <Printer className="w-4 h-4" />
          Print PDF
        </button>
        <button
          onClick={() => window.open(`/api/print/capa/${id}/docx`, '_blank')}
          className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
        >
          <FileText className="w-4 h-4" />
          Download Word
        </button>
        {isAdmin && (
          <button
            onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        )}
      </div>

      {/* ── Header card ──────────────────────────────────────────────────── */}
      <Card className="p-6 mb-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${STATUS_COLORS[capa.status] || 'bg-gray-100 text-gray-700'}`}>
              <Shield className="w-7 h-7" />
            </div>
            <div>
              {editingField === 'capa_id' ? (
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={fieldDraft}
                    onChange={(e) => setFieldDraft(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1 text-lg font-bold focus:outline-none focus:ring-2 focus:ring-indigo-500 w-64"
                    autoFocus
                    onKeyDown={(e) => e.key === 'Enter' && saveField('capa_id', fieldDraft)}
                  />
                  <button onClick={() => saveField('capa_id', fieldDraft)} disabled={savingField} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-4 h-4" /></button>
                  <button onClick={cancelFieldEdit} className="p-1 text-gray-400 hover:bg-gray-50 rounded"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <h1
                  className={`text-2xl font-bold text-gray-900 ${isAdmin ? 'cursor-pointer hover:text-indigo-600' : ''}`}
                  onClick={() => isAdmin && startFieldEdit('capa_id', capa.capa_id || capa.capa_number || '')}
                  title={isAdmin ? 'Click to edit CAPA ID' : ''}
                >
                  {capa.capa_id || capa.capa_number || `CAPA-${capa.id}`}
                  {isAdmin && <Pencil className="w-3.5 h-3.5 inline ml-2 text-gray-300" />}
                </h1>
              )}
              <RecordInfoTooltip title={GMP_HELP.capa.info.title}>
                <p><strong>What:</strong> {GMP_HELP.capa.info.what}</p>
                <p><strong>When to create:</strong> {GMP_HELP.capa.info.when}</p>
                <p><strong>What you need:</strong> {GMP_HELP.capa.info.need}</p>
              </RecordInfoTooltip>
              {/* Overdue / Due Soon badges */}
              <div className="flex items-center gap-2 mt-1 flex-wrap">
                {capa.target_date && capa.status !== 'closed' && new Date(capa.target_date) < new Date() && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-red-600 text-white animate-pulse">
                    <Clock className="w-3 h-3" />
                    OVERDUE
                  </span>
                )}
                {capa.target_date && capa.status !== 'closed' && (() => {
                  const daysLeft = Math.ceil((new Date(capa.target_date) - new Date()) / (1000 * 60 * 60 * 24));
                  return daysLeft > 0 && daysLeft <= 7;
                })() && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-500 text-white">
                    <Clock className="w-3 h-3" />
                    DUE SOON — {Math.ceil((new Date(capa.target_date) - new Date()) / (1000 * 60 * 60 * 24))}d left
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                {capa.created_at && <span>Opened {formatDate(capa.created_at)}</span>}
                {editingField === 'source_type' ? (
                  <div className="flex items-center gap-2 ml-2">
                    <select
                      value={fieldDraft}
                      onChange={(e) => setFieldDraft(e.target.value)}
                      className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      autoFocus
                    >
                      <option value="">None</option>
                      <option value="change_request">Change Request</option>
                      <option value="deviation">Deviation</option>
                      <option value="ccr">CCR</option>
                      <option value="complaint">Complaint</option>
                      <option value="audit">Audit</option>
                      <option value="other">Other</option>
                    </select>
                    <button onClick={() => saveField('source_type', fieldDraft)} disabled={savingField} className="p-1 text-green-600 hover:bg-green-50 rounded"><Save className="w-3.5 h-3.5" /></button>
                    <button onClick={cancelFieldEdit} className="p-1 text-gray-400 hover:bg-gray-50 rounded"><X className="w-3.5 h-3.5" /></button>
                  </div>
                ) : capa.source_type && (
                  <>
                    <span className="text-gray-300">·</span>
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${SOURCE_COLORS[capa.source_type] || 'bg-gray-50 text-gray-600'} ${isAdmin ? 'cursor-pointer hover:opacity-80' : ''}`}
                      onClick={() => isAdmin && startFieldEdit('source_type', capa.source_type)}
                      title={isAdmin ? 'Click to edit source type' : ''}
                    >
                      {statusLabel(capa.source_type)}
                      {isAdmin && <Pencil className="w-2.5 h-2.5 ml-1 opacity-50" />}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Status badge — editable for admin */}
          <div className="flex items-center gap-3">
            {editingField === 'status' ? (
              <div className="flex items-center gap-2">
                <select
                  value={fieldDraft}
                  onChange={(e) => setFieldDraft(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                >
                  {STATUS_OPTIONS.map(s => (
                    <option key={s} value={s}>{statusLabel(s)}</option>
                  ))}
                  <option value="investigating">Investigating</option>
                  <option value="action_defined">Action Defined</option>
                </select>
                <button
                  onClick={() => saveField('status', fieldDraft)}
                  disabled={savingField}
                  className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"
                >
                  <Save className="w-4 h-4" />
                </button>
                <button onClick={cancelFieldEdit} className="p-1.5 text-gray-400 hover:bg-gray-50 rounded-lg">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => isAdmin && startFieldEdit('status', capa.status)}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-semibold border ${STATUS_COLORS[capa.status] || 'bg-gray-100 text-gray-700 border-gray-200'} ${isAdmin ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                disabled={!isAdmin}
              >
                {statusLabel(capa.status)}
                {isAdmin && <Pencil className="w-3 h-3 opacity-50" />}
              </button>
            )}
          </div>
        </div>

        {/* Responsible person — editable for admin */}
        <div className="mt-4 flex items-center gap-2 text-sm text-gray-600">
          <User className="w-4 h-4 text-gray-400" />
          <span className="font-medium text-gray-500" title={GMP_HELP.capa.fields.responsible_person}>Responsible:</span>
          {editingField === 'responsible' ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={fieldDraft}
                onChange={(e) => setFieldDraft(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 w-48"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && saveField('responsible_person', fieldDraft)}
              />
              <button
                onClick={() => saveField('responsible_person', fieldDraft)}
                disabled={savingField}
                className="p-1 text-green-600 hover:bg-green-50 rounded"
              >
                <Save className="w-3.5 h-3.5" />
              </button>
              <button onClick={cancelFieldEdit} className="p-1 text-gray-400 hover:bg-gray-50 rounded">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <span className="flex items-center gap-1">
              {capa.responsible_person || <span className="text-gray-400 italic">Unassigned</span>}
              {isAdmin && (
                <button
                  onClick={() => startFieldEdit('responsible', capa.responsible_person)}
                  className="p-1 text-gray-300 hover:text-indigo-600 rounded transition-colors"
                >
                  <Pencil className="w-3 h-3" />
                </button>
              )}
            </span>
          )}
        </div>

        {/* Date pills */}
        <div className="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
          {/* Target Date */}
          <DatePill
            icon={CalendarDays}
            iconColor="text-amber-500"
            label="Target Date"
            value={capa.target_date}
            isOverdue={capa.target_date && new Date(capa.target_date) < new Date() && capa.status !== 'closed'}
            isAdmin={isAdmin}
            editing={editingField === 'target_date'}
            draft={fieldDraft}
            onEdit={() => startFieldEdit('target_date', capa.target_date || '')}
            onDraftChange={setFieldDraft}
            onSave={() => saveField('target_date', fieldDraft)}
            onCancel={cancelFieldEdit}
            saving={savingField}
          />
          {/* Completion Date */}
          <DatePill
            icon={CheckCircle}
            iconColor="text-green-500"
            label="Completion Date"
            value={capa.completion_date}
            isAdmin={isAdmin}
            editing={editingField === 'completion_date'}
            draft={fieldDraft}
            onEdit={() => startFieldEdit('completion_date', capa.completion_date || '')}
            onDraftChange={setFieldDraft}
            onSave={() => saveField('completion_date', fieldDraft)}
            onCancel={cancelFieldEdit}
            saving={savingField}
          />
          {/* Effectiveness Check Date */}
          <DatePill
            icon={RefreshCw}
            iconColor="text-purple-500"
            label="Effectiveness Check"
            value={capa.effectiveness_check_date}
            isAdmin={isAdmin}
            editing={editingField === 'effectiveness_date'}
            draft={fieldDraft}
            onEdit={() => startFieldEdit('effectiveness_date', capa.effectiveness_check_date || '')}
            onDraftChange={setFieldDraft}
            onSave={() => saveField('effectiveness_check_date', fieldDraft)}
            onCancel={cancelFieldEdit}
            saving={savingField}
          />
        </div>
      </Card>

      <LifecycleBar status={capa.status} isAdmin={isAdmin} capa={capa} onQuickEdit={(field, label) => setQuickEditField({ field, label })} onAdvance={async (newStatus) => { try { await apiPut(`/api/capas/${capa.id}`, { status: newStatus }); refetch(); } catch(e) { alert(e.message); } }} />

      {/* ── Tab bar ──────────────────────────────────────────────────────── */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6">
        {TABS.map(tab => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === tab.key
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200/60'
            }`}
          >
            {tab.label}
            {tab.key === 'linked' && (linkedTests.length + linkedComplaints.length > 0) && (
              <span className={`ml-1.5 text-xs ${activeTab === tab.key ? 'text-indigo-200' : 'text-gray-400'}`}>
                ({linkedTests.length + linkedComplaints.length})
              </span>
            )}
            {tab.key === 'activity' && updates.length > 0 && (
              <span className={`ml-1.5 text-xs ${activeTab === tab.key ? 'text-indigo-200' : 'text-gray-400'}`}>
                ({updates.length})
              </span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab content ──────────────────────────────────────────────────── */}

      {/* OVERVIEW TAB */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          {/* CAPA Summary — What is this CAPA about? */}
          <Card className="p-6">
            <div className="space-y-4">
              {/* Title */}
              <div>
                {editingField === 'title' ? (
                  <div className="flex items-center gap-2 mb-1">
                    <input
                      autoFocus
                      className="text-xl font-bold text-gray-900 border border-indigo-300 rounded-lg px-3 py-1 flex-1 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      value={fieldDraft}
                      onChange={(e) => setFieldDraft(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') saveField('title', fieldDraft); if (e.key === 'Escape') setEditingField(null); }}
                      placeholder="Enter CAPA title..."
                    />
                    <button onClick={() => saveField('title', fieldDraft)} disabled={savingField} className="p-1.5 text-green-600 hover:bg-green-50 rounded-lg"><Save className="w-4 h-4" /></button>
                    <button onClick={() => setEditingField(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded-lg"><X className="w-4 h-4" /></button>
                  </div>
                ) : (
                  <h2
                    className={`text-xl font-bold mb-1 ${isAdmin ? 'cursor-pointer hover:text-indigo-600 transition-colors' : ''} ${capa.title ? 'text-gray-900' : 'text-gray-400 italic'}`}
                    onClick={() => { if (isAdmin) { setEditingField('title'); setFieldDraft(capa.title || ''); } }}
                    title={isAdmin ? 'Click to edit title' : ''}
                  >
                    {capa.title || '(No title set — click to add)'}
                  </h2>
                )}
                <div className="flex flex-wrap items-center gap-3 text-sm">
                  {capa.classification && (
                    <span className="group relative inline-flex items-center cursor-help">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                        capa.classification === 'critical' ? 'bg-red-100 text-red-700 border-red-200' :
                        capa.classification === 'major' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                        'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }`}>
                        {capa.classification?.charAt(0).toUpperCase() + capa.classification?.slice(1)} ⓘ
                      </span>
                      <div className="hidden group-hover:block absolute top-full left-0 mt-2 w-80 p-4 bg-white rounded-xl shadow-xl border border-gray-200 z-50 text-left">
                        <h4 className="text-sm font-bold text-gray-900 mb-3">Classification Guide</h4>
                        <div className="space-y-3">
                          <div className="p-2.5 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-xs font-bold text-red-700 mb-1">🔴 Critical</p>
                            <ul className="text-xs text-red-600 space-y-0.5 list-disc ml-3">
                              <li>Direct food safety hazard (pathogen, allergen, contamination)</li>
                              <li>Customer illness or injury reported</li>
                              <li>Product recall required or likely</li>
                              <li>CCP failure with product released</li>
                              <li>Regulatory non-compliance (CFIA/FDA violation)</li>
                            </ul>
                          </div>
                          <div className="p-2.5 bg-orange-50 rounded-lg border border-orange-200">
                            <p className="text-xs font-bold text-orange-700 mb-1">🟠 Major</p>
                            <ul className="text-xs text-orange-600 space-y-0.5 list-disc ml-3">
                              <li>Product quality significantly affected</li>
                              <li>Recurring issue across multiple batches/complaints</li>
                              <li>SOP or GMP requirement not followed</li>
                              <li>Systemic process failure identified</li>
                              <li>Customer complaints showing a pattern/trend</li>
                              <li>Supplier non-conformance affecting product</li>
                            </ul>
                          </div>
                          <div className="p-2.5 bg-yellow-50 rounded-lg border border-yellow-200">
                            <p className="text-xs font-bold text-yellow-700 mb-1">🟡 Minor</p>
                            <ul className="text-xs text-yellow-600 space-y-0.5 list-disc ml-3">
                              <li>Isolated one-time event, not recurring</li>
                              <li>Documentation or record-keeping error</li>
                              <li>Cosmetic or labelling issue (no safety impact)</li>
                              <li>Minor process deviation within acceptable range</li>
                              <li>No product quality or safety impact</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                    </span>
                  )}
                  {capa.priority && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      capa.priority === 'high' ? 'bg-red-50 text-red-600 border-red-200' :
                      capa.priority === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                      'bg-green-50 text-green-600 border-green-200'
                    }`}>
                      Priority: {capa.priority?.charAt(0).toUpperCase() + capa.priority?.slice(1)}
                    </span>
                  )}
                  {capa.risk_assessment && (
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                      capa.risk_assessment === 'high' || capa.risk_assessment === 'critical' ? 'bg-red-50 text-red-600 border-red-200' :
                      capa.risk_assessment === 'medium' ? 'bg-amber-50 text-amber-600 border-amber-200' :
                      'bg-green-50 text-green-600 border-green-200'
                    }`}>
                      Risk: {capa.risk_assessment?.charAt(0).toUpperCase() + capa.risk_assessment?.slice(1)}
                    </span>
                  )}
                </div>

                {/* Category / Department / Source info cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
                  {capa.category && (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Category</p>
                      <p className="text-sm font-semibold text-gray-800">{capa.category?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</p>
                    </div>
                  )}
                  {capa.department && (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Department</p>
                      <p className="text-sm font-semibold text-gray-800">{capa.department}</p>
                    </div>
                  )}
                  {capa.source_type && (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Source</p>
                      <p className="text-sm font-semibold text-gray-800">{capa.source_type?.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}{capa.source_id ? ` #${capa.source_id}` : ''}</p>
                    </div>
                  )}
                  {capa.initiated_by && (
                    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                      <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wider mb-0.5">Initiated By</p>
                      <p className="text-sm font-semibold text-gray-800">{capa.initiated_by}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Description */}
              {capa.description && (
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                  <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-blue-500" />
                    Description — What Happened
                  </h3>
                  <div className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                    <FormattedText text={capa.description} />
                  </div>
                </div>
              )}

              {/* Root Cause Analysis */}
              {capa.root_cause_analysis && (
                <div className="bg-amber-50/50 rounded-lg p-4 border border-amber-100">
                  <h3 className="text-sm font-semibold text-amber-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Root Cause Analysis
                  </h3>
                  <div className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                    <FormattedText text={capa.root_cause_analysis} />
                  </div>
                </div>
              )}

              {/* Investigation Details */}
              {capa.investigation_details && (
                <div className="bg-blue-50/50 rounded-lg p-4 border border-blue-100">
                  <h3 className="text-sm font-semibold text-blue-700 uppercase tracking-wide mb-2 flex items-center gap-2">
                    <FlaskConical className="w-4 h-4 text-blue-500" />
                    Investigation Details
                  </h3>
                  <div className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">
                    <FormattedText text={capa.investigation_details} />
                  </div>
                </div>
              )}

              {/* Key Details Grid */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 pt-3 border-t border-gray-100">
                <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">Responsible</p>
                  <p className="text-sm font-bold text-indigo-900">{capa.responsible_person || '—'}</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">Target Date</p>
                  <p className="text-sm font-bold text-indigo-900">{capa.target_date || '—'}</p>
                  {capa.target_date && new Date(capa.target_date) < new Date() && capa.status !== 'closed' && capa.status !== 'completed' && (
                    <p className="text-[10px] font-bold text-red-500 mt-0.5">⚠️ OVERDUE</p>
                  )}
                </div>
                <div className="bg-indigo-50 rounded-lg p-3 border border-indigo-100 col-span-2">
                  <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider mb-0.5">Verification Method</p>
                  <p className="text-sm font-semibold text-indigo-900">{capa.verification_method || '— Not yet defined'}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* ── Collapsible CAPA Sections ──────────────────────────────── */}

          <CollapsibleSection
            icon={FileText}
            iconColor="text-blue-500"
            title="Description"
            defaultOpen={capa.status === 'open'}
            badge={capa.description ? <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">Filled</span> : <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">Empty</span>}
          >
            <FieldHelp text={GMP_HELP.capa.fields.description} />
            <EditableCard
              icon={FileText}
              iconColor="text-blue-500"
              title="Description — What Happened"
              value={<FormattedText text={capa.description} />}
              rawValue={capa.description || ""}
              placeholder={GMP_HELP.capa.placeholders.description}
              isAdmin={canEditContent}
              onSave={saveTextCard('description')}
              aiSuggestProps={{ field: 'description', recordType: 'capa', context: capa }}
            />
          </CollapsibleSection>

          <CollapsibleSection
            icon={Shield}
            iconColor="text-orange-500"
            title="Containment / Immediate Action"
            defaultOpen={capa.status === 'open' || capa.status === 'investigating'}
            badge={capa.containment_action ? <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">Filled</span> : <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">Empty</span>}
          >
            <FieldHelp text={GMP_HELP.capa.fields.containment_action} />
            <EditableCard
              icon={Shield}
              iconColor="text-orange-500"
              title="Containment / Immediate Action"
              value={<FormattedText text={capa.containment_action} />}
              rawValue={capa.containment_action || ""}
              placeholder={GMP_HELP.capa.placeholders.containment_action}
              isAdmin={canEditContent}
              onSave={saveTextCard('containment_action')}
              aiSuggestProps={{ field: 'containment_action', recordType: 'capa', context: capa }}
            />
          </CollapsibleSection>

          <CollapsibleSection
            icon={FlaskConical}
            iconColor="text-amber-500"
            title="Root Cause Investigation"
            defaultOpen={capa.status === 'investigating'}
            badge={capa.root_cause_method ? <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">{ROOT_CAUSE_LABELS[capa.root_cause_method] || capa.root_cause_method}</span> : <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">No method</span>}
          >
            <div className="mb-4">
              <label className="text-sm font-medium text-gray-600 mb-0.5 block">Investigation Method</label>
              <FieldHelp text={GMP_HELP.capa.fields.root_cause_method} />
              {canEditContent ? (
                <select
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  value={capa.root_cause_method || ""}
                  onChange={async (e) => {
                    try {
                      await apiPut(`/api/capas/${capa.id}`, { root_cause_method: e.target.value });
                      refetch();
                    } catch(err) { alert(err.message); }
                  }}
                >
                  <option value="">— Select method —</option>
                  <option value="5_whys">5 Whys</option>
                  <option value="fishbone">Fishbone / Ishikawa</option>
                  <option value="fault_tree">Fault Tree Analysis</option>
                  <option value="pareto">Pareto Analysis</option>
                  <option value="fmea">Failure Mode Effects Analysis (FMEA)</option>
                  <option value="other">Other</option>
                </select>
              ) : (
                <p className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">{ROOT_CAUSE_LABELS[capa.root_cause_method] || capa.root_cause_method || "Not specified"}</p>
              )}
            </div>
            <FieldHelp text={GMP_HELP.capa.fields.root_cause_analysis} />
            <EditableCard
              icon={FlaskConical}
              iconColor="text-amber-500"
              title="Root Cause Analysis"
              value={<FormattedText text={capa.root_cause_analysis} />}
              rawValue={capa.root_cause_analysis || ""}
              placeholder={GMP_HELP.capa.placeholders.root_cause_analysis}
              isAdmin={canEditContent}
              onSave={saveTextCard('root_cause_analysis')}
              aiSuggestProps={{ field: 'root_cause_analysis', recordType: 'capa', context: capa }}
            />
          </CollapsibleSection>

          <CollapsibleSection
            icon={Shield}
            iconColor="text-red-500"
            title="Corrective Action"
            defaultOpen={capa.status === 'action_defined' || capa.status === 'in_progress'}
            badge={capa.corrective_action ? <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">Defined</span> : <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">Empty</span>}
          >
            <FieldHelp text={GMP_HELP.capa.fields.corrective_action} />
            <EditableCard
              icon={Shield}
              iconColor="text-red-500"
              title="Corrective Action"
              value={<FormattedText text={capa.corrective_action} />}
              rawValue={capa.corrective_action || ""}
              placeholder={GMP_HELP.capa.placeholders.corrective_action}
              isAdmin={canEditContent}
              onSave={saveTextCard('corrective_action')}
              aiSuggestProps={{ field: 'corrective_action', recordType: 'capa', context: capa }}
            />
          </CollapsibleSection>

          <CollapsibleSection
            icon={AlertTriangle}
            iconColor="text-amber-500"
            title="Preventive Action"
            defaultOpen={capa.status === 'action_defined' || capa.status === 'in_progress'}
            badge={capa.preventive_action ? <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">Defined</span> : <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">Empty</span>}
          >
            <FieldHelp text={GMP_HELP.capa.fields.preventive_action} />
            <EditableCard
              icon={AlertTriangle}
              iconColor="text-amber-500"
              title="Preventive Action"
              value={<FormattedText text={capa.preventive_action} />}
              rawValue={capa.preventive_action || ""}
              placeholder={GMP_HELP.capa.placeholders.preventive_action}
              isAdmin={canEditContent}
              onSave={saveTextCard('preventive_action')}
              aiSuggestProps={{ field: 'preventive_action', recordType: 'capa', context: capa }}
            />
          </CollapsibleSection>

          <CollapsibleSection
            icon={Activity}
            iconColor="text-green-500"
            title="Effectiveness Verification"
            defaultOpen={capa.status === 'pending_review' || capa.status === 'closed'}
            badge={capa.effectiveness_notes ? <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-green-100 text-green-700">Verified</span> : <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-500">Pending</span>}
          >
            <div className="space-y-4">
              <FieldHelp text={GMP_HELP.capa.fields.verification_method} />
              <EditableCard
                icon={CheckCircle}
                iconColor="text-purple-500"
                title="Verification Method"
                value={capa.verification_method || ""}
                rawValue={capa.verification_method || ""}
                placeholder={GMP_HELP.capa.placeholders.verification_method}
                isAdmin={canEditContent}
                onSave={saveTextCard('verification_method')}
              />
              <FieldHelp text={GMP_HELP.capa.fields.effectiveness_notes} />
              <EditableCard
                icon={Activity}
                iconColor="text-green-500"
                title="Effectiveness Notes"
                value={<FormattedText text={capa.effectiveness_notes} />}
                rawValue={capa.effectiveness_notes || ""}
                placeholder={GMP_HELP.capa.placeholders.effectiveness_notes}
                isAdmin={canEditContent}
                onSave={saveTextCard('effectiveness_notes')}
              />
            </div>
          </CollapsibleSection>

          {/* ── Action Bar — Advance / Send Back / Escalate ──────────── */}
          {isAdmin && capa.status !== 'closed' && (
            <Card className="p-5 bg-gradient-to-r from-gray-50 to-white border-2 border-dashed border-gray-200">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 flex items-center gap-2">
                <Zap className="w-4 h-4 text-indigo-500" />
                Quick Actions
              </h3>
              <div className="flex flex-wrap items-center gap-3">
                {/* Advance to next stage */}
                {STAGE_GATES[capa.status] && (() => {
                  const g = STAGE_GATES[capa.status];
                  const canGo = g.required.every(r => capa[r.field] && String(capa[r.field]).trim().length > 0);
                  return (
                    <button
                      onClick={async () => {
                        if (!canGo) { alert('Complete all required fields before advancing.'); return; }
                        try { await apiPut(`/api/capas/${capa.id}`, { status: g.next }); refetch(); } catch(e) { alert(e.message); }
                      }}
                      disabled={!canGo}
                      className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                        canGo
                          ? 'bg-green-600 text-white hover:bg-green-700 shadow-sm hover:shadow-md'
                          : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      <CheckCircle className="w-4 h-4" />
                      {g.label} →
                    </button>
                  );
                })()}

                {/* Send back to previous stage */}
                {lifecycleIndex(capa.status) > 0 && (
                  <button
                    onClick={async () => {
                      const prevIdx = lifecycleIndex(capa.status) - 1;
                      const prevStatus = LIFECYCLE_STEPS[prevIdx].key;
                      if (!confirm(`Send this CAPA back to "${LIFECYCLE_STEPS[prevIdx].label}"?`)) return;
                      try { await apiPut(`/api/capas/${capa.id}`, { status: prevStatus }); refetch(); } catch(e) { alert(e.message); }
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-red-50 text-red-700 hover:bg-red-100 border border-red-200 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Send Back
                  </button>
                )}

                {/* Escalate to critical */}
                {capa.priority !== 'critical' && capa.classification !== 'critical' && (
                  <button
                    onClick={async () => {
                      if (!confirm('Escalate this CAPA to Critical priority? This will flag it as highest urgency.')) return;
                      try { await apiPut(`/api/capas/${capa.id}`, { priority: 'critical', classification: 'critical' }); refetch(); } catch(e) { alert(e.message); }
                    }}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-200 transition-all"
                  >
                    <AlertTriangle className="w-4 h-4" />
                    Escalate
                  </button>
                )}
              </div>
            </Card>
          )}
        </div>
      )}

      {/* LINKED RECORDS TAB */}
      {activeTab === 'linked' && (
        <div className="space-y-6">
          {/* Batch Tests */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-sky-500" />
                Batch Tests ({linkedTests.length})
              </h3>
              {isAdmin && (
                <div className="relative">
                  <button
                    onClick={openBatchPicker}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Link Batch Test
                  </button>
                  <LinkPicker
                    open={showBatchPicker}
                    onClose={() => setShowBatchPicker(false)}
                    items={availableBatches}
                    loading={loadingBatches}
                    emptyLabel="No available batch tests"
                    suggestedIds={suggestedBatchIds}
                    onSelect={linkBatch}
                    renderItem={(b) => (
                      <div className="flex items-center justify-between gap-3 whitespace-nowrap">
                        <div>
                          <span className="text-sm font-medium text-gray-900">{b.batch_number || b.lot_number}</span>
                          {b.product_name && <span className="ml-2 text-xs text-gray-500">{b.product_name}</span>}
                        </div>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${BATCH_STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-600'}`}>
                          {b.status?.toUpperCase()}
                        </span>
                      </div>
                    )}
                  />
                </div>
              )}
            </div>

            {linkedTests.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {linkedTests.map((test, i) => (
                  <div
                    key={test.id || i}
                    onClick={() => navigate(`/batch-testing/${test.id}`)}
                    className="p-4 bg-gray-50 rounded-lg border border-gray-100 hover:border-indigo-200 hover:bg-indigo-50/30 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-semibold text-gray-900">{test.batch_number || test.lot_number}</span>
                      <div className="flex items-center gap-1.5">
                        {test.is_retest && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold bg-orange-100 text-orange-700">
                            RETEST
                          </span>
                        )}
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${BATCH_STATUS_COLORS[test.status] || 'bg-gray-100 text-gray-600'}`}>
                          {test.status?.toUpperCase()}
                        </span>
                      </div>
                    </div>
                    <div className="text-xs text-gray-500 space-y-0.5">
                      {test.product_name && <p>{test.product_name}</p>}
                      {test.test_date && (
                        <p className="flex items-center gap-1">
                          <CalendarDays className="w-3 h-3" />
                          {formatDate(test.test_date)}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No linked batch tests</p>
              </div>
            )}
          </Card>

          {/* Complaints */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <MessageSquare className="w-4 h-4 text-red-500" />
                Complaints ({linkedComplaints.length})
              </h3>
              {isAdmin && (
                <div className="relative">
                  <button
                    onClick={openComplaintPicker}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Link Complaint
                  </button>
                  <LinkPicker
                    open={showComplaintPicker}
                    onClose={() => setShowComplaintPicker(false)}
                    items={availableComplaints}
                    loading={loadingComplaints}
                    emptyLabel="No available complaints"
                    suggestedIds={suggestedComplaintIds}
                    onSelect={linkComplaint}
                    renderItem={(c) => (
                      <div>
                        <span className="text-sm font-medium text-gray-900">{c.complaint_number || `#${c.id}`}</span>
                        <span className="ml-2 text-xs text-gray-500">{c.product_name || ''}</span>
                        {c.category && <span className="ml-2 text-xs text-gray-400">· {c.category}</span>}
                      </div>
                    )}
                  />
                </div>
              )}
            </div>

            {linkedComplaints.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Complaint #</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Date</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Product</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Issue Type</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
                      {isAdmin && <th className="w-10" />}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {linkedComplaints.map((c, i) => (
                      <tr
                        key={c.id || i}
                        className="hover:bg-gray-50/50 cursor-pointer group"
                        onClick={() => navigate(`/complaints/${c.id}`)}
                      >
                        <td className="px-3 py-2.5 font-medium text-indigo-600">{c.complaint_number || `#${c.id}`}</td>
                        <td className="px-3 py-2.5 text-gray-500">{formatDate(c.date || c.created_at)}</td>
                        <td className="px-3 py-2.5 text-gray-700">{c.product_name || '—'}</td>
                        <td className="px-3 py-2.5 text-gray-500">{c.category || '—'}</td>
                        <td className="px-3 py-2.5">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            c.status === 'closed' ? 'bg-green-100 text-green-700' :
                            c.status === 'open' ? 'bg-amber-100 text-amber-700' :
                            'bg-gray-100 text-gray-600'
                          }`}>
                            {c.status?.toUpperCase() || 'OPEN'}
                          </span>
                        </td>
                        {isAdmin && (
                          <td className="px-2 py-2.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); unlinkComplaint(c.id); }}
                              className="p-1 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded"
                              title="Unlink complaint"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No linked complaints</p>
              </div>
            )}
          </Card>

          {/* Universal Cross-Linker */}
          <RecordLinker sourceType="capa" sourceId={id} />
        </div>
      )}

      {/* ACTIVITY LOG TAB */}
      {activeTab === 'activity' && (
        <div className="space-y-6">
          {/* Stage-aware guidance */}
          <Card className="p-5">
            <div className="p-4 rounded-lg border mb-4" style={{
              backgroundColor: capa.status === 'open' ? '#fefce8' : capa.status === 'investigating' ? '#fff7ed' : capa.status === 'action_defined' ? '#ecfeff' : capa.status === 'in_progress' ? '#eff6ff' : capa.status === 'pending_review' ? '#faf5ff' : '#f0fdf4',
              borderColor: capa.status === 'open' ? '#fef08a' : capa.status === 'investigating' ? '#fed7aa' : capa.status === 'action_defined' ? '#a5f3fc' : capa.status === 'in_progress' ? '#bfdbfe' : capa.status === 'pending_review' ? '#e9d5ff' : '#bbf7d0',
            }}>
              <h4 className="text-sm font-bold text-gray-800 mb-2">
                {capa.status === 'open' && '📝 Stage 1: Document the Problem'}
                {capa.status === 'investigating' && '🔍 Stage 2: Investigate Root Cause'}
                {capa.status === 'action_defined' && '🎯 Stage 3: Define Corrective & Preventive Actions'}
                {capa.status === 'in_progress' && '🔧 Stage 4: Implement Actions'}
                {capa.status === 'pending_review' && '✅ Stage 5: Verify Effectiveness'}
                {capa.status === 'closed' && '🏁 CAPA Complete'}
              </h4>
              <p className="text-sm text-gray-700 mb-3">
                {capa.status === 'open' && 'Log what happened — describe the problem, attach evidence (photos, test results, complaints), and note who discovered it and when.'}
                {capa.status === 'investigating' && 'Document your investigation — what method did you use (5 Whys, Fishbone)? What evidence did you find? What is the root cause?'}
                {capa.status === 'action_defined' && 'Record what actions you decided on — both corrective (fix the problem) and preventive (stop it from recurring). Assign owners and deadlines.'}
                {capa.status === 'in_progress' && 'Log implementation progress — what has been done? Any obstacles? Attach evidence of completed actions (photos, updated SOPs, training records).'}
                {capa.status === 'pending_review' && 'Document effectiveness verification — did the actions work? Show evidence: reduced complaints, test results, audit findings, monitoring data.'}
                {capa.status === 'closed' && 'This CAPA is complete. All updates are in the timeline below.'}
              </p>
              {capa.status !== 'closed' && (
                <div className="flex flex-wrap gap-2">
                  <p className="text-xs font-semibold text-gray-500 w-full mb-1">Suggested log entries for this stage:</p>
                  {capa.status === 'open' && ['Problem description', 'Photos/evidence attached', 'Initial assessment', 'People notified'].map(s => (
                    <button key={s} onClick={() => { setUpdateType('note'); setUpdateContent(s + ': '); }}
                      className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full hover:bg-gray-50 text-gray-700">{s}</button>
                  ))}
                  {capa.status === 'investigating' && ['Root cause identified', 'Investigation method used', 'Evidence collected', 'Contributing factors', 'Scope of impact assessed'].map(s => (
                    <button key={s} onClick={() => { setUpdateType('investigation'); setUpdateContent(s + ': '); }}
                      className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full hover:bg-gray-50 text-gray-700">{s}</button>
                  ))}
                  {capa.status === 'action_defined' && ['Corrective action assigned', 'Preventive action assigned', 'Training scheduled', 'SOP update planned', 'Equipment change planned'].map(s => (
                    <button key={s} onClick={() => { setUpdateType('note'); setUpdateContent(s + ': '); }}
                      className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full hover:bg-gray-50 text-gray-700">{s}</button>
                  ))}
                  {capa.status === 'in_progress' && ['Action completed', 'SOP updated', 'Training completed', 'Equipment installed', 'Process change implemented', 'Obstacle encountered'].map(s => (
                    <button key={s} onClick={() => { setUpdateType('evidence'); setUpdateContent(s + ': '); }}
                      className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full hover:bg-gray-50 text-gray-700">{s}</button>
                  ))}
                  {capa.status === 'pending_review' && ['Effectiveness verified', 'Complaint rate reduced', 'Test results confirm fix', 'Audit confirms compliance', 'Monitoring data attached'].map(s => (
                    <button key={s} onClick={() => { setUpdateType('effectiveness_review'); setUpdateContent(s + ': '); }}
                      className="px-3 py-1.5 text-xs bg-white border border-gray-200 rounded-full hover:bg-gray-50 text-gray-700">{s}</button>
                  ))}
                </div>
              )}
            </div>

            {/* Add update form */}
            {capa.status !== 'closed' && (
              <>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Log an Update</h3>
                <div className="flex items-center gap-3 mb-3">
                  <select
                    value={updateType}
                    onChange={(e) => setUpdateType(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  >
                    {UPDATE_TYPE_OPTIONS.map(opt => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <textarea
                  value={updateContent}
                  onChange={(e) => setUpdateContent(e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Describe what was done, what was found, or attach evidence..."
                />
                <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-3 mt-2 border border-gray-100">Example: 2026-04-27 — Investigated temperature deviation on line 2. Reviewed log sheet, isolated affected product, notified supervisor.</p>
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handleSubmitUpdate}
                    disabled={submittingUpdate || !updateContent.trim()}
                    className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                  >
                    <Send className="w-4 h-4" />
                    {submittingUpdate ? 'Adding...' : 'Add Update'}
                  </button>
                </div>
              </>
            )}
          </Card>

          {/* Timeline */}
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-500" />
                Timeline ({filteredUpdates.length}{timelineFilter !== 'all' ? ` of ${updates.length}` : ''})
              </h3>
              <div className="flex gap-1">
                {[
                  { key: 'all', label: 'All' },
                  { key: 'notes', label: 'Notes' },
                  { key: 'evidence', label: 'Evidence' },
                  { key: 'investigation', label: 'Investigation' },
                  { key: 'status', label: 'Status' },
                ].map(f => (
                  <button key={f.key} onClick={() => setTimelineFilter(f.key)}
                    className={`px-2.5 py-1 text-xs rounded-full font-medium transition-colors ${timelineFilter === f.key ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>
            {updates.length > 0 ? (
              <div className="relative">
                <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
                <div className="space-y-4">
                  {filteredUpdates.map((entry, i) => (
                    <div key={entry.id || i} className="relative flex gap-4 pl-10">
                      <div className="absolute left-2.5 top-1.5 w-3 h-3 rounded-full bg-white border-2 border-indigo-400" />
                      <div className="flex-1 bg-gray-50 rounded-lg p-4 border border-gray-100">
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${UPDATE_TYPE_COLORS[entry.type] || 'bg-gray-100 text-gray-600'}`}>
                            {statusLabel(entry.type)}
                          </span>
                          <span className="text-xs text-gray-400">{formatDateTime(entry.created_at || entry.date)}</span>
                          {entry.author && (
                            <span className="text-xs text-gray-500 flex items-center gap-1">
                              <User className="w-3 h-3" />
                              {entry.author}
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-700 whitespace-pre-wrap">{entry.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                <p className="text-sm">No activity yet</p>
              </div>
            )}
          </Card>
        </div>
      )}

      {/* DOCUMENTS TAB */}
      {activeTab === 'documents' && (
        <Card className="p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
              <Paperclip className="w-4 h-4 text-indigo-500" />
              Documents ({attachments.length})
            </h3>
            {(isAdmin || canEditContent) && (
              <label className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 cursor-pointer transition-colors">
                <Upload className="w-4 h-4" />
                {uploading ? 'Uploading...' : 'Upload File'}
                <input type="file" className="hidden" onChange={handleFileUpload} disabled={uploading}
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png" />
              </label>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-4">Accepted: PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (max 10MB)</p>
          <p className="text-xs text-indigo-700 bg-indigo-50 rounded-lg p-3 mb-4 border border-indigo-100">Upload supporting evidence: photos, batch records, supplier COAs, calibration records, temperature logs, or corrective action evidence.</p>
          {attachments.length > 0 ? (
            <div className="space-y-2">
              {attachments.map(att => (
                <div key={att.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                  <div className="flex items-center gap-3 min-w-0">
                    <FileText className="w-5 h-5 text-gray-400 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-700 truncate">{att.original_name}</p>
                      <p className="text-xs text-gray-400">{formatFileSize(att.file_size)} · {att.uploaded_by} · {formatDateTime(att.created_at)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <a href={`/uploads/capa-docs/${att.filename}`} target="_blank" rel="noopener noreferrer"
                      className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors" title="Download">
                      <Download className="w-4 h-4" />
                    </a>
                    {isAdmin && (
                      <button onClick={() => handleDeleteAttachment(att.id)}
                        className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10 text-gray-400">
              <Paperclip className="w-8 h-8 mx-auto mb-2 opacity-40" />
              <p className="text-sm">No documents yet. Upload evidence, photos, or supporting documents.</p>
            </div>
          )}
        </Card>
      )}

      {activeTab === 'audit' && (
        <AuditTrailSection capaId={id} />
      )}
      {/* Quick Edit Modal */}
      {quickEditField && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">Fill Required Field</h3>
            <p className="text-sm text-gray-600 mb-4">{quickEditField.label}</p>
            {quickEditField.field === 'classification' ? (
              <select
                value={quickEditValue}
                onChange={e => setQuickEditValue(e.target.value)}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-3 mb-4 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select classification...</option>
                <option value="critical">Critical — Food safety hazard, illness, recall</option>
                <option value="major">Major — Quality affected, recurring, SOP violation</option>
                <option value="minor">Minor — Isolated, documentation, cosmetic</option>
              </select>
            ) : quickEditField.field === 'effectiveness_result' ? (
              <select
                value={quickEditValue}
                onChange={e => setQuickEditValue(e.target.value)}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-3 mb-4 focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">Select result...</option>
                <option value="effective">Effective — actions resolved the issue</option>
                <option value="not_effective">Not Effective — issue persists, further action needed</option>
              </select>
            ) : (
              <textarea
                rows={4}
                value={quickEditValue}
                onChange={e => setQuickEditValue(e.target.value)}
                placeholder={`Enter ${quickEditField.label.toLowerCase()}...`}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-3 mb-4 focus:ring-2 focus:ring-indigo-500"
                autoFocus
              />
            )}
            <div className="flex justify-end gap-3">
              <button onClick={() => { setQuickEditField(null); setQuickEditValue(''); }}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100">
                Cancel
              </button>
              <button onClick={handleQuickSave} disabled={!quickEditValue.trim()}
                className="px-5 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                Save & Continue
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── DatePill sub-component ─────────────────────────────────────────────────

function DatePill({ icon: Icon, iconColor, label, value, isOverdue, isAdmin, editing, draft, onEdit, onDraftChange, onSave, onCancel, saving }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${isOverdue ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100'}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 ${isOverdue ? 'text-red-500' : iconColor}`} />
      <div className="flex-1 min-w-0">
        <p className="text-[11px] font-medium text-gray-500 uppercase">{label}</p>
        {editing ? (
          <div className="flex items-center gap-1.5 mt-0.5">
            <input
              type="date"
              value={draft}
              onChange={(e) => onDraftChange(e.target.value)}
              className="border border-gray-200 rounded px-2 py-0.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              autoFocus
            />
            <button onClick={onSave} disabled={saving} className="p-0.5 text-green-600 hover:bg-green-50 rounded">
              <Save className="w-3.5 h-3.5" />
            </button>
            <button onClick={onCancel} className="p-0.5 text-gray-400 hover:bg-gray-50 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <p className={`text-sm font-semibold flex items-center gap-1 ${isOverdue ? 'text-red-600' : 'text-gray-900'}`}>
            {formatDate(value)}
            {isAdmin && (
              <button onClick={onEdit} className="p-0.5 text-gray-300 hover:text-indigo-600 rounded transition-colors">
                <Pencil className="w-3 h-3" />
              </button>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
