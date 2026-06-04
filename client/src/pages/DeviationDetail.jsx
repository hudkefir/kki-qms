import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Save, X, Plus, Clock, CheckCircle, AlertTriangle,
  Shield, FileText, Users, AlertOctagon, History, MessageSquare, Paperclip,
  Upload, Download, Trash2, Lock, Unlock, Eye, AlertCircle, ChevronDown, ChevronUp
} from 'lucide-react';
import { useFetch, apiPut, apiPost, apiDelete } from '../hooks/useApi';
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

  // Feature 1: Audit Trail
  const { data: auditTrail, refetch: refetchAudit } = useFetch(`/api/deviations/${id}/audit-trail`);

  // Feature 2: Attachments
  const { data: attachments, refetch: refetchAttachments } = useFetch(`/api/deviations/${id}/attachments`);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileDescription, setFileDescription] = useState('');

  // Feature 3: Comments
  const { data: comments, refetch: refetchComments } = useFetch(`/api/deviations/${id}/comments`);
  const [newComment, setNewComment] = useState('');
  const [postingComment, setPostingComment] = useState(false);

  // Feature 4: Approvals
  const { data: approvals, refetch: refetchApprovals } = useFetch(`/api/deviations/${id}/approvals`);
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [approvalAction, setApprovalAction] = useState(null); // { type: 'request' | 'approve' | 'reject', approvalType?, approvalId? }
  const [approvalForm, setApprovalForm] = useState({ signature_meaning: '', password: '', rejection_reason: '' });

  // Feature 5: Similar Deviations
  const { data: similarDeviations } = useFetch(`/api/deviations/${id}/similar`);
  const [showSimilar, setShowSimilar] = useState(false);

  const openCapaModal = () => {
    const affBatches = Array.isArray(dev.affected_batches) ? dev.affected_batches : JSON.parse(dev.affected_batches || '[]');
    const affProducts = Array.isArray(dev.affected_products) ? dev.affected_products : JSON.parse(dev.affected_products || '[]');
    const batchInfo = affBatches.length > 0 ? `\nBatch(es): ${affBatches.join(', ')}` : '';
    const productInfo = affProducts.length > 0 ? `\nProduct(s): ${affProducts.join(', ')}` : '';
    const classInfo = dev.classification ? `\nClassification: ${dev.classification}` : '';
    const descContext = `Deviation ${dev.report_id}: ${dev.description || ''}${batchInfo}${productInfo}${classInfo}`;
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + 30);
    const targetStr = targetDate.toISOString().slice(0, 10);

    // Auto-generate corrective action from root cause and description
    let correctiveAction = '';
    if (dev.root_cause) {
      correctiveAction = `Root cause identified: ${dev.root_cause}\n\nCorrective action: Address the root cause by implementing immediate corrections to the process/procedure that led to this deviation.`;
      if (dev.immediate_action) {
        correctiveAction += `\n\nImmediate containment already taken: ${dev.immediate_action}`;
      }
    } else if (dev.description) {
      correctiveAction = `Investigate and correct the issue described in ${dev.report_id}: ${dev.description.substring(0, 200)}${dev.description.length > 200 ? '...' : ''}`;
    }

    // Auto-generate preventive action from root cause and category
    let preventiveAction = '';
    if (dev.root_cause) {
      const categoryLabel = DEV_CATEGORY_LABELS[dev.category] || dev.category || 'process';
      preventiveAction = `To prevent recurrence of the root cause (${dev.root_cause.substring(0, 150)}${dev.root_cause.length > 150 ? '...' : ''}):\n\n`;
      preventiveAction += '1. Review and update applicable SOPs to address the identified gap\n';
      preventiveAction += '2. Conduct targeted training for relevant personnel\n';
      preventiveAction += `3. Implement additional monitoring/verification for ${categoryLabel} controls\n`;
      preventiveAction += '4. Verify effectiveness of corrective actions within 30 days';
    }

    setCapaForm({
      title: `CAPA for ${dev.report_id}${affBatches.length > 0 ? ` (${affBatches[0]})` : ''} - ${dev.title || ''}`,
      corrective_action: correctiveAction,
      preventive_action: preventiveAction,
      description: descContext.trim(),
      responsible_person: dev.investigated_by || dev.discovered_by || '',
      target_date: targetStr,
    });
    setShowCapaModal(true);
  };
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
      await apiPost('/api/capas', {
        ...capaForm,
        source_type: 'deviation',
        source_id: dev.id,
      });
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

  const attachmentCount = (attachments || []).length;
  const commentCount = (comments || []).length;

  const tabs = [
    { id: 'overview', label: 'What Happened' },
    { id: 'linked', label: `Linked Records (${linkedCount})` },
    { id: 'investigation', label: 'Investigation' },
    { id: 'disposition', label: 'Disposition' },
    { id: 'capas', label: `CAPAs (${capas.length})` },
    { id: 'attachments', label: `Attachments (${attachmentCount})` },
    { id: 'comments', label: `Comments (${commentCount})` },
    { id: 'audit', label: 'Audit Trail' },
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

      {/* ── Feature 5: Similar Deviations Alert ── */}
      {similarDeviations && similarDeviations.length > 0 && (
        <div className={`rounded-xl shadow-sm border p-4 mb-6 ${
          similarDeviations.length >= 3 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'
        }`}>
          <div className="flex items-center justify-between cursor-pointer" onClick={() => setShowSimilar(!showSimilar)}>
            <div className="flex items-center gap-2">
              <AlertTriangle className={`w-5 h-5 ${similarDeviations.length >= 3 ? 'text-red-600' : 'text-amber-600'}`} />
              <span className={`font-medium text-sm ${similarDeviations.length >= 3 ? 'text-red-800' : 'text-amber-800'}`}>
                {similarDeviations.length >= 3
                  ? `Recurring pattern detected -- ${similarDeviations.length} similar deviations in 90 days. Consider CAPA.`
                  : `${similarDeviations.length} similar deviation${similarDeviations.length > 1 ? 's' : ''} found in the last 90 days`
                }
              </span>
            </div>
            {showSimilar ? <ChevronUp className="w-4 h-4 text-gray-500" /> : <ChevronDown className="w-4 h-4 text-gray-500" />}
          </div>
          {showSimilar && (
            <div className="mt-3 space-y-2">
              {similarDeviations.map(sd => (
                <Link key={sd.id} to={`/deviations/${sd.id}`} className="block p-3 bg-white rounded-lg border border-gray-200 hover:border-gray-300 transition-colors">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-sm font-medium text-navy-700">{sd.report_id}</span>
                      <span className="text-sm text-gray-700 ml-2">{sd.title}</span>
                    </div>
                    <DevStatusBadge status={sd.status} />
                  </div>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-gray-500">{sd.discovered_at || sd.created_at}</span>
                    {sd.similarity_reasons && sd.similarity_reasons.map((reason, i) => (
                      <span key={i} className="text-xs px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">{reason}</span>
                    ))}
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Feature 4: Approval Status ── */}
      {approvals && approvals.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <h3 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <Lock className="w-4 h-4" /> Approval Status
          </h3>
          <div className="flex gap-4">
            {['investigation', 'disposition', 'closure'].map(aType => {
              const approval = (approvals || []).find(a => a.approval_type === aType);
              const statusStyles = {
                pending: 'bg-yellow-100 text-yellow-700 border-yellow-200',
                approved: 'bg-green-100 text-green-700 border-green-200',
                rejected: 'bg-red-100 text-red-700 border-red-200',
              };
              return (
                <div key={aType} className="flex-1 text-center">
                  <p className="text-xs font-medium text-gray-500 uppercase mb-1">{aType}</p>
                  {approval ? (
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${statusStyles[approval.status]}`}>
                      {approval.status === 'approved' && <CheckCircle className="w-3 h-3 mr-1" />}
                      {approval.status === 'rejected' && <X className="w-3 h-3 mr-1" />}
                      {approval.status === 'pending' && <Clock className="w-3 h-3 mr-1" />}
                      {approval.status.charAt(0).toUpperCase() + approval.status.slice(1)}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Not requested</span>
                  )}
                  {approval && approval.approved_by && (
                    <p className="text-xs text-gray-400 mt-1">by {approval.approved_by}</p>
                  )}
                </div>
              );
            })}
          </div>

          {/* Request / Approve / Reject buttons */}
          <div className="flex gap-2 mt-3 pt-3 border-t border-gray-100">
            {!approvals?.find(a => a.approval_type === 'investigation') && dev.root_cause && (
              <button onClick={() => { setApprovalAction({ type: 'request', approvalType: 'investigation' }); setShowApprovalModal(true); }}
                className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700">Request Investigation Approval</button>
            )}
            {!approvals?.find(a => a.approval_type === 'disposition') && dev.product_disposition && (
              <button onClick={() => { setApprovalAction({ type: 'request', approvalType: 'disposition' }); setShowApprovalModal(true); }}
                className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-xs hover:bg-purple-700">Request Disposition Approval</button>
            )}
            {!approvals?.find(a => a.approval_type === 'closure') && dev.status !== 'closed' && approvals?.find(a => a.approval_type === 'disposition' && a.status === 'approved') && (
              <button onClick={() => { setApprovalAction({ type: 'request', approvalType: 'closure' }); setShowApprovalModal(true); }}
                className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700">Request Closure Approval</button>
            )}
            {approvals?.filter(a => a.status === 'pending').map(a => (
              <div key={a.id} className="flex gap-1">
                <button onClick={() => { setApprovalAction({ type: 'approve', approvalId: a.id, approvalType: a.approval_type }); setApprovalForm({ signature_meaning: '', password: '' }); setShowApprovalModal(true); }}
                  className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 flex items-center gap-1"><Unlock className="w-3 h-3" /> Approve {a.approval_type}</button>
                <button onClick={() => { setApprovalAction({ type: 'reject', approvalId: a.id, approvalType: a.approval_type }); setApprovalForm({ rejection_reason: '', password: '' }); setShowApprovalModal(true); }}
                  className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs hover:bg-red-700 flex items-center gap-1"><X className="w-3 h-3" /> Reject</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 mb-6 bg-gray-100 rounded-lg p-1">
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
            <button onClick={openCapaModal} className="flex items-center gap-2 px-3 py-2 bg-navy-800 text-white rounded-lg text-sm hover:bg-navy-700">
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
                      <Link to={`/capas/${capa.id}`} className="text-xs text-navy-600 hover:underline">View CAPA</Link>
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

      {/* ── Feature 1: Audit Trail Tab ── */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <History className="w-5 h-5 text-gray-500" /> Change History
          </h2>
          {(!auditTrail || auditTrail.length === 0) ? (
            <p className="text-sm text-gray-400">No audit entries recorded yet</p>
          ) : (
            <div className="relative">
              <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
              <div className="space-y-6">
                {auditTrail.map((entry) => {
                  const initials = (entry.username || '??').slice(0, 2).toUpperCase();
                  let oldVals = {};
                  let newVals = {};
                  try { oldVals = typeof entry.old_values === 'string' ? JSON.parse(entry.old_values) : (entry.old_values || {}); } catch(e) {}
                  try { newVals = typeof entry.new_values === 'string' ? JSON.parse(entry.new_values) : (entry.new_values || {}); } catch(e) {}
                  const changedFields = Object.keys(newVals).filter(k => k !== 'undefined');

                  return (
                    <div key={entry.id} className="relative pl-10">
                      <div className="absolute left-2 w-5 h-5 rounded-full bg-navy-800 text-white text-[9px] font-bold flex items-center justify-center z-10">
                        {initials}
                      </div>
                      <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-900">
                            {entry.action.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                          </span>
                          <span className="text-xs text-gray-400">
                            {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ''}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mb-1">by {entry.username}</p>
                        {changedFields.length > 0 && (
                          <div className="mt-2 space-y-1">
                            {changedFields.map(field => (
                              <div key={field} className="text-xs">
                                <span className="font-medium text-gray-600">{field}:</span>
                                {oldVals[field] !== undefined && (
                                  <span className="text-red-500 line-through ml-1">{String(oldVals[field]).substring(0, 80)}</span>
                                )}
                                <span className="text-green-600 ml-1">{String(newVals[field]).substring(0, 80)}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Feature 2: Attachments Tab ── */}
      {activeTab === 'attachments' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
              <Paperclip className="w-5 h-5 text-gray-500" /> Attachments & Evidence
            </h2>

            {/* Upload dropzone */}
            <div
              className={`border-2 border-dashed rounded-lg p-6 text-center mb-4 transition-colors ${
                dragOver ? 'border-blue-400 bg-blue-50' : 'border-gray-300 hover:border-gray-400'
              }`}
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={async (e) => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (!file) return;
                setUploadingFile(true);
                try {
                  const fd = new FormData();
                  fd.append('file', file);
                  fd.append('description', fileDescription);
                  await apiPost(`/api/deviations/${id}/attachments`, fd);
                  setFileDescription('');
                  refetchAttachments();
                } catch (err) { alert('Upload error: ' + err.message); }
                finally { setUploadingFile(false); }
              }}
            >
              <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500 mb-2">Drag & drop a file here, or click to browse</p>
              <input
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png"
                className="hidden"
                id="dev-file-input"
                onChange={async (e) => {
                  const file = e.target.files[0];
                  if (!file) return;
                  setUploadingFile(true);
                  try {
                    const fd = new FormData();
                    fd.append('file', file);
                    fd.append('description', fileDescription);
                    await apiPost(`/api/deviations/${id}/attachments`, fd);
                    setFileDescription('');
                    refetchAttachments();
                    e.target.value = '';
                  } catch (err) { alert('Upload error: ' + err.message); }
                  finally { setUploadingFile(false); }
                }}
              />
              <label htmlFor="dev-file-input" className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm cursor-pointer hover:bg-navy-700">
                {uploadingFile ? 'Uploading...' : 'Choose File'}
              </label>
              <p className="text-xs text-gray-400 mt-2">PDF, DOC, DOCX, XLS, XLSX, JPG, PNG (max 10MB)</p>
            </div>

            {/* File list */}
            {(!attachments || attachments.length === 0) ? (
              <p className="text-sm text-gray-400">No files attached yet</p>
            ) : (
              <div className="space-y-2">
                {attachments.map(att => {
                  const isImage = /\.(jpg|jpeg|png|gif)$/i.test(att.original_name);
                  const sizeKB = att.file_size ? (att.file_size / 1024).toFixed(1) + ' KB' : '';
                  return (
                    <div key={att.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                      {isImage ? (
                        <img src={`/api/deviations/${id}/attachments/${att.id}/download`} alt={att.original_name} className="w-12 h-12 object-cover rounded border border-gray-200" />
                      ) : (
                        <div className="w-12 h-12 bg-gray-200 rounded flex items-center justify-center">
                          <FileText className="w-6 h-6 text-gray-500" />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{att.original_name}</p>
                        <p className="text-xs text-gray-500">{sizeKB} &middot; {att.uploaded_by} &middot; {att.created_at ? new Date(att.created_at).toLocaleDateString() : ''}</p>
                        {att.description && <p className="text-xs text-gray-400 mt-0.5">{att.description}</p>}
                      </div>
                      <div className="flex items-center gap-1">
                        <a href={`/api/deviations/${id}/attachments/${att.id}/download`} download className="p-1.5 text-gray-500 hover:text-blue-600 rounded hover:bg-blue-50">
                          <Download className="w-4 h-4" />
                        </a>
                        <button onClick={async () => {
                          if (!confirm('Delete this attachment?')) return;
                          try { await apiDelete(`/api/deviations/${id}/attachments/${att.id}`); refetchAttachments(); }
                          catch (err) { alert('Error: ' + err.message); }
                        }} className="p-1.5 text-gray-500 hover:text-red-600 rounded hover:bg-red-50">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Feature 3: Comments Tab ── */}
      {activeTab === 'comments' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-gray-500" /> Comments & Activity
          </h2>

          {/* Comment list (oldest first, chat-style) */}
          <div className="space-y-3 mb-4 max-h-96 overflow-y-auto">
            {(!comments || comments.length === 0) ? (
              <p className="text-sm text-gray-400 text-center py-4">No comments yet. Start the conversation.</p>
            ) : (
              comments.map(c => {
                const isSystem = c.comment_type === 'system' || c.comment_type === 'status_change';
                const initials = (c.author || '??').slice(0, 2).toUpperCase();
                return (
                  <div key={c.id} className={`flex gap-3 ${isSystem ? 'justify-center' : ''}`}>
                    {isSystem ? (
                      <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-full">
                        <AlertCircle className="w-3 h-3 text-gray-400" />
                        <span className="text-xs text-gray-500 italic">{c.content}</span>
                        <span className="text-xs text-gray-400">{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</span>
                      </div>
                    ) : (
                      <>
                        <div className="w-8 h-8 rounded-full bg-navy-800 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                          {initials}
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-lg p-3 border border-gray-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-900">{c.author}</span>
                            <span className="text-xs text-gray-400">{c.created_at ? new Date(c.created_at).toLocaleString() : ''}</span>
                          </div>
                          <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.content}</p>
                        </div>
                      </>
                    )}
                  </div>
                );
              })
            )}
          </div>

          {/* New comment input */}
          <div className="border-t border-gray-200 pt-4">
            <textarea
              rows={3}
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2 mb-2"
            />
            <div className="flex justify-end">
              <button
                disabled={!newComment.trim() || postingComment}
                onClick={async () => {
                  setPostingComment(true);
                  try {
                    await apiPost(`/api/deviations/${id}/comments`, { content: newComment.trim() });
                    setNewComment('');
                    refetchComments();
                  } catch (err) { alert('Error: ' + err.message); }
                  finally { setPostingComment(false); }
                }}
                className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm hover:bg-navy-700 disabled:opacity-50"
              >
                {postingComment ? 'Posting...' : 'Post Comment'}
              </button>
            </div>
          </div>
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
      <Modal isOpen={showCapaModal} onClose={() => setShowCapaModal(false)} title="Create CAPA from Deviation" size="lg">
        <form onSubmit={handleCreateCapa} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
            <input type="text" value={capaForm.title || ''} onChange={e => setCapaForm({ ...capaForm, title: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Context / Description</label>
            <textarea rows={3} value={capaForm.description || ''} onChange={e => setCapaForm({ ...capaForm, description: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2 bg-gray-50" />
          </div>
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

      {/* ── Feature 4: Approval Modal ── */}
      <Modal isOpen={showApprovalModal} onClose={() => { setShowApprovalModal(false); setApprovalAction(null); }} title={
        approvalAction?.type === 'request' ? `Request ${approvalAction.approvalType} Approval`
        : approvalAction?.type === 'approve' ? `Approve ${approvalAction?.approvalType}`
        : `Reject ${approvalAction?.approvalType}`
      }>
        <form onSubmit={async (e) => {
          e.preventDefault();
          try {
            if (approvalAction.type === 'request') {
              await apiPost(`/api/deviations/${id}/approvals`, { approval_type: approvalAction.approvalType });
            } else {
              const body = {
                status: approvalAction.type === 'approve' ? 'approved' : 'rejected',
                password: approvalForm.password,
                signature_meaning: approvalForm.signature_meaning,
              };
              if (approvalAction.type === 'reject') body.rejection_reason = approvalForm.rejection_reason;
              await apiPut(`/api/deviations/${id}/approvals/${approvalAction.approvalId}`, body);
            }
            setShowApprovalModal(false);
            setApprovalAction(null);
            setApprovalForm({});
            refetchApprovals();
            refetch();
          } catch (err) { alert('Error: ' + err.message); }
        }} className="space-y-4">
          {approvalAction?.type === 'request' && (
            <p className="text-sm text-gray-600">
              This will request approval for the <strong>{approvalAction.approvalType}</strong> stage of this deviation.
            </p>
          )}
          {(approvalAction?.type === 'approve' || approvalAction?.type === 'reject') && (
            <>
              {approvalAction?.type === 'approve' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Signature Meaning *</label>
                  <input type="text" required value={approvalForm.signature_meaning || ''} onChange={e => setApprovalForm({ ...approvalForm, signature_meaning: e.target.value })}
                    placeholder="e.g., I approve this investigation is complete and accurate"
                    className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
              )}
              {approvalAction?.type === 'reject' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason *</label>
                  <textarea rows={3} required value={approvalForm.rejection_reason || ''} onChange={e => setApprovalForm({ ...approvalForm, rejection_reason: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Password (e-signature) *</label>
                <input type="password" required value={approvalForm.password || ''} onChange={e => setApprovalForm({ ...approvalForm, password: e.target.value })}
                  placeholder="Re-enter your password to sign"
                  className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                <p className="text-xs text-gray-400 mt-1">Your password serves as your electronic signature per 21 CFR Part 11</p>
              </div>
            </>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => { setShowApprovalModal(false); setApprovalAction(null); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" className={`px-4 py-2 text-white rounded-lg text-sm ${
              approvalAction?.type === 'reject' ? 'bg-red-600 hover:bg-red-700' : 'bg-navy-800 hover:bg-navy-700'
            }`}>
              {approvalAction?.type === 'request' ? 'Submit Request' : approvalAction?.type === 'approve' ? 'Sign & Approve' : 'Reject'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
