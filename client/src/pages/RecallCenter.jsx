import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertTriangle, Plus, Search, ChevronDown, ChevronUp, Clock, Shield, Activity,
  CheckCircle, XCircle, Zap, ClipboardCheck, Flame, Info, Eye, EyeOff
} from 'lucide-react';
import { Users } from 'lucide-react';
import { useFetch, apiPost } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

// ──── Shared constants ────

const RECALL_STATUS_OPTIONS = ['initiated', 'investigating', 'hold_segregate', 'cfia_notified', 'customers_notified', 'recall_active', 'effectiveness_check', 'closed'];
const RECALL_STATUS_LABELS = {
  initiated: 'Initiated', investigating: 'Investigating', hold_segregate: 'Hold/Segregate',
  cfia_notified: 'CFIA Notified', customers_notified: 'Customers Notified',
  recall_active: 'Recall Active', effectiveness_check: 'Effectiveness Check', closed: 'Closed',
};
const RECALL_STATUS_STYLES = {
  initiated: 'bg-red-100 text-red-700 border-red-200',
  investigating: 'bg-amber-100 text-amber-800 border-amber-200',
  hold_segregate: 'bg-orange-100 text-orange-800 border-orange-200',
  cfia_notified: 'bg-blue-100 text-blue-800 border-blue-200',
  customers_notified: 'bg-purple-100 text-purple-800 border-purple-200',
  recall_active: 'bg-red-100 text-red-700 border-red-200',
  effectiveness_check: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
};

const CLASSIFICATION_LABELS = { class_1: 'Class I', class_2: 'Class II', class_3: 'Class III' };
const CLASSIFICATION_STYLES = {
  class_1: 'bg-red-100 text-red-700 border-red-200',
  class_2: 'bg-amber-100 text-amber-800 border-amber-200',
  class_3: 'bg-green-100 text-green-700 border-green-200',
};

const TRIGGER_LABELS = {
  consumer_illness: 'Consumer Illness', pathogen: 'Pathogen', undeclared_allergen: 'Undeclared Allergen',
  foreign_material: 'Foreign Material', ccp_deviation: 'CCP Deviation', supplier_recall: 'Supplier Recall',
  labelling_error: 'Labelling Error', tampering: 'Tampering', cfia_directive: 'CFIA Directive', other: 'Other',
};

const EXERCISE_STATUS_STYLES = {
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  passed: 'bg-green-100 text-green-700 border-green-200',
  failed: 'bg-red-100 text-red-700 border-red-200',
  corrective_action: 'bg-amber-100 text-amber-800 border-amber-200',
};

const EXERCISE_TYPE_LABELS = {
  finished_product: 'Finished Product', ingredient_supplier: 'Ingredient/Supplier', auditor_initiated: 'Auditor Initiated',
};

const CRISIS_SEVERITY_STYLES = {
  low: 'bg-green-100 text-green-700 border-green-200',
  moderate: 'bg-amber-100 text-amber-800 border-amber-200',
  high: 'bg-orange-100 text-orange-700 border-orange-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
};

const CRISIS_STATUS_STYLES = {
  active: 'bg-red-100 text-red-700 border-red-200',
  contained: 'bg-amber-100 text-amber-800 border-amber-200',
  resolved: 'bg-green-100 text-green-700 border-green-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
};

const CRISIS_TYPE_LABELS = {
  fire: 'Fire', flood: 'Flood', power_outage: 'Power Outage',
  refrigeration_failure: 'Refrigeration Failure', water_contamination: 'Water Contamination',
  equipment_failure: 'Equipment Failure', security_breach: 'Security Breach',
  natural_disaster: 'Natural Disaster', it_failure: 'IT Failure', other: 'Other',
};

export function RecallStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${RECALL_STATUS_STYLES[status] || RECALL_STATUS_STYLES.initiated}`}>
      {RECALL_STATUS_LABELS[status] || status}
    </span>
  );
}

export function RecallClassificationBadge({ classification }) {
  if (!classification) return <span className="text-xs text-gray-400">--</span>;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${CLASSIFICATION_STYLES[classification] || ''}`}>
      {CLASSIFICATION_LABELS[classification] || classification}
    </span>
  );
}

export function SeverityBadge({ severity }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${CRISIS_SEVERITY_STYLES[severity] || CRISIS_SEVERITY_STYLES.moderate}`}>
      {severity?.charAt(0).toUpperCase() + severity?.slice(1)}
    </span>
  );
}

// ──── Contextual Help Components ────

export function HelpToggle({ visible, setVisible }) {
  return (
    <button
      onClick={() => setVisible(v => !v)}
      className="flex items-center gap-1.5 text-xs text-indigo-500 hover:text-indigo-700 transition-colors"
    >
      {visible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
      {visible ? 'Hide tips' : 'Show tips'}
    </button>
  );
}

export function HelpTip({ children, className = '' }) {
  return (
    <div className={`flex gap-2.5 rounded-lg bg-indigo-50 border border-indigo-100 px-3.5 py-2.5 ${className}`}>
      <Info className="w-4 h-4 text-indigo-400 flex-shrink-0 mt-0.5" />
      <div className="text-[11.5px] leading-relaxed text-indigo-800">{children}</div>
    </div>
  );
}

export {
  RECALL_STATUS_OPTIONS, RECALL_STATUS_LABELS, RECALL_STATUS_STYLES,
  CLASSIFICATION_LABELS, CLASSIFICATION_STYLES, TRIGGER_LABELS,
  EXERCISE_STATUS_STYLES, EXERCISE_TYPE_LABELS,
  CRISIS_SEVERITY_STYLES, CRISIS_STATUS_STYLES, CRISIS_TYPE_LABELS,
};

// ──── Main Page ────

export default function RecallCenter() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('dashboard');

  const { data: recallTeam, refetch: refetchTeam } = useFetch('/api/recall-team');
  const [showAddMember, setShowAddMember] = useState(false);
  const [memberForm, setMemberForm] = useState({});

  const ROLE_LABELS = {
    recall_coordinator: { label: 'Recall Coordinator', color: 'bg-red-100 text-red-700 border-red-200' },
    food_safety_lead: { label: 'Food Safety Lead', color: 'bg-amber-100 text-amber-700 border-amber-200' },
    lab_contact: { label: 'Lab Contact', color: 'bg-blue-100 text-blue-700 border-blue-200' },
    regulatory: { label: 'Regulatory', color: 'bg-purple-100 text-purple-700 border-purple-200' },
    distributor: { label: 'Distributor', color: 'bg-green-100 text-green-700 border-green-200' },
    insurance: { label: 'Insurance', color: 'bg-gray-100 text-gray-700 border-gray-200' },
    technical_expert: { label: 'Technical Expert', color: 'bg-cyan-100 text-cyan-700 border-cyan-200' },
    production: { label: 'Production', color: 'bg-orange-100 text-orange-700 border-orange-200' },
    management: { label: 'Management', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' },
    other: { label: 'Other', color: 'bg-gray-100 text-gray-600 border-gray-200' },
  };

  const tabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'recalls', label: 'Recalls', icon: AlertTriangle },
    { id: 'team', label: 'Recall Team', icon: Users },
    { id: 'traceability', label: 'Traceability', icon: ClipboardCheck },
    { id: 'crisis', label: 'Crisis Events', icon: Flame },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6">
        <p className="text-sm text-gray-500 font-medium">KK-SOP-00901 / KK-SOP-00903</p>
        <h1 className="text-3xl font-bold text-gray-900">Recall Center</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'dashboard' && <DashboardTab navigate={navigate} />}
      {activeTab === 'recalls' && <RecallsTab navigate={navigate} />}
      {activeTab === 'team' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-gray-900">Internal Recall Team</h2>
                <p className="text-sm text-gray-500 mt-1">Contact list for recall/withdrawal events — who to call, in what order</p>
              </div>
              <button onClick={() => { setMemberForm({}); setShowAddMember(true); }}
                className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700">
                + Add Member
              </button>
            </div>

            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <h3 className="text-sm font-bold text-red-800 mb-2">⚠️ In a Recall Emergency:</h3>
              <ol className="text-sm text-red-700 space-y-1 list-decimal ml-4">
                <li><strong>STOP</strong> all production and shipping of affected product</li>
                <li><strong>QUARANTINE</strong> all affected product on-site</li>
                <li>Contact <strong>Recall Coordinator</strong> (Priority 1) immediately</li>
                <li>Follow notification chain below — contact each person in priority order</li>
                <li>Document every action with time, date, and person contacted</li>
              </ol>
            </div>

            <div className="space-y-3">
              {(recallTeam || []).map(member => {
                const roleConfig = ROLE_LABELS[member.role] || ROLE_LABELS.other;
                return (
                  <div key={member.id} className="flex items-start gap-4 p-4 bg-gray-50 rounded-lg border border-gray-100">
                    <div className="flex-shrink-0 w-10 h-10 bg-navy-100 rounded-full flex items-center justify-center">
                      <span className="text-sm font-bold text-navy-700">P{member.notification_priority}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-gray-900">{member.name}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${roleConfig.color}`}>{roleConfig.label}</span>
                      </div>
                      {member.title && <p className="text-xs text-gray-500">{member.title}</p>}
                      <div className="flex flex-wrap gap-3 mt-2">
                        {member.phone && <span className="text-xs text-blue-600">📞 {member.phone}</span>}
                        {member.email && <span className="text-xs text-blue-600">✉️ {member.email}</span>}
                      </div>
                      {member.responsibility && <p className="text-xs text-gray-600 mt-2 leading-relaxed">{member.responsibility}</p>}
                    </div>
                  </div>
                );
              })}
              {(!recallTeam || recallTeam.length === 0) && (
                <p className="text-sm text-gray-400 text-center py-8">No team members yet.</p>
              )}
            </div>
          </div>

          {showAddMember && (
            <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
              <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg mx-4 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Add Recall Team Member</h3>
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1">Name *</label>
                      <input type="text" value={memberForm.name || ''} onChange={e => setMemberForm({...memberForm, name: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1">Role *</label>
                      <select value={memberForm.role || ''} onChange={e => setMemberForm({...memberForm, role: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                        <option value="">Select...</option>
                        {Object.entries(ROLE_LABELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                      </select></div>
                  </div>
                  <div><label className="block text-xs font-semibold text-gray-700 mb-1">Title</label>
                    <input type="text" value={memberForm.title || ''} onChange={e => setMemberForm({...memberForm, title: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" /></div>
                  <div className="grid grid-cols-2 gap-3">
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1">Phone</label>
                      <input type="text" value={memberForm.phone || ''} onChange={e => setMemberForm({...memberForm, phone: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" /></div>
                    <div><label className="block text-xs font-semibold text-gray-700 mb-1">Email</label>
                      <input type="text" value={memberForm.email || ''} onChange={e => setMemberForm({...memberForm, email: e.target.value})}
                        className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" /></div>
                  </div>
                  <div><label className="block text-xs font-semibold text-gray-700 mb-1">Responsibility</label>
                    <textarea rows={2} value={memberForm.responsibility || ''} onChange={e => setMemberForm({...memberForm, responsibility: e.target.value})}
                      className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" /></div>
                  <div><label className="block text-xs font-semibold text-gray-700 mb-1">Priority (1=first)</label>
                    <select value={memberForm.notification_priority || 5} onChange={e => setMemberForm({...memberForm, notification_priority: parseInt(e.target.value)})}
                      className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                      {[1,2,3,4,5].map(n => <option key={n} value={n}>Priority {n}</option>)}
                    </select></div>
                </div>
                <div className="flex justify-end gap-3 mt-4">
                  <button onClick={() => setShowAddMember(false)} className="px-4 py-2 text-sm border border-gray-300 rounded-lg">Cancel</button>
                  <button onClick={async () => {
                    try { await apiPost('/api/recall-team', memberForm); setShowAddMember(false); refetchTeam(); }
                    catch(e) { alert(e.message); }
                  }} className="px-4 py-2 text-sm bg-navy-800 text-white rounded-lg">Add Member</button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'traceability' && <TraceabilityTab navigate={navigate} />}
      {activeTab === 'crisis' && <CrisisTab navigate={navigate} />}
    </div>
  );
}

// ──── Dashboard Tab ────

function DashboardTab({ navigate }) {
  const { data: dash, loading, error } = useFetch('/api/recall/dashboard');
  const [showTips, setShowTips] = useState(true);

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-end"><HelpToggle visible={showTips} setVisible={setShowTips} /></div>
      {showTips && (
        <HelpTip>
          The Recall Center monitors active recalls, traceability exercises, and crisis events to ensure consumer protection and regulatory compliance (CFIA SFCR). Use this dashboard for a quick status overview of all food safety incidents and readiness activities.
        </HelpTip>
      )}
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'Active Recalls', value: dash.activeRecalls, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Open Crises', value: dash.openCrises, icon: Flame, color: 'text-orange-600', bg: 'bg-orange-50' },
          { label: 'Exercises This Year', value: `${dash.exercisesThisYear}/2`, icon: ClipboardCheck, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Exercise Status', value: dash.nextExerciseDue === 'due' ? 'Due' : 'On Track', icon: dash.nextExerciseDue === 'due' ? Clock : CheckCircle, color: dash.nextExerciseDue === 'due' ? 'text-amber-600' : 'text-green-600', bg: dash.nextExerciseDue === 'due' ? 'bg-amber-50' : 'bg-green-50' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`${card.bg} p-2 rounded-lg`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-xs text-gray-500">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Active Recalls Alert */}
      {dash.activeRecalls > 0 && dash.recentRecalls?.filter(r => r.status !== 'closed').length > 0 && (
        <div className="bg-red-50 rounded-xl border border-red-200 p-5">
          <h3 className="text-base font-semibold text-red-800 mb-3 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4" /> Active Recalls
          </h3>
          <div className="space-y-2">
            {dash.recentRecalls.filter(r => r.status !== 'closed').map(r => (
              <div
                key={r.id}
                onClick={() => navigate(`/recalls/${r.id}`)}
                className="flex items-center justify-between bg-white rounded-lg p-3 border border-red-100 cursor-pointer hover:bg-red-50 transition-colors"
              >
                <div>
                  <span className="text-sm font-medium text-red-800">{r.recall_id}</span>
                  <span className="text-sm text-gray-700 ml-2">{r.title}</span>
                </div>
                <RecallStatusBadge status={r.status} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Recent Exercises</h3>
          {(!dash.recentExercises || dash.recentExercises.length === 0) ? (
            <p className="text-sm text-gray-400">No exercises recorded</p>
          ) : (
            <div className="space-y-2">
              {dash.recentExercises.map(ex => (
                <div
                  key={ex.id}
                  onClick={() => navigate(`/traceability-exercises/${ex.id}`)}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <span className="text-sm font-medium text-navy-700">{ex.exercise_id}</span>
                    <span className="text-xs text-gray-500 ml-2">{EXERCISE_TYPE_LABELS[ex.type] || ex.type}</span>
                    {ex.elapsed_minutes && <span className="text-xs text-gray-400 ml-2">{ex.elapsed_minutes} min</span>}
                  </div>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${EXERCISE_STATUS_STYLES[ex.status] || ''}`}>
                    {ex.status?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Recent Crisis Events</h3>
          {(!dash.recentCrises || dash.recentCrises.length === 0) ? (
            <p className="text-sm text-gray-400">No crisis events recorded</p>
          ) : (
            <div className="space-y-2">
              {dash.recentCrises.map(ce => (
                <div
                  key={ce.id}
                  onClick={() => navigate(`/crisis-events/${ce.id}`)}
                  className="flex items-center justify-between p-3 rounded-lg border border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors"
                >
                  <div>
                    <span className="text-sm font-medium text-navy-700">{ce.event_id}</span>
                    <span className="text-sm text-gray-700 ml-2">{ce.title}</span>
                  </div>
                  <SeverityBadge severity={ce.severity} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ──── Recalls Tab ────

function RecallsTab({ navigate }) {
  const { data: items, loading, error, refetch } = useFetch('/api/recalls');
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type: 'recall', trigger_type: 'other' });
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    if (!items) return [];
    let list = [...items];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(r => r.recall_id?.toLowerCase().includes(s) || r.title?.toLowerCase().includes(s) || r.initiated_by?.toLowerCase().includes(s));
    }
    if (filterStatus) list = list.filter(r => r.status === filterStatus);
    list.sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [items, search, filterStatus, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-navy-600" /> : <ChevronDown className="w-3 h-3 text-navy-600" />;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiPost('/api/recalls', form);
      setShowModal(false);
      setForm({ type: 'recall', trigger_type: 'other' });
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSubmitting(false); }
  };

  const [showTips, setShowTips] = useState(true);

  if (loading) return <LoadingSpinner message="Loading Recalls..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;

  const activeCount = items?.filter(r => r.status !== 'closed').length || 0;

  return (
    <div>
      <div className="flex justify-end mb-2"><HelpToggle visible={showTips} setVisible={setShowTips} /></div>
      {showTips && (
        <HelpTip className="mb-4">
          <p className="mb-1.5"><strong>Recall</strong> = CFIA-directed or voluntary removal of product from the market. <strong>Withdrawal</strong> = voluntary removal of product that has not yet reached consumers.</p>
          <p className="mb-1.5">Initiate a recall when any of these triggers occur (SOP-00901): consumer illness, pathogen detection, undeclared allergen, foreign material, CCP deviation, supplier recall, labelling error, tampering, or CFIA directive.</p>
          <p className="font-semibold text-red-700">For Class I recalls, all steps must be initiated within 24 hours.</p>
        </HelpTip>
      )}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{activeCount} active recall{activeCount !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-red-700 text-white rounded-lg text-sm font-medium hover:bg-red-600 transition-colors">
          <Plus className="w-4 h-4" />
          Initiate Recall
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search recalls..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-navy-500" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2">
            <option value="">All Statuses</option>
            {RECALL_STATUS_OPTIONS.map(s => <option key={s} value={s}>{RECALL_STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {[
                  { field: 'recall_id', label: 'ID' },
                  { field: 'title', label: 'Title' },
                  { field: 'type', label: 'Type' },
                  { field: 'classification', label: 'Class' },
                  { field: 'status', label: 'Status' },
                  { field: 'trigger_type', label: 'Trigger' },
                  { field: 'initiated_by', label: 'Initiated By' },
                  { field: 'created_at', label: 'Date' },
                ].map(col => (
                  <th key={col.field} onClick={() => handleSort(col.field)}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                    <div className="flex items-center gap-1">
                      {col.label}
                      <SortIcon field={col.field} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No recalls found</td></tr>
              ) : (
                filtered.map(r => (
                  <tr key={r.id} onClick={() => navigate(`/recalls/${r.id}`)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-navy-700">{r.recall_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{r.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600 capitalize">{r.type}</td>
                    <td className="px-4 py-3"><RecallClassificationBadge classification={r.classification} /></td>
                    <td className="px-4 py-3"><RecallStatusBadge status={r.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{TRIGGER_LABELS[r.trigger_type] || r.trigger_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.initiated_by}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{r.created_at?.slice(0, 10)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Initiate Recall / Withdrawal">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input type="text" required value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select required value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                <option value="recall">Recall</option>
                <option value="withdrawal">Withdrawal</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Trigger *</label>
              <select required value={form.trigger_type} onChange={e => setForm({ ...form, trigger_type: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                {Object.entries(TRIGGER_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trigger Description *</label>
            <textarea rows={3} required value={form.trigger_description || ''} onChange={e => setForm({ ...form, trigger_description: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Initiated By *</label>
              <input type="text" required value={form.initiated_by || ''} onChange={e => setForm({ ...form, initiated_by: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Classification</label>
              <select value={form.classification || ''} onChange={e => setForm({ ...form, classification: e.target.value || null })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                <option value="">Select later...</option>
                <option value="class_1">Class I - Serious health risk</option>
                <option value="class_2">Class II - May cause adverse health</option>
                <option value="class_3">Class III - Not likely to cause adverse health</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-red-700 text-white rounded-lg text-sm disabled:opacity-50">
              {submitting ? 'Initiating...' : 'Initiate Recall'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ──── Traceability Tab ────

function TraceabilityTab({ navigate }) {
  const { data: items, loading, error, refetch } = useFetch('/api/traceability-exercises');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type: 'finished_product' });
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiPost('/api/traceability-exercises', { ...form, start_time: new Date().toISOString() });
      setShowModal(false);
      setForm({ type: 'finished_product' });
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSubmitting(false); }
  };

  const [showTips, setShowTips] = useState(true);

  if (loading) return <LoadingSpinner message="Loading Exercises..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;

  const currentYear = new Date().getFullYear();
  const thisYearCount = items?.filter(e => e.created_at?.startsWith(String(currentYear))).length || 0;

  return (
    <div>
      <div className="flex justify-end mb-2"><HelpToggle visible={showTips} setVisible={setShowTips} /></div>
      {showTips && (
        <HelpTip className="mb-4">
          <p className="mb-1.5"><strong>2-hour rule:</strong> You must trace, locate, and reconcile 100% of a lot within 2 hours. This is the CFIA SFCR benchmark for traceability readiness.</p>
          <p className="mb-1.5"><strong>Exercise types:</strong> (1) <em>Finished product incident</em> — trace a finished SKU back to all ingredients and forward to all customers. (2) <em>Ingredient/supplier incident</em> — trace a raw material lot forward to all finished products and customers.</p>
          <p className="font-semibold">At least 2 exercises per year required, both types must be completed within each 12-month period.</p>
        </HelpTip>
      )}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <p className="text-sm text-gray-500">{items?.length || 0} total exercises</p>
          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border ${thisYearCount >= 2 ? 'bg-green-100 text-green-700 border-green-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
            {thisYearCount}/2 this year {thisYearCount >= 2 ? '(compliant)' : '(due)'}
          </span>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors">
          <Plus className="w-4 h-4" />
          New Exercise
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Target Lot</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Time</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reconciliation</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Conducted By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!items || items.length === 0) ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No exercises found</td></tr>
              ) : (
                items.map(ex => (
                  <tr key={ex.id} onClick={() => navigate(`/traceability-exercises/${ex.id}`)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-navy-700">{ex.exercise_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{EXERCISE_TYPE_LABELS[ex.type] || ex.type}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{ex.target_lot}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${EXERCISE_STATUS_STYLES[ex.status] || ''}`}>
                        {ex.status?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ex.elapsed_minutes ? `${ex.elapsed_minutes} min` : 'In progress'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ex.reconciliation_percent != null ? `${ex.reconciliation_percent}%` : '--'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ex.conducted_by}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ex.created_at?.slice(0, 10)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="New Traceability Exercise">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Exercise Type *</label>
            <select required value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
              {Object.entries(EXERCISE_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Lot Code *</label>
            <input type="text" required value={form.target_lot || ''} onChange={e => setForm({ ...form, target_lot: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" placeholder="e.g. 003321" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Target Description</label>
            <input type="text" value={form.target_description || ''} onChange={e => setForm({ ...form, target_description: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" placeholder="e.g. CocoMng 359ml" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Conducted By *</label>
            <input type="text" required value={form.conducted_by || ''} onChange={e => setForm({ ...form, conducted_by: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm disabled:opacity-50">
              {submitting ? 'Starting...' : 'Start Exercise'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

// ──── Crisis Tab ────

function CrisisTab({ navigate }) {
  const { data: items, loading, error, refetch } = useFetch('/api/crisis-events');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ type: 'other', severity: 'moderate' });
  const [submitting, setSubmitting] = useState(false);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiPost('/api/crisis-events', { ...form, reported_at: new Date().toISOString() });
      setShowModal(false);
      setForm({ type: 'other', severity: 'moderate' });
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSubmitting(false); }
  };

  const [showTips, setShowTips] = useState(true);

  if (loading) return <LoadingSpinner message="Loading Crisis Events..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;

  const activeCount = items?.filter(e => !['closed', 'resolved'].includes(e.status)).length || 0;

  return (
    <div>
      <div className="flex justify-end mb-2"><HelpToggle visible={showTips} setVisible={setShowTips} /></div>
      {showTips && (
        <HelpTip className="mb-4">
          <p className="mb-1.5">A crisis event is any incident that threatens personnel safety, product safety, or business continuity: fire, flood, power outage, refrigeration failure, water contamination, equipment failure, security breach, natural disaster, or IT failure.</p>
          <p className="font-semibold text-red-700">Personnel safety first. Stop production if product safety may be compromised.</p>
        </HelpTip>
      )}
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">{activeCount} active event{activeCount !== 1 ? 's' : ''}</p>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-orange-700 text-white rounded-lg text-sm font-medium hover:bg-orange-600 transition-colors">
          <Plus className="w-4 h-4" />
          Report Crisis
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Title</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Severity</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Reported By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!items || items.length === 0) ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No crisis events found</td></tr>
              ) : (
                items.map(ce => (
                  <tr key={ce.id} onClick={() => navigate(`/crisis-events/${ce.id}`)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-navy-700">{ce.event_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{ce.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{CRISIS_TYPE_LABELS[ce.type] || ce.type}</td>
                    <td className="px-4 py-3"><SeverityBadge severity={ce.severity} /></td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${CRISIS_STATUS_STYLES[ce.status] || ''}`}>
                        {ce.status?.charAt(0).toUpperCase() + ce.status?.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ce.reported_by}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ce.created_at?.slice(0, 10)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Report Crisis Event">
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input type="text" required value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select required value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                {Object.entries(CRISIS_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity *</label>
              <select required value={form.severity} onChange={e => setForm({ ...form, severity: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                <option value="low">Low</option>
                <option value="moderate">Moderate</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea rows={3} required value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reported By *</label>
            <input type="text" required value={form.reported_by || ''} onChange={e => setForm({ ...form, reported_by: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.production_stopped || false} onChange={e => setForm({ ...form, production_stopped: e.target.checked })} className="rounded border-gray-300" />
              Production Stopped
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.product_held || false} onChange={e => setForm({ ...form, product_held: e.target.checked })} className="rounded border-gray-300" />
              Product Held
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={form.food_safety_impact || false} onChange={e => setForm({ ...form, food_safety_impact: e.target.checked })} className="rounded border-gray-300" />
              Food Safety Impact
            </label>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-orange-700 text-white rounded-lg text-sm disabled:opacity-50">
              {submitting ? 'Reporting...' : 'Report Crisis'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
