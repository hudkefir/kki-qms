import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  Archive, ArrowLeft, Edit2, Save, X, AlertCircle, ExternalLink, Camera, Trash2,
  MessageSquare, Send, User, FlaskConical, Package, RefreshCw, CheckCircle, XCircle, Clock, Loader2,
  History, GitCommit, ArrowRight, Mail
} from 'lucide-react';
import LinkedDocuments from '../components/LinkedDocuments';
import RecordLinker from '../components/RecordLinker';
import { FieldHelp, RecordInfoTooltip, GMP_HELP } from '../components/GmpFieldHelp';
import { useFetch, apiPut, apiPost, apiDelete } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import { SeverityBadge, ComplaintStatusBadge, PRODUCT_OPTIONS, ISSUE_TYPES, SEVERITY_OPTIONS, STATUS_OPTIONS, STATUS_LABELS } from './Complaints';
import AiSuggestButton from '../components/AiSuggestButton';

export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole, user: currentUser } = useAuth();
  const { data: complaint, loading, error, refetch } = useFetch(`/api/complaints/${id}`);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [showStatusModal, setShowStatusModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [statusReason, setStatusReason] = useState('');
  const [statusChanging, setStatusChanging] = useState(false);

  // Status history
  const { data: statusHistory, refetch: refetchHistory } = useFetch(`/api/complaints/${id}/status-history`);

  // Batch test linkage
  const { data: batchTests, loading: batchLoading } = useFetch(
    complaint?.lot_number ? '/api/batch-tests/by-lot/' + encodeURIComponent(complaint.lot_number) : null
  );

  // SOS Inventory lookup
  const [sosData, setSosData] = useState(null);
  const [sosLoading, setSosLoading] = useState(false);
  const [sosError, setSosError] = useState(null);

  const fetchSOS = async (forceRefresh = false) => {
    if (!complaint?.lot_number) return;
    setSosLoading(true);
    setSosError(null);
    try {
      const res = await fetch('/api/sos/lot/' + encodeURIComponent(complaint.lot_number) + (forceRefresh ? '?refresh=true' : ''), { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load SOS data');
      const data = await res.json();
      setSosData(data);
    } catch (err) {
      setSosError(err.message);
    } finally {
      setSosLoading(false);
    }
  };

  React.useEffect(() => {
    if (complaint?.lot_number) fetchSOS();
  }, [complaint?.lot_number]);

  const handleAdminDelete = async () => {
    if (!confirm(`Delete complaint ${complaint.complaint_number}? This cannot be undone.`)) return;
    try {
      await apiDelete(`/api/admin/complaints/${id}`);
      navigate('/complaints');
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    setSubmittingComment(true);
    try {
      await apiPost(`/api/complaints/${id}/comments`, { comment: newComment.trim() });
      setNewComment('');
      refetch();
    } catch (err) {
      alert('Failed to add comment: ' + err.message);
    } finally {
      setSubmittingComment(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await apiDelete(`/api/complaints/${id}/comments/${commentId}`);
      refetch();
    } catch (err) {
      alert('Failed to delete comment: ' + err.message);
    }
  };

  if (loading) return <LoadingSpinner message="Loading complaint..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;
  if (!complaint) return <div className="text-center py-16 text-gray-500">Complaint not found</div>;

  const NEXT_STATUS = {
    open: 'investigating',
    investigating: 'corrective_action',
    corrective_action: 'resolved',
    resolved: 'closed',
    closed: 'open',
  };

  const STATUS_BUTTON_LABELS = {
    open: 'Start Investigation',
    investigating: 'Move to Pending Response',
    corrective_action: 'Mark Resolved',
    resolved: 'Close Complaint',
    closed: 'Reopen',
  };

  const handleStatusChange = async () => {
    setStatusChanging(true);
    try {
      await apiPost(`/api/complaints/${id}/status`, { status: pendingStatus, reason: statusReason });
      setShowStatusModal(false);
      setStatusReason('');
      setPendingStatus(null);
      refetch();
      refetchHistory();
    } catch (err) {
      alert('Failed to update status: ' + err.message);
    } finally {
      setStatusChanging(false);
    }
  };

  const fmtTs = ts => ts ? ts.replace('T', ' ').slice(0, 16) : '';

  const startEdit = () => {
    setFormData({ ...complaint });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const product = PRODUCT_OPTIONS.find(p => p.sku === formData.product_sku);
      await apiPut(`/api/complaints/${id}`, {
        ...formData,
        product_name: product?.name || formData.product_name,
      });
      setEditing(false);
      refetch();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const comments = complaint.comments || [];

  const timelineEvents = (() => {
    const events = [];
    if (complaint.created_at) {
      events.push({ type: 'created', timestamp: complaint.created_at, by: complaint.created_by });
    }
    (statusHistory || []).forEach(sh => {
      events.push({ type: 'status', timestamp: sh.created_at, oldStatus: sh.old_status, newStatus: sh.new_status, by: sh.changed_by, reason: sh.reason });
    });
    comments.forEach(c => {
      events.push({ type: 'comment', timestamp: c.created_at, by: c.author, text: c.comment });
    });
    events.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
    return events;
  })();

  const helpTexts = GMP_HELP.complaint.fields;
  const placeholders = GMP_HELP.complaint.placeholders;

  const infoFields = [
    { label: 'Complaint ID', value: complaint.complaint_number, mono: true },
    { label: 'Date Received', value: complaint.date_received, editField: 'date_received', type: 'date', help: helpTexts.date_received },
    { label: 'Source', value: complaint.source, editField: 'source', help: helpTexts.source, placeholder: placeholders.source },
    { label: 'Reporter', value: complaint.reporter, editField: 'reporter', help: helpTexts.reporter, placeholder: placeholders.reporter },
    { label: 'Store/Location', value: complaint.store_location, editField: 'store_location', help: helpTexts.store_location, placeholder: placeholders.store_location },
    { label: 'Product', value: `${complaint.product_sku} ${complaint.product_name}`, editField: 'product_sku', type: 'product_select', help: helpTexts.product_sku },
    { label: 'Lot Number', value: complaint.lot_number || '—', editField: 'lot_number', mono: true, help: helpTexts.lot_number, placeholder: placeholders.lot_number },
    { label: 'Best Before', value: complaint.best_before || '—', editField: 'best_before', type: 'date', help: helpTexts.best_before },
    { label: 'Quantity Affected', value: complaint.quantity_affected || '—', editField: 'quantity_affected', type: 'number', help: helpTexts.quantity_affected, placeholder: placeholders.quantity_affected },
    { label: 'Issue Type', value: complaint.issue_type, editField: 'issue_type', type: 'issue_select', help: helpTexts.issue_type },
    { label: 'Assigned To', value: complaint.assigned_to || '—', editField: 'assigned_to', help: helpTexts.assigned_to, placeholder: placeholders.assigned_to },
  ];

  const handleArchiveToggle = async () => {
    const action = complaint.archived ? 'unarchive' : 'archive';
    if (!confirm(complaint.archived ? 'Restore this complaint from archive?' : 'Archive this complaint? It will be hidden from the default view.')) return;
    try {
      const res = await fetch('/api/complaints/' + complaint.id + '/' + action, { method: 'PATCH', credentials: 'include' });
      if (!res.ok) throw new Error('Failed to ' + action);
      refetch();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };


  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <button onClick={() => navigate('/complaints')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Complaints
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{complaint.complaint_number}</h1>
              <RecordInfoTooltip title={GMP_HELP.complaint.info.title}>
                <p><strong>What:</strong> {GMP_HELP.complaint.info.what}</p>
                <p><strong>When to create:</strong> {GMP_HELP.complaint.info.when}</p>
                <p><strong>What you need:</strong> {GMP_HELP.complaint.info.need}</p>
              </RecordInfoTooltip>
              {complaint.archived ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-500 border border-gray-300">Archived</span> : null}
              <SeverityBadge severity={complaint.severity} />
              <ComplaintStatusBadge status={complaint.status} />
            </div>
            <p className="text-gray-600">{complaint.product_sku} {complaint.product_name} — {complaint.issue_type}</p>
            {complaint.assigned_to && (
              <p className="text-sm text-gray-500 mt-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5" /> Assigned to: <span className="font-medium text-gray-700">{complaint.assigned_to}</span>
              </p>
            )}
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
            {!editing && (
              <button onClick={handleArchiveToggle} className={"flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors " + (complaint.archived ? "border-green-300 text-green-700 hover:bg-green-50" : "border-gray-300 text-gray-600 hover:bg-gray-50")}>
                <Archive className="w-4 h-4" /> {complaint.archived ? 'Unarchive' : 'Archive'}
              </button>
            )}
            {hasRole('admin') && !editing && (
              <button onClick={handleAdminDelete} className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info Grid */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Complaint Details</h2>
            <div className="grid grid-cols-2 gap-4">
              {infoFields.map(field => (
                <div key={field.label}>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-0.5">{field.label}</p>
                  {editing && field.help && <FieldHelp text={field.help} />}
                  {editing && field.editField ? (
                    field.type === 'product_select' ? (
                      <select value={formData.product_sku || ''} onChange={e => setFormData({ ...formData, product_sku: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-1.5">
                        {PRODUCT_OPTIONS.map(p => <option key={p.sku} value={p.sku}>{p.sku} {p.name}</option>)}
                      </select>
                    ) : field.type === 'issue_select' ? (
                      <select value={formData.issue_type || ''} onChange={e => setFormData({ ...formData, issue_type: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-1.5">
                        {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <input type={field.type || 'text'} value={formData[field.editField] || ''} onChange={e => setFormData({ ...formData, [field.editField]: e.target.value })} placeholder={field.placeholder || ''} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-1.5" />
                    )
                  ) : (
                    <p className={`text-sm text-gray-900 ${field.mono ? 'font-mono' : ''}`}>{field.value}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Severity & Status (editable) */}
          {editing && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Status & Severity</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-0.5">Severity</label>
                  <FieldHelp text={helpTexts.severity} />
                  <select value={formData.severity || ''} onChange={e => setFormData({ ...formData, severity: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                    {SEVERITY_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={formData.status || ''} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-1">
              <h2 className="text-lg font-semibold text-gray-900">Description</h2>
              {editing && (
                <AiSuggestButton
                  field="description"
                  recordType="complaint"
                  context={formData}
                  onSuggestion={(text) => setFormData({ ...formData, description: text })}
                />
              )}
            </div>
            {editing && <FieldHelp text={helpTexts.description} />}
            {editing ? (
              <textarea rows={4} value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} placeholder={placeholders.description} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            ) : (
              <p className="text-sm text-gray-700 leading-relaxed">{complaint.description || 'No description provided.'}</p>
            )}
          </div>

          {/* Investigation Comments */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Investigation Comments</h2>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{comments.length}</span>
            </div>

            {/* Comment list */}
            {comments.length === 0 ? (
              <p className="text-sm text-gray-400 mb-4">No investigation comments yet. Add the first one below.</p>
            ) : (
              <div className="space-y-3 mb-4">
                {comments.map(c => (
                  <div key={c.id} className="bg-gray-50 rounded-lg p-3 border border-gray-100">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2 mb-1">
                        <div className="w-6 h-6 bg-navy-100 rounded-full flex items-center justify-center">
                          <User className="w-3.5 h-3.5 text-navy-600" />
                        </div>
                        <span className="text-sm font-medium text-gray-900">{c.author || 'Unknown'}</span>
                        <span className="text-xs text-gray-400">{c.created_at?.replace('T', ' ').slice(0, 16)}</span>
                        {c.email_ref && <Mail className="w-3 h-3 text-blue-400" title="From email" />}
                      </div>
                      {hasRole('admin') && (
                        <button onClick={() => handleDeleteComment(c.id)} className="text-gray-300 hover:text-red-500 transition-colors" title="Delete comment">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                    <p className="text-sm text-gray-700 ml-8 leading-relaxed whitespace-pre-wrap">{c.comment}</p>
                    {c.attachment_path && (
                      <p className="text-xs text-navy-600 ml-8 mt-1">Attachment: {c.attachment_path}</p>
                    )}
                    {c.email_ref && (
                      <a href={c.email_ref} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 ml-8 mt-1 transition-colors">
                        <Mail className="w-3 h-3" />
                        View original email
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Add comment form */}
            <div className="border-t border-gray-100 pt-4">
              <textarea
                rows={3}
                value={newComment}
                onChange={e => setNewComment(e.target.value)}
                placeholder="Add an investigation comment... (e.g., contacted retailer, checked batch records, retesting results)"
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2 resize-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddComment(); }}
              />
              <div className="flex justify-between items-center mt-2">
                <span className="text-xs text-gray-400">Cmd+Enter to submit</span>
                <button
                  onClick={handleAddComment}
                  disabled={!newComment.trim() || submittingComment}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-700 text-white rounded-lg text-sm hover:bg-navy-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="w-3.5 h-3.5" />
                  {submittingComment ? 'Adding...' : 'Add Comment'}
                </button>
              </div>
            </div>
          </div>

          {/* Activity Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-5">
              <History className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Activity Timeline</h2>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{timelineEvents.length}</span>
            </div>
            {timelineEvents.length === 0 ? (
              <p className="text-sm text-gray-400">No activity recorded yet.</p>
            ) : (
              <div>
                {timelineEvents.map((event, i) => {
                  const isLast = i === timelineEvents.length - 1;
                  const dotBg = event.type === 'created' ? 'bg-green-500' : event.type === 'status' ? 'bg-blue-500' : 'bg-gray-400';
                  const DotIcon = event.type === 'created' ? CheckCircle : event.type === 'status' ? GitCommit : MessageSquare;
                  return (
                    <div key={i} className="relative flex gap-4">
                      <div className="flex flex-col items-center flex-shrink-0">
                        <div className={`w-7 h-7 rounded-full ${dotBg} flex items-center justify-center z-10`}>
                          <DotIcon className="w-3.5 h-3.5 text-white" />
                        </div>
                        {!isLast && <div className="w-0.5 bg-gray-200 flex-1 mt-1" style={{ minHeight: '1.5rem' }} />}
                      </div>
                      <div className={`flex-1 min-w-0 ${isLast ? 'pb-0' : 'pb-4'}`}>
                        <div className="flex items-baseline gap-2 mb-0.5">
                          <span className="text-xs text-gray-400">{fmtTs(event.timestamp)}</span>
                          {event.by && <span className="text-xs font-medium text-gray-500">{event.by}</span>}
                        </div>
                        {event.type === 'created' && (
                          <p className="text-sm font-medium text-green-700">Complaint created</p>
                        )}
                        {event.type === 'status' && (
                          <div>
                            <div className="flex items-center gap-1.5 text-sm">
                              <span className="text-gray-500">{STATUS_LABELS[event.oldStatus] || event.oldStatus || 'Initial'}</span>
                              <ArrowRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                              <span className="font-semibold text-blue-800">{STATUS_LABELS[event.newStatus] || event.newStatus}</span>
                            </div>
                            {event.reason && (
                              <p className="text-xs text-gray-500 mt-0.5 italic">"{event.reason}"</p>
                            )}
                          </div>
                        )}
                        {event.type === 'comment' && (
                          <p className="text-sm text-gray-700 leading-relaxed">{event.text}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Linked Batch Tests */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-2 mb-4">
              <FlaskConical className="w-5 h-5 text-gray-600" />
              <h2 className="text-lg font-semibold text-gray-900">Linked Batch Tests</h2>
              {batchTests && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{batchTests.length}</span>}
            </div>

            {!complaint.lot_number ? (
              <p className="text-sm text-gray-400">No lot number set — cannot link batch tests.</p>
            ) : batchLoading ? (
              <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading batch tests...</div>
            ) : !batchTests || batchTests.length === 0 ? (
              <p className="text-sm text-gray-400">No batch tests found for lot <span className="font-mono">{complaint.lot_number}</span></p>
            ) : (
              <div className="space-y-3">
                {batchTests.map(bt => {
                  const StatusIcon = bt.status === 'pass' ? CheckCircle : bt.status === 'fail' ? XCircle : Clock;
                  const statusColor = bt.status === 'pass' ? 'text-green-600' : bt.status === 'fail' ? 'text-red-600' : 'text-amber-600';
                  const statusBg = bt.status === 'pass' ? 'bg-green-50 border-green-200' : bt.status === 'fail' ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200';
                  const keyResults = (bt.results || []).filter(r => ['pH Level', 'Coliform', 'E. coli', 'Salmonella', 'Yeast & Mold', 'Seal Integrity'].includes(r.test_name));
                  return (
                    <div key={bt.id} className={`rounded-lg p-4 border ${statusBg}`}>
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <StatusIcon className={`w-4 h-4 ${statusColor}`} />
                          <span className="text-sm font-semibold text-gray-900">Batch {bt.batch_number}</span>
                          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${bt.status === 'pass' ? 'bg-green-100 text-green-700' : bt.status === 'fail' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                            {bt.status?.toUpperCase()}
                          </span>
                        </div>
                        <span className="text-xs text-gray-500">{bt.test_date}</span>
                      </div>
                      <div className="text-xs text-gray-600 mb-2">
                        {bt.product_name && <span>{bt.product_name}</span>}
                        {bt.test_profile && <span className="ml-2 text-gray-400">({bt.test_profile})</span>}
                        {bt.tested_by && <span className="ml-2">by {bt.tested_by}</span>}
                      </div>
                      {keyResults.length > 0 && (
                        <div className="grid grid-cols-3 gap-2 mt-2">
                          {keyResults.map(r => (
                            <div key={r.id} className="text-xs">
                              <span className="text-gray-500">{r.test_name}:</span>{' '}
                              <span className={r.pass_fail === 'pass' ? 'text-green-700 font-medium' : r.pass_fail === 'fail' ? 'text-red-700 font-medium' : 'text-gray-600'}>
                                {r.actual_value || r.target_value || 'Pending'}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                      {bt.results && bt.results.length > keyResults.length && (
                        <p className="text-xs text-gray-400 mt-1">+ {bt.results.length - keyResults.length} more tests</p>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Photos placeholder */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Photos</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Photo upload coming soon</p>
              <p className="text-xs text-gray-400 mt-1">Drag and drop or click to upload complaint photos</p>
            </div>
          </div>

          {/* Cross-Linked Records */}
          <RecordLinker sourceType="complaint" sourceId={id} />

          {/* Linked Documents */}
          <LinkedDocuments linkedType="complaint" linkedId={id} category="complaint" />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Assigned To */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Responsible Person</h3>
            {complaint.assigned_to ? (
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-navy-100 rounded-full flex items-center justify-center">
                  <User className="w-4 h-4 text-navy-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-900">{complaint.assigned_to}</p>
                  <p className="text-xs text-gray-500">Follow-up & closure</p>
                </div>
              </div>
            ) : (
              <p className="text-sm text-amber-600 flex items-center gap-1">
                <AlertCircle className="w-4 h-4" /> No one assigned
              </p>
            )}
          </div>

          {/* Workflow Actions */}
          {!editing && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">Workflow Actions</h3>
              <div className="mb-3 space-y-1.5">
                {STATUS_OPTIONS.map((s, i) => {
                  const statusIndex = STATUS_OPTIONS.indexOf(complaint.status);
                  const isActive = i <= statusIndex;
                  const isCurrent = s === complaint.status;
                  return (
                    <div key={s} className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${isCurrent ? 'bg-navy-600 ring-2 ring-navy-100' : isActive ? 'bg-green-500' : 'bg-gray-200'}`} />
                      <span className={`text-xs ${isCurrent ? 'font-semibold text-navy-700' : isActive ? 'text-gray-600' : 'text-gray-400'}`}>
                        {STATUS_LABELS[s]}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-2">
                <button
                  onClick={() => { setPendingStatus(NEXT_STATUS[complaint.status]); setShowStatusModal(true); }}
                  className={`w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    complaint.status === 'closed'
                      ? 'border border-amber-300 text-amber-700 bg-amber-50 hover:bg-amber-100'
                      : 'bg-navy-800 text-white hover:bg-navy-700'
                  }`}
                >
                  <ArrowRight className="w-4 h-4" />
                  {STATUS_BUTTON_LABELS[complaint.status]}
                </button>
                {complaint.status === 'closed' && (
                  <button
                    onClick={() => { setPendingStatus('open'); setShowStatusModal(true); }}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
                  >
                    Reopen
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Linked CCR */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Linked CCR</h3>
            {complaint.linkedCCR ? (
              <Link to={`/ccrs/${complaint.linkedCCR.id}`} className="block p-3 border border-navy-100 bg-navy-50 rounded-lg hover:bg-navy-100 transition-colors group">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-navy-700">{complaint.linkedCCR.ccr_number}</span>
                  <ExternalLink className="w-3 h-3 text-navy-400 group-hover:text-navy-600" />
                </div>
                <p className="text-xs text-navy-600 mt-1">{complaint.linkedCCR.title}</p>
              </Link>
            ) : (
              <p className="text-sm text-gray-400">No CCR linked</p>
            )}
          </div>

          {/* SOS Inventory */}
          {complaint.lot_number && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                  <Package className="w-4 h-4 text-gray-500" /> SOS Inventory
                </h3>
                <button onClick={() => fetchSOS(true)} disabled={sosLoading} className="text-xs text-navy-600 hover:text-navy-800 flex items-center gap-1 disabled:opacity-50">
                  <RefreshCw className={`w-3 h-3 ${sosLoading ? 'animate-spin' : ''}`} /> Refresh
                </button>
              </div>
              {sosLoading && !sosData ? (
                <div className="flex items-center gap-2 text-sm text-gray-500"><Loader2 className="w-4 h-4 animate-spin" /> Loading...</div>
              ) : sosError ? (
                <p className="text-xs text-red-500">{sosError}</p>
              ) : sosData && !sosData.found ? (
                <p className="text-xs text-gray-400">No SOS records for lot {complaint.lot_number}</p>
              ) : sosData ? (
                <div className="space-y-2 text-sm">
                  {sosData.cached && <p className="text-xs text-gray-400 italic">Cached result</p>}
                  {sosData.items && sosData.items.length > 0 ? (
                    sosData.items.slice(0, 5).map((item, i) => (
                      <div key={i} className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                        <p className="font-medium text-gray-900">{item.name || item.itemName || 'Unknown Item'}</p>
                        {(item.sku || item.itemSku) && <p className="text-gray-500">SKU: {item.sku || item.itemSku}</p>}
                        {(item.quantity || item.qty) && <p className="text-gray-500">Qty: {item.quantity || item.qty}</p>}
                        {item.expirationDate && <p className="text-gray-500">Expires: {item.expirationDate}</p>}
                        {item.status && <p className="text-gray-500">Status: {item.status}</p>}
                      </div>
                    ))
                  ) : sosData.lot_info && (Array.isArray(sosData.lot_info) ? sosData.lot_info : [sosData.lot_info]).slice(0, 5).map((lot, i) => (
                    <div key={i} className="p-2 bg-gray-50 rounded-lg border border-gray-100 text-xs">
                      <p className="font-medium text-gray-900">Lot: {lot.number || lot.lotNumber || complaint.lot_number}</p>
                      {lot.itemName && <p className="text-gray-500">Item: {lot.itemName}</p>}
                      {lot.quantity && <p className="text-gray-500">Qty: {lot.quantity}</p>}
                      {lot.expirationDate && <p className="text-gray-500">Expires: {lot.expirationDate}</p>}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-gray-400">No data</p>
              )}
            </div>
          )}

          {/* Timestamps */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Timestamps</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-700">{complaint.created_at?.slice(0, 10)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Updated</span>
                <span className="text-gray-700">{complaint.updated_at?.slice(0, 10)}</span>
              </div>
              {complaint.created_by && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Created by</span>
                  <span className="text-gray-700">{complaint.created_by}</span>
                </div>
              )}
              {complaint.updated_by && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Updated by</span>
                  <span className="text-gray-700">{complaint.updated_by}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Status Change Modal */}
      {showStatusModal && pendingStatus && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-1">
              {pendingStatus === 'open' ? 'Reopen Complaint' : `Advance to: ${STATUS_LABELS[pendingStatus]}`}
            </h3>
            <div className="flex items-center gap-1.5 text-sm text-gray-500 mb-4">
              <span>{STATUS_LABELS[complaint.status]}</span>
              <ArrowRight className="w-3.5 h-3.5" />
              <span className="font-medium text-gray-700">{STATUS_LABELS[pendingStatus]}</span>
            </div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason / Note <span className="font-normal text-gray-400">(optional)</span></label>
            <textarea
              rows={3}
              value={statusReason}
              onChange={e => setStatusReason(e.target.value)}
              placeholder="e.g., Investigation initiated, all records reviewed..."
              className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2 resize-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
              autoFocus
              onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleStatusChange(); }}
            />
            <div className="flex justify-end gap-2 mt-4">
              <button
                onClick={() => { setShowStatusModal(false); setStatusReason(''); setPendingStatus(null); }}
                className="px-4 py-2 text-sm border border-gray-300 rounded-lg text-gray-600 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusChange}
                disabled={statusChanging}
                className="px-4 py-2 text-sm bg-navy-800 text-white rounded-lg hover:bg-navy-700 disabled:opacity-50"
              >
                {statusChanging ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
