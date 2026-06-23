import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Edit,
  Save,
  Clock,
  User,
  Calendar,
  Tag,
  FileText,
  MessageSquare,
  History,
  ClipboardCheck,
  ClipboardList,
  Plus,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Minus,
  Upload,
  Download,
  File,
  Paperclip,
  BookOpen,
  Zap,
  Eye,
  RefreshCw,
  X,
  Trash2,
  Archive,
  Star,
  ChevronDown,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { useFetch, apiPut, apiPost, apiDelete } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import FormattedText from '../components/FormattedText';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

// --- Version preview helpers (mirror server/src/routes/documents/files.js) ---
function previewMinor(current) {
  const parts = String(current || '1.0').trim().split('.');
  const i = parts.length - 1;
  const n = parseInt(parts[i], 10);
  if (Number.isNaN(n)) return '1.0';
  parts[i] = String(n + 1);
  return parts.join('.');
}
function previewMajor(current) {
  const parts = String(current || '1.0').trim().split('.');
  const n = parseInt(parts[0], 10);
  if (Number.isNaN(n)) return '1.0';
  parts[0] = String(n + 1);
  for (let i = 1; i < parts.length; i++) parts[i] = '0';
  return parts.join('.');
}
// Filename-encoded version (..._v2.0.docx) is the manual override and wins.
function previewNextVersion(current, filename, major) {
  const m = String(filename || '').match(/_v(\d+(?:[._]\d+)+)/i);
  if (m) return { value: m[1].replace(/_/g, '.'), source: 'filename' };
  return major
    ? { value: previewMajor(current), source: 'major' }
    : { value: previewMinor(current), source: 'minor' };
}
import LinkedDocuments from '../components/LinkedDocuments';
import SOPForms from '../components/SOPForms';

const TABS = [
  { key: 'overview', label: 'Overview', icon: FileText },
  { key: 'forms', label: 'Forms', icon: ClipboardList },
  { key: 'documents', label: 'Documents', icon: Paperclip },
  { key: 'revisions', label: 'Revisions', icon: History },
  { key: 'comments', label: 'Comments', icon: MessageSquare },
  { key: 'audit', label: 'Audit Checklist', icon: ClipboardCheck },
];

const STATUS_OPTIONS = ['active', 'in_review', 'approved', 'draft', 'archived'];
const AUDIT_STATUSES = ['met', 'partial', 'not_met', 'na'];

export default function SOPDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, canWrite, hasRole } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Inline edit mode for overview
  const [editMode, setEditMode] = useState(false);
  const [editForm, setEditForm] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editFeedback, setEditFeedback] = useState(null); // { type: 'success'|'error', message }

  // Content Reading
  const [showContentReader, setShowContentReader] = useState(false);
  const [contentReading, setContentReading] = useState(false);
  const [contentPreview, setContentPreview] = useState(null);
  const [contentApplying, setContentApplying] = useState(false);
  const [selectedFields, setSelectedFields] = useState({}); // BUG 6 FIX: per-field checkboxes

  // Revision form
  const [showAddRevision, setShowAddRevision] = useState(false);
  const [revisionForm, setRevisionForm] = useState({ version: '', description: '', reason: '', author: '' });

  // Comment form
  const [commentText, setCommentText] = useState('');

  // File upload
  const [uploading, setUploading] = useState(false);
  const [pendingUpload, setPendingUpload] = useState(null); // staged File awaiting bump choice
  const [majorRevision, setMajorRevision] = useState(false);

  // File delete
  const [deleteFileTarget, setDeleteFileTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Revision history expand/collapse (per file group)
  const [expandedHistory, setExpandedHistory] = useState({});

  // Document viewer
  const [viewerDoc, setViewerDoc] = useState(null);

  const { data: sop, loading, error, refetch } = useFetch(`/api/sops/${id}`);
  const { data: files, refetch: refetchFiles } = useFetch(`/api/sops/${id}/files`);
  const { data: linkedDocs } = useFetch(`/api/documents?linked_type=sop&linked_id=${id}`);
  const { data: sopForms } = useFetch(`/api/sops/${id}/forms`);

  if (loading) return <LoadingSpinner message="Loading SOP..." />;
  if (error || !sop) {
    return (
      <div className="text-center py-16">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-600 font-medium">Failed to load SOP</p>
        <p className="text-sm text-gray-500 mt-1">{error || 'SOP not found'}</p>
        <button onClick={() => navigate('/sops')} className="mt-4 text-sm text-navy-600 hover:underline">
          Back to Library
        </button>
      </div>
    );
  }

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const formatDateTime = (d) => {
    if (!d) return '-';
    const date = new Date(d);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) +
      ' at ' + date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '-';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  // --- Inline Edit Mode ---
  const startEdit = () => {
    setEditForm({
      title: sop.title || '',
      sop_number: sop.sop_number || '',
      version: sop.version || '',
      status: sop.status || 'draft',
      owner: sop.owner || '',
      reviewer: sop.reviewer || '',
      approver: sop.approver || '',
      effective_date: sop.effective_date ? sop.effective_date.split('T')[0] : '',
      next_review_date: sop.next_review_date ? sop.next_review_date.split('T')[0] : '',
      category_name: sop.category_name || '',
      category_code: sop.category_code || '',
      description: sop.description || '',
      scope: sop.scope || '',
      procedure_text: sop.procedure_text || '',
      responsibilities: sop.responsibilities || '',
      materials_equipment: sop.materials_equipment || '',
      sop_references: sop.sop_references || '',
      notes: sop.notes || '',
    });
    setEditMode(true);
    setEditFeedback(null);
  };

  const cancelEdit = () => {
    setEditMode(false);
    setEditForm(null);
    setEditFeedback(null);
  };

  const handleSaveEdit = async () => {
    setEditSaving(true);
    setEditFeedback(null);
    try {
      await apiPut(`/api/sops/${id}`, editForm);
      setEditMode(false);
      setEditForm(null);
      setEditFeedback({ type: 'success', message: 'SOP updated successfully' });
      refetch();
      setTimeout(() => setEditFeedback(null), 4000);
    } catch (err) {
      setEditFeedback({ type: 'error', message: err.message });
    } finally {
      setEditSaving(false);
    }
  };

  const handleAddRevision = async (e) => {
    e.preventDefault();
    try {
      await apiPost(`/api/sops/${id}/revisions`, revisionForm);
      setShowAddRevision(false);
      setRevisionForm({ version: '', description: '', reason: '', author: '' });
      refetch();
    } catch (err) {
      alert('Failed to add revision: ' + err.message);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    try {
      await apiPost(`/api/sops/${id}/comments`, { comment: commentText });
      setCommentText('');
      refetch();
    } catch (err) {
      alert('Failed to add comment: ' + err.message);
    }
  };

  const handleDeleteComment = async (commentId) => {
    if (!confirm('Delete this comment?')) return;
    try {
      await apiDelete(`/api/sops/${id}/comments/${commentId}`);
      refetch();
    } catch (err) {
      alert('Failed to delete comment: ' + err.message);
    }
  };

  const handleReadContent = async () => {
    setContentReading(true);
    try {
      const response = await apiPost(`/api/sops/${id}/read-content`);
      setContentPreview(response);
      // Initialize all fields as selected by default
      if (response?.preview?.updates) {
        const initial = {};
        Object.keys(response.preview.updates).forEach(field => { initial[field] = true; });
        setSelectedFields(initial);
      }
      setShowContentReader(true);
    } catch (err) {
      if (err.status === 404) {
        setContentPreview({
          error: true,
          message: err.details?.message || 'No document uploaded yet for this SOP.',
          solution: err.details?.solution || 'To use "Read & Update", upload a .docx file first:',
          steps: err.details?.steps || [
            '1. Go to the "Documents" tab on this page',
            '2. Upload a .docx file for this SOP',
            '3. Then click "Read & Update" again'
          ],
        });
        setShowContentReader(true);
      } else {
        setContentPreview({
          error: true,
          message: err.message || 'An unexpected error occurred while reading the document.',
          solution: 'Please try again or contact an administrator if the problem persists.',
        });
        setShowContentReader(true);
      }
    } finally {
      setContentReading(false);
    }
  };

  const handleApplyContent = async () => {
    // Only send selected fields
    const filteredUpdates = {};
    for (const [field, change] of Object.entries(contentPreview.preview.updates)) {
      if (selectedFields[field]) {
        filteredUpdates[field] = change;
      }
    }
    if (Object.keys(filteredUpdates).length === 0) {
      alert('Please select at least one field to update.');
      return;
    }
    setContentApplying(true);
    try {
      await apiPost(`/api/sops/${id}/apply-content`, { updates: filteredUpdates });
      setShowContentReader(false);
      setContentPreview(null);
      setSelectedFields({});
      refetch();
      setEditFeedback({ type: 'success', message: 'Document content applied successfully' });
      setTimeout(() => setEditFeedback(null), 4000);
    } catch (err) {
      alert('Failed to apply updates: ' + err.message);
    } finally {
      setContentApplying(false);
    }
  };

  const handleChecklistUpdate = async (itemId, status) => {
    try {
      await apiPut(`/api/audit/${itemId}`, { status });
      refetch();
    } catch (err) {
      alert('Failed to update checklist: ' + err.message);
    }
  };

  // Stage the selected file and open the revision dialog (instead of uploading
  // immediately) so the uploader can declare minor vs. major before it writes
  // to the controlled record.
  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPendingUpload(file);
    setMajorRevision(false);
    e.target.value = '';
  };

  const handleConfirmUpload = async () => {
    if (!pendingUpload) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', pendingUpload);
      formData.append('bump', majorRevision ? 'major' : 'minor');
      const res = await fetch(`/api/sops/${id}/upload`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Upload failed');
      }
      refetchFiles();
      refetch();
      setPendingUpload(null);
      setMajorRevision(false);
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteFile = async () => {
    if (!deleteFileTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/files/${deleteFileTarget.id}`);
      refetchFiles();
    } catch (err) {
      alert('Failed to delete file: ' + err.message);
    } finally {
      setDeleting(false);
      setDeleteFileTarget(null);
    }
  };

  const handlePromoteFile = async (fileId) => {
    try {
      await apiPost(`/api/files/${fileId}/promote`);
      refetchFiles();
      setEditFeedback({ type: 'success', message: 'File promoted to current version' });
      setTimeout(() => setEditFeedback(null), 4000);
    } catch (err) {
      alert('Failed to promote file: ' + err.message);
    }
  };

  const handleArchiveFile = async (fileId) => {
    try {
      await apiPost(`/api/files/${fileId}/archive`);
      refetchFiles();
      setEditFeedback({ type: 'success', message: 'File archived' });
      setTimeout(() => setEditFeedback(null), 4000);
    } catch (err) {
      alert('Failed to archive file: ' + err.message);
    }
  };

  const handleAdminDelete = async () => {
    if (!confirm(`Are you sure you want to delete SOP ${sop.sop_number}? This action cannot be undone and will remove all revisions, comments, and attachments.`)) return;
    try {
      await apiDelete(`/api/admin/sops/${id}`);
      navigate('/sops');
    } catch (err) {
      alert('Failed to delete SOP: ' + err.message);
    }
  };

  const revisions = sop.revisions || [];
  const comments = sop.comments || [];
  const checklist = sop.audit_checklist || sop.checklist || [];
  const sopFiles = files || [];

  // Group files by original name, latest version first
  // All controlled-document files for this SOP form ONE lineage — newest is the
  // controlled copy, older ones are revision history — regardless of filename.
  // (Filenames carry a version like _v0_9_1 / _v1_0, so grouping by name would
  // wrongly render each upload as its own "Controlled" card.)
  const groupedFiles = {};
  if (sopFiles.length > 0) {
    const sorted = [...sopFiles].sort((a, b) => (b.id || 0) - (a.id || 0));
    const current = sorted.find(v => v.is_current !== false) || sorted[0];
    groupedFiles[current.original_name] = sorted;
  }

  // Open a sop_file in the viewer modal (reuse viewerDoc state with a type flag)
  const openSopFileViewer = (file) => {
    setViewerDoc({
      id: file.id,
      original_name: file.original_name,
      _isSopFile: true,
    });
  };

  const infoItems = [
    { icon: Tag, label: 'Version', value: sop.version || '-', field: 'version' },
    { icon: User, label: 'Owner', value: sop.owner || '-', field: 'owner' },
    { icon: Calendar, label: 'Effective Date', value: formatDate(sop.effective_date), field: 'effective_date' },
    { icon: Clock, label: 'Next Review', value: formatDate(sop.next_review_date), field: 'next_review_date' },
    { icon: FileText, label: 'Category', value: sop.category_name || '-', field: 'category_name' },
    { icon: Clock, label: 'Last Updated', value: formatDate(sop.updated_at) },
  ];

  // Editable field renderer
  const ef = (field) => editForm?.[field] ?? '';
  const setEf = (field, val) => setEditForm(f => ({ ...f, [field]: val }));

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back Button */}
      <button
        onClick={() => navigate('/sops')}
        className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to SOP Library
      </button>

      {/* Feedback toast */}
      {editFeedback && (
        <div className={`mb-4 px-4 py-3 rounded-lg text-sm font-medium flex items-center justify-between ${
          editFeedback.type === 'success' ? 'bg-green-50 border border-green-200 text-green-700' : 'bg-red-50 border border-red-200 text-red-700'
        }`}>
          <div className="flex items-center gap-2">
            {editFeedback.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
            {editFeedback.message}
          </div>
          <button onClick={() => setEditFeedback(null)} className="text-current opacity-60 hover:opacity-100">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <span className="text-sm font-mono font-semibold text-navy-600 bg-navy-50 px-2 py-0.5 rounded">
                {sop.sop_number}
              </span>
              <StatusBadge status={sop.status} type="status" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">{sop.title}</h1>
          </div>
          <div className="flex items-center gap-3">
            {linkedDocs && linkedDocs.length > 0 ? (
              <button
                onClick={() => setViewerDoc(linkedDocs[0])}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Eye className="w-4 h-4" />
                View Document
              </button>
            ) : sopFiles.length > 0 ? (
              <button
                onClick={() => openSopFileViewer(sopFiles[0])}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
              >
                <Eye className="w-4 h-4" />
                View Document
              </button>
            ) : null}
            {canWrite() && (
              <button
                onClick={handleReadContent}
                disabled={contentReading}
                className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors text-sm font-medium"
              >
                {contentReading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <BookOpen className="w-4 h-4" />
                )}
                {contentReading ? 'Reading...' : 'Read & Update'}
              </button>
            )}
            {hasRole('admin') && (
              <button
                onClick={handleAdminDelete}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
          </div>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-6 pt-6 border-t border-gray-100">
          {infoItems.map(item => (
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

      {/* Tabs */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b border-gray-200">
          <div className="flex">
            {TABS.map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex items-center gap-2 px-5 py-3.5 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-navy-600 text-navy-700'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
                {tab.key === 'forms' && sopForms?.length > 0 && (
                  <span className="ml-1 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">{sopForms.length}</span>
                )}
                {tab.key === 'revisions' && revisions.length > 0 && (
                  <span className="ml-1 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">{revisions.length}</span>
                )}
                {tab.key === 'comments' && comments.length > 0 && (
                  <span className="ml-1 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">{comments.length}</span>
                )}
                {tab.key === 'documents' && sopFiles.length > 0 && (
                  <span className="ml-1 bg-gray-100 text-gray-600 text-xs px-1.5 py-0.5 rounded-full">{sopFiles.length}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="p-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Edit toggle */}
              {canWrite() && !editMode && (
                <div className="flex justify-end">
                  <button
                    onClick={startEdit}
                    className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors text-sm font-medium"
                  >
                    <Edit className="w-4 h-4" />
                    Edit Overview
                  </button>
                </div>
              )}

              {editMode && editForm ? (
                /* ===== EDIT MODE ===== */
                <div className="space-y-5">
                  <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Editing Overview</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={cancelEdit}
                        className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveEdit}
                        disabled={editSaving}
                        className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700 disabled:bg-navy-400 transition-colors text-sm font-medium"
                      >
                        <Save className="w-4 h-4" />
                        {editSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </div>

                  {/* Title & SOP Number */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                      <input type="text" value={ef('title')} onChange={e => setEf('title', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">SOP Number</label>
                      <input type="text" value={ef('sop_number')} onChange={e => setEf('sop_number', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
                    </div>
                  </div>

                  {/* Version, Status */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Version</label>
                      <input type="text" value={ef('version')} onChange={e => setEf('version', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select value={ef('status')} onChange={e => setEf('status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 bg-white">
                        {STATUS_OPTIONS.map(s => (
                          <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Owner, Reviewer, Approver */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Owner</label>
                      <input type="text" value={ef('owner')} onChange={e => setEf('owner', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Reviewer</label>
                      <input type="text" value={ef('reviewer')} onChange={e => setEf('reviewer', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Approver</label>
                      <input type="text" value={ef('approver')} onChange={e => setEf('approver', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
                    </div>
                  </div>

                  {/* Dates */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
                      <input type="date" value={ef('effective_date')} onChange={e => setEf('effective_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Next Review Date</label>
                      <input type="date" value={ef('next_review_date')} onChange={e => setEf('next_review_date', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
                    </div>
                  </div>

                  {/* Category */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category Name</label>
                      <input type="text" value={ef('category_name')} onChange={e => setEf('category_name', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category Code</label>
                      <input type="text" value={ef('category_code')} onChange={e => setEf('category_code', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
                    </div>
                  </div>

                  {/* Description */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea value={ef('description')} onChange={e => setEf('description', e.target.value)} rows={4}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none" />
                  </div>

                  {/* Extracted Content Fields */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Scope</label>
                    <textarea value={ef('scope')} onChange={e => setEf('scope', e.target.value)} rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Procedure</label>
                    <textarea value={ef('procedure_text')} onChange={e => setEf('procedure_text', e.target.value)} rows={4}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Responsibilities</label>
                    <textarea value={ef('responsibilities')} onChange={e => setEf('responsibilities', e.target.value)} rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Materials & Equipment</label>
                    <textarea value={ef('materials_equipment')} onChange={e => setEf('materials_equipment', e.target.value)} rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none" />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">References</label>
                    <textarea value={ef('sop_references')} onChange={e => setEf('sop_references', e.target.value)} rows={3}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none" />
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                    <textarea value={ef('notes')} onChange={e => setEf('notes', e.target.value)} rows={4}
                      className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none" />
                  </div>

                  {/* Bottom save/cancel */}
                  <div className="flex justify-end gap-2 pt-3 border-t border-gray-200">
                    <button onClick={cancelEdit}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                      Cancel
                    </button>
                    <button onClick={handleSaveEdit} disabled={editSaving}
                      className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700 disabled:bg-navy-400 transition-colors text-sm font-medium">
                      <Save className="w-4 h-4" />
                      {editSaving ? 'Saving...' : 'Save Changes'}
                    </button>
                  </div>
                </div>
              ) : (
                /* ===== READ-ONLY MODE ===== */
                <div className="space-y-6">
                  {/* Document Information */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">Document Information</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">SOP Number</p>
                        <p className="text-sm font-medium text-gray-900">{sop.sop_number || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Version</p>
                        <p className="text-sm font-medium text-gray-900">{sop.version || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Status</p>
                        <StatusBadge status={sop.status} type="status" />
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Category</p>
                        <p className="text-sm font-medium text-gray-900">{sop.category_name || '-'}</p>
                      </div>
                      <div>
                        <p className="text-[11px] text-gray-400 uppercase tracking-wide">Category Code</p>
                        <p className="text-sm font-medium text-gray-900">{sop.category_code || '-'}</p>
                      </div>
                    </div>
                  </div>

                  {/* Personnel */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">Personnel</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2.5">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-[11px] text-gray-400 uppercase tracking-wide">Owner / Author</p>
                          <p className="text-sm font-medium text-gray-900">{sop.owner || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-[11px] text-gray-400 uppercase tracking-wide">Reviewer</p>
                          <p className="text-sm font-medium text-gray-900">{sop.reviewer || '-'}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <User className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-[11px] text-gray-400 uppercase tracking-wide">Approver</p>
                          <p className="text-sm font-medium text-gray-900">{sop.approver || '-'}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Dates */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3 pb-2 border-b border-gray-100">Dates</h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div className="flex items-center gap-2.5">
                        <Calendar className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-[11px] text-gray-400 uppercase tracking-wide">Effective Date</p>
                          <p className="text-sm font-medium text-gray-900">{formatDate(sop.effective_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-[11px] text-gray-400 uppercase tracking-wide">Next Review Date</p>
                          <p className="text-sm font-medium text-gray-900">{formatDate(sop.next_review_date)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <div>
                          <p className="text-[11px] text-gray-400 uppercase tracking-wide">Last Updated</p>
                          <p className="text-sm font-medium text-gray-900">{formatDate(sop.updated_at)}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Purpose / Description */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 pb-2 border-b border-gray-100">Purpose / Description</h3>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap">
                      {sop.description || 'No description provided.'}
                    </p>
                  </div>

                  {/* Scope */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 pb-2 border-b border-gray-100">Scope</h3>
                    <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-blue-50 border border-blue-100 rounded-lg p-4">
                      {sop.scope || 'Not specified.'}
                    </div>
                  </div>

                  {/* Procedure */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 pb-2 border-b border-gray-100">Procedure</h3>
                    <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-green-50 border border-green-100 rounded-lg p-4">
                      {sop.procedure_text || 'Not specified.'}
                    </div>
                  </div>

                  {/* Responsibilities */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 pb-2 border-b border-gray-100">Responsibilities</h3>
                    <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-purple-50 border border-purple-100 rounded-lg p-4">
                      {<FormattedText text={sop.responsibilities} variant="roles" />}
                    </div>
                  </div>

                  {/* Materials & Equipment */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 pb-2 border-b border-gray-100">Materials & Equipment</h3>
                    <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-amber-50 border border-amber-100 rounded-lg p-4">
                      {sop.materials_equipment || 'Not specified.'}
                    </div>
                  </div>

                  {/* References */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 pb-2 border-b border-gray-100">References</h3>
                    <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 border border-gray-200 rounded-lg p-4">
                      {<FormattedText text={sop.sop_references} variant="references" />}
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-2 pb-2 border-b border-gray-100">Notes</h3>
                    <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-3 min-h-[60px]">
                      {sop.notes || 'No notes yet.'}
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Forms Tab */}
          {activeTab === 'forms' && (
            <SOPForms sopId={id} />
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Controlled Document</h3>
                    <p className="text-xs text-gray-400 mt-0.5">The official current file for this SOP. Uploading a new file supersedes the current one — older files are kept in revision history, never deleted.</p>
                  </div>
                  {canWrite() && (
                    <label className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 cursor-pointer transition-colors">
                      <Upload className="w-4 h-4" />
                      {uploading ? 'Uploading...' : 'Upload New File'}
                      <input
                        type="file"
                        accept=".pdf,.docx,.doc"
                        onChange={handleFileSelect}
                        disabled={uploading}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>

                <p className="text-xs text-gray-400 mb-4">Accepted formats: PDF, DOCX. Max 50MB per file.</p>

                {sopFiles.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Paperclip className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                    <p className="text-sm text-gray-500">No SOP files uploaded yet</p>
                    {canWrite() && <p className="text-xs text-gray-400 mt-1">Upload the SOP document (PDF or DOCX)</p>}
                  </div>
                ) : (
                  <div className="space-y-5">
                    {Object.entries(groupedFiles).map(([name, versions]) => {
                      const current = versions.find(v => v.is_current !== false) || versions[0];
                      const history = versions.filter(v => v.id !== current.id);
                      const isOpen = !!expandedHistory[name];
                      return (
                        <div key={name} className="space-y-2">
                          {/* Controlled Document card */}
                          <div className="border border-navy-200 rounded-lg overflow-hidden ring-1 ring-navy-100">
                            <div className="bg-navy-50/60 px-4 py-3 flex items-start justify-between gap-3">
                              <div className="flex items-start gap-3 min-w-0">
                                <div className="w-9 h-9 rounded-lg bg-navy-800 text-white flex items-center justify-center shrink-0">
                                  <File className="w-4 h-4" />
                                </div>
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-sm font-semibold text-gray-900 truncate">{name}</span>
                                    <span className="text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                                      <ShieldCheck className="w-3 h-3" />
                                      Controlled
                                    </span>
                                  </div>
                                  <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                                    <span>{formatFileSize(current.file_size)}</span>
                                    <span>by {current.uploaded_by}</span>
                                    <span>{formatDate(current.uploaded_at)}</span>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right shrink-0">
                                <div className="text-[10px] uppercase tracking-wide text-gray-400">Document Version</div>
                                <div className="text-lg font-bold text-navy-800 leading-tight">{sop.version || '-'}</div>
                              </div>
                            </div>
                            <div className="px-4 py-2.5 flex items-center justify-end gap-3 border-t border-navy-100 bg-white">
                              <button
                                onClick={(e) => { e.stopPropagation(); openSopFileViewer(current); }}
                                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium"
                              >
                                <Eye className="w-3.5 h-3.5" />
                                View
                              </button>
                              <a
                                href={`/api/files/${current.id}/download`}
                                className="flex items-center gap-1 text-xs text-navy-600 hover:text-navy-800 font-medium"
                              >
                                <Download className="w-3.5 h-3.5" />
                                Download
                              </a>
                              {hasRole('admin') && (
                                <button
                                  onClick={(e) => { e.stopPropagation(); setDeleteFileTarget(current); }}
                                  className="flex items-center gap-1 text-xs text-gray-300 hover:text-red-600"
                                  title="Delete file (admin)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Revision history (collapsed) */}
                          {history.length > 0 && (
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                              <button
                                onClick={() => setExpandedHistory(prev => ({ ...prev, [name]: !prev[name] }))}
                                className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-gray-50"
                              >
                                <span className="flex items-center gap-2 text-xs font-medium text-gray-600">
                                  <History className="w-3.5 h-3.5 text-gray-400" />
                                  Revision History
                                  <span className="text-gray-400">({history.length} previous file{history.length > 1 ? 's' : ''})</span>
                                </span>
                                {isOpen ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                              </button>
                              {isOpen && (
                                <div className="divide-y divide-gray-100 border-t border-gray-200">
                                  {history.map((f, idx) => (
                                    <div key={f.id} className="px-4 py-2.5 flex items-center justify-between hover:bg-gray-50">
                                      <div className="flex items-center gap-3">
                                        <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-0.5 rounded">Rev {f.version}</span>
                                        <span className="text-xs font-medium text-gray-400 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                                          <Archive className="w-3 h-3" />
                                          Superseded
                                        </span>
                                        <span className="text-xs text-gray-500">{formatFileSize(f.file_size)}</span>
                                        <span className="text-xs text-gray-400">by {f.uploaded_by}</span>
                                        <span className="text-xs text-gray-400">{formatDate(f.uploaded_at)}</span>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        {canWrite() && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); handlePromoteFile(f.id); }}
                                            className="flex items-center gap-1 text-xs text-green-600 hover:text-green-800 font-medium"
                                            title="Restore as the controlled document"
                                          >
                                            <RefreshCw className="w-3.5 h-3.5" />
                                            Restore
                                          </button>
                                        )}
                                        <button
                                          onClick={(e) => { e.stopPropagation(); openSopFileViewer(f); }}
                                          className="text-xs text-blue-500 hover:text-blue-700"
                                          title="View in browser"
                                        >
                                          <Eye className="w-3.5 h-3.5" />
                                        </button>
                                        <a
                                          href={`/api/files/${f.id}/download`}
                                          className="text-xs text-gray-400 hover:text-navy-600"
                                        >
                                          <Download className="w-3.5 h-3.5" />
                                        </a>
                                        {hasRole('admin') && (
                                          <button
                                            onClick={(e) => { e.stopPropagation(); setDeleteFileTarget(f); }}
                                            className="text-xs text-gray-300 hover:text-red-600"
                                            title="Delete file (admin)"
                                          >
                                            <Trash2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              <div className="border-t border-gray-200 pt-6">
                <LinkedDocuments linkedType="sop" linkedId={id} category="sop" />
              </div>
            </div>
          )}

          {/* Revisions Tab */}
          {activeTab === 'revisions' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-gray-700">Revision History</h3>
                {canWrite() && (
                  <button
                    onClick={() => setShowAddRevision(!showAddRevision)}
                    className="flex items-center gap-1.5 text-sm text-navy-600 hover:text-navy-800 font-medium"
                  >
                    <Plus className="w-4 h-4" />
                    Add Revision
                  </button>
                )}
              </div>

              {showAddRevision && (
                <form onSubmit={handleAddRevision} className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                  <div className="grid grid-cols-2 gap-3 mb-3">
                    <input type="text" required placeholder="Version (e.g. 2.0)" value={revisionForm.version}
                      onChange={e => setRevisionForm(f => ({ ...f, version: e.target.value }))}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
                    <input type="text" required placeholder="Author" value={revisionForm.author}
                      onChange={e => setRevisionForm(f => ({ ...f, author: e.target.value }))}
                      className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
                  </div>
                  <input type="text" required placeholder="Description of changes" value={revisionForm.description}
                    onChange={e => setRevisionForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 mb-3" />
                  <input type="text" placeholder="Reason for revision" value={revisionForm.reason}
                    onChange={e => setRevisionForm(f => ({ ...f, reason: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 mb-3" />
                  <div className="flex justify-end gap-2">
                    <button type="button" onClick={() => setShowAddRevision(false)}
                      className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
                    <button type="submit"
                      className="px-3 py-1.5 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700">Add Revision</button>
                  </div>
                </form>
              )}

              {revisions.length === 0 ? (
                <div className="text-center py-8">
                  <History className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No revisions recorded</p>
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
                  <div className="space-y-4">
                    {revisions.map((rev, idx) => (
                      <div key={rev.id || idx} className="relative pl-10">
                        <div className="absolute left-2.5 top-1.5 w-3 h-3 bg-navy-600 rounded-full border-2 border-white" />
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-semibold text-gray-900">v{rev.version}</span>
                            <span className="text-xs text-gray-400">{formatDate(rev.created_at || rev.date)}</span>
                          </div>
                          <p className="text-sm text-gray-700">{rev.change_description || rev.description}</p>
                          {rev.reason && <p className="text-xs text-gray-500 mt-1">Reason: {rev.reason}</p>}
                          <p className="text-xs text-gray-400 mt-1">By {rev.changed_by || rev.author || 'Unknown'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Comments Tab */}
          {activeTab === 'comments' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Comments</h3>

              {canWrite() && (
                <form onSubmit={handleAddComment} className="bg-gray-50 rounded-lg p-4 mb-6 border border-gray-200">
                  <div className="text-xs text-gray-500 mb-2">Posting as <span className="font-medium text-gray-700">{user?.display_name || user?.username || 'Unknown'}</span></div>
                  <textarea required placeholder="Write a comment..." value={commentText}
                    onChange={e => setCommentText(e.target.value)} rows={3}
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none mb-3" />
                  <div className="flex justify-end">
                    <button type="submit"
                      className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700">Add Comment</button>
                  </div>
                </form>
              )}

              {comments.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No comments yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {comments.map((c, idx) => (
                    <div key={c.id || idx} className="bg-gray-50 rounded-lg p-4 border border-gray-100">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 bg-navy-100 rounded-full flex items-center justify-center">
                            <User className="w-3.5 h-3.5 text-navy-600" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">{c.author || 'Anonymous'}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs text-gray-400" title={c.created_at ? new Date(c.created_at).toLocaleString() : ''}>{formatDateTime(c.created_at)}</span>
                          {canWrite() && (
                            <button onClick={() => handleDeleteComment(c.id)} className="p-1 text-gray-300 hover:text-red-500 transition-colors" title="Delete comment">
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{c.comment}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Audit Checklist Tab */}
          {activeTab === 'audit' && (
            <div>
              <h3 className="text-sm font-semibold text-gray-700 mb-4">Audit Checklist</h3>

              {checklist.length === 0 ? (
                <div className="text-center py-8">
                  <ClipboardCheck className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                  <p className="text-sm text-gray-500">No audit checklist items</p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-gray-50 border-b border-gray-200">
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Requirement</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-40">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-48">Notes</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                      {checklist.map((item, idx) => {
                        const statusIcon = item.status === 'met' ? CheckCircle :
                          item.status === 'partial' ? AlertTriangle :
                          item.status === 'not_met' ? XCircle : Minus;
                        const StatusIcon = statusIcon;
                        const iconColor = item.status === 'met' ? 'text-green-500' :
                          item.status === 'partial' ? 'text-amber-500' :
                          item.status === 'not_met' ? 'text-red-500' : 'text-gray-400';

                        return (
                          <tr key={item.id || idx} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <StatusIcon className={`w-4 h-4 flex-shrink-0 ${iconColor}`} />
                                <span className="text-sm text-gray-900">{item.requirement || item.description || item.title}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <select
                                value={item.status || 'na'}
                                onChange={e => handleChecklistUpdate(item.id, e.target.value)}
                                disabled={!canWrite()}
                                className={`px-2 py-1 rounded-lg text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-navy-500 ${
                                  item.status === 'met' ? 'bg-green-50 border-green-200 text-green-700' :
                                  item.status === 'partial' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                  item.status === 'not_met' ? 'bg-red-50 border-red-200 text-red-700' :
                                  'bg-gray-50 border-gray-200 text-gray-600'
                                } ${!canWrite() ? 'opacity-60 cursor-not-allowed' : ''}`}
                              >
                                {AUDIT_STATUSES.map(s => (
                                  <option key={s} value={s}>
                                    {s === 'na' ? 'N/A' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                  </option>
                                ))}
                              </select>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-gray-500">{item.notes || '-'}</span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Content Reader Modal — with per-field checkboxes (BUG 6 FIX) */}
      <Modal
        isOpen={showContentReader}
        onClose={() => setShowContentReader(false)}
        title="SOP Content Analysis"
        size="large"
      >
        {contentPreview?.error ? (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-amber-600" />
                <h4 className="font-medium text-amber-800">No Document Linked</h4>
              </div>
              <p className="text-sm text-amber-700 mt-1">{contentPreview.message}</p>
              {contentPreview.solution && (
                <p className="text-sm font-medium text-amber-800 mt-3">{contentPreview.solution}</p>
              )}
              {contentPreview.steps?.length > 0 && (
                <ol className="text-sm text-amber-700 mt-2 space-y-1 list-decimal list-inside">
                  {contentPreview.steps.map((step, i) => (
                    <li key={i}>{step.replace(/^\d+\.\s*/, '')}</li>
                  ))}
                </ol>
              )}
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => { setShowContentReader(false); setContentPreview(null); }}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >Close</button>
            </div>
          </div>
        ) : contentPreview && (
          <div className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium text-blue-800">Document Analysis Complete</h4>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Extracted content from: {contentPreview.document_info?.filename}
              </p>
              {contentPreview.extraction.warnings?.length > 0 && (
                <div className="mt-2">
                  <p className="text-sm font-medium text-amber-800">Warnings:</p>
                  <ul className="text-sm text-amber-700 list-disc list-inside mt-1">
                    {contentPreview.extraction.warnings.map((warning, i) => (
                      <li key={i}>{warning}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {contentPreview.preview.hasUpdates ? (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">Proposed Updates</h4>
                  <div className="flex items-center gap-3 text-xs">
                    <button
                      onClick={() => {
                        const all = {};
                        Object.keys(contentPreview.preview.updates).forEach(f => { all[f] = true; });
                        setSelectedFields(all);
                      }}
                      className="text-navy-600 hover:text-navy-800 font-medium"
                    >Select All</button>
                    <button
                      onClick={() => setSelectedFields({})}
                      className="text-navy-600 hover:text-navy-800 font-medium"
                    >Deselect All</button>
                  </div>
                </div>
                {Object.entries(contentPreview.preview.updates).map(([field, change]) => (
                  <div key={field} className={`border rounded-lg p-4 transition-colors ${selectedFields[field] ? 'border-navy-200 bg-white' : 'border-gray-200 bg-gray-50 opacity-60'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!selectedFields[field]}
                          onChange={e => setSelectedFields(prev => ({ ...prev, [field]: e.target.checked }))}
                          className="w-4 h-4 rounded border-gray-300 text-navy-600 focus:ring-navy-500"
                        />
                        <h5 className="font-medium text-gray-900 capitalize">{field.replace(/_/g, ' ')}</h5>
                      </label>
                      {selectedFields[field] && (
                        <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded">Will Update</span>
                      )}
                    </div>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs text-gray-500 uppercase tracking-wide">Current</label>
                        <div className="text-sm text-gray-700 bg-gray-50 p-2 rounded mt-1">
                          {change.current || <em className="text-gray-400">Empty</em>}
                        </div>
                      </div>
                      <div>
                        <label className="text-xs text-green-600 uppercase tracking-wide">Proposed</label>
                        <div className="text-sm text-gray-900 bg-green-50 p-2 rounded mt-1">
                          {change.proposed}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}

                <div className="flex items-center justify-between pt-4 border-t">
                  <div className="text-sm text-gray-500">
                    {Object.values(selectedFields).filter(Boolean).length} of {Object.keys(contentPreview.preview.updates).length} field(s) selected
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowContentReader(false)}
                      className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >Cancel</button>
                    <button
                      onClick={handleApplyContent}
                      disabled={contentApplying || Object.values(selectedFields).filter(Boolean).length === 0}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 disabled:bg-green-400"
                    >
                      {contentApplying ? (
                        <><RefreshCw className="w-4 h-4 animate-spin" />Applying...</>
                      ) : (
                        <><CheckCircle className="w-4 h-4" />Apply Selected</>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <Eye className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Updates Needed</h4>
                <p className="text-gray-500">The SOP record is already up-to-date with the document content.</p>
                <div className="mt-4">
                  <button onClick={() => setShowContentReader(false)}
                    className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200">Close</button>
                </div>
              </div>
            )}

            <div className="border-t pt-4">
              <details className="text-sm">
                <summary className="cursor-pointer text-gray-600 hover:text-gray-900">View extraction details</summary>
                <div className="mt-2 space-y-2 text-gray-600">
                  <div><strong>Word count:</strong> {contentPreview.extraction.word_count}</div>
                  <div><strong>Extracted at:</strong> {new Date(contentPreview.extraction.extraction_timestamp).toLocaleString()}</div>
                  {contentPreview.extraction.extracted_version && (
                    <div><strong>Document version:</strong> {contentPreview.extraction.extracted_version}</div>
                  )}
                  {contentPreview.extraction.extracted_author && (
                    <div><strong>Document author:</strong> {contentPreview.extraction.extracted_author}</div>
                  )}
                </div>
              </details>
            </div>
          </div>
        )}
      </Modal>

      {/* Delete File Confirmation Modal */}
      {pendingUpload && (() => {
        const preview = previewNextVersion(sop.version, pendingUpload.name, majorRevision);
        const fromFilename = preview.source === 'filename';
        return (
          <Modal isOpen={true} onClose={() => { if (!uploading) { setPendingUpload(null); setMajorRevision(false); } }} title="Upload New Revision">
            <div className="p-4 space-y-4">
              <div>
                <div className="text-[11px] uppercase tracking-wide text-gray-400">File</div>
                <div className="text-sm font-medium text-gray-900 break-all">{pendingUpload.name}</div>
              </div>

              <div className="flex items-center gap-2 text-sm">
                <span className="text-gray-500">Document version</span>
                <span className="font-semibold text-gray-700">{sop.version || '1.0'}</span>
                <ChevronRight className="w-4 h-4 text-gray-400" />
                <span className="font-bold text-navy-800">{preview.value}</span>
              </div>

              {fromFilename ? (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  Version <strong>{preview.value}</strong> is taken from the filename and overrides the toggle below (QA-controlled manual version).
                </p>
              ) : (
                <label className="flex items-start gap-2.5 p-3 border border-gray-200 rounded-lg cursor-pointer hover:bg-gray-50">
                  <input
                    type="checkbox"
                    checked={majorRevision}
                    onChange={(e) => setMajorRevision(e.target.checked)}
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-navy-800 focus:ring-navy-700"
                  />
                  <span className="text-sm">
                    <span className="font-medium text-gray-900">Major revision</span>
                    <span className="block text-xs text-gray-500 mt-0.5">
                      Check this only if the <strong>procedure changed</strong> — new/removed steps, a changed CCP or critical limit, different equipment or materials (triggers re-training/re-approval). Bumps the whole number (→ {previewMajor(sop.version)}). Leave unchecked for clarifications/wording fixes (minor → {previewMinor(sop.version)}).
                    </span>
                  </span>
                </label>
              )}

              <p className="text-xs text-gray-400">The current file moves to revision history — nothing is deleted.</p>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  onClick={() => { setPendingUpload(null); setMajorRevision(false); }}
                  disabled={uploading}
                  className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmUpload}
                  disabled={uploading}
                  className="px-3 py-1.5 text-sm text-white bg-navy-800 hover:bg-navy-700 rounded-lg disabled:opacity-50"
                >
                  {uploading ? 'Uploading…' : `Upload as ${preview.value}`}
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {deleteFileTarget && (
        <Modal isOpen={true} onClose={() => setDeleteFileTarget(null)} title="Delete File">
          <div className="p-4">
            <p className="text-sm text-gray-700 mb-1">
              Are you sure you want to delete this file? This action cannot be undone.
            </p>
            <p className="text-sm font-medium text-gray-900 mb-4">
              {deleteFileTarget.original_name} (v{deleteFileTarget.version})
            </p>
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDeleteFileTarget(null)}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteFile}
                disabled={deleting}
                className="px-3 py-1.5 text-sm text-white bg-red-600 hover:bg-red-700 rounded-lg disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Document Viewer Modal — supports both linked documents and sop_files */}
      {viewerDoc && (() => {
        const isSopFile = viewerDoc._isSopFile;
        const isPdf = (viewerDoc.original_name || '').toLowerCase().endsWith('.pdf');
        const downloadUrl = isSopFile
          ? `/api/files/${viewerDoc.id}/download`
          : `/api/documents/${viewerDoc.id}/download`;
        const previewUrl = isSopFile
          ? (isPdf ? `/api/files/${viewerDoc.id}/preview` : `/api/files/${viewerDoc.id}/preview-html`)
          : (isPdf ? `/api/documents/${viewerDoc.id}/preview` : `/api/documents/${viewerDoc.id}/preview-html`);

        return (
          <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setViewerDoc(null)}>
            <div className="bg-white rounded-xl w-full max-w-5xl h-[90vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
                <div className="flex items-center gap-3 min-w-0">
                  <FileText className="w-5 h-5 text-blue-500 flex-shrink-0" />
                  <h3 className="font-semibold text-gray-900 truncate">{viewerDoc.original_name}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={downloadUrl}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100"
                  >
                    <Download className="w-4 h-4" />
                    Download
                  </a>
                  <button onClick={() => setViewerDoc(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
              <div className="flex-1 bg-gray-100">
                <iframe
                  src={previewUrl}
                  className="w-full h-full border-0"
                  title={`View: ${viewerDoc.original_name}`}
                />
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
