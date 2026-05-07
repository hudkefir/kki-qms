import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Edit, Save, Building2, User, Mail, Phone, MapPin, Package, Calendar, Clock, Shield, AlertTriangle, CheckCircle, XCircle, Plus, Star, FileText, X, Trash2, Upload, Download, MessageSquare, Send, Bot, UserCircle, Activity } from 'lucide-react';
import { useFetch, apiPut, apiPost, apiPatch, apiDelete } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

const STATUS_CONFIG = {
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  conditional: { label: 'Conditional', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  suspended: { label: 'Suspended', color: 'bg-red-100 text-red-700', icon: XCircle },
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-600', icon: Clock },
};

const RISK_CONFIG = {
  low: { label: 'Low Risk', color: 'bg-green-50 text-green-600 border-green-200' },
  medium: { label: 'Medium Risk', color: 'bg-amber-50 text-amber-600 border-amber-200' },
  high: { label: 'High Risk', color: 'bg-red-50 text-red-600 border-red-200' },
};

export default function SupplierDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canWrite, hasRole } = useAuth();

  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState(null);

  const [showReview, setShowReview] = useState(false);
  const [reviewForm, setReviewForm] = useState({ review_date: new Date().toISOString().split('T')[0], outcome: 'approved', findings: '', corrective_actions: '', next_review: '' });
  const [addingReview, setAddingReview] = useState(false);

  const [statusOverride, setStatusOverride] = useState('');

  const [showUpload, setShowUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadType, setUploadType] = useState('other');
  const [uploadNotes, setUploadNotes] = useState('');
  const [uploading, setUploading] = useState(false);

  const { data: supplier, loading, error, refetch } = useFetch(`/api/suppliers/${id}`);
  const { data: checklist, loading: checklistLoading, refetch: refetchChecklist } = useFetch(`/api/suppliers/${id}/checklist`);
  const { data: activities, loading: activitiesLoading, refetch: refetchActivities } = useFetch(`/api/suppliers/${id}/activities`);

  const [activityForm, setActivityForm] = useState({ activity_type: 'note', title: '', description: '' });
  const [addingActivity, setAddingActivity] = useState(false);

  const handleAddActivity = async (e) => {
    e.preventDefault();
    if (!activityForm.title.trim()) return;
    setAddingActivity(true);
    try {
      await apiPost(`/api/suppliers/${id}/activities`, activityForm);
      setActivityForm({ activity_type: 'note', title: '', description: '' });
      refetchActivities();
    } catch (err) { alert('Failed: ' + err.message); }
    finally { setAddingActivity(false); }
  };

  const handleDeleteActivity = async (activityId) => {
    if (!confirm('Delete this activity?')) return;
    try {
      await apiDelete(`/api/suppliers/${id}/activities/${activityId}`);
      refetchActivities();
    } catch (err) { alert('Failed: ' + err.message); }
  };

  const ACTIVITY_TYPE_CONFIG = {
    note: { label: 'Note', color: 'bg-blue-100 text-blue-700 border-blue-200', dotColor: 'bg-blue-500', icon: MessageSquare },
    email_sent: { label: 'Email Sent', color: 'bg-purple-100 text-purple-700 border-purple-200', dotColor: 'bg-purple-500', icon: Send },
    document_received: { label: 'Document Received', color: 'bg-green-100 text-green-700 border-green-200', dotColor: 'bg-green-500', icon: Download },
    document_requested: { label: 'Document Requested', color: 'bg-amber-100 text-amber-700 border-amber-200', dotColor: 'bg-amber-500', icon: Upload },
    status_change: { label: 'Status Change', color: 'bg-amber-100 text-amber-700 border-amber-200', dotColor: 'bg-amber-500', icon: Shield },
    review: { label: 'Review', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', dotColor: 'bg-indigo-500', icon: Star },
    system: { label: 'System', color: 'bg-gray-100 text-gray-600 border-gray-200', dotColor: 'bg-gray-400', icon: Activity },
  };

  const timeAgo = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now - date;
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1) return 'just now';
    if (diffMin < 60) return diffMin + 'm ago';
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return diffHr + 'h ago';
    const diffDay = Math.floor(diffHr / 24);
    if (diffDay < 7) return diffDay + 'd ago';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };
  const [updatingItem, setUpdatingItem] = useState(null);

  const handleToggleItem = async (itemId, currentCompleted) => {
    setUpdatingItem(itemId);
    try {
      await apiPatch(`/api/suppliers/${id}/checklist/${itemId}`, { completed: !currentCompleted });
      refetchChecklist();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setUpdatingItem(null); }
  };

  const handleToggleRequired = async (itemId, currentRequired) => {
    try {
      await apiPatch(`/api/suppliers/${id}/checklist/${itemId}`, { required: !currentRequired });
      refetchChecklist();
    } catch (err) { alert('Error: ' + err.message); }
  };

  if (loading) return <LoadingSpinner message="Loading supplier..." />;
  if (error || !supplier) return (
    <div className="text-center py-16">
      <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
      <p className="text-red-600 font-medium">Failed to load supplier</p>
      <button onClick={() => navigate('/suppliers')} className="mt-4 text-sm text-navy-600 hover:underline">Back to Suppliers</button>
    </div>
  );

  const formatDate = (d) => !d ? '-' : new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

  const statusCfg = STATUS_CONFIG[supplier.status] || STATUS_CONFIG.pending;
  const riskCfg = RISK_CONFIG[supplier.risk_level] || RISK_CONFIG.low;
  const StatusIcon = statusCfg.icon;
  const isOverdue = supplier.next_review_date && new Date(supplier.next_review_date) < new Date();

  const startEdit = () => {
    setEditForm({
      name: supplier.name || '', contact_name: supplier.contact_name || '', contact_email: supplier.contact_email || '',
      contact_phone: supplier.contact_phone || '', address: supplier.address || '', products_supplied: supplier.products_supplied || '',
      status: supplier.status || 'pending', approval_date: supplier.approval_date ? supplier.approval_date.split('T')[0] : '',
      next_review_date: supplier.next_review_date ? supplier.next_review_date.split('T')[0] : '',
      risk_level: supplier.risk_level || 'low', certification: supplier.certification || '', notes: supplier.notes || '',
    });
    setEditMode(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut(`/api/suppliers/${id}`, editForm);
      setEditMode(false); setEditForm(null);
      setFeedback({ type: 'success', message: 'Supplier updated' });
      refetch();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      setFeedback({ type: 'error', message: err.message });
    } finally { setSaving(false); }
  };

  const handleStatusOverride = async (newStatus) => {
    if (!confirm(`Change status to "${newStatus}"?`)) return;
    try {
      await apiPatch(`/api/suppliers/${id}/status`, { status: newStatus });
      refetch();
      setFeedback({ type: 'success', message: `Status changed to ${newStatus}` });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      alert('Failed: ' + err.message);
    }
  };

  const handleAddReview = async (e) => {
    e.preventDefault();
    setAddingReview(true);
    try {
      await apiPost(`/api/suppliers/${id}/reviews`, reviewForm);
      setShowReview(false);
      setReviewForm({ review_date: new Date().toISOString().split('T')[0], outcome: 'approved', findings: '', corrective_actions: '', next_review: '' });
      refetch();
      setFeedback({ type: 'success', message: 'Review added' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      alert('Failed: ' + err.message);
    } finally { setAddingReview(false); }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete supplier "${supplier.name}"? This cannot be undone.`)) return;
    try {
      await apiDelete(`/api/suppliers/${id}`);
      navigate('/suppliers');
    } catch (err) { alert('Failed: ' + err.message); }
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!uploadFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', uploadFile);
      formData.append('document_type', uploadType);
      formData.append('notes', uploadNotes);
      await apiPost(`/api/suppliers/${id}/documents`, formData);
      setShowUpload(false);
      setUploadFile(null);
      setUploadType('other');
      setUploadNotes('');
      refetch();
      setFeedback({ type: 'success', message: 'Document uploaded' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally { setUploading(false); }
  };

  const handleDeleteDoc = async (docId, docName) => {
    if (!confirm(`Delete document "${docName}"? This cannot be undone.`)) return;
    try {
      await apiDelete(`/api/suppliers/${id}/documents/${docId}`);
      refetch();
      setFeedback({ type: 'success', message: 'Document deleted' });
      setTimeout(() => setFeedback(null), 3000);
    } catch (err) { alert('Failed: ' + err.message); }
  };

  const ef = (f) => editForm?.[f] ?? '';
  const setEf = (f, v) => setEditForm(prev => ({ ...prev, [f]: v }));

  const reviews = supplier.reviews || [];

  return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate('/suppliers')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors">
        <ArrowLeft className="w-4 h-4" /> Back to Suppliers
      </button>

      {feedback && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-between ${feedback.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'}`}>
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {feedback.message}
          </div>
          <button onClick={() => setFeedback(null)} className="text-current opacity-60 hover:opacity-100"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <Building2 className="w-5 h-5 text-navy-600" />
              <h1 className="text-2xl font-bold text-gray-900">{supplier.name}</h1>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${statusCfg.color}`}>
                <StatusIcon className="w-3.5 h-3.5" /> {statusCfg.label}
              </span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${riskCfg.color}`}>{riskCfg.label}</span>
              {isOverdue && <span className="px-2.5 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700">Review Overdue</span>}

              {/* Admin status override */}
              {hasRole('admin') && (
                <select
                  value=""
                  onChange={e => { if (e.target.value) handleStatusOverride(e.target.value); }}
                  className="ml-2 px-2 py-1 text-xs border border-gray-200 rounded-lg bg-white text-gray-600 cursor-pointer"
                >
                  <option value="">Change Status...</option>
                  {['approved', 'conditional', 'suspended', 'pending'].filter(s => s !== supplier.status).map(s => (
                    <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            {canWrite() && !editMode && (
              <button onClick={startEdit} className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700 text-sm font-medium">
                <Edit className="w-4 h-4" /> Edit
              </button>
            )}
            {hasRole('admin') && (
              <button onClick={handleDelete} className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
          {[
            { icon: User, label: 'Contact', value: supplier.contact_name || '-' },
            { icon: Mail, label: 'Email', value: supplier.contact_email || '-' },
            { icon: Phone, label: 'Phone', value: supplier.contact_phone || '-' },
            { icon: Package, label: 'Products', value: supplier.products_supplied || '-' },
            { icon: Calendar, label: 'Approved', value: formatDate(supplier.approval_date) },
            { icon: Clock, label: 'Next Review', value: formatDate(supplier.next_review_date) },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-2.5">
              <item.icon className="w-4 h-4 text-gray-400" />
              <div>
                <p className="text-[11px] text-gray-400 uppercase tracking-wide">{item.label}</p>
                <p className="text-sm font-medium text-gray-900">{item.value}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Edit Form */}
      {editMode && editForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Edit Supplier</h3>
            <div className="flex gap-2">
              <button onClick={() => { setEditMode(false); setEditForm(null); }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700 disabled:bg-navy-400 text-sm font-medium">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" value={ef('name')} onChange={e => setEf('name', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <input type="text" value={ef('contact_name')} onChange={e => setEf('contact_name', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input type="email" value={ef('contact_email')} onChange={e => setEf('contact_email', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" value={ef('contact_phone')} onChange={e => setEf('contact_phone', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Address</label>
            <input type="text" value={ef('address')} onChange={e => setEf('address', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Products Supplied</label>
            <input type="text" value={ef('products_supplied')} onChange={e => setEf('products_supplied', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={ef('status')} onChange={e => setEf('status', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 bg-white">
                {['pending', 'approved', 'conditional', 'suspended'].map(s => <option key={s} value={s}>{STATUS_CONFIG[s].label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
              <select value={ef('risk_level')} onChange={e => setEf('risk_level', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 bg-white">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Certification</label>
              <input type="text" value={ef('certification')} onChange={e => setEf('certification', e.target.value)} placeholder="e.g., ISO 22000, HACCP" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approval Date</label>
              <input type="date" value={ef('approval_date')} onChange={e => setEf('approval_date', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Review Date</label>
              <input type="date" value={ef('next_review_date')} onChange={e => setEf('next_review_date', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={ef('notes')} onChange={e => setEf('notes', e.target.value)} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none" />
          </div>
        </div>
      )}

      {/* Certification & Notes */}
      {!editMode && (supplier.certification || supplier.notes || supplier.address) && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 space-y-4">
          {supplier.certification && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Certification</h3>
              <p className="text-sm text-gray-600">{supplier.certification}</p>
            </div>
          )}
          {supplier.address && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Address</h3>
              <p className="text-sm text-gray-600">{supplier.address}</p>
            </div>
          )}
          {supplier.notes && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2">Notes</h3>
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{supplier.notes}</p>
            </div>
          )}
        </div>
      )}

      {/* Documents */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Documents</h3>
          {canWrite() && (
            <button onClick={() => setShowUpload(true)} className="flex items-center gap-1 px-3 py-1.5 bg-navy-800 text-white rounded-lg hover:bg-navy-700 text-xs font-medium">
              <Upload className="w-3.5 h-3.5" /> Upload
            </button>
          )}
        </div>

        {showUpload && (
          <form onSubmit={handleUpload} className="border border-gray-200 rounded-lg p-4 mb-4 space-y-3 bg-gray-50">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">File *</label>
              <input
                type="file"
                accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
                onChange={e => setUploadFile(e.target.files[0] || null)}
                className="w-full text-sm text-gray-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-navy-100 file:text-navy-700 hover:file:bg-navy-200"
                required
              />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                <select value={uploadType} onChange={e => setUploadType(e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 bg-white">
                  <option value="evaluation_checklist">Evaluation Checklist</option>
                  <option value="supplier_info_sheet">Supplier Info Sheet</option>
                  <option value="certification">Certification</option>
                  <option value="coa">Certificate of Analysis</option>
                  <option value="audit_report">Audit Report</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <input type="text" value={uploadNotes} onChange={e => setUploadNotes(e.target.value)} placeholder="Optional notes" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-1">
              <button type="button" onClick={() => { setShowUpload(false); setUploadFile(null); }} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
              <button type="submit" disabled={uploading || !uploadFile} className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 disabled:bg-navy-400">
                <Upload className="w-4 h-4" /> {uploading ? 'Uploading...' : 'Upload'}
              </button>
            </div>
          </form>
        )}

        {(!supplier.documents || supplier.documents.length === 0) ? (
          <p className="text-sm text-gray-400 text-center py-8">No documents uploaded yet</p>
        ) : (
          <div className="space-y-2">
            {supplier.documents.map(doc => (
              <div key={doc.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-3">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-4 h-4 text-gray-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{doc.original_name}</p>
                    <p className="text-xs text-gray-400">
                      {doc.document_type?.replace(/_/g, ' ')} &middot; {formatDate(doc.uploaded_at)}
                      {doc.uploaded_by && <> &middot; {doc.uploaded_by}</>}
                      {doc.notes && <> &middot; {doc.notes}</>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <a href={`/api/suppliers/${id}/documents/${doc.id}/download`} className="p-1.5 text-gray-400 hover:text-navy-600 rounded-lg hover:bg-gray-50" title="Download">
                    <Download className="w-4 h-4" />
                  </a>
                  {hasRole('admin') && (
                    <button onClick={() => handleDeleteDoc(doc.id, doc.original_name)} className="p-1.5 text-gray-400 hover:text-red-600 rounded-lg hover:bg-red-50" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Requirements Checklist */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Requirements Checklist</h3>
            {checklist && (
              <p className="text-xs text-gray-500 mt-1">
                {checklist.completed} of {checklist.total_required} required items complete ({checklist.percentage}%)
              </p>
            )}
          </div>
          {checklist && (
            <div className="flex items-center gap-2">
              <div className="w-32 bg-gray-200 rounded-full h-3">
                <div
                  className={`h-3 rounded-full transition-all ${
                    checklist.percentage === 100 ? 'bg-green-500' :
                    checklist.percentage >= 50 ? 'bg-blue-500' :
                    'bg-amber-500'
                  }`}
                  style={{ width: checklist.percentage + '%' }}
                />
              </div>
              <span className={`text-sm font-bold ${
                checklist.percentage === 100 ? 'text-green-600' :
                checklist.percentage >= 50 ? 'text-blue-600' :
                'text-amber-600'
              }`}>
                {checklist.percentage}%
              </span>
            </div>
          )}
        </div>

        {checklistLoading ? (
          <p className="text-sm text-gray-400">Loading checklist...</p>
        ) : checklist?.items?.length > 0 ? (
          <div className="space-y-1">
            {/* Required items */}
            {checklist.items.filter(i => i.required).map(item => (
              <div key={item.id} className={`flex items-center justify-between p-3 rounded-lg border transition-colors ${
                item.completed ? 'bg-green-50 border-green-200' : 'bg-white border-gray-200 hover:border-amber-200'
              }`}>
                <div className="flex items-center gap-3 flex-1">
                  <button
                    onClick={() => handleToggleItem(item.id, item.completed)}
                    disabled={updatingItem === item.id}
                    className={`flex-shrink-0 w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                      item.completed
                        ? 'bg-green-500 border-green-500 text-white'
                        : 'border-gray-300 hover:border-green-400'
                    }`}
                  >
                    {item.completed && <CheckCircle className="w-4 h-4" />}
                  </button>
                  <div className="flex-1">
                    <span className={`text-sm font-medium ${item.completed ? 'text-green-700 line-through' : 'text-gray-900'}`}>
                      {item.item_name}
                    </span>
                    {item.completed_date && (
                      <span className="text-xs text-gray-400 ml-2">✓ {item.completed_date?.slice(0, 10)}</span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {item.notes && (
                    <span className="text-xs text-gray-500 max-w-xs truncate">{item.notes}</span>
                  )}
                  {!item.completed && (
                    <button
                      onClick={async () => {
                        const reason = prompt('Why is this not applicable? (e.g. "Domestic supplier — no import license needed")');
                        if (reason !== null) {
                          try {
                            await apiPatch(`/api/suppliers/${id}/checklist/${item.id}`, { required: false, notes: reason || 'Not applicable' });
                            refetchChecklist();
                          } catch (err) { alert('Error: ' + err.message); }
                        }
                      }}
                      className="flex-shrink-0 px-2 py-1 text-xs text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded border border-transparent hover:border-gray-200 transition-colors"
                      title="Mark as Not Applicable"
                    >
                      N/A
                    </button>
                  )}
                </div>
              </div>
            ))}

            {/* N/A items — collapsed */}
            {checklist.items.filter(i => !i.required).length > 0 && (
              <details className="mt-3">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600 py-2">
                  {checklist.items.filter(i => !i.required).length} items marked N/A
                </summary>
                <div className="space-y-1 mt-1">
                  {checklist.items.filter(i => !i.required).map(item => (
                    <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-gray-50 border border-gray-100">
                      <div className="flex items-center gap-3">
                        <span className="text-xs text-gray-400 font-medium px-2 py-0.5 bg-gray-200 rounded">N/A</span>
                        <span className="text-sm text-gray-400">{item.item_name}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {item.notes && <span className="text-xs text-gray-400">{item.notes}</span>}
                        <button
                          onClick={async () => {
                            try {
                              await apiPatch(`/api/suppliers/${id}/checklist/${item.id}`, { required: true, notes: '' });
                              refetchChecklist();
                            } catch (err) { alert('Error: ' + err.message); }
                          }}
                          className="text-xs text-blue-500 hover:text-blue-700 px-2 py-0.5 hover:bg-blue-50 rounded"
                          title="Restore as required"
                        >
                          Restore
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400">No checklist items configured</p>
        )}
      </div>

            {/* Activity Timeline */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Activity Timeline</h3>
          <span className="text-xs text-gray-400">{Array.isArray(activities) ? activities.length : 0} entries</span>
        </div>

        {/* Add Activity Form */}
        {canWrite() && (
          <form onSubmit={handleAddActivity} className="border border-gray-200 rounded-lg p-4 mb-5 bg-gray-50 space-y-3">
            <div className="flex gap-3">
              <select
                value={activityForm.activity_type}
                onChange={e => setActivityForm(f => ({ ...f, activity_type: e.target.value }))}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500 shrink-0"
              >
                <option value="note">📝 Note</option>
                <option value="email_sent">📧 Email Sent</option>
                <option value="document_received">📥 Document Received</option>
                <option value="document_requested">📤 Document Requested</option>
                <option value="status_change">🔄 Status Change</option>
                <option value="review">⭐ Review</option>
                <option value="system">⚙️ System</option>
              </select>
              <input
                type="text"
                value={activityForm.title}
                onChange={e => setActivityForm(f => ({ ...f, title: e.target.value }))}
                placeholder="What happened?"
                className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                required
              />
            </div>
            <textarea
              value={activityForm.description}
              onChange={e => setActivityForm(f => ({ ...f, description: e.target.value }))}
              placeholder="Additional details (optional)"
              rows={2}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none"
            />
            <div className="flex justify-end">
              <button
                type="submit"
                disabled={addingActivity || !activityForm.title.trim()}
                className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 disabled:bg-navy-400"
              >
                <Plus className="w-4 h-4" /> {addingActivity ? 'Adding...' : 'Add Entry'}
              </button>
            </div>
          </form>
        )}

        {/* Timeline */}
        {activitiesLoading ? (
          <p className="text-sm text-gray-400 text-center py-8">Loading timeline...</p>
        ) : !Array.isArray(activities) || activities.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No activity recorded yet</p>
        ) : (
          <div className="relative">
            {/* Vertical line */}
            <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-gray-200" />

            <div className="space-y-4">
              {activities.map(a => {
                const cfg = ACTIVITY_TYPE_CONFIG[a.activity_type] || ACTIVITY_TYPE_CONFIG.system;
                const TypeIcon = cfg.icon;
                const isJarvis = a.source === 'jarvis';
                return (
                  <div key={a.id} className="relative flex gap-4 pl-1">
                    {/* Timeline dot */}
                    <div className={`relative z-10 flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${cfg.dotColor} text-white shadow-sm`}>
                      <TypeIcon className="w-4 h-4" />
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0 pb-1">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-900">{a.title}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${cfg.color}`}>{cfg.label}</span>
                            {isJarvis ? (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-violet-100 text-violet-700 text-[10px] font-medium border border-violet-200">
                                <Bot className="w-3 h-3" /> Jarvis
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 text-[10px] font-medium border border-sky-200">
                                <UserCircle className="w-3 h-3" /> {a.created_by || 'Manual'}
                              </span>
                            )}
                          </div>
                          {a.description && (
                            <p className="text-sm text-gray-500 mt-1 whitespace-pre-wrap">{a.description}</p>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <span className="text-xs text-gray-400 whitespace-nowrap" title={new Date(a.created_at).toLocaleString()}>
                            {timeAgo(a.created_at)}
                          </span>
                          {hasRole('admin') && (
                            <button
                              onClick={() => handleDeleteActivity(a.id)}
                              className="p-1 text-gray-300 hover:text-red-500 rounded hover:bg-red-50 transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Review History */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Supplier Reviews</h3>
          {canWrite() && (
            <button onClick={() => setShowReview(true)} className="flex items-center gap-1 px-3 py-1.5 bg-navy-800 text-white rounded-lg hover:bg-navy-700 text-xs font-medium">
              <Plus className="w-3.5 h-3.5" /> Add Review
            </button>
          )}
        </div>

        {reviews.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-8">No reviews recorded yet</p>
        ) : (
          <div className="space-y-3">
            {reviews.map(r => {
              const oCfg = STATUS_CONFIG[r.outcome] || STATUS_CONFIG.approved;
              return (
                <div key={r.id} className="border border-gray-100 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{formatDate(r.review_date)}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${oCfg.color}`}>{oCfg.label}</span>
                    </div>
                    <span className="text-xs text-gray-400">{r.reviewer}</span>
                  </div>
                  {r.findings && <p className="text-sm text-gray-600 mb-1"><span className="font-medium">Findings:</span> {r.findings}</p>}
                  {r.corrective_actions && <p className="text-sm text-gray-600"><span className="font-medium">Corrective Actions:</span> {r.corrective_actions}</p>}
                  {r.next_review && <p className="text-xs text-gray-400 mt-1">Next review: {formatDate(r.next_review)}</p>}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add Review Modal */}
      <Modal isOpen={showReview} onClose={() => setShowReview(false)} title="Add Supplier Review">
        <form onSubmit={handleAddReview} className="p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Review Date *</label>
              <input type="date" value={reviewForm.review_date} onChange={e => setReviewForm(f => ({ ...f, review_date: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" required />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Outcome</label>
              <select value={reviewForm.outcome} onChange={e => setReviewForm(f => ({ ...f, outcome: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 bg-white">
                <option value="approved">Approved</option>
                <option value="conditional">Conditional</option>
                <option value="suspended">Suspended</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Findings</label>
            <textarea value={reviewForm.findings} onChange={e => setReviewForm(f => ({ ...f, findings: e.target.value }))} rows={3} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Corrective Actions</label>
            <textarea value={reviewForm.corrective_actions} onChange={e => setReviewForm(f => ({ ...f, corrective_actions: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Next Review Date</label>
            <input type="date" value={reviewForm.next_review} onChange={e => setReviewForm(f => ({ ...f, next_review: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowReview(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={addingReview} className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 disabled:bg-navy-400">
              {addingReview ? 'Adding...' : 'Add Review'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
