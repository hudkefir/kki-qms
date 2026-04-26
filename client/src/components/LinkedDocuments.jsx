import React, { useState, useRef } from 'react';
import { useFetch } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import { FileText, Download, Upload, File, Image, Table2, FolderOpen, X, CheckCircle, AlertCircle, Eye, Tag, Trash2 } from 'lucide-react';

const CATEGORY_COLORS = {
  sop: 'bg-blue-100 text-blue-700',
  ccr: 'bg-purple-100 text-purple-700',
  complaint: 'bg-orange-100 text-orange-700',
  audit: 'bg-green-100 text-green-700',
  general: 'bg-gray-100 text-gray-700',
};

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatDateTime(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-CA') + ' at ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function getFileIcon(type) {
  if (['pdf'].includes(type)) return <FileText className="w-4 h-4 text-red-500" />;
  if (['jpg', 'jpeg', 'png'].includes(type)) return <Image className="w-4 h-4 text-green-500" />;
  if (['xlsx', 'xls'].includes(type)) return <Table2 className="w-4 h-4 text-emerald-600" />;
  if (['docx', 'doc'].includes(type)) return <FileText className="w-4 h-4 text-blue-500" />;
  return <File className="w-4 h-4 text-gray-400" />;
}

function isPdf(filename) {
  return (filename || '').toLowerCase().endsWith('.pdf');
}

function isDocx(filename) {
  const lower = (filename || '').toLowerCase();
  return lower.endsWith('.docx') || lower.endsWith('.doc');
}

function isPreviewable(filename) {
  return isPdf(filename) || isDocx(filename);
}

export default function LinkedDocuments({ linkedType, linkedId, category }) {
  const { canWrite, user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: documents, refetch } = useFetch(
    `/api/documents?linked_type=${linkedType}&linked_id=${linkedId}`
  );
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState(null);
  const [previewDoc, setPreviewDoc] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const fileInputRef = useRef(null);

  const docs = documents || [];

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const handleUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;
    setUploading(true);

    try {
      const formData = new FormData();
      files.forEach(f => formData.append('files', f));
      formData.append('category', category || 'general');
      formData.append('linked_type', linkedType);
      formData.append('linked_id', linkedId);

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Upload failed');
      }

      showToast('Document uploaded');
      refetch();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/documents/${deleteTarget.id}`, {
        method: 'DELETE',
        credentials: 'include',
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || 'Delete failed');
      }
      showToast('Document deleted');
      setDeleteTarget(null);
      setSelectedDocs(prev => { const next = new Set(prev); next.delete(deleteTarget.id); return next; });
      refetch();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setDeleting(false);
    }
  };

  const toggleSelectDoc = (id) => {
    setSelectedDocs(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedDocs.size === docs.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(docs.map(d => d.id)));
    }
  };

  const handleBulkDelete = async () => {
    if (selectedDocs.size === 0) return;
    setDeleting(true);
    try {
      for (const id of selectedDocs) {
        const res = await fetch(`/api/documents/${id}`, {
          method: 'DELETE',
          credentials: 'include',
        });
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.error || 'Delete failed');
        }
      }
      showToast(`${selectedDocs.size} document${selectedDocs.size !== 1 ? 's' : ''} deleted`);
      setSelectedDocs(new Set());
      setBulkDeleteConfirm(false);
      refetch();
    } catch (err) {
      showToast(err.message, 'error');
      refetch();
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Toast */}
        {toast && (
          <div className={`mb-4 flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${
            toast.type === 'error' ? 'bg-red-50 text-red-700' : 'bg-green-50 text-green-700'
          }`}>
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4" /> : <CheckCircle className="w-4 h-4" />}
            {toast.message}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Linked Documents</h2>
            <p className="text-xs text-gray-400 mt-0.5">Supporting files — drafts, reference materials, superseded versions, related forms.</p>
          </div>
          {canWrite() && (
            <label className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 cursor-pointer transition-colors">
              <Upload className="w-4 h-4" />
              {uploading ? 'Uploading...' : 'Upload'}
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept=".pdf,.docx,.doc,.xlsx,.xls,.jpg,.jpeg,.png"
                onChange={handleUpload}
                disabled={uploading}
                className="hidden"
              />
            </label>
          )}
        </div>

        {/* Bulk Delete Toolbar */}
        {isAdmin && selectedDocs.size > 0 && (
          <div className="flex items-center gap-3 mb-3 px-3 py-2 bg-red-50 border border-red-200 rounded-lg">
            <span className="text-sm font-medium text-red-700">{selectedDocs.size} selected</span>
            <button
              onClick={() => setBulkDeleteConfirm(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              <Trash2 className="w-4 h-4" />
              Delete Selected
            </button>
            <button
              onClick={() => setSelectedDocs(new Set())}
              className="px-2 py-1.5 text-sm text-gray-600 hover:text-gray-800 font-medium"
            >
              Clear
            </button>
          </div>
        )}

        {docs.length === 0 ? (
          <div className="text-center py-8">
            <FolderOpen className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No documents linked</p>
            {canWrite() && <p className="text-xs text-gray-400 mt-1">Upload files to attach to this record</p>}
          </div>
        ) : (
          <div className="space-y-2">
            {isAdmin && docs.length > 1 && (
              <div className="flex items-center gap-2 px-3 py-1">
                <input
                  type="checkbox"
                  checked={docs.length > 0 && selectedDocs.size === docs.length}
                  onChange={toggleSelectAll}
                  className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                />
                <span className="text-xs text-gray-500">Select all</span>
              </div>
            )}
            {docs.map(doc => {
              const ext = (doc.filename || doc.original_name || '').split('.').pop().toLowerCase();
              return (
                <div key={doc.id} className={`flex items-center justify-between p-3 rounded-lg hover:bg-gray-100 transition-colors ${selectedDocs.has(doc.id) ? 'bg-red-50/50' : 'bg-gray-50'}`}>
                  <div className="flex items-center gap-3 min-w-0">
                    {isAdmin && (
                      <input
                        type="checkbox"
                        checked={selectedDocs.has(doc.id)}
                        onChange={() => toggleSelectDoc(doc.id)}
                        className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500 flex-shrink-0"
                      />
                    )}
                    {getFileIcon(ext)}
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">{doc.original_name}</p>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-xs text-gray-400">{formatFileSize(doc.file_size)}</span>
                        <span className="text-xs text-gray-400">v{doc.version}</span>
                        <span className="text-xs text-gray-400">{doc.uploaded_by}</span>
                        {doc.download_count > 0 && (
                          <span className="text-xs text-gray-400">{doc.download_count} download{doc.download_count !== 1 ? 's' : ''}</span>
                        )}
                        <span className="text-xs text-gray-400" title={`Uploaded: ${new Date(doc.created_at || doc.upload_date).toLocaleString()}`}>
                          {formatDateTime(doc.created_at || doc.upload_date)}
                        </span>
                      </div>
                      {doc.tags && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {doc.tags.split(',').map((tag, i) => (
                            <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-200 text-[10px] text-gray-600">
                              <Tag className="w-2.5 h-2.5" />
                              {tag.trim()}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {isPreviewable(doc.filename || doc.original_name) && (
                      <button
                        onClick={() => setPreviewDoc(doc)}
                        className="p-1.5 text-gray-400 hover:text-blue-600 rounded-lg hover:bg-white"
                        title="View Document"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                    <a
                      href={`/api/documents/${doc.id}/download`}
                      className="p-1.5 text-gray-400 hover:text-navy-600 rounded-lg hover:bg-white flex-shrink-0"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    {isAdmin && (
                      <button
                        onClick={() => setDeleteTarget(doc)}
                        className="p-1.5 text-red-500 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors"
                        title="Delete document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setDeleteTarget(null)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete Document</h3>
            </div>
            <p className="text-gray-700 mb-2">
              Are you sure you want to permanently delete <span className="font-semibold">"{deleteTarget.original_name}"</span>?
            </p>
            <p className="text-sm text-red-600 mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting...' : 'Delete Permanently'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bulk Delete Confirmation Modal */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setBulkDeleteConfirm(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-red-100 rounded-lg">
                <Trash2 className="w-5 h-5 text-red-600" />
              </div>
              <h3 className="text-lg font-semibold text-gray-900">Delete {selectedDocs.size} Document{selectedDocs.size !== 1 ? 's' : ''}</h3>
            </div>
            <p className="text-gray-700 mb-2">
              Are you sure you want to permanently delete <span className="font-semibold">{selectedDocs.size} document{selectedDocs.size !== 1 ? 's' : ''}</span>?
            </p>
            <div className="max-h-32 overflow-y-auto bg-gray-50 rounded-lg p-2 mb-3 space-y-1">
              {docs.filter(d => selectedDocs.has(d.id)).map(d => (
                <div key={d.id} className="flex items-center gap-2 text-sm text-gray-700">
                  {getFileIcon((d.filename || d.original_name || '').split('.').pop().toLowerCase())}
                  <span className="truncate">{d.original_name}</span>
                </div>
              ))}
            </div>
            <p className="text-sm text-red-600 mb-4">This action cannot be undone.</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBulkDelete}
                disabled={deleting}
                className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                <Trash2 className="w-4 h-4" />
                {deleting ? 'Deleting...' : `Delete ${selectedDocs.size} Document${selectedDocs.size !== 1 ? 's' : ''}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className={`w-5 h-5 flex-shrink-0 ${isPdf(previewDoc.original_name) ? 'text-red-500' : 'text-blue-500'}`} />
                <h3 className="font-semibold text-gray-900 truncate">{previewDoc.original_name}</h3>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={`/api/documents/${previewDoc.id}/download`}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100"
                >
                  <Download className="w-4 h-4" />
                  Download
                </a>
                <button onClick={() => setPreviewDoc(null)} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>
            <div className="flex-1 bg-gray-100">
              <iframe
                src={isDocx(previewDoc.original_name) ? `/api/documents/${previewDoc.id}/preview-html` : `/api/documents/${previewDoc.id}/preview`}
                className="w-full h-full border-0"
                title={`Preview: ${previewDoc.original_name}`}
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
