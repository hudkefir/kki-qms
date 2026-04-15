import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Upload, FileText, Download, Trash2, Search, Filter, FolderOpen,
  ArrowUpDown, ArrowUp, ArrowDown, Eye, X, History, Tag, File, Image, Table2, ChevronDown,
  ClipboardList, ExternalLink, RotateCcw
} from 'lucide-react';
import { useFetch, apiPost, apiDelete } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { useAuth } from '../hooks/useAuth';

// Debounce hook for search
function useDebounce(value, delay) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

const CATEGORY_OPTIONS = [
  { value: 'sop', label: 'SOP', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'ccr', label: 'CCR', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'complaint', label: 'Complaint', color: 'bg-red-50 text-red-700 border-red-200' },
  { value: 'audit', label: 'Audit', color: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'general', label: 'General', color: 'bg-gray-50 text-gray-700 border-gray-200' }
];

const DOCUMENT_TYPE_OPTIONS = [
  { value: '', label: 'All Types' },
  { value: 'sop', label: 'SOP' },
  { value: 'form', label: 'Form' },
  { value: 'logbook', label: 'Logbook' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'specification', label: 'Specification' },
  { value: 'policy', label: 'Policy' },
  { value: 'record', label: 'Record' },
  { value: 'supplement', label: 'Supplement' },
  { value: 'other', label: 'Other' },
];

const DOC_TYPE_COLORS = {
  sop: 'bg-blue-100 text-blue-700',
  form: 'bg-amber-100 text-amber-700',
  logbook: 'bg-teal-100 text-teal-700',
  checklist: 'bg-indigo-100 text-indigo-700',
  specification: 'bg-pink-100 text-pink-700',
  policy: 'bg-cyan-100 text-cyan-700',
  record: 'bg-orange-100 text-orange-700',
  supplement: 'bg-lime-100 text-lime-700',
  other: 'bg-gray-100 text-gray-600',
};

const VERSION_TYPE_OPTIONS = [
  { value: 'minor', label: 'Minor update (v1.1)', desc: 'Documentation only, no training needed' },
  { value: 'major', label: 'Major revision (v2.0)', desc: 'Process changes, requires training' }
];

const SORT_OPTIONS = [
  { value: 'date', label: 'Date uploaded' },
  { value: 'name', label: 'File name' },
  { value: 'size', label: 'File size' },
  { value: 'downloads', label: 'Downloads' },
  { value: 'version', label: 'Version' }
];

function formatFileSize(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(filename) {
  const ext = (filename || '').split('.').pop().toLowerCase();
  if (ext === 'pdf') return <FileText className="w-5 h-5 text-red-500" />;
  if (['jpg', 'jpeg', 'png'].includes(ext)) return <Image className="w-5 h-5 text-green-500" />;
  if (['xlsx', 'xls'].includes(ext)) return <Table2 className="w-5 h-5 text-emerald-600" />;
  if (['docx', 'doc'].includes(ext)) return <FileText className="w-5 h-5 text-blue-500" />;
  return <File className="w-5 h-5 text-gray-400" />;
}

function isPdf(filename) {
  return (filename || '').toLowerCase().endsWith('.pdf');
}

export default function DocumentLibrary() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortBy, setSortBy] = useState('date');
  const [sortOrder, setSortOrder] = useState('desc');
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [docTypeFilter, setDocTypeFilter] = useState('');
  const [uploadForm, setUploadForm] = useState({
    category: 'general',
    versionType: 'major',
    description: '',
    versionNotes: '',
    document_type: 'other',
    linked_sop_id: ''
  });
  const [previewDoc, setPreviewDoc] = useState(null);
  const [versionHistory, setVersionHistory] = useState(null);
  const [versionLoading, setVersionLoading] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [selectedDocs, setSelectedDocs] = useState(new Set());
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [activeTab, setActiveTab] = useState('documents'); // 'documents' | 'forms'
  const fileInputRef = useRef();

  // Debounce search to avoid firing on every keystroke
  const debouncedSearch = useDebounce(searchTerm, 300);

  // Build query string for server-side filtering/sorting
  // Fetch SOPs for linking dropdown
  const { data: sops } = useFetch('/api/sops');

  const queryParams = new URLSearchParams();
  if (categoryFilter) queryParams.set('category', categoryFilter);
  if (docTypeFilter) queryParams.set('document_type', docTypeFilter);
  if (debouncedSearch) queryParams.set('search', debouncedSearch);
  if (sortBy) queryParams.set('sort', sortBy);
  if (sortOrder) queryParams.set('order', sortOrder);

  const { data: documents, loading, error, refetch } = useFetch(`/api/documents?${queryParams.toString()}`);

  // Fetch forms for the Forms tab
  const formsQueryParams = new URLSearchParams();
  if (debouncedSearch) formsQueryParams.set('search', debouncedSearch);
  const { data: formsData, loading: formsLoading, refetch: refetchForms } = useFetch(`/api/forms?${formsQueryParams.toString()}`);

  const hasActiveFilters = categoryFilter || docTypeFilter || searchTerm;

  const clearAllFilters = () => {
    setSearchTerm('');
    setCategoryFilter('');
    setDocTypeFilter('');
  };

  const canWrite = user?.role === 'admin' || user?.role === 'manager';
  const isAdmin = user?.role === 'admin';

  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (canWrite) setDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(false);
    if (!canWrite) return;
    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      setUploadFiles(files);
      setShowUploadForm(true);
    }
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      setUploadFiles(files);
      setShowUploadForm(true);
    }
  };

  const handleUpload = async () => {
    if (uploadFiles.length === 0) return;
    setUploading(true);
    try {
      const formData = new FormData();
      uploadFiles.forEach(file => formData.append('files', file));
      formData.append('category', uploadForm.category);
      formData.append('versionType', uploadForm.versionType);
      formData.append('description', uploadForm.description);
      formData.append('versionNotes', uploadForm.versionNotes);
      formData.append('document_type', uploadForm.document_type);
      if (uploadForm.linked_sop_id) formData.append('linked_sop_id', uploadForm.linked_sop_id);

      await apiPost('/api/documents/upload', formData);
      setShowUploadForm(false);
      setUploadFiles([]);
      setUploadForm({ category: 'general', versionType: 'major', description: '', versionNotes: '', document_type: 'other', linked_sop_id: '' });
      refetch();
    } catch (err) {
      alert('Upload failed: ' + err.message);
    } finally {
      setUploading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await apiDelete(`/api/documents/${deleteTarget.id}`);
      setDeleteTarget(null);
      setSelectedDocs(prev => { const next = new Set(prev); next.delete(deleteTarget.id); return next; });
      refetch();
    } catch (err) {
      alert('Delete failed: ' + err.message);
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

  const confirmBulkDelete = async () => {
    if (selectedDocs.size === 0) return;
    setDeleting(true);
    try {
      for (const id of selectedDocs) {
        await apiDelete(`/api/documents/${id}`);
      }
      setSelectedDocs(new Set());
      setBulkDeleteConfirm(false);
      refetch();
    } catch (err) {
      alert('Bulk delete failed: ' + err.message);
      refetch();
    } finally {
      setDeleting(false);
    }
  };

  const toggleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder(field === 'name' ? 'asc' : 'desc');
    }
  };

  const getSortIcon = (field) => {
    if (sortBy !== field) return <ArrowUpDown className="w-3.5 h-3.5 text-gray-300" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3.5 h-3.5 text-blue-600" />
      : <ArrowDown className="w-3.5 h-3.5 text-blue-600" />;
  };

  const handleViewVersions = async (doc) => {
    setVersionLoading(true);
    try {
      const res = await fetch(`/api/documents/${doc.id}/versions`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load versions');
      const versions = await res.json();
      setVersionHistory({ doc, versions });
    } catch (err) {
      alert('Failed to load version history: ' + err.message);
    } finally {
      setVersionLoading(false);
    }
  };

  const getCategoryBadge = (category) => {
    const cat = CATEGORY_OPTIONS.find(c => c.value === category) || CATEGORY_OPTIONS[4];
    return (
      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${cat.color}`}>
        {cat.label}
      </span>
    );
  };

  const parseTags = (tags) => {
    if (!tags) return [];
    return tags.split(',').map(t => t.trim()).filter(Boolean);
  };

  const docs = documents || [];

  if (loading) return <LoadingSpinner message="Loading documents..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Document Library</h1>
        <p className="text-gray-600 mt-2">
          Manage and organize all QMS documents — {docs.length} document{docs.length !== 1 ? 's' : ''}
        </p>
      </div>

      {/* Upload Zone */}
      {canWrite && (
        <div
          className={`relative mb-8 border-2 border-dashed rounded-xl p-8 text-center transition-all cursor-pointer ${
            dragOver ? 'border-blue-400 bg-blue-50 scale-[1.01]' : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
          }`}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.docx,.xlsx,.jpg,.jpeg,.png"
            className="hidden"
            onChange={handleFileSelect}
          />
          <Upload className={`w-12 h-12 mx-auto mb-4 ${dragOver ? 'text-blue-500' : 'text-gray-400'}`} />
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {dragOver ? 'Drop files here' : 'Upload Documents'}
          </h3>
          <p className="text-gray-500">Drag and drop files here, or click to browse</p>
          <p className="text-sm text-gray-400 mt-2">PDF, DOCX, XLSX, JPG, PNG — up to 50MB each</p>
        </div>
      )}

      {/* Filters & Sort Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          {/* Search */}
          <div className="relative flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400 flex-shrink-0" />
            <input
              type="text"
              placeholder="Search by name, description, or tags..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 pr-8 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-2 p-0.5 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100"
                title="Clear search"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Category filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Categories</option>
              {CATEGORY_OPTIONS.map(cat => (
                <option key={cat.value} value={cat.value}>{cat.label}</option>
              ))}
            </select>
          </div>

          {/* Document Type filter */}
          <div className="flex items-center gap-2">
            <select
              value={docTypeFilter}
              onChange={(e) => setDocTypeFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DOCUMENT_TYPE_OPTIONS.map(dt => (
                <option key={dt.value} value={dt.value}>{dt.label}</option>
              ))}
            </select>
          </div>

          {/* Sort */}
          <div className="flex items-center gap-1">
            {SORT_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => toggleSort(opt.value)}
                className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  sortBy === opt.value ? 'bg-blue-50 text-blue-700' : 'text-gray-500 hover:bg-gray-100'
                }`}
              >
                {opt.label}
                {getSortIcon(opt.value)}
              </button>
            ))}
          </div>

          {/* Clear Filters */}
          {hasActiveFilters && (
            <button
              onClick={clearAllFilters}
              className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
              title="Clear all filters"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Clear Filters
            </button>
          )}
        </div>
      </div>

      {/* Tabs: Documents / Forms */}
      <div className="flex items-center gap-1 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('documents')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'documents'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <FileText className="w-4 h-4" />
          Documents
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{(documents || []).length}</span>
        </button>
        <button
          onClick={() => setActiveTab('forms')}
          className={`flex items-center gap-2 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
            activeTab === 'forms'
              ? 'border-blue-600 text-blue-700'
              : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
          }`}
        >
          <ClipboardList className="w-4 h-4" />
          Forms (SOP)
          <span className="ml-1 px-1.5 py-0.5 rounded-full text-xs bg-gray-100 text-gray-600">{(formsData || []).length}</span>
        </button>
      </div>

      {/* === FORMS TAB === */}
      {activeTab === 'forms' && (
        <div>
          {formsLoading ? (
            <LoadingSpinner message="Loading forms..." />
          ) : (formsData || []).length === 0 ? (
            <div className="text-center py-16">
              <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500">No forms found</p>
              {searchTerm && <p className="text-sm text-gray-400 mt-1">Try adjusting your search</p>}
              <p className="text-sm text-gray-400 mt-2">Forms are created within SOP pages under the Forms &amp; Records tab.</p>
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Form</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Type</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Status</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Ver</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-32">Linked SOP</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Fields</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Entries</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(formsData || []).map(form => (
                    <tr key={form.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="min-w-0">
                          <p className="font-medium text-gray-900 text-sm">{form.form_number}</p>
                          <p className="text-xs text-gray-500 truncate mt-0.5">{form.title}</p>
                          {form.description && <p className="text-xs text-gray-400 truncate mt-0.5">{form.description}</p>}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-700">
                          {(form.form_type || 'record').charAt(0).toUpperCase() + (form.form_type || 'record').slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                          form.status === 'active' ? 'bg-green-100 text-green-700' :
                          form.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {(form.status || 'draft').charAt(0).toUpperCase() + (form.status || 'draft').slice(1)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">v{form.version || '1.0'}</td>
                      <td className="px-4 py-3">
                        {form.sop_number ? (
                          <a href={`/sops/${form.sop_id}`} className="text-sm text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-1">
                            {form.sop_number}
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        ) : (
                          <span className="text-sm text-gray-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{form.field_count || 0}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{form.entry_count || 0}</td>
                      <td className="px-4 py-3">
                        <div className="text-xs text-gray-500">{form.created_by}</div>
                        <div className="text-xs text-gray-400">
                          {form.created_at ? new Date(form.created_at).toLocaleDateString() : '—'}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* === DOCUMENTS TAB === */}
      {activeTab === 'documents' && (<>
      {/* Category summary chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {CATEGORY_OPTIONS.map(cat => {
          const count = docs.filter(d => d.category === cat.value).length;
          if (count === 0 && categoryFilter && categoryFilter !== cat.value) return null;
          return (
            <button
              key={cat.value}
              onClick={() => setCategoryFilter(categoryFilter === cat.value ? '' : cat.value)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                categoryFilter === cat.value
                  ? cat.color + ' ring-2 ring-offset-1 ring-blue-300'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              {cat.label}
              <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${
                categoryFilter === cat.value ? 'bg-white/60' : 'bg-gray-100'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {/* Bulk Delete Toolbar */}
      {isAdmin && selectedDocs.size > 0 && (
        <div className="flex items-center gap-3 mb-4 px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
          <span className="text-sm font-medium text-red-700">{selectedDocs.size} document{selectedDocs.size !== 1 ? 's' : ''} selected</span>
          <button
            onClick={() => setBulkDeleteConfirm(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected
          </button>
          <button
            onClick={() => setSelectedDocs(new Set())}
            className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800 font-medium"
          >
            Clear Selection
          </button>
        </div>
      )}

      {/* Documents Table */}
      {docs.length === 0 ? (
        <div className="text-center py-16">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No documents found</p>
          {searchTerm && <p className="text-sm text-gray-400 mt-1">Try adjusting your search or filters</p>}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                {isAdmin && (
                  <th className="px-3 py-3 w-10">
                    <input
                      type="checkbox"
                      checked={docs.length > 0 && selectedDocs.size === docs.length}
                      onChange={toggleSelectAll}
                      className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                  </th>
                )}
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">Document</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Category</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-24">Type</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-16">Ver</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Size</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-12" title="Downloads">DL</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-28">Uploaded</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider w-40">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {docs.map(doc => (
                <tr key={doc.id} className={`hover:bg-gray-50/50 transition-colors group ${selectedDocs.has(doc.id) ? 'bg-red-50/50' : ''}`}>
                  {isAdmin && (
                    <td className="px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedDocs.has(doc.id)}
                        onChange={() => toggleSelectDoc(doc.id)}
                        className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                      />
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      {getFileIcon(doc.filename)}
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate text-sm">{doc.original_name}</p>
                        {doc.description && (
                          <p className="text-xs text-gray-500 truncate mt-0.5">{doc.description}</p>
                        )}
                        {doc.tags && (
                          <div className="flex flex-wrap gap-1 mt-1">
                            {parseTags(doc.tags).map((tag, i) => (
                              <span key={i} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-gray-100 text-[10px] text-gray-600">
                                <Tag className="w-2.5 h-2.5" />
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">{getCategoryBadge(doc.category)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${DOC_TYPE_COLORS[doc.document_type] || DOC_TYPE_COLORS.other}`}>
                      {(doc.document_type || 'other').charAt(0).toUpperCase() + (doc.document_type || 'other').slice(1)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">v{doc.version}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{formatFileSize(doc.file_size)}</td>
                  <td className="px-4 py-3 text-sm text-gray-500">{doc.download_count || 0}</td>
                  <td className="px-4 py-3">
                    <div className="text-xs text-gray-500">{doc.uploaded_by}</div>
                    <div className="text-xs text-gray-400">
                      {new Date(doc.upload_date).toLocaleDateString()}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1 justify-end">
                      {isPdf(doc.filename) && (
                        <button
                          onClick={() => setPreviewDoc(doc)}
                          className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Preview PDF"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleViewVersions(doc)}
                        className="p-1.5 text-gray-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                        title="Version history"
                      >
                        <History className="w-4 h-4" />
                      </button>
                      <a
                        href={`/api/documents/${doc.id}/download`}
                        className="p-1.5 text-gray-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      </>)}

      {/* Upload Form Modal */}
      {showUploadForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !uploading && setShowUploadForm(false)}>
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Upload {uploadFiles.length} file{uploadFiles.length !== 1 ? 's' : ''}</h3>
              <button onClick={() => !uploading && setShowUploadForm(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={uploadForm.category}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, category: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {CATEGORY_OPTIONS.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Document Type</label>
                <select
                  value={uploadForm.document_type}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, document_type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {DOCUMENT_TYPE_OPTIONS.filter(d => d.value).map(dt => (
                    <option key={dt.value} value={dt.value}>{dt.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Link to SOP (optional)</label>
                <select
                  value={uploadForm.linked_sop_id}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, linked_sop_id: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">None</option>
                  {(sops || []).map(sop => (
                    <option key={sop.id} value={sop.id}>{sop.sop_number} — {sop.title}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Version Type</label>
                <div className="space-y-2">
                  {VERSION_TYPE_OPTIONS.map(type => (
                    <label key={type.value} className={`flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors ${
                      uploadForm.versionType === type.value ? 'border-blue-400 bg-blue-50/50' : 'border-gray-200'
                    }`}>
                      <input
                        type="radio"
                        name="versionType"
                        value={type.value}
                        checked={uploadForm.versionType === type.value}
                        onChange={(e) => setUploadForm(prev => ({ ...prev, versionType: e.target.value }))}
                        className="mt-0.5"
                      />
                      <div>
                        <span className="font-medium text-gray-900 text-sm">{type.label}</span>
                        <p className="text-xs text-gray-500 mt-0.5">{type.desc}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <input
                  type="text"
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Brief description of the document"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Version Notes / Tags</label>
                <input
                  type="text"
                  value={uploadForm.versionNotes}
                  onChange={(e) => setUploadForm(prev => ({ ...prev, versionNotes: e.target.value }))}
                  placeholder="e.g. GMP, Costco audit, training"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="bg-gray-50 rounded-lg p-3">
                <h4 className="font-medium text-gray-900 text-sm mb-2">Files to upload:</h4>
                <div className="space-y-1">
                  {uploadFiles.map((file, i) => (
                    <div key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      {getFileIcon(file.name)}
                      <span className="truncate">{file.name}</span>
                      <span className="text-gray-400 text-xs flex-shrink-0">{formatFileSize(file.size)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowUploadForm(false)}
                disabled={uploading}
                className="flex-1 px-4 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleUpload}
                disabled={uploading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    Upload
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Preview Modal */}
      {previewDoc && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={() => setPreviewDoc(null)}>
          <div className="bg-white rounded-xl w-full max-w-4xl h-[85vh] flex flex-col shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div className="flex items-center gap-3 min-w-0">
                <FileText className="w-5 h-5 text-red-500 flex-shrink-0" />
                <div className="min-w-0">
                  <h3 className="font-semibold text-gray-900 truncate">{previewDoc.original_name}</h3>
                  <p className="text-xs text-gray-500">v{previewDoc.version} — {previewDoc.uploaded_by}</p>
                </div>
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
                src={`/api/documents/${previewDoc.id}/preview`}
                className="w-full h-full border-0"
                title={`Preview: ${previewDoc.original_name}`}
              />
            </div>
          </div>
        </div>
      )}

      {/* Version History Modal */}
      {versionHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setVersionHistory(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <History className="w-5 h-5 text-purple-600" />
                <h3 className="text-lg font-semibold">Version History</h3>
              </div>
              <button onClick={() => setVersionHistory(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-500 mb-4 truncate">{versionHistory.doc.original_name}</p>

            {versionHistory.versions.length === 0 ? (
              <p className="text-sm text-gray-400 py-4 text-center">No version history available</p>
            ) : (
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {versionHistory.versions.map((ver, i) => (
                  <div key={ver.id} className={`flex items-center justify-between p-3 rounded-lg border ${
                    ver.id === versionHistory.doc.id ? 'border-blue-200 bg-blue-50/50' : 'border-gray-100 bg-gray-50'
                  }`}>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className={`text-sm font-semibold ${ver.id === versionHistory.doc.id ? 'text-blue-700' : 'text-gray-700'}`}>
                          v{ver.version}
                        </span>
                        {i === 0 && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 bg-green-100 text-green-700 rounded">Latest</span>
                        )}
                        {ver.id === versionHistory.doc.id && i !== 0 && (
                          <span className="text-[10px] font-medium px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded">Current</span>
                        )}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {ver.uploaded_by} — {new Date(ver.upload_date).toLocaleDateString()}
                        {ver.tags && <span className="ml-2 text-gray-400">{ver.tags}</span>}
                      </div>
                    </div>
                    <a
                      href={`/api/documents/${ver.id}/download`}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-white rounded-lg flex-shrink-0"
                      title="Download this version"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {/* Delete Confirmation Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Document">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <Trash2 className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-gray-700">
              Are you sure you want to permanently delete <span className="font-semibold">"{deleteTarget?.original_name}"</span>?
            </p>
          </div>
          <p className="text-sm text-red-600">This action cannot be undone. The file will be removed from disk and the deletion will be recorded in the audit log.</p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setDeleteTarget(null)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting...' : 'Delete Permanently'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Bulk Delete Confirmation Modal */}
      <Modal isOpen={bulkDeleteConfirm} onClose={() => setBulkDeleteConfirm(false)} title="Delete Multiple Documents">
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 bg-red-50 rounded-lg border border-red-200">
            <Trash2 className="w-5 h-5 text-red-600 flex-shrink-0" />
            <p className="text-gray-700">
              Are you sure you want to permanently delete <span className="font-semibold">{selectedDocs.size} document{selectedDocs.size !== 1 ? 's' : ''}</span>?
            </p>
          </div>
          <div className="max-h-40 overflow-y-auto bg-gray-50 rounded-lg p-3 space-y-1">
            {docs.filter(d => selectedDocs.has(d.id)).map(d => (
              <div key={d.id} className="flex items-center gap-2 text-sm text-gray-700">
                {getFileIcon(d.filename)}
                <span className="truncate">{d.original_name}</span>
              </div>
            ))}
          </div>
          <p className="text-sm text-red-600">This action cannot be undone. All selected files will be removed from disk.</p>
          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => setBulkDeleteConfirm(false)}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={confirmBulkDelete}
              disabled={deleting}
              className="flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              {deleting ? 'Deleting...' : `Delete ${selectedDocs.size} Document${selectedDocs.size !== 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
