import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Save, X, Plus, Clock, CheckCircle, AlertTriangle,
  Shield, Phone, Mail, Users, Package, FileText, Truck
} from 'lucide-react';
import { useFetch, apiPut, apiPost } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import {
  RecallStatusBadge, RecallClassificationBadge, HelpTip, HelpToggle,
  RECALL_STATUS_OPTIONS, RECALL_STATUS_LABELS, TRIGGER_LABELS,
  CLASSIFICATION_LABELS,
} from './RecallCenter';

const WORKFLOW_STAGES = [
  { key: 'initiated', label: 'Initiated' },
  { key: 'investigating', label: 'Investigating' },
  { key: 'hold_segregate', label: 'Hold' },
  { key: 'cfia_notified', label: 'CFIA' },
  { key: 'customers_notified', label: 'Customers' },
  { key: 'recall_active', label: 'Active' },
  { key: 'effectiveness_check', label: 'Effectiveness' },
  { key: 'closed', label: 'Closed' },
];

const STATUS_GUIDANCE = {
  initiated: 'Identify affected products, lot codes, and batch IDs. Determine scope: one lot, multiple lots, or date range.',
  investigating: 'Conduct root cause analysis. Reference BPR for each batch. Determine which batches used the same raw material lot.',
  hold_segregate: 'Physically locate ALL affected product in FRIDGE-01, FRIDGE-02, dry storage, packaging area, loading dock. Label: RECALLED \u2013 DO NOT USE \u2013 DO NOT SHIP. Ensure no affected product leaves the facility.',
  cfia_notified: 'Contact CFIA Recall Coordinator: 416-665-5049 (or after-hours: 1-866-225-2342). Provide: product details, lot codes, distribution scope, risk assessment, proposed classification.',
  customers_notified: 'Notify all customers on distribution list. Prioritize: (1) distributors, (2) vulnerable populations (hospitals, daycares), (3) all others. Request confirmation of receipt.',
  recall_active: 'Monitor customer responses. Track quantities accounted for at each customer.',
  effectiveness_check: 'Verify 100% of distributed quantity is accounted for (returned, destroyed, or confirmed consumed). Document gaps.',
  closed: 'All product accounted for. Root cause investigation complete. CAPA implemented.',
};

const CLASSIFICATION_GUIDANCE = {
  class_1: 'Reasonable probability that use of the product will cause serious adverse health consequences or death.',
  class_2: 'Probability that use of the product may cause temporary adverse health consequences or where probability of serious consequences is remote.',
  class_3: 'Use of the product will not cause any adverse health consequences.',
};

function StatusProgressBar({ status }) {
  const idx = WORKFLOW_STAGES.findIndex(s => s.key === status);
  return (
    <div className="flex items-center gap-1">
      {WORKFLOW_STAGES.map((stage, i) => {
        const isComplete = i <= idx;
        const isCurrent = i === idx;
        return (
          <div key={stage.key} className="flex items-center gap-1 flex-1">
            <div className={`flex-1 h-2 rounded-full ${isComplete ? (isCurrent ? 'bg-red-500' : 'bg-green-500') : 'bg-gray-200'}`} />
            <span className={`text-[10px] whitespace-nowrap ${isCurrent ? 'font-semibold text-red-700' : isComplete ? 'text-green-700' : 'text-gray-400'}`}>
              {stage.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export default function RecallDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: recall, loading, error, refetch } = useFetch(`/api/recalls/${id}`);

  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Modals
  const [showCfiaModal, setShowCfiaModal] = useState(false);
  const [cfiaForm, setCfiaForm] = useState({});
  const [showDistModal, setShowDistModal] = useState(false);
  const [distForm, setDistForm] = useState({ customer_type: 'distributor' });
  const [showDispositionModal, setShowDispositionModal] = useState(false);
  const [dispositionForm, setDispositionForm] = useState({});
  const [showEffectivenessModal, setShowEffectivenessModal] = useState(false);
  const [effectivenessForm, setEffectivenessForm] = useState({});
  const [showTips, setShowTips] = useState(true);

  if (loading) return <LoadingSpinner message="Loading Recall..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;
  if (!recall) return <div className="text-center py-16 text-gray-500">Recall not found</div>;

  const startEdit = () => { setFormData({ ...recall }); setEditing(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut(`/api/recalls/${id}`, formData);
      setEditing(false);
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleHold = async () => {
    if (!confirm('Mark product as held/segregated?')) return;
    try { await apiPost(`/api/recalls/${id}/hold`, {}); refetch(); }
    catch (err) { alert('Error: ' + err.message); }
  };

  const handleNotifyCfia = async (e) => {
    e.preventDefault();
    try {
      await apiPost(`/api/recalls/${id}/notify-cfia`, cfiaForm);
      setShowCfiaModal(false); setCfiaForm({}); refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleNotifyCustomers = async () => {
    if (!confirm('Mark all customers as notified?')) return;
    try { await apiPost(`/api/recalls/${id}/notify-customers`, {}); refetch(); }
    catch (err) { alert('Error: ' + err.message); }
  };

  const handleEffectiveness = async (e) => {
    e.preventDefault();
    try {
      await apiPost(`/api/recalls/${id}/effectiveness`, effectivenessForm);
      setShowEffectivenessModal(false); setEffectivenessForm({}); refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleDisposition = async (e) => {
    e.preventDefault();
    try {
      await apiPost(`/api/recalls/${id}/disposition`, dispositionForm);
      setShowDispositionModal(false); setDispositionForm({}); refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleClose = async () => {
    if (!confirm('Close this recall? This indicates all actions are complete.')) return;
    try { await apiPost(`/api/recalls/${id}/close`, {}); refetch(); }
    catch (err) { alert('Error: ' + err.message); }
  };

  const handleAddDist = async (e) => {
    e.preventDefault();
    try {
      await apiPost(`/api/recalls/${id}/distribution`, distForm);
      setShowDistModal(false); setDistForm({ customer_type: 'distributor' }); refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleUpdateDist = async (distId, updates) => {
    try { await apiPut(`/api/recalls/${id}/distribution/${distId}`, updates); refetch(); }
    catch (err) { alert('Error: ' + err.message); }
  };

  const distribution = recall.distribution || [];
  const affectedProducts = Array.isArray(recall.affected_products) ? recall.affected_products : JSON.parse(recall.affected_products || '[]');
  const affectedLots = Array.isArray(recall.affected_lot_codes) ? recall.affected_lot_codes : JSON.parse(recall.affected_lot_codes || '[]');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'distribution', label: `Distribution (${distribution.length})` },
    { id: 'cfia', label: 'CFIA & Notices' },
    { id: 'timeline', label: 'Timeline' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate('/recalls')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Recall Center
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-4">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{recall.recall_id}</h1>
              <RecallStatusBadge status={recall.status} />
              <RecallClassificationBadge classification={recall.classification} />
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${recall.type === 'recall' ? 'bg-red-100 text-red-700 border-red-200' : 'bg-amber-100 text-amber-800 border-amber-200'}`}>
                {recall.type === 'recall' ? 'Recall' : 'Withdrawal'}
              </span>
            </div>
            <p className="text-gray-700 font-medium">{recall.title}</p>
            <p className="text-sm text-gray-500 mt-1">Initiated by {recall.initiated_by} — {TRIGGER_LABELS[recall.trigger_type] || recall.trigger_type}</p>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-3 py-2 bg-navy-800 text-white rounded-lg text-sm hover:bg-navy-700 disabled:opacity-50">
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button onClick={startEdit} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                <Edit2 className="w-4 h-4" /> Edit
              </button>
            )}
          </div>
        </div>

        {/* Status Progress */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <StatusProgressBar status={recall.status} />
        </div>

        {/* Action Buttons */}
        {!editing && recall.status !== 'closed' && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
            {['initiated', 'investigating'].includes(recall.status) && (
              <button onClick={handleHold} className="px-3 py-1.5 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700">
                <Package className="w-3.5 h-3.5 inline mr-1" /> Hold Product
              </button>
            )}
            {['initiated', 'investigating', 'hold_segregate'].includes(recall.status) && (
              <button onClick={() => setShowCfiaModal(true)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                <Phone className="w-3.5 h-3.5 inline mr-1" /> Notify CFIA
              </button>
            )}
            {['cfia_notified', 'recall_active'].includes(recall.status) && (
              <button onClick={handleNotifyCustomers} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                <Mail className="w-3.5 h-3.5 inline mr-1" /> Send Notices
              </button>
            )}
            {['customers_notified', 'recall_active'].includes(recall.status) && (
              <button onClick={() => setShowEffectivenessModal(true)} className="px-3 py-1.5 bg-cyan-600 text-white rounded-lg text-sm hover:bg-cyan-700">
                <CheckCircle className="w-3.5 h-3.5 inline mr-1" /> Verify Effectiveness
              </button>
            )}
            {!recall.product_disposition && (
              <button onClick={() => setShowDispositionModal(true)} className="px-3 py-1.5 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700">
                <Truck className="w-3.5 h-3.5 inline mr-1" /> Record Disposition
              </button>
            )}
            {['effectiveness_check'].includes(recall.status) && (
              <button onClick={handleClose} className="px-3 py-1.5 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-700">
                Close Recall
              </button>
            )}
          </div>
        )}
      </div>

      {/* Tips & Status Guidance */}
      <div className="flex justify-end mb-2"><HelpToggle visible={showTips} setVisible={setShowTips} /></div>
      {showTips && (
        <div className="space-y-2 mb-4">
          <HelpTip>
            <p className="font-semibold mb-1">Current step: {RECALL_STATUS_LABELS[recall.status]}</p>
            <p>{STATUS_GUIDANCE[recall.status]}</p>
          </HelpTip>
          {recall.classification && CLASSIFICATION_GUIDANCE[recall.classification] && (
            <HelpTip>
              <p><strong>{CLASSIFICATION_LABELS[recall.classification]}:</strong> {CLASSIFICATION_GUIDANCE[recall.classification]}</p>
              {recall.classification === 'class_1' && <p className="font-semibold text-red-700 mt-1">All recall steps must be initiated within 24 hours.</p>}
            </HelpTip>
          )}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recall Details</h2>
            {editing ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input type="text" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={formData.status || ''} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                    {RECALL_STATUS_OPTIONS.map(s => <option key={s} value={s}>{RECALL_STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Classification</label>
                  <select value={formData.classification || ''} onChange={e => setFormData({ ...formData, classification: e.target.value || null })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                    <option value="">Not classified</option>
                    {Object.entries(CLASSIFICATION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Root Cause</label>
                  <input type="text" value={formData.root_cause || ''} onChange={e => setFormData({ ...formData, root_cause: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Risk Assessment</label>
                  <textarea rows={2} value={formData.risk_assessment || ''} onChange={e => setFormData({ ...formData, risk_assessment: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Qty Produced</label>
                  <input type="number" value={formData.total_quantity_produced || ''} onChange={e => setFormData({ ...formData, total_quantity_produced: parseInt(e.target.value) || null })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Qty Shipped</label>
                  <input type="number" value={formData.total_quantity_shipped || ''} onChange={e => setFormData({ ...formData, total_quantity_shipped: parseInt(e.target.value) || null })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Qty On-Site</label>
                  <input type="number" value={formData.total_quantity_onsite || ''} onChange={e => setFormData({ ...formData, total_quantity_onsite: parseInt(e.target.value) || null })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Total Qty Accounted</label>
                  <input type="number" value={formData.total_quantity_accounted || ''} onChange={e => setFormData({ ...formData, total_quantity_accounted: parseInt(e.target.value) || null })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-6">
                  {[
                    { label: 'Recall ID', value: recall.recall_id },
                    { label: 'Type', value: recall.type === 'recall' ? 'Recall' : 'Withdrawal' },
                    { label: 'Trigger', value: TRIGGER_LABELS[recall.trigger_type] || recall.trigger_type },
                    { label: 'Classification', value: CLASSIFICATION_LABELS[recall.classification] || 'Not classified' },
                    { label: 'Initiated By', value: recall.initiated_by },
                    { label: 'Created', value: recall.created_at?.slice(0, 10) },
                    { label: 'Qty Produced', value: recall.total_quantity_produced ?? '--' },
                    { label: 'Qty Shipped', value: recall.total_quantity_shipped ?? '--' },
                    { label: 'Qty On-Site', value: recall.total_quantity_onsite ?? '--' },
                    { label: 'Qty Accounted', value: recall.total_quantity_accounted ?? '--' },
                    { label: 'Product Disposition', value: recall.product_disposition?.replace('_', ' ') || '--' },
                    { label: 'Disposition Date', value: recall.disposition_date?.slice(0, 10) || '--' },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{item.label}</p>
                      <p className="text-sm text-gray-900">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Trigger Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{recall.trigger_description}</p>
                </div>
                {recall.root_cause && (
                  <div className="mb-4">
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Root Cause</p>
                    <p className="text-sm text-gray-700">{recall.root_cause}</p>
                  </div>
                )}
                {recall.risk_assessment && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Risk Assessment</p>
                    <p className="text-sm text-gray-700">{recall.risk_assessment}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {/* Affected Products & Lots */}
          {(affectedProducts.length > 0 || affectedLots.length > 0) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Affected Products & Lots</h2>
              <div className="grid grid-cols-2 gap-6">
                {affectedProducts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Products</p>
                    <div className="flex flex-wrap gap-2">
                      {affectedProducts.map((p, i) => (
                        <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
                {affectedLots.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Lot Codes</p>
                    <div className="flex flex-wrap gap-2">
                      {affectedLots.map((l, i) => (
                        <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800 border border-amber-200">{l}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Distribution Tab */}
      {activeTab === 'distribution' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Distribution List</h2>
            <button onClick={() => setShowDistModal(true)} className="flex items-center gap-2 px-3 py-2 bg-navy-800 text-white rounded-lg text-sm hover:bg-navy-700">
              <Plus className="w-4 h-4" /> Add Customer
            </button>
          </div>

          {distribution.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No customers in distribution list</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Customer</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Type</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Qty Shipped</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Qty Accounted</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Notified</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Effective</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {distribution.map(d => (
                      <tr key={d.id}>
                        <td className="px-4 py-3">
                          <p className="text-sm font-medium text-gray-900">{d.customer_name}</p>
                          {d.contact_name && <p className="text-xs text-gray-500">{d.contact_name}</p>}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600 capitalize">{d.customer_type?.replace('_', ' ') || '--'}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{d.quantity_shipped}</td>
                        <td className="px-4 py-3 text-sm text-gray-900">{d.quantity_accounted || 0}</td>
                        <td className="px-4 py-3">
                          {d.notified ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700"><CheckCircle className="w-3 h-3" /> Yes</span>
                          ) : (
                            <button onClick={() => handleUpdateDist(d.id, { notified: 1, notified_at: new Date().toISOString() })} className="text-xs text-blue-600 hover:underline">Mark notified</button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          {d.effective ? (
                            <span className="inline-flex items-center gap-1 text-xs text-green-700"><CheckCircle className="w-3 h-3" /> Yes</span>
                          ) : (
                            <button onClick={() => handleUpdateDist(d.id, { effective: 1 })} className="text-xs text-blue-600 hover:underline">Confirm</button>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <button onClick={() => {
                            const qty = prompt('Quantity accounted for:', d.quantity_accounted || 0);
                            if (qty !== null) handleUpdateDist(d.id, { quantity_accounted: parseInt(qty) || 0 });
                          }} className="text-xs text-navy-600 hover:underline">Update qty</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CFIA & Notices Tab */}
      {activeTab === 'cfia' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">CFIA Notification</h2>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">CFIA Notified</p>
                <p className="text-sm text-gray-900">{recall.cfia_notified ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notified At</p>
                <p className="text-sm text-gray-900">{recall.cfia_notified_at?.slice(0, 16) || '--'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">CFIA Contact</p>
                <p className="text-sm text-gray-900">{recall.cfia_contact_name || '--'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">CFIA Reference #</p>
                <p className="text-sm text-gray-900">{recall.cfia_reference_number || '--'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Recall Notice Template</h2>
            <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 space-y-2 border border-gray-200">
              <p><strong>URGENT RECALL NOTICE</strong></p>
              <p>Date: {new Date().toISOString().slice(0, 10)}</p>
              <p>Recall ID: {recall.recall_id}</p>
              <p>Product(s): {affectedProducts.join(', ') || 'See attached list'}</p>
              <p>Lot Code(s): {affectedLots.join(', ') || 'See attached list'}</p>
              <p>Reason: {recall.trigger_description}</p>
              <p className="mt-2">Please immediately remove the above product(s) from sale/distribution and segregate all affected inventory. Confirm receipt of this notice and report quantities held.</p>
              <p className="mt-2">Contact: QA Manager, Kefir Kultures Inc.</p>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Customer Notification Status</h2>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Customers Notified</p>
                <p className="text-sm text-gray-900">{recall.customers_notified ? 'Yes' : 'No'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Recall Notice Sent</p>
                <p className="text-sm text-gray-900">{recall.recall_notice_sent ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Timeline Tab */}
      {activeTab === 'timeline' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Recall Lifecycle</h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-6">
              <TimelineItem icon={<AlertTriangle className="w-3.5 h-3.5 text-white" />} color="bg-red-500" title="Initiated" date={recall.created_at?.slice(0, 10)} desc={`${recall.title} - ${TRIGGER_LABELS[recall.trigger_type]}`} />
              {recall.status !== 'initiated' && <TimelineItem icon={<Shield className="w-3.5 h-3.5 text-white" />} color="bg-amber-500" title="Investigation / Hold" />}
              {recall.cfia_notified_at && <TimelineItem icon={<Phone className="w-3.5 h-3.5 text-white" />} color="bg-blue-500" title={`CFIA Notified: ${recall.cfia_contact_name || ''}`} date={recall.cfia_notified_at?.slice(0, 10)} desc={`Ref: ${recall.cfia_reference_number || '--'}`} />}
              {recall.customers_notified === 1 && <TimelineItem icon={<Mail className="w-3.5 h-3.5 text-white" />} color="bg-purple-500" title="Customers Notified" desc="Recall notices sent" />}
              {recall.product_disposition && <TimelineItem icon={<Truck className="w-3.5 h-3.5 text-white" />} color="bg-gray-500" title={`Disposition: ${recall.product_disposition.replace('_', ' ')}`} date={recall.disposition_date?.slice(0, 10)} desc={recall.disposition_witnessed_by ? `Witnessed by ${recall.disposition_witnessed_by}` : ''} />}
              {recall.closed_at && <TimelineItem icon={<CheckCircle className="w-3.5 h-3.5 text-white" />} color="bg-slate-500" title="Closed" date={recall.closed_at?.slice(0, 10)} />}
            </div>
          </div>
        </div>
      )}

      {/* CFIA Notification Modal */}
      <Modal isOpen={showCfiaModal} onClose={() => setShowCfiaModal(false)} title="Record CFIA Notification">
        <form onSubmit={handleNotifyCfia} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CFIA Contact Name</label>
            <input type="text" value={cfiaForm.cfia_contact_name || ''} onChange={e => setCfiaForm({ ...cfiaForm, cfia_contact_name: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">CFIA Reference Number</label>
            <input type="text" value={cfiaForm.cfia_reference_number || ''} onChange={e => setCfiaForm({ ...cfiaForm, cfia_reference_number: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowCfiaModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm">Record Notification</button>
          </div>
        </form>
      </Modal>

      {/* Add Customer Modal */}
      <Modal isOpen={showDistModal} onClose={() => setShowDistModal(false)} title="Add Customer to Distribution List">
        <form onSubmit={handleAddDist} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer Name *</label>
            <input type="text" required value={distForm.customer_name || ''} onChange={e => setDistForm({ ...distForm, customer_name: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <input type="text" value={distForm.contact_name || ''} onChange={e => setDistForm({ ...distForm, contact_name: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Customer Type</label>
              <select value={distForm.customer_type} onChange={e => setDistForm({ ...distForm, customer_type: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                <option value="distributor">Distributor</option>
                <option value="retailer">Retailer</option>
                <option value="direct_consumer">Direct Consumer</option>
                <option value="institution">Institution</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" value={distForm.contact_phone || ''} onChange={e => setDistForm({ ...distForm, contact_phone: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={distForm.contact_email || ''} onChange={e => setDistForm({ ...distForm, contact_email: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Shipped</label>
            <input type="number" value={distForm.quantity_shipped || ''} onChange={e => setDistForm({ ...distForm, quantity_shipped: parseInt(e.target.value) || 0 })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowDistModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm">Add Customer</button>
          </div>
        </form>
      </Modal>

      {/* Effectiveness Modal */}
      <Modal isOpen={showEffectivenessModal} onClose={() => setShowEffectivenessModal(false)} title="Verify Effectiveness">
        <form onSubmit={handleEffectiveness} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Total Quantity Accounted For</label>
            <input type="number" value={effectivenessForm.total_quantity_accounted || ''} onChange={e => setEffectivenessForm({ ...effectivenessForm, total_quantity_accounted: parseInt(e.target.value) || 0 })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowEffectivenessModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-cyan-600 text-white rounded-lg text-sm">Record</button>
          </div>
        </form>
      </Modal>

      {/* Disposition Modal */}
      <Modal isOpen={showDispositionModal} onClose={() => setShowDispositionModal(false)} title="Record Product Disposition">
        <form onSubmit={handleDisposition} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Disposition *</label>
            <select required value={dispositionForm.product_disposition || ''} onChange={e => setDispositionForm({ ...dispositionForm, product_disposition: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
              <option value="">Select...</option>
              <option value="destruction">Destruction</option>
              <option value="return_to_supplier">Return to Supplier</option>
              <option value="pending">Pending</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Witnessed By</label>
            <input type="text" value={dispositionForm.disposition_witnessed_by || ''} onChange={e => setDispositionForm({ ...dispositionForm, disposition_witnessed_by: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowDispositionModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-gray-700 text-white rounded-lg text-sm">Record Disposition</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function TimelineItem({ icon, color, title, date, desc }) {
  return (
    <div className="flex gap-4 ml-1">
      <div className={`w-7 h-7 rounded-full ${color} flex items-center justify-center z-10 flex-shrink-0`}>
        {icon}
      </div>
      <div>
        <p className="text-sm font-medium text-gray-900">{title}</p>
        {date && <p className="text-xs text-gray-500">{date}</p>}
        {desc && <p className="text-xs text-gray-400 mt-1">{desc}</p>}
      </div>
    </div>
  );
}
