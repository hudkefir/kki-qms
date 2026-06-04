import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Save, X, Plus, Clock, CheckCircle, AlertTriangle,
  Shield, FileText, Users, AlertOctagon
} from 'lucide-react';
import { useFetch, apiPut, apiPost } from '../hooks/useApi';
import RecordLinker from '../components/RecordLinker';
import { FieldHelp, RecordInfoTooltip, GMP_HELP } from '../components/GmpFieldHelp';
import AiSuggestButton from '../components/AiSuggestButton';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { DevStatusBadge, DevClassificationBadge, DEV_STATUS_OPTIONS, DEV_STATUS_LABELS, DEV_CATEGORY_LABELS } from './Deviations';

const CAPA_STATUS_STYLES = {
  open: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  closed: 'bg-slate-100 text-slate-600',
};

const DISPOSITION_LABELS = {
  release: 'Release', hold: 'Hold', donate: 'Donate',
  reject_destroy: 'Reject/Destroy', recall_evaluation: 'Recall Evaluation',
};

const DISPOSITION_STYLES = {
  release: 'bg-green-100 text-green-700 border-green-200',
  hold: 'bg-amber-100 text-amber-800 border-amber-200',
  donate: 'bg-blue-100 text-blue-800 border-blue-200',
  reject_destroy: 'bg-red-100 text-red-700 border-red-200',
  recall_evaluation: 'bg-red-100 text-red-700 border-red-200',
};

const ROOT_CAUSE_LABELS = {
  five_whys: '5 Whys', fishbone: 'Fishbone/Ishikawa', timeline: 'Timeline Analysis',
};

export default function DeviationDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: dev, loading, error, refetch } = useFetch(`/api/deviations/${id}`);
  const { data: allComplaints } = useFetch('/api/complaints');
  const { data: allSops } = useFetch('/api/sops');
  const { data: allBatchTests } = useFetch('/api/batch-tests');

  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  const [showClassifyModal, setShowClassifyModal] = useState(false);
  const [classifyForm, setClassifyForm] = useState({});
  const [showInvestigateModal, setShowInvestigateModal] = useState(false);
  const [investigateForm, setInvestigateForm] = useState({});
  const [showDispositionModal, setShowDispositionModal] = useState(false);
  const [dispositionForm, setDispositionForm] = useState({});
  const [showCapaModal, setShowCapaModal] = useState(false);
  const [capaForm, setCapaForm] = useState({});
  const [linkType, setLinkType] = useState('');
  const [linkSearch, setLinkSearch] = useState('');

  if (loading) return <LoadingSpinner message="Loading Deviation..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;
  if (!dev) return <div className="text-center py-16 text-gray-500">Deviation not found</div>;

  const startEdit = () => { setFormData({ ...dev }); setEditing(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut(`/api/deviations/${id}`, formData);
      setEditing(false);
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleClassify = async (e) => {
    e.preventDefault();
    try {
      await apiPost(`/api/deviations/${id}/classify`, classifyForm);
      setShowClassifyModal(false);
      setClassifyForm({});
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleInvestigate = async (e) => {
    e.preventDefault();
    try {
      await apiPost(`/api/deviations/${id}/investigate`, investigateForm);
      setShowInvestigateModal(false);
      setInvestigateForm({});
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleDisposition = async (e) => {
    e.preventDefault();
    try {
      await apiPost(`/api/deviations/${id}/disposition`, dispositionForm);
      setShowDispositionModal(false);
      setDispositionForm({});
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleCreateCapa = async (e) => {
    e.preventDefault();
    try {
      await apiPost('/api/capas', { ...capaForm, source_type: 'deviation', source_id: dev.id });
      setShowCapaModal(false);
      setCapaForm({});
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const capas = dev.capas || [];

  const handleLink = async (type, itemId) => {
    const fieldMap = { complaint: 'linked_complaints_json', sop: 'linked_sops_json', batch: 'linked_batch_tests_json' };
    const currentField = fieldMap[type];
    const currentIds = JSON.parse(dev[currentField] || '[]');
    if (currentIds.includes(itemId)) return;
    const updated = [...currentIds, itemId];
    try {
      await apiPut('/api/deviations/' + id, { [currentField]: JSON.stringify(updated) });
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleUnlink = async (type, itemId) => {
    const fieldMap = { complaint: 'linked_complaints_json', sop: 'linked_sops_json', batch: 'linked_batch_tests_json' };
    const currentField = fieldMap[type];
    const currentIds = JSON.parse(dev[currentField] || '[]');
    const updated = currentIds.filter(i => i !== itemId);
    try {
      await apiPut('/api/deviations/' + id, { [currentField]: JSON.stringify(updated) });
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };
  const affectedBatches = Array.isArray(dev.affected_batches) ? dev.affected_batches : JSON.parse(dev.affected_batches || '[]');
  const affectedProducts = Array.isArray(dev.affected_products) ? dev.affected_products : JSON.parse(dev.affected_products || '[]');

  const linkedComplaints = dev.linked_complaints || [];
  const linkedSops = dev.linked_sops || [];
  const linkedBatchTests = dev.linked_batch_tests || [];
  const linkedCount = linkedComplaints.length + linkedSops.length + linkedBatchTests.length;

  const tabs = [
    { id: 'overview', label: 'What Happened' },
    { id: 'linked', label: `Linked Records (${linkedCount})` },
    { id: 'investigation', label: 'Investigation' },
    { id: 'disposition', label: 'Disposition' },
    { id: 'capas', label: `CAPAs (${capas.length})` },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate('/deviations')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Deviations
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{dev.report_id}</h1>
              <RecordInfoTooltip title={GMP_HELP.deviation.info.title}>
                <p><strong>What:</strong> {GMP_HELP.deviation.info.what}</p>
                <p><strong>When to create:</strong> {GMP_HELP.deviation.info.when}</p>
                <p><strong>What you need:</strong> {GMP_HELP.deviation.info.need}</p>
              </RecordInfoTooltip>
              <DevStatusBadge status={dev.status} />
              <DevClassificationBadge classification={dev.classification} />
              {dev.is_ccp_deviation === 1 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                  <AlertOctagon className="w-3 h-3" /> CCP
                </span>
              )}
            </div>
            <p className="text-gray-700 font-medium">{dev.title}</p>
            <p className="text-sm text-gray-500 mt-1">Discovered by {dev.discovered_by} on {dev.discovered_at} — {DEV_CATEGORY_LABELS[dev.category] || dev.category}</p>
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

        {/* Action Buttons */}
        {!editing && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
            {dev.status === 'reported' && (
              <button onClick={() => setShowClassifyModal(true)} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700">
                Classify
              </button>
            )}
            {['reported', 'under_investigation'].includes(dev.status) && (
              <button onClick={() => setShowInvestigateModal(true)} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                Record Investigation
              </button>
            )}
            {!dev.product_disposition && (
              <button onClick={() => setShowDispositionModal(true)} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                Set Disposition
              </button>
            )}
          </div>
        )}

        {/* Flags */}
        {(dev.process_stopped === 1 || dev.product_on_hold === 1) && (
          <div className="mt-4 flex gap-2">
            {dev.process_stopped === 1 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                <AlertTriangle className="w-3 h-3" /> Process Stopped
              </span>
            )}
            {dev.product_on_hold === 1 && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-200">
                <Clock className="w-3 h-3" /> Product on Hold
              </span>
            )}
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Deviation Details</h2>
            {editing ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">Title</label>
                  <FieldHelp text={GMP_HELP.deviation.fields.title} />
                  <input type="text" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} placeholder={GMP_HELP.deviation.placeholders.title} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={formData.status || ''} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                    {DEV_STATUS_OPTIONS.map(s => <option key={s} value={s}>{DEV_STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <label className="block text-sm font-medium text-gray-700">Description</label>
                    <AiSuggestButton field="description" recordType="deviation" context={formData} onSuggestion={(text) => setFormData({ ...formData, description: text })} />
                  </div>
                  <FieldHelp text={GMP_HELP.deviation.fields.description} />
                  <textarea rows={3} value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder={GMP_HELP.deviation.placeholders.description} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">Category</label>
                  <FieldHelp text={GMP_HELP.deviation.fields.category} />
                  <select value={formData.category || ''} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                    {Object.entries(DEV_CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">Classification</label>
                  <FieldHelp text={GMP_HELP.deviation.fields.classification} />
                  <select value={formData.classification || ''} onChange={e => setFormData({ ...formData, classification: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                    <option value="critical">Critical</option>
                    <option value="major">Major</option>
                    <option value="minor">Minor</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">Discovered By</label>
                  <FieldHelp text={GMP_HELP.deviation.fields.discovered_by} />
                  <input type="text" value={formData.discovered_by || ''} onChange={e => setFormData({ ...formData, discovered_by: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">Discovered At</label>
                  <FieldHelp text={GMP_HELP.deviation.fields.discovered_at} />
                  <input type="date" value={formData.discovered_at || ''} onChange={e => setFormData({ ...formData, discovered_at: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">Location</label>
                  <FieldHelp text={GMP_HELP.deviation.fields.location} />
                  <input type="text" value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} placeholder={GMP_HELP.deviation.placeholders.location} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">Investigation Due Date</label>
                  <FieldHelp text={GMP_HELP.deviation.fields.investigation_due_date} />
                  <input type="date" value={formData.investigation_due_date || ''} onChange={e => setFormData({ ...formData, investigation_due_date: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <label className="block text-sm font-medium text-gray-700">Immediate Action Taken</label>
                    <AiSuggestButton field="containment_action" recordType="deviation" context={formData} onSuggestion={(text) => setFormData({ ...formData, immediate_action: text })} />
                  </div>
                  <FieldHelp text={GMP_HELP.deviation.fields.immediate_action} />
                  <textarea rows={2} value={formData.immediate_action || ''} onChange={e => setFormData({ ...formData, immediate_action: e.target.value })} placeholder={GMP_HELP.deviation.placeholders.immediate_action} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div className="col-span-2">
                  <div className="flex items-center gap-2 mb-0.5">
                    <label className="block text-sm font-medium text-gray-700">Root Cause</label>
                    <AiSuggestButton field="root_cause" recordType="deviation" context={formData} onSuggestion={(text) => setFormData({ ...formData, root_cause: text })} />
                  </div>
                  <FieldHelp text={GMP_HELP.deviation.fields.root_cause} />
                  <textarea rows={3} value={formData.root_cause || ''} onChange={e => setFormData({ ...formData, root_cause: e.target.value })} placeholder={GMP_HELP.deviation.placeholders.root_cause} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Root Cause Method</label>
                  <select value={formData.root_cause_method || ''} onChange={e => setFormData({ ...formData, root_cause_method: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                    <option value="">Select...</option>
                    {Object.entries(ROOT_CAUSE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">Product Disposition</label>
                  <FieldHelp text={GMP_HELP.deviation.fields.product_disposition} />
                  <select value={formData.product_disposition || ''} onChange={e => setFormData({ ...formData, product_disposition: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                    <option value="">Not set</option>
                    {Object.entries(DISPOSITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">Scope Assessment</label>
                  <FieldHelp text={GMP_HELP.deviation.fields.scope_assessment} />
                  <textarea rows={2} value={formData.scope_assessment || ''} onChange={e => setFormData({ ...formData, scope_assessment: e.target.value })} placeholder={GMP_HELP.deviation.placeholders.scope_assessment} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Disposition Rationale</label>
                  <textarea rows={2} value={formData.disposition_rationale || ''} onChange={e => setFormData({ ...formData, disposition_rationale: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div className="col-span-2 flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={formData.is_ccp_deviation === 1} onChange={e => setFormData({ ...formData, is_ccp_deviation: e.target.checked ? 1 : 0 })} className="rounded border-gray-300" />
                    CCP Deviation
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={formData.process_stopped === 1} onChange={e => setFormData({ ...formData, process_stopped: e.target.checked ? 1 : 0 })} className="rounded border-gray-300" />
                    Process Stopped
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={formData.product_on_hold === 1} onChange={e => setFormData({ ...formData, product_on_hold: e.target.checked ? 1 : 0 })} className="rounded border-gray-300" />
                    Product on Hold
                  </label>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-6">
                  {[
                    { label: 'Report ID', value: dev.report_id },
                    { label: 'Category', value: DEV_CATEGORY_LABELS[dev.category] || dev.category },
                    { label: 'Discovered By', value: dev.discovered_by },
                    { label: 'Discovered At', value: dev.discovered_at },
                    { label: 'Location', value: dev.location || '—' },
                    { label: 'Investigation Due', value: dev.investigation_due_date || '—' },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{item.label}</p>
                      <p className="text-sm text-gray-900">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{dev.description}</p>
                </div>
                {dev.immediate_action && (
                  <div className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-lg">
                    <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-1">Immediate Action Taken</p>
                    <p className="text-sm text-gray-700">{dev.immediate_action}</p>
                  </div>
                )}
              </>
            )}
          </div>

          {(affectedBatches.length > 0 || affectedProducts.length > 0) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Affected Items</h2>
              <div className="grid grid-cols-2 gap-4">
                {affectedBatches.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Batches</p>
                    <div className="flex flex-wrap gap-2">
                      {affectedBatches.map((b, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-mono">{b}</span>
                      ))}
                    </div>
                  </div>
                )}
                {affectedProducts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Products</p>
                    <div className="flex flex-wrap gap-2">
                      {affectedProducts.map((p, i) => (
                        <span key={i} className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* LINKED RECORDS TAB */}
      {activeTab === 'linked' && (
        <div className="space-y-6">
          {/* Linked Complaints */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Linked Complaints ({linkedComplaints.length})</h2>
              {linkType !== 'complaint' ? (
                <button onClick={() => setLinkType('complaint')} className="flex items-center gap-2 px-3 py-1.5 bg-navy-800 text-white rounded-lg text-sm hover:bg-navy-700">
                  <Plus className="w-4 h-4" /> Link Complaint
                </button>
              ) : (
                <button onClick={() => setLinkType('')} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">Cancel</button>
              )}
            </div>
            {linkType === 'complaint' && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input type="text" placeholder="Search complaints..." value={linkSearch} onChange={e => setLinkSearch(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2 mb-2" />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {(allComplaints || []).filter(c => {
                    const s = linkSearch.toLowerCase();
                    const alreadyLinked = (JSON.parse(dev.linked_complaints_json || '[]')).includes(c.id);
                    return !alreadyLinked && (!s || c.complaint_number?.toLowerCase().includes(s) || c.reporter?.toLowerCase().includes(s) || c.issue_type?.toLowerCase().includes(s));
                  }).slice(0, 10).map(c => (
                    <div key={c.id} className="flex items-center justify-between p-2 hover:bg-white rounded text-sm">
                      <span><strong>{c.complaint_number}</strong> — {c.reporter} ({c.issue_type})</span>
                      <button onClick={() => { handleLink('complaint', c.id); setLinkType(''); setLinkSearch(''); }} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200">Link</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {linkedComplaints.length === 0 ? (
              <p className="text-sm text-gray-400">No complaints linked yet</p>
            ) : (
              <div className="space-y-2">
                {linkedComplaints.map(c => (
                  <div key={c.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <span className="text-sm font-medium text-navy-700 cursor-pointer hover:underline" onClick={() => navigate('/complaints/' + c.id)}>{c.complaint_number}</span>
                      <span className="text-sm text-gray-600 ml-2">{c.reporter} — {c.issue_type}</span>
                      <span className="text-xs text-gray-400 ml-2">{c.date_received}</span>
                    </div>
                    <button onClick={() => handleUnlink('complaint', c.id)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1">Unlink</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Linked SOPs */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Linked SOPs ({linkedSops.length})</h2>
              {linkType !== 'sop' ? (
                <button onClick={() => setLinkType('sop')} className="flex items-center gap-2 px-3 py-1.5 bg-navy-800 text-white rounded-lg text-sm hover:bg-navy-700">
                  <Plus className="w-4 h-4" /> Link SOP
                </button>
              ) : (
                <button onClick={() => setLinkType('')} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">Cancel</button>
              )}
            </div>
            {linkType === 'sop' && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input type="text" placeholder="Search SOPs..." value={linkSearch} onChange={e => setLinkSearch(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2 mb-2" />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {(allSops || []).filter(s => {
                    const q = linkSearch.toLowerCase();
                    const alreadyLinked = (JSON.parse(dev.linked_sops_json || '[]')).includes(s.id);
                    return !alreadyLinked && (!q || s.sop_number?.toLowerCase().includes(q) || s.title?.toLowerCase().includes(q));
                  }).slice(0, 10).map(s => (
                    <div key={s.id} className="flex items-center justify-between p-2 hover:bg-white rounded text-sm">
                      <span><strong>{s.sop_number}</strong> — {s.title}</span>
                      <button onClick={() => { handleLink('sop', s.id); setLinkType(''); setLinkSearch(''); }} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200">Link</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {linkedSops.length === 0 ? (
              <p className="text-sm text-gray-400">No SOPs linked yet</p>
            ) : (
              <div className="space-y-2">
                {linkedSops.map(s => (
                  <div key={s.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <span className="text-sm font-medium text-navy-700 cursor-pointer hover:underline" onClick={() => navigate('/sops/' + s.id)}>{s.sop_number}</span>
                      <span className="text-sm text-gray-600 ml-2">{s.title}</span>
                    </div>
                    <button onClick={() => handleUnlink('sop', s.id)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1">Unlink</button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Cross-Linked Records (Universal) */}
          <RecordLinker sourceType="deviation" sourceId={id} />

          {/* Linked Batch Tests */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">Linked Batch Tests ({linkedBatchTests.length})</h2>
              {linkType !== 'batch' ? (
                <button onClick={() => setLinkType('batch')} className="flex items-center gap-2 px-3 py-1.5 bg-navy-800 text-white rounded-lg text-sm hover:bg-navy-700">
                  <Plus className="w-4 h-4" /> Link Batch Test
                </button>
              ) : (
                <button onClick={() => setLinkType('')} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">Cancel</button>
              )}
            </div>
            {linkType === 'batch' && (
              <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                <input type="text" placeholder="Search batch tests..." value={linkSearch} onChange={e => setLinkSearch(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2 mb-2" />
                <div className="max-h-48 overflow-y-auto space-y-1">
                  {(allBatchTests || []).filter(b => {
                    const q = linkSearch.toLowerCase();
                    const alreadyLinked = (JSON.parse(dev.linked_batch_tests_json || '[]')).includes(b.id);
                    return !alreadyLinked && (!q || b.batch_number?.toLowerCase().includes(q));
                  }).slice(0, 10).map(b => (
                    <div key={b.id} className="flex items-center justify-between p-2 hover:bg-white rounded text-sm">
                      <span><strong>{b.batch_number}</strong> — {b.test_date} — {b.overall_result || 'pending'}</span>
                      <button onClick={() => { handleLink('batch', b.id); setLinkType(''); setLinkSearch(''); }} className="px-2 py-1 bg-green-100 text-green-700 rounded text-xs hover:bg-green-200">Link</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {linkedBatchTests.length === 0 ? (
              <p className="text-sm text-gray-400">No batch tests linked yet</p>
            ) : (
              <div className="space-y-2">
                {linkedBatchTests.map(b => (
                  <div key={b.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                    <div>
                      <span className="text-sm font-medium text-navy-700 cursor-pointer hover:underline" onClick={() => navigate('/batch-tests/' + b.id)}>{b.batch_number}</span>
                      <span className="text-sm text-gray-600 ml-2">{b.test_date}</span>
                      <span className={`ml-2 text-xs font-semibold px-2 py-0.5 rounded-full ${b.overall_result === 'pass' ? 'bg-green-100 text-green-700' : b.overall_result === 'fail' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-600'}`}>{b.overall_result || 'pending'}</span>
                    </div>
                    <button onClick={() => handleUnlink('batch', b.id)} className="text-xs text-red-500 hover:text-red-700 px-2 py-1">Unlink</button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'investigation' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Root Cause Investigation</h2>
            {dev.root_cause ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Method</p>
                  <p className="text-sm text-gray-900">{ROOT_CAUSE_LABELS[dev.root_cause_method] || dev.root_cause_method || '—'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Root Cause</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{dev.root_cause}</p>
                </div>
                {dev.scope_assessment && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Scope Assessment</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{dev.scope_assessment}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No investigation recorded yet</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'disposition' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Disposition</h2>
            {dev.product_disposition ? (
              <div className="space-y-4">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Disposition</p>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${DISPOSITION_STYLES[dev.product_disposition] || ''}`}>
                    {DISPOSITION_LABELS[dev.product_disposition] || dev.product_disposition}
                  </span>
                </div>
                {dev.disposition_rationale && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Rationale</p>
                    <p className="text-sm text-gray-700 leading-relaxed">{dev.disposition_rationale}</p>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-sm text-gray-400">No product disposition set yet</p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'capas' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Linked CAPAs</h2>
            <button onClick={() => setShowCapaModal(true)} className="flex items-center gap-2 px-3 py-2 bg-navy-800 text-white rounded-lg text-sm hover:bg-navy-700">
              <Plus className="w-4 h-4" /> Create CAPA
            </button>
          </div>

          {capas.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No CAPAs linked to this deviation</p>
            </div>
          ) : (
            <div className="space-y-3">
              {capas.map(capa => {
                const isOverdue = !['completed', 'closed'].includes(capa.status) && capa.target_date && new Date(capa.target_date) < new Date();
                return (
                  <div key={capa.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium text-navy-700">{capa.capa_id}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${CAPA_STATUS_STYLES[isOverdue ? 'overdue' : capa.status] || CAPA_STATUS_STYLES.open}`}>
                          {isOverdue ? 'Overdue' : capa.status.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
                        </span>
                      </div>
                      <Link to="/capas" className="text-xs text-navy-600 hover:underline">View All CAPAs</Link>
                    </div>
                    <p className="text-sm text-gray-900 mb-1"><strong>Corrective:</strong> {capa.corrective_action}</p>
                    <p className="text-sm text-gray-900 mb-2"><strong>Preventive:</strong> {capa.preventive_action}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {capa.responsible_person}</span>
                      <span className={`flex items-center gap-1 ${isOverdue ? 'text-red-600 font-semibold' : ''}`}>
                        <Clock className="w-3 h-3" /> Target: {capa.target_date}
                      </span>
                      {capa.actual_completion_date && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3 h-3" /> Completed: {capa.actual_completion_date}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Classify Modal */}
      <Modal isOpen={showClassifyModal} onClose={() => setShowClassifyModal(false)} title="Classify Deviation">
        <form onSubmit={handleClassify} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Classification *</label>
            <select required value={classifyForm.classification || ''} onChange={e => setClassifyForm({ ...classifyForm, classification: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
              <option value="">Select...</option>
              <option value="minor">Minor</option>
              <option value="major">Major</option>
              <option value="critical">Critical</option>
            </select>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowClassifyModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm">Classify</button>
          </div>
        </form>
      </Modal>

      {/* Investigate Modal */}
      <Modal isOpen={showInvestigateModal} onClose={() => setShowInvestigateModal(false)} title="Record Investigation" size="lg">
        <form onSubmit={handleInvestigate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Root Cause Method</label>
            <select value={investigateForm.root_cause_method || ''} onChange={e => setInvestigateForm({ ...investigateForm, root_cause_method: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
              <option value="">Select...</option>
              <option value="five_whys">5 Whys</option>
              <option value="fishbone">Fishbone / Ishikawa</option>
              <option value="timeline">Timeline Analysis</option>
            </select>
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <label className="block text-sm font-medium text-gray-700">Root Cause</label>
              <AiSuggestButton field="root_cause" recordType="deviation" context={{ ...dev, ...investigateForm }} onSuggestion={(text) => setInvestigateForm({ ...investigateForm, root_cause: text })} />
            </div>
            <textarea rows={8} value={investigateForm.root_cause || ''} onChange={e => setInvestigateForm({ ...investigateForm, root_cause: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scope Assessment</label>
            <textarea rows={5} value={investigateForm.scope_assessment || ''} onChange={e => setInvestigateForm({ ...investigateForm, scope_assessment: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowInvestigateModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm">Save</button>
          </div>
        </form>
      </Modal>

      {/* Disposition Modal */}
      <Modal isOpen={showDispositionModal} onClose={() => setShowDispositionModal(false)} title="Set Product Disposition" size="lg">
        <form onSubmit={handleDisposition} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Disposition *</label>
            <select required value={dispositionForm.product_disposition || ''} onChange={e => setDispositionForm({ ...dispositionForm, product_disposition: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
              <option value="">Select...</option>
              {Object.entries(DISPOSITION_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rationale</label>
            <textarea rows={6} value={dispositionForm.disposition_rationale || ''} onChange={e => setDispositionForm({ ...dispositionForm, disposition_rationale: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowDispositionModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm">Set Disposition</button>
          </div>
        </form>
      </Modal>

      {/* CAPA Modal */}
      <Modal isOpen={showCapaModal} onClose={() => setShowCapaModal(false)} title="Create CAPA" size="lg">
        <form onSubmit={handleCreateCapa} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Corrective Action *</label>
            <textarea rows={5} required value={capaForm.corrective_action || ''} onChange={e => setCapaForm({ ...capaForm, corrective_action: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preventive Action *</label>
            <textarea rows={5} required value={capaForm.preventive_action || ''} onChange={e => setCapaForm({ ...capaForm, preventive_action: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Responsible Person *</label>
              <input type="text" required value={capaForm.responsible_person || ''} onChange={e => setCapaForm({ ...capaForm, responsible_person: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Date *</label>
              <input type="date" required value={capaForm.target_date || ''} onChange={e => setCapaForm({ ...capaForm, target_date: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowCapaModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm">Create CAPA</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
