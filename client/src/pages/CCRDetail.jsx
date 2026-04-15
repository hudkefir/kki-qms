import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Save, X, Plus, Clock, CheckCircle, AlertTriangle,
  ExternalLink, Target, Users, FileText, Trash2
} from 'lucide-react';
import LinkedDocuments from '../components/LinkedDocuments';
import { useFetch, apiPut, apiPost, apiDelete } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { SeverityBadge, ComplaintStatusBadge } from './Complaints';
import { CCRStatusBadge, CCR_STATUS_OPTIONS, CCR_STATUS_LABELS } from './CCRs';

const ACTION_STATUS_STYLES = {
  pending: 'bg-gray-100 text-gray-700',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
};

export default function CCRDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { data: ccr, loading, error, refetch } = useFetch(`/api/ccrs/${id}`);
  const { data: allComplaints } = useFetch('/api/complaints');
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const handleAdminDelete = async () => {
    if (!confirm(`Delete CCR ${ccr.ccr_number}? This will remove all linked corrective actions. This cannot be undone.`)) return;
    try {
      await apiDelete(`/api/admin/ccrs/${id}`);
      navigate('/ccrs');
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const [showActionModal, setShowActionModal] = useState(false);
  const [actionForm, setActionForm] = useState({});
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkIds, setLinkIds] = useState([]);
  const [activeTab, setActiveTab] = useState('overview');

  if (loading) return <LoadingSpinner message="Loading CCR..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;
  if (!ccr) return <div className="text-center py-16 text-gray-500">CCR not found</div>;

  const startEdit = () => { setFormData({ ...ccr }); setEditing(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut(`/api/ccrs/${id}`, formData);
      setEditing(false);
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleAddAction = async (e) => {
    e.preventDefault();
    try {
      await apiPost(`/api/ccrs/${id}/actions`, actionForm);
      setShowActionModal(false);
      setActionForm({});
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleUpdateAction = async (actionId, updates) => {
    try {
      await apiPut(`/api/ccrs/${id}/actions/${actionId}`, updates);
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleLinkComplaints = async () => {
    try {
      await apiPost(`/api/ccrs/${id}/complaints`, { complaint_ids: linkIds });
      setShowLinkModal(false);
      setLinkIds([]);
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const linkedIds = (ccr.complaints || []).map(c => c.id);
  const unlinkableComplaints = (allComplaints || []).filter(c => !linkedIds.includes(c.id));

  const actions = ccr.actions || [];
  const completedActions = actions.filter(a => a.status === 'completed').length;
  const actionProgress = actions.length > 0 ? Math.round((completedActions / actions.length) * 100) : 0;

  // Check for overdue
  const now = new Date();
  const isOverdue = ccr.target_resolution_date && new Date(ccr.target_resolution_date) < now && ccr.status !== 'closed';

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'complaints', label: `Complaints (${(ccr.complaints || []).length})` },
    { id: 'actions', label: `Corrective Actions (${actions.length})` },
    { id: 'timeline', label: 'Timeline' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate('/ccrs')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to CCRs
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{ccr.ccr_number}</h1>
              <CCRStatusBadge status={ccr.status} />
              {isOverdue && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                  <AlertTriangle className="w-3 h-3" /> Overdue
                </span>
              )}
            </div>
            <p className="text-gray-700 font-medium">{ccr.title}</p>
            <p className="text-sm text-gray-500 mt-1">{ccr.recipient_company} — {ccr.recipient_contact}</p>
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
            {hasRole('admin') && !editing && (
              <button onClick={handleAdminDelete} className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>
        </div>

        {/* Progress bar */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Corrective Action Progress</span>
            <span className="text-sm text-gray-500">{completedActions}/{actions.length} completed</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3">
            <div
              className={`h-3 rounded-full transition-all ${actionProgress >= 100 ? 'bg-green-500' : actionProgress >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`}
              style={{ width: `${actionProgress}%` }}
            />
          </div>
        </div>
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
          {/* Info Grid */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">CCR Details</h2>
            {editing ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input type="text" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={formData.status || ''} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                    {CCR_STATUS_OPTIONS.map(s => <option key={s} value={s}>{CCR_STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Company</label>
                  <input type="text" value={formData.recipient_company || ''} onChange={e => setFormData({ ...formData, recipient_company: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Recipient Contact</label>
                  <input type="text" value={formData.recipient_contact || ''} onChange={e => setFormData({ ...formData, recipient_contact: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Resolution</label>
                  <input type="date" value={formData.target_resolution_date || ''} onChange={e => setFormData({ ...formData, target_resolution_date: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Actual Resolution</label>
                  <input type="date" value={formData.actual_resolution_date || ''} onChange={e => setFormData({ ...formData, actual_resolution_date: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea rows={3} value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                {[
                  { label: 'CCR Number', value: ccr.ccr_number },
                  { label: 'Date Created', value: ccr.date_created },
                  { label: 'Recipient', value: `${ccr.recipient_company} — ${ccr.recipient_contact}` },
                  { label: 'Recipient Email', value: ccr.recipient_email || '—' },
                  { label: 'Target Resolution', value: ccr.target_resolution_date || '—' },
                  { label: 'Actual Resolution', value: ccr.actual_resolution_date || '—' },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{item.label}</p>
                    <p className="text-sm text-gray-900">{item.value}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Root Causes & Workstreams */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Root Causes & Risk Assessment</h2>
            {(() => {
              const rc = ccr.root_causes;
              const causes = Array.isArray(rc) ? rc : (rc?.causes || []);
              if (causes.length === 0) return <p className="text-sm text-gray-400">No root causes documented</p>;
              return (
                <div className="space-y-3">
                  {causes.map((cause, i) => (
                    <div key={i} className="p-4 bg-red-50 border border-red-100 rounded-lg">
                      <div className="flex items-start gap-3">
                        <Target className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-gray-900">{cause.title || cause}</p>
                          {cause.description && <p className="text-sm text-gray-600 mt-1">{cause.description}</p>}
                          {cause.action && (
                            <p className="text-sm text-blue-700 mt-2 font-medium">✅ Corrective Action: {cause.action}</p>
                          )}
                          {cause.risk_pre && cause.risk_post && (
                            <div className="flex gap-4 mt-2">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cause.risk_pre.level === 'CRITICAL' ? 'bg-red-200 text-red-800' : 'bg-amber-200 text-amber-800'}`}>
                                Pre-CAPA: {cause.risk_pre.score} ({cause.risk_pre.level})
                              </span>
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${cause.risk_post.level === 'LOW' ? 'bg-green-200 text-green-800' : 'bg-amber-200 text-amber-800'}`}>
                                Post-CAPA: {cause.risk_post.score} ({cause.risk_post.level})
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}

            {/* Workstreams */}
            {ccr.root_causes?.workstreams && ccr.root_causes.workstreams.length > 0 && (
              <div className="mt-6">
                <h3 className="text-md font-semibold text-gray-900 mb-3">Corrective Workstreams</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {ccr.root_causes.workstreams.map((ws, i) => (
                    <div key={i} className="p-4 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-sm font-bold text-blue-900">{ws.partner}</p>
                      <p className="text-xs text-gray-600 mt-1">Lead: {ws.lead}</p>
                      <p className="text-xs text-gray-700 mt-2">{ws.status}</p>
                      <p className="text-xs font-medium text-blue-700 mt-1">Target: {ws.completion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CAPA Info */}
            {ccr.root_causes?.capa && (
              <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded-lg flex items-center gap-3">
                <FileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm text-gray-700">
                  <strong>{ccr.root_causes.capa}</strong> — Classification: <span className={`font-bold ${ccr.root_causes.capa_class === 'CRITICAL' ? 'text-red-600' : 'text-amber-600'}`}>{ccr.root_causes.capa_class}</span>
                </span>
              </div>
            )}
          </div>

          {/* Containment & Preventive Measures */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Interim Containment Actions</h2>
            {(() => {
              const pm = ccr.preventive_measures;
              const containment = Array.isArray(pm) ? pm : (pm?.containment || []);
              if (containment.length === 0) return <p className="text-sm text-gray-400">No containment actions documented</p>;
              return (
                <ul className="space-y-2">
                  {containment.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg">
                      <AlertTriangle className="w-4 h-4 text-amber-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              );
            })()}

            {/* Preventive Measures */}
            {ccr.preventive_measures?.preventive && ccr.preventive_measures.preventive.length > 0 && (
              <div className="mt-6">
                <h3 className="text-md font-semibold text-gray-900 mb-3">Preventive Measures</h3>
                <ul className="space-y-2">
                  {ccr.preventive_measures.preventive.map((measure, i) => (
                    <li key={i} className="flex items-start gap-3 p-3 bg-green-50 border border-green-100 rounded-lg">
                      <CheckCircle className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                      <span className="text-sm text-gray-700">{measure}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Verification Plan */}
            {ccr.preventive_measures?.verification && ccr.preventive_measures.verification.length > 0 && (
              <div className="mt-6">
                <h3 className="text-md font-semibold text-gray-900 mb-3">Effectiveness Verification Plan</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-gray-50 text-left">
                        <th className="p-2 font-medium text-gray-600">Action</th>
                        <th className="p-2 font-medium text-gray-600">Success Criteria</th>
                        <th className="p-2 font-medium text-gray-600">Target Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ccr.preventive_measures.verification.map((v, i) => (
                        <tr key={i} className="border-t border-gray-100">
                          <td className="p-2 font-medium text-gray-900">{v.action}</td>
                          <td className="p-2 text-gray-700">{v.criteria}</td>
                          <td className="p-2 text-blue-700 font-medium">{v.target}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* CAPA Closure Criteria */}
            {ccr.preventive_measures?.closure && ccr.preventive_measures.closure.length > 0 && (
              <div className="mt-6">
                <h3 className="text-md font-semibold text-gray-900 mb-3">CAPA Closure Criteria</h3>
                <ul className="space-y-2">
                  {ccr.preventive_measures.closure.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 p-2">
                      <span className="w-5 h-5 flex items-center justify-center bg-gray-200 text-gray-600 rounded-full text-xs font-bold flex-shrink-0">{i+1}</span>
                      <span className="text-sm text-gray-700">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          {/* Notes */}
          {ccr.notes && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Notes</h2>
              <p className="text-sm text-gray-700 leading-relaxed">{ccr.notes}</p>
            </div>
          )}
        </div>
      )}

      {activeTab === 'complaints' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Linked Complaints</h2>
            <button onClick={() => setShowLinkModal(true)} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
              <Plus className="w-4 h-4" /> Link Complaints
            </button>
          </div>

          {(ccr.complaints || []).length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No complaints linked to this CCR</p>
            </div>
          ) : (
            <div className="space-y-3">
              {ccr.complaints.map(c => (
                <Link
                  key={c.id}
                  to={`/complaints/${c.id}`}
                  className="block bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow group"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-navy-700">{c.complaint_number}</span>
                      <SeverityBadge severity={c.severity} />
                      <ComplaintStatusBadge status={c.status} />
                    </div>
                    <ExternalLink className="w-4 h-4 text-gray-300 group-hover:text-gray-500" />
                  </div>
                  <div className="mt-2 flex items-center gap-4 text-sm text-gray-600">
                    <span>{c.product_sku} {c.product_name}</span>
                    <span>{c.issue_type}</span>
                    {c.lot_number && <span className="font-mono text-xs">Lot: {c.lot_number}</span>}
                    <span>{c.date_received}</span>
                  </div>
                  {c.description && (
                    <p className="mt-2 text-sm text-gray-500 line-clamp-2">{c.description}</p>
                  )}
                </Link>
              ))}
            </div>
          )}

          {/* Link Modal */}
          <Modal isOpen={showLinkModal} onClose={() => setShowLinkModal(false)} title="Link Complaints">
            <div className="space-y-4">
              {unlinkableComplaints.length === 0 ? (
                <p className="text-sm text-gray-500">All complaints are already linked.</p>
              ) : (
                <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                  {unlinkableComplaints.map(c => (
                    <label key={c.id} className="flex items-center gap-3 px-3 py-2 hover:bg-gray-50 cursor-pointer">
                      <input type="checkbox" checked={linkIds.includes(c.id)} onChange={() => setLinkIds(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])} className="rounded border-gray-300" />
                      <span className="text-sm">{c.complaint_number} — {c.product_name} ({c.issue_type})</span>
                    </label>
                  ))}
                </div>
              )}
              <div className="flex justify-end gap-3">
                <button onClick={() => setShowLinkModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
                <button onClick={handleLinkComplaints} disabled={linkIds.length === 0} className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm disabled:opacity-50">
                  Link Selected
                </button>
              </div>
            </div>
          </Modal>
        </div>
      )}

      {activeTab === 'actions' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Corrective Actions</h2>
            <button onClick={() => setShowActionModal(true)} className="flex items-center gap-2 px-3 py-2 bg-navy-800 text-white rounded-lg text-sm hover:bg-navy-700">
              <Plus className="w-4 h-4" /> Add Action
            </button>
          </div>

          {actions.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No corrective actions yet</p>
            </div>
          ) : (
            <div className="space-y-4">
              {actions.map((action, i) => {
                const isActionOverdue = action.target_date && action.status !== 'completed' && new Date(action.target_date) < now;
                const effectiveStatus = isActionOverdue ? 'overdue' : action.status;
                return (
                  <div key={action.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="bg-navy-100 text-navy-700 text-xs font-bold px-2 py-1 rounded">#{i + 1}</span>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${ACTION_STATUS_STYLES[effectiveStatus]}`}>
                          {effectiveStatus === 'in_progress' ? 'In Progress' : effectiveStatus.charAt(0).toUpperCase() + effectiveStatus.slice(1)}
                        </span>
                      </div>
                      <select
                        value={action.status}
                        onChange={e => handleUpdateAction(action.id, { status: e.target.value, completion_date: e.target.value === 'completed' ? new Date().toISOString().slice(0, 10) : null })}
                        className="text-xs border border-gray-200 rounded px-2 py-1"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                    <p className="text-sm text-gray-900 font-medium mb-2">{action.description}</p>
                    <div className="flex items-center gap-4 text-xs text-gray-500">
                      {action.responsible && (
                        <span className="flex items-center gap-1">
                          <Users className="w-3 h-3" /> {action.responsible}
                        </span>
                      )}
                      {action.target_date && (
                        <span className={`flex items-center gap-1 ${isActionOverdue ? 'text-red-600 font-semibold' : ''}`}>
                          <Clock className="w-3 h-3" /> Target: {action.target_date}
                        </span>
                      )}
                      {action.completion_date && (
                        <span className="flex items-center gap-1 text-green-600">
                          <CheckCircle className="w-3 h-3" /> Completed: {action.completion_date}
                        </span>
                      )}
                    </div>
                    {action.notes && <p className="text-xs text-gray-400 mt-2">{action.notes}</p>}

                    {/* Individual progress bar */}
                    <div className="mt-3">
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${
                            effectiveStatus === 'completed' ? 'bg-green-500' : effectiveStatus === 'overdue' ? 'bg-red-500' : effectiveStatus === 'in_progress' ? 'bg-blue-500' : 'bg-gray-300'
                          }`}
                          style={{ width: effectiveStatus === 'completed' ? '100%' : effectiveStatus === 'in_progress' ? '50%' : effectiveStatus === 'overdue' ? '75%' : '10%' }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Add Action Modal */}
          <Modal isOpen={showActionModal} onClose={() => setShowActionModal(false)} title="Add Corrective Action">
            <form onSubmit={handleAddAction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                <textarea rows={3} required value={actionForm.description || ''} onChange={e => setActionForm({ ...actionForm, description: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Responsible</label>
                  <input type="text" value={actionForm.responsible || ''} onChange={e => setActionForm({ ...actionForm, responsible: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
                  <input type="date" value={actionForm.target_date || ''} onChange={e => setActionForm({ ...actionForm, target_date: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={2} value={actionForm.notes || ''} onChange={e => setActionForm({ ...actionForm, notes: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
              </div>
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setShowActionModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm">Add Action</button>
              </div>
            </form>
          </Modal>
        </div>
      )}

      {activeTab === 'timeline' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6">CCR Lifecycle Timeline</h2>
          <div className="relative">
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />
            <div className="space-y-6">
              {/* CCR Created */}
              <div className="flex gap-4 ml-1">
                <div className="w-7 h-7 rounded-full bg-navy-600 flex items-center justify-center z-10 flex-shrink-0">
                  <FileText className="w-3.5 h-3.5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">CCR Created</p>
                  <p className="text-xs text-gray-500">{ccr.date_created}</p>
                  <p className="text-xs text-gray-400 mt-1">{ccr.title}</p>
                </div>
              </div>

              {/* Complaints linked */}
              {(ccr.complaints || []).map(c => (
                <div key={c.id} className="flex gap-4 ml-1">
                  <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center z-10 flex-shrink-0">
                    <AlertTriangle className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Complaint Linked: {c.complaint_number}</p>
                    <p className="text-xs text-gray-500">{c.date_received}</p>
                    <p className="text-xs text-gray-400 mt-1">{c.product_name} — {c.issue_type}</p>
                  </div>
                </div>
              ))}

              {/* Actions */}
              {actions.map((a, i) => (
                <div key={a.id} className="flex gap-4 ml-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 flex-shrink-0 ${a.status === 'completed' ? 'bg-green-500' : 'bg-blue-500'}`}>
                    {a.status === 'completed' ? <CheckCircle className="w-3.5 h-3.5 text-white" /> : <Clock className="w-3.5 h-3.5 text-white" />}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Action #{i + 1}: {a.responsible}</p>
                    <p className="text-xs text-gray-500">Target: {a.target_date || 'TBD'}</p>
                    <p className="text-xs text-gray-400 mt-1 line-clamp-2">{a.description}</p>
                  </div>
                </div>
              ))}

              {/* Target resolution */}
              {ccr.target_resolution_date && (
                <div className="flex gap-4 ml-1">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center z-10 flex-shrink-0 ${isOverdue ? 'bg-red-500' : 'bg-gray-300'}`}>
                    <Target className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900">Target Resolution</p>
                    <p className={`text-xs ${isOverdue ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                      {ccr.target_resolution_date} {isOverdue && '(OVERDUE)'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Linked Documents */}
      <div className="mt-6">
        <LinkedDocuments linkedType="ccr" linkedId={id} category="ccr" />
      </div>
    </div>
  );
}
