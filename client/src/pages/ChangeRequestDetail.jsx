import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Save, X, Plus, Clock, CheckCircle, AlertTriangle,
  Shield, FileText, Users
} from 'lucide-react';
import { useFetch, apiPut, apiPost } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { CCStatusBadge, ClassificationBadge, CC_STATUS_OPTIONS, CC_STATUS_LABELS, CATEGORY_LABELS } from './ChangeRequests';

const CAPA_STATUS_STYLES = {
  open: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  closed: 'bg-slate-100 text-slate-600',
};

export default function ChangeRequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: cr, loading, error, refetch } = useFetch(`/api/change-requests/${id}`);

  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Action modals
  const [showClassifyModal, setShowClassifyModal] = useState(false);
  const [classifyForm, setClassifyForm] = useState({});
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [showEffectivenessModal, setShowEffectivenessModal] = useState(false);
  const [effectivenessForm, setEffectivenessForm] = useState({});
  const [showCapaModal, setShowCapaModal] = useState(false);
  const [capaForm, setCapaForm] = useState({});

  if (loading) return <LoadingSpinner message="Loading Change Request..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;
  if (!cr) return <div className="text-center py-16 text-gray-500">Change request not found</div>;

  const startEdit = () => { setFormData({ ...cr }); setEditing(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut(`/api/change-requests/${id}`, formData);
      setEditing(false);
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleClassify = async (e) => {
    e.preventDefault();
    try {
      await apiPost(`/api/change-requests/${id}/classify`, classifyForm);
      setShowClassifyModal(false);
      setClassifyForm({});
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleApprove = async () => {
    if (!confirm('Approve this change request?')) return;
    try {
      await apiPost(`/api/change-requests/${id}/approve`, {});
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleReject = async (e) => {
    e.preventDefault();
    try {
      await apiPost(`/api/change-requests/${id}/reject`, { rejection_reason: rejectReason });
      setShowRejectModal(false);
      setRejectReason('');
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleEffectiveness = async (e) => {
    e.preventDefault();
    try {
      await apiPost(`/api/change-requests/${id}/effectiveness`, effectivenessForm);
      setShowEffectivenessModal(false);
      setEffectivenessForm({});
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleCreateCapa = async (e) => {
    e.preventDefault();
    try {
      await apiPost('/api/capas', { ...capaForm, source_type: 'change_request', source_id: cr.id });
      setShowCapaModal(false);
      setCapaForm({});
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const capas = cr.capas || [];
  const foodSafetyImpact = typeof cr.food_safety_impact === 'string' ? JSON.parse(cr.food_safety_impact || '{}') : (cr.food_safety_impact || {});
  const affectedDocs = typeof cr.affected_documents === 'string' ? JSON.parse(cr.affected_documents || '[]') : (cr.affected_documents || []);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'classification', label: 'Classification & Impact' },
    { id: 'capas', label: `CAPAs (${capas.length})` },
    { id: 'timeline', label: 'Timeline' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate('/change-requests')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Change Requests
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{cr.request_id}</h1>
              <CCStatusBadge status={cr.status} />
              <ClassificationBadge classification={cr.classification} />
              {cr.is_emergency === 1 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                  <AlertTriangle className="w-3 h-3" /> Emergency
                </span>
              )}
            </div>
            <p className="text-gray-700 font-medium">{cr.title}</p>
            <p className="text-sm text-gray-500 mt-1">Initiated by {cr.initiator} — {CATEGORY_LABELS[cr.category] || cr.category}</p>
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
            {cr.status === 'draft' && (
              <button onClick={() => setShowClassifyModal(true)} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700">
                Classify
              </button>
            )}
            {cr.status === 'pending_review' && (
              <>
                <button onClick={handleApprove} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                  Approve
                </button>
                <button onClick={() => setShowRejectModal(true)} className="px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                  Reject
                </button>
              </>
            )}
            {['approved', 'implementing', 'monitoring', 'effectiveness_check'].includes(cr.status) && (
              <button onClick={() => setShowEffectivenessModal(true)} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                Record Effectiveness
              </button>
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
          {/* Lifecycle Progress Bar */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-4">Change Control Lifecycle</h3>
            <div className="flex items-center gap-1 mb-4">
              {[
                { key: 'draft', label: '1. Draft' },
                { key: 'pending_review', label: '2. Review' },
                { key: 'approved', label: '3. Approved' },
                { key: 'implementing', label: '4. Implementing' },
                { key: 'monitoring', label: '5. Monitoring' },
                { key: 'closed', label: '6. Closed' },
                
              ].map((step, i, arr) => {
                const statusOrder = ['draft','pending_review','approved','rejected','implementing','monitoring','effectiveness_check','closed'];
                const currentIdx = statusOrder.indexOf(cr.status);
                const stepIdx = statusOrder.indexOf(step.key);
                const isComplete = stepIdx <= currentIdx;
                const isCurrent = stepIdx === currentIdx;
                return (
                  <React.Fragment key={step.key}>
                    {i > 0 && <div className={`flex-1 h-1 rounded ${isComplete ? 'bg-purple-500' : 'bg-gray-200'}`} />}
                    <div className="flex flex-col items-center gap-1">
                      <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold border-2 transition-colors ${
                        isCurrent ? 'bg-purple-600 text-white border-purple-600 ring-4 ring-purple-100' :
                        isComplete ? 'bg-purple-500 text-white border-purple-500' :
                        'bg-white text-gray-400 border-gray-200'
                      }`}>
                        {isComplete && !isCurrent ? <CheckCircle className="w-3.5 h-3.5" /> : i + 1}
                      </div>
                      <span className={`text-[10px] font-medium whitespace-nowrap ${isCurrent ? 'text-purple-700' : isComplete ? 'text-gray-700' : 'text-gray-400'}`}>
                        {step.label}
                      </span>
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
            <div className="p-4 bg-purple-50 border border-purple-100 rounded-lg flex items-start justify-between">
              <div>
                <p className="text-sm font-semibold text-purple-800">
                  Current: {CC_STATUS_LABELS[cr.status] || cr.status}
                </p>
                <p className="text-sm text-purple-700 mt-1">
                  {cr.status === 'draft' && 'Fill in the change description, justification, and impact analysis. Submit for review when ready.'}
                  {cr.status === 'pending_review' && 'Change request submitted for review. QA will classify and assess risk/impact.'}
                  
                  {cr.status === 'approved' && 'Change approved. Ready to implement. Update SOPs, train staff, execute the change.'}
                  {cr.status === 'implementing' && 'Change is being implemented. Ensure all affected processes, documents, and training are updated.'}
                  {cr.status === 'monitoring' && 'Change implemented. Monitoring effectiveness. Verify the change achieved its intended outcome.'}
                  {cr.status === 'effectiveness_check' && 'Effectiveness review due. Document whether the change was successful.'}
                  {cr.status === 'closed' && 'Change control complete. All documentation finalized.'}
                </p>
              </div>
              {['draft','pending_review','approved','implementing','monitoring'].includes(cr.status) && (
                <button
                  onClick={async () => {
                    const next = {draft:'pending_review',pending_review:'approved',approved:'implementing',implementing:'monitoring',monitoring:'closed'};
                    if (next[cr.status]) {
                      try { await apiPut('/api/change-requests/' + cr.id, { status: next[cr.status] }); refetch(); }
                      catch(e) { alert(e.message); }
                    }
                  }}
                  className="ml-4 px-4 py-2 bg-purple-600 text-white text-sm font-medium rounded-lg hover:bg-purple-700 whitespace-nowrap flex items-center gap-2"
                >
                  Advance →
                </button>
              )}
            </div>
          </div>

          {/* Summary Card */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-bold text-gray-900 mb-2">{cr.title}</h2>
            <div className="flex flex-wrap items-center gap-3 text-sm mb-4">
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-purple-100 text-purple-700 border-purple-200">
                {CATEGORY_LABELS[cr.category] || cr.category}
              </span>
              {cr.is_emergency === 1 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-red-100 text-red-700 border-red-200">
                  ⚡ Emergency
                </span>
              )}
              {cr.training_required === 1 && (
                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border bg-amber-100 text-amber-700 border-amber-200">
                  📚 Training Required
                </span>
              )}
              {cr.risk_assessment && (
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${
                  cr.risk_assessment === 'high' ? 'bg-red-100 text-red-700 border-red-200' :
                  cr.risk_assessment === 'medium' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                  'bg-green-100 text-green-700 border-green-200'
                }`}>
                  Risk: {cr.risk_assessment}
                </span>
              )}
            </div>

            {/* Description */}
            <div className="bg-gray-50 rounded-lg p-4 border border-gray-100 mb-4">
              <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-wide mb-2">Description</h3>
              <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{cr.description}</p>
            </div>

            {cr.justification && (
              <div className="bg-blue-50 rounded-lg p-4 border border-blue-100 mb-4">
                <h3 className="text-xs font-semibold text-blue-700 uppercase tracking-wide mb-2">Justification — Why This Change</h3>
                <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{cr.justification}</p>
              </div>
            )}

            {cr.impact_analysis && (
              <div className="bg-amber-50 rounded-lg p-4 border border-amber-100 mb-4">
                <h3 className="text-xs font-semibold text-amber-700 uppercase tracking-wide mb-2">Impact Analysis</h3>
                <p className="text-sm text-gray-800 whitespace-pre-line leading-relaxed">{cr.impact_analysis}</p>
              </div>
            )}

            {/* Key Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-4 border-t border-gray-200">
              <div><p className="text-xs font-medium text-gray-500 uppercase">Initiator</p><p className="text-sm font-semibold text-gray-900 mt-0.5">{cr.initiator || '—'}</p></div>
              <div><p className="text-xs font-medium text-gray-500 uppercase">Proposed Date</p><p className="text-sm font-semibold text-gray-900 mt-0.5">{cr.proposed_effective_date || '—'}</p></div>
              <div><p className="text-xs font-medium text-gray-500 uppercase">Approved By</p><p className="text-sm font-semibold text-gray-900 mt-0.5">{cr.approved_by || '—'}</p></div>
              <div><p className="text-xs font-medium text-gray-500 uppercase">Actual Effective Date</p><p className="text-sm font-semibold text-gray-900 mt-0.5">{cr.actual_effective_date || '—'}</p></div>
            </div>
          </div>

          {/* Edit Section */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Edit Change Request</h2>
            {editing ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input type="text" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={formData.status || ''} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                    {CC_STATUS_OPTIONS.map(s => <option key={s} value={s}>{CC_STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select value={formData.category || ''} onChange={e => setFormData({ ...formData, category: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                    {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Proposed Effective Date</label>
                  <input type="date" value={formData.proposed_effective_date || ''} onChange={e => setFormData({ ...formData, proposed_effective_date: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea rows={3} value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Justification — Why is this change needed?</label>
                  <textarea rows={2} value={formData.justification || ''} onChange={e => setFormData({ ...formData, justification: e.target.value })} placeholder="Business reason, quality improvement, regulatory requirement, complaint response..." className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Risk Assessment</label>
                  <select value={formData.risk_assessment || ''} onChange={e => setFormData({ ...formData, risk_assessment: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                    <option value="">Select...</option>
                    <option value="low">Low — No food safety impact, minimal process change</option>
                    <option value="medium">Medium — May affect product quality, requires monitoring</option>
                    <option value="high">High — Food safety impact, requires validation before implementation</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Initiator</label>
                  <input type="text" value={formData.initiator || ''} onChange={e => setFormData({ ...formData, initiator: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Impact Analysis — What does this change affect?</label>
                  <textarea rows={2} value={formData.impact_analysis || ''} onChange={e => setFormData({ ...formData, impact_analysis: e.target.value })} placeholder="Affected SOPs, processes, equipment, suppliers, products, labels, training needs..." className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div className="col-span-2 flex items-center gap-6">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={formData.is_emergency === 1 || formData.is_emergency === true} onChange={e => setFormData({ ...formData, is_emergency: e.target.checked ? 1 : 0 })} className="rounded border-gray-300" />
                    Emergency Change
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={formData.training_required === 1 || formData.training_required === true} onChange={e => setFormData({ ...formData, training_required: e.target.checked ? 1 : 0 })} className="rounded border-gray-300" />
                    Training Required
                  </label>
                </div>
              </div>
            ) : (
              <p className="text-sm text-gray-500">Click <strong>Edit</strong> in the header to modify this change request.</p>
            )}
          </div>

          {cr.rejection_reason && (
            <div className="bg-red-50 rounded-xl border border-red-200 p-6">
              <h2 className="text-lg font-semibold text-red-800 mb-2">Rejection Reason</h2>
              <p className="text-sm text-red-700">{cr.rejection_reason}</p>
            </div>
          )}

          {cr.effectiveness_result && (
            <div className={`rounded-xl border p-6 ${cr.effectiveness_result === 'effective' ? 'bg-green-50 border-green-200' : 'bg-amber-50 border-amber-200'}`}>
              <h2 className={`text-lg font-semibold mb-2 ${cr.effectiveness_result === 'effective' ? 'text-green-800' : 'text-amber-800'}`}>
                Effectiveness Check: {cr.effectiveness_result === 'effective' ? 'Effective' : 'Not Effective'}
              </h2>
              <p className="text-sm text-gray-700">{cr.effectiveness_notes || 'No notes'}</p>
              <p className="text-xs text-gray-500 mt-2">Checked: {cr.effectiveness_check_date?.slice(0, 10) || '—'}</p>
            </div>
          )}

          {affectedDocs.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Affected Documents</h2>
              <ul className="space-y-2">
                {affectedDocs.map((doc, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                    <FileText className="w-4 h-4 text-gray-400" /> {doc}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {activeTab === 'classification' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Classification</h2>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Classification</p>
                <ClassificationBadge classification={cr.classification} />
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Emergency</p>
                <p className="text-sm text-gray-900">{cr.is_emergency ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Food Safety Impact Assessment</h2>
            {Object.keys(foodSafetyImpact).length === 0 ? (
              <p className="text-sm text-gray-400">No food safety impact assessment recorded</p>
            ) : (
              <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                {Object.entries(foodSafetyImpact).map(([key, value]) => (
                  <div key={key}>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{key.replace(/_/g, ' ')}</p>
                    <p className="text-sm text-gray-900">{typeof value === 'boolean' ? (value ? 'Yes' : 'No') : String(value)}</p>
                  </div>
                ))}
              </div>
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
              <p className="text-gray-500">No CAPAs linked to this change request</p>
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

      {activeTab === 'timeline' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">Change Request Lifecycle</h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-6">
              <div className="flex gap-4 ml-1">
                <div className="w-7 h-7 rounded-full bg-navy-600 flex items-center justify-center z-10 flex-shrink-0">
                  <FileText className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">Created</p>
                  <p className="text-xs text-gray-500">{cr.created_at?.slice(0, 10)}</p>
                  <p className="text-xs text-gray-400 mt-1">{cr.title}</p>
                </div>
              </div>

              {cr.classification && (
                <div className="flex gap-4 ml-1">
                  <div className="w-7 h-7 rounded-full bg-amber-500 flex items-center justify-center z-10 flex-shrink-0">
                    <Shield className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Classified: {cr.classification}</p>
                  </div>
                </div>
              )}

              {cr.approved_at && (
                <div className="flex gap-4 ml-1">
                  <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center z-10 flex-shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Approved by {cr.approved_by}</p>
                    <p className="text-xs text-gray-500">{cr.approved_at?.slice(0, 10)}</p>
                  </div>
                </div>
              )}

              {cr.rejection_reason && (
                <div className="flex gap-4 ml-1">
                  <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center z-10 flex-shrink-0">
                    <X className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Rejected</p>
                    <p className="text-xs text-gray-400 mt-1">{cr.rejection_reason}</p>
                  </div>
                </div>
              )}

              {cr.effectiveness_check_date && (
                <div className="flex gap-4 ml-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 flex-shrink-0 ${cr.effectiveness_result === 'effective' ? 'bg-green-500' : 'bg-amber-500'}`}>
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Effectiveness: {cr.effectiveness_result}</p>
                    <p className="text-xs text-gray-500">{cr.effectiveness_check_date?.slice(0, 10)}</p>
                  </div>
                </div>
              )}

              {capas.map(capa => (
                <div key={capa.id} className="flex gap-4 ml-1">
                  <div className="w-7 h-7 rounded-full bg-purple-500 flex items-center justify-center z-10 flex-shrink-0">
                    <Shield className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">CAPA: {capa.capa_id}</p>
                    <p className="text-xs text-gray-500">{capa.responsible_person} — Target: {capa.target_date}</p>
                  </div>
                </div>
              ))}

              {cr.closed_at && (
                <div className="flex gap-4 ml-1">
                  <div className="w-7 h-7 rounded-full bg-slate-500 flex items-center justify-center z-10 flex-shrink-0">
                    <CheckCircle className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Closed</p>
                    <p className="text-xs text-gray-500">{cr.closed_at?.slice(0, 10)}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Classify Modal */}
      <Modal isOpen={showClassifyModal} onClose={() => setShowClassifyModal(false)} title="Classify Change Request">
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
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Food Safety Impact Notes</label>
            <textarea rows={3} value={classifyForm.food_safety_impact?.notes || ''} onChange={e => setClassifyForm({ ...classifyForm, food_safety_impact: { ...(classifyForm.food_safety_impact || {}), notes: e.target.value } })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" placeholder="Describe impact on food safety..." />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowClassifyModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm">Classify</button>
          </div>
        </form>
      </Modal>

      {/* Reject Modal */}
      <Modal isOpen={showRejectModal} onClose={() => setShowRejectModal(false)} title="Reject Change Request">
        <form onSubmit={handleReject} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Rejection Reason *</label>
            <textarea rows={3} required value={rejectReason} onChange={e => setRejectReason(e.target.value)} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowRejectModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm">Reject</button>
          </div>
        </form>
      </Modal>

      {/* Effectiveness Modal */}
      <Modal isOpen={showEffectivenessModal} onClose={() => setShowEffectivenessModal(false)} title="Record Effectiveness Check">
        <form onSubmit={handleEffectiveness} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Result *</label>
            <select required value={effectivenessForm.effectiveness_result || ''} onChange={e => setEffectivenessForm({ ...effectivenessForm, effectiveness_result: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
              <option value="">Select...</option>
              <option value="effective">Effective</option>
              <option value="not_effective">Not Effective</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={3} value={effectivenessForm.effectiveness_notes || ''} onChange={e => setEffectivenessForm({ ...effectivenessForm, effectiveness_notes: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowEffectivenessModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm">Record</button>
          </div>
        </form>
      </Modal>

      {/* CAPA Modal */}
      <Modal isOpen={showCapaModal} onClose={() => setShowCapaModal(false)} title="Create CAPA">
        <form onSubmit={handleCreateCapa} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Corrective Action *</label>
            <textarea rows={2} required value={capaForm.corrective_action || ''} onChange={e => setCapaForm({ ...capaForm, corrective_action: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Preventive Action *</label>
            <textarea rows={2} required value={capaForm.preventive_action || ''} onChange={e => setCapaForm({ ...capaForm, preventive_action: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
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
