import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  Filter,
  Plus,
  ChevronUp,
  ChevronDown,
  FileText,
  X,
  BookOpen,
  RefreshCw,
  Zap,
  UploadCloud,
  CheckCircle2,
  AlertTriangle,
} from 'lucide-react';
import { useFetch, apiPost } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';

const STATUS_OPTIONS = ['', 'active', 'in_review', 'approved', 'draft', 'archived'];

export default function SOPLibrary() {
  const navigate = useNavigate();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [sortField, setSortField] = useState('sop_number');
  const [sortDir, setSortDir] = useState('asc');
  const [showAdd, setShowAdd] = useState(false);
  const [showBulkReader, setShowBulkReader] = useState(false);
  const [bulkReading, setBulkReading] = useState(false);
  const [bulkResults, setBulkResults] = useState(null);
  const emptyAddForm = {
    sop_number: '',
    title: '',
    category_name: '',
    category_code: '',
    status: 'draft',
    owner: '',
    version: '1.0',
    description: '',
    reviewer: '',
    approver: '',
    effective_date: '',
    next_review_date: '',
    scope: '',
    responsibilities: '',
    sop_references: '',
  };
  const [addForm, setAddForm] = useState(emptyAddForm);
  const [addError, setAddError] = useState('');
  const [addingNewCat, setAddingNewCat] = useState(false);
  const [newCatName, setNewCatName] = useState('');

  // Parse-on-upload (Tier A) state
  const [parsing, setParsing] = useState(false);
  const [parseError, setParseError] = useState('');
  const [parseWarnings, setParseWarnings] = useState([]);
  const [fieldMeta, setFieldMeta] = useState({}); // field -> { source, confidence }
  const [parsedFile, setParsedFile] = useState(null); // File to attach after create
  const [confirmReviewed, setConfirmReviewed] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [saving, setSaving] = useState(false);

  const { data: sopsData, loading, error, refetch } = useFetch('/api/sops');
  const sops = sopsData?.sops || sopsData || [];

  // Controlled category list (source of truth for the picker + filter).
  const { data: catData, refetch: refetchCats } = useFetch('/api/sop-categories');
  const catList = catData?.categories || catData || [];

  const categories = useMemo(() => {
    const cats = new Set();
    (Array.isArray(catList) ? catList : []).forEach(c => { if (c.name) cats.add(c.name); });
    // Include any names present on SOPs but not yet in the lookup (legacy safety).
    sops.forEach(s => { if (s.category_name) cats.add(s.category_name); });
    return ['', ...Array.from(cats).sort()];
  }, [catList, sops]);

  const filtered = useMemo(() => {
    let result = [...sops];

    if (search) {
      const q = search.toLowerCase();
      result = result.filter(s =>
        (s.sop_number || '').toLowerCase().includes(q) ||
        (s.title || '').toLowerCase().includes(q) ||
        (s.owner || '').toLowerCase().includes(q)
      );
    }
    if (statusFilter) result = result.filter(s => s.status === statusFilter);
    if (categoryFilter) result = result.filter(s => s.category_name === categoryFilter);

    result.sort((a, b) => {
      const aVal = (a[sortField] || '').toString().toLowerCase();
      const bVal = (b[sortField] || '').toString().toLowerCase();
      const cmp = aVal.localeCompare(bVal);
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return result;
  }, [sops, search, statusFilter, categoryFilter, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('asc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc'
      ? <ChevronUp className="w-3 h-3 text-navy-600" />
      : <ChevronDown className="w-3 h-3 text-navy-600" />;
  };

  const resetAddModal = () => {
    setShowAdd(false);
    setAddForm(emptyAddForm);
    setAddingNewCat(false);
    setNewCatName('');
    setParseError('');
    setParseWarnings([]);
    setFieldMeta({});
    setParsedFile(null);
    setConfirmReviewed(false);
    setParsing(false);
    setSaving(false);
  };

  // Drop-first intake: parse a .docx into pre-filled fields (no save yet).
  const handleParseFile = async (file) => {
    if (!file) return;
    if (!file.name.toLowerCase().endsWith('.docx')) {
      setParseError('Only .docx files can be parsed (Tier A). Use manual entry for PDFs.');
      return;
    }
    setParsing(true);
    setParseError('');
    setParseWarnings([]);
    try {
      const fd = new FormData();
      fd.append('file', file);
      const res = await apiPost('/api/sops/parse', fd);
      const f = res.fields || {};
      const val = (k) => (f[k] && f[k].value != null ? f[k].value : '');
      // Map a parsed category name onto the controlled list if it matches.
      const parsedCat = val('category_name');
      const matchedCat = catList.find(c => c.name === parsedCat);
      setAddForm(prev => ({
        ...prev,
        sop_number: val('sop_number') || prev.sop_number,
        title: val('title') || prev.title,
        version: val('version') || prev.version,
        owner: val('owner') || prev.owner,
        reviewer: val('reviewer') || prev.reviewer,
        approver: val('approver') || prev.approver,
        effective_date: val('effective_date') || prev.effective_date,
        next_review_date: val('next_review_date') || prev.next_review_date,
        scope: val('scope') || prev.scope,
        responsibilities: val('responsibilities') || prev.responsibilities,
        sop_references: val('sop_references') || prev.sop_references,
        category_name: matchedCat ? matchedCat.name : prev.category_name,
        category_code: matchedCat ? matchedCat.code : prev.category_code,
      }));
      const meta = {};
      for (const [k, v] of Object.entries(f)) meta[k] = { source: v.source, confidence: v.confidence };
      setFieldMeta(meta);
      setParseWarnings(res.warnings || []);
      setParsedFile(file);
      setConfirmReviewed(false);
    } catch (err) {
      setParseError(err.message || 'Parse failed');
    } finally {
      setParsing(false);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setAddError('');
    setSaving(true);
    try {
      const created = await apiPost('/api/sops', addForm);
      // Drop-first: attach the dropped file, reusing the existing version-bump path.
      if (parsedFile && created?.id) {
        try {
          const fd = new FormData();
          fd.append('file', parsedFile);
          await apiPost(`/api/sops/${created.id}/upload`, fd);
        } catch (uErr) {
          // SOP record exists; surface attach failure without losing the create.
          setAddError(`SOP created, but file attach failed: ${uErr.message}`);
          setSaving(false);
          refetch();
          return;
        }
      }
      resetAddModal();
      refetch();
    } catch (err) {
      setAddError(err.message);
      setSaving(false);
    }
  };

  // "+ Add new" category escape hatch — creates a controlled category, then selects it.
  const handleCreateCategory = async () => {
    const name = newCatName.trim();
    if (!name) return;
    setAddError('');
    try {
      const cat = await apiPost('/api/sop-categories', { name });
      await refetchCats();
      setAddForm(f => ({ ...f, category_name: cat.name, category_code: cat.code }));
      setAddingNewCat(false);
      setNewCatName('');
    } catch (err) {
      setAddError(err.message);
    }
  };

  const handleBulkReadContent = async () => {
    setBulkReading(true);
    try {
      // Get SOPs with linked documents (only process those with documents)
      const sopsWithDocs = filtered.filter(sop => sop.id).slice(0, 5); // Limit to 5 for safety
      const sopIds = sopsWithDocs.map(sop => sop.id);

      if (sopIds.length === 0) {
        alert('No SOPs found to process');
        return;
      }

      const response = await apiPost('/api/sops/bulk-read-content', { sop_ids: sopIds });
      setBulkResults(response);
      setShowBulkReader(true);
    } catch (err) {
      alert('Failed to process SOPs: ' + err.message);
    } finally {
      setBulkReading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const activeFilters = [statusFilter, categoryFilter].filter(Boolean).length;

  if (loading) return <LoadingSpinner message="Loading SOPs..." />;
  if (error) {
    return (
      <div className="text-center py-16">
        <p className="text-red-600 font-medium">Failed to load SOPs</p>
        <p className="text-sm text-gray-500 mt-1">{error}</p>
      </div>
    );
  }

  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    return new Date(dateStr) < new Date();
  };

  // Confidence chip shown next to a field after a parse.
  const Chip = ({ field }) => {
    const m = fieldMeta[field];
    if (!m) return null;
    const high = m.confidence === 'high';
    return (
      <span
        title={`source: ${m.source}`}
        className={`ml-2 inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${high ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'}`}
      >
        {high ? <CheckCircle2 className="w-2.5 h-2.5" /> : <AlertTriangle className="w-2.5 h-2.5" />}
        {high ? 'parsed' : 'review'}
      </span>
    );
  };

  const columns = [
    { key: 'sop_number', label: 'SOP Number', width: 'w-32' },
    { key: 'title', label: 'Title', width: 'flex-1' },
    { key: 'category_name', label: 'Category', width: 'w-40' },
    { key: 'version', label: 'Ver.', width: 'w-16' },
    { key: 'status', label: 'Status', width: 'w-28' },
    { key: 'owner', label: 'Owner', width: 'w-28' },
    { key: 'next_review_date', label: 'Review Due', width: 'w-28' },
    { key: 'updated_at', label: 'Updated', width: 'w-28' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SOP Library</h1>
          <p className="text-sm text-gray-500 mt-1">{sops.length} total documents</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleBulkReadContent}
            disabled={bulkReading}
            className="flex items-center gap-2 px-4 py-2.5 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-green-400 transition-colors text-sm font-medium shadow-sm"
          >
            {bulkReading ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Zap className="w-4 h-4" />
            )}
            {bulkReading ? 'Processing...' : 'Bulk Read SOPs'}
          </button>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus className="w-4 h-4" />
            Add SOP
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-3 items-center">
          <div className="relative flex-1 min-w-[240px]">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search SOPs by number, title, or owner..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
            />
            {search && (
              <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
          </div>

          <select
            value={statusFilter}
            onChange={e => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 bg-white"
          >
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.filter(Boolean).map(s => (
              <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
            ))}
          </select>

          <select
            value={categoryFilter}
            onChange={e => setCategoryFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 bg-white"
          >
            <option value="">All Categories</option>
            {categories.filter(Boolean).map(c => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>

          {activeFilters > 0 && (
            <button
              onClick={() => { setStatusFilter(''); setCategoryFilter(''); }}
              className="text-xs text-navy-600 hover:text-navy-800 font-medium"
            >
              Clear filters ({activeFilters})
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {columns.map(col => (
                  <th
                    key={col.key}
                    onClick={() => handleSort(col.key)}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider cursor-pointer hover:text-gray-700 select-none"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <SortIcon field={col.key} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length} className="px-4 py-16 text-center">
                    <FileText className="w-10 h-10 text-gray-300 mx-auto mb-3" />
                    <p className="text-sm text-gray-500 font-medium">No SOPs found</p>
                    <p className="text-xs text-gray-400 mt-1">Try adjusting your search or filters</p>
                  </td>
                </tr>
              ) : (
                filtered.map(sop => (
                  <tr
                    key={sop.id}
                    onClick={() => navigate(`/sops/${sop.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3">
                      <span className="text-sm font-mono font-medium text-navy-700">{sop.sop_number}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-900 font-medium">{sop.title}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{sop.category_name || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{sop.version || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={sop.status} type="status" />
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-600">{sop.owner || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {sop.next_review_date ? (
                        <span className={`text-sm ${isOverdue(sop.next_review_date) ? 'text-red-600 font-medium' : 'text-gray-500'}`}>
                          {isOverdue(sop.next_review_date) && '! '}{formatDate(sop.next_review_date)}
                        </span>
                      ) : (
                        <span className="text-sm text-gray-300">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm text-gray-500">{formatDate(sop.updated_at)}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-100 bg-gray-50 text-xs text-gray-500">
            Showing {filtered.length} of {sops.length} SOPs
          </div>
        )}
      </div>

      {/* Add SOP Modal */}
      <Modal isOpen={showAdd} onClose={resetAddModal} title="Add New SOP">
        <form onSubmit={handleAdd} className="space-y-4">
          {addError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {addError}
            </div>
          )}

          {/* Drop-first intake — parse a controlled .docx to auto-fill below */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleParseFile(e.dataTransfer.files?.[0]); }}
            className={`border-2 border-dashed rounded-lg p-4 text-center transition-colors ${dragOver ? 'border-navy-500 bg-navy-50' : 'border-gray-300 bg-gray-50'}`}
          >
            <input
              id="sop-drop-input"
              type="file"
              accept=".docx"
              className="hidden"
              onChange={e => handleParseFile(e.target.files?.[0])}
            />
            <label htmlFor="sop-drop-input" className="cursor-pointer flex flex-col items-center gap-1">
              {parsing
                ? <RefreshCw className="w-6 h-6 text-navy-500 animate-spin" />
                : <UploadCloud className="w-6 h-6 text-gray-400" />}
              <span className="text-sm font-medium text-gray-700">
                {parsing ? 'Parsing…' : parsedFile ? parsedFile.name : 'Drop a controlled SOP .docx to auto-fill'}
              </span>
              <span className="text-xs text-gray-400">
                Fields pre-fill below — <span className="text-green-600 font-medium">green</span> = from header cell, <span className="text-amber-600 font-medium">amber</span> = confirm/correct
              </span>
            </label>
          </div>

          {parseError && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg p-3">
              {parseError}
            </div>
          )}
          {parseWarnings.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 text-amber-700 text-xs rounded-lg p-3">
              <strong>Needs review:</strong> {parseWarnings.join('; ')}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SOP Number * <Chip field="sop_number" /></label>
              <input
                type="text"
                required
                value={addForm.sop_number}
                onChange={e => setAddForm(f => ({ ...f, sop_number: e.target.value }))}
                placeholder="e.g. SOP-001"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Version <Chip field="version" /></label>
              <input
                type="text"
                value={addForm.version}
                onChange={e => setAddForm(f => ({ ...f, version: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title * <Chip field="title" /></label>
            <input
              type="text"
              required
              value={addForm.title}
              onChange={e => setAddForm(f => ({ ...f, title: e.target.value }))}
              placeholder="SOP title"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category <Chip field="category_name" /></label>
              {addingNewCat ? (
                <div className="flex gap-2">
                  <input
                    type="text"
                    autoFocus
                    value={newCatName}
                    onChange={e => setNewCatName(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleCreateCategory(); } }}
                    placeholder="New category name"
                    className="flex-1 min-w-0 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                  />
                  <button type="button" onClick={handleCreateCategory}
                    className="px-3 py-2 bg-navy-600 text-white rounded-lg text-sm hover:bg-navy-700">Add</button>
                  <button type="button" onClick={() => { setAddingNewCat(false); setNewCatName(''); }}
                    className="px-2 py-2 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
                </div>
              ) : (
                <select
                  value={addForm.category_name}
                  onChange={e => {
                    if (e.target.value === '__new__') { setAddingNewCat(true); return; }
                    const sel = catList.find(c => c.name === e.target.value);
                    setAddForm(f => ({
                      ...f,
                      category_name: e.target.value,
                      category_code: sel ? sel.code : e.target.value.toLowerCase().replace(/\s+/g, '_'),
                    }));
                  }}
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 bg-white"
                >
                  <option value="">Select a category…</option>
                  {(Array.isArray(catList) ? catList : []).map(c => (
                    <option key={c.id || c.code} value={c.name}>{c.name}</option>
                  ))}
                  <option value="__new__">+ Add new category…</option>
                </select>
              )}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Owner / Prepared By <Chip field="owner" /></label>
              <input
                type="text"
                value={addForm.owner}
                onChange={e => setAddForm(f => ({ ...f, owner: e.target.value }))}
                placeholder="Owner name"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reviewer <Chip field="reviewer" /></label>
              <input
                type="text"
                value={addForm.reviewer}
                onChange={e => setAddForm(f => ({ ...f, reviewer: e.target.value }))}
                placeholder="Reviewer name"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Approver / Approved By <Chip field="approver" /></label>
              <input
                type="text"
                value={addForm.approver}
                onChange={e => setAddForm(f => ({ ...f, approver: e.target.value }))}
                placeholder="Approver name"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date <Chip field="effective_date" /></label>
              <input
                type="date"
                value={addForm.effective_date || ''}
                onChange={e => setAddForm(f => ({ ...f, effective_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Review Date <Chip field="next_review_date" /></label>
              <input
                type="date"
                value={addForm.next_review_date || ''}
                onChange={e => setAddForm(f => ({ ...f, next_review_date: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={addForm.status}
                onChange={e => setAddForm(f => ({ ...f, status: e.target.value }))}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 bg-white"
              >
                {STATUS_OPTIONS.filter(Boolean).map(s => (
                  <option key={s} value={s}>{s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea
              value={addForm.description}
              onChange={e => setAddForm(f => ({ ...f, description: e.target.value }))}
              rows={3}
              placeholder="Brief description of the SOP..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Scope <Chip field="scope" /></label>
            <textarea
              value={addForm.scope}
              onChange={e => setAddForm(f => ({ ...f, scope: e.target.value }))}
              rows={2}
              placeholder="Scope of the SOP..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Responsibilities <Chip field="responsibilities" /></label>
            <textarea
              value={addForm.responsibilities}
              onChange={e => setAddForm(f => ({ ...f, responsibilities: e.target.value }))}
              rows={2}
              placeholder="Roles and responsibilities..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">References <Chip field="sop_references" /></label>
            <textarea
              value={addForm.sop_references}
              onChange={e => setAddForm(f => ({ ...f, sop_references: e.target.value }))}
              rows={2}
              placeholder="Regulatory / internal references..."
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none"
            />
          </div>

          {parsedFile && (
            <label className="flex items-start gap-2 text-sm text-gray-700 bg-blue-50 border border-blue-200 rounded-lg p-3">
              <input
                type="checkbox"
                checked={confirmReviewed}
                onChange={e => setConfirmReviewed(e.target.checked)}
                className="mt-0.5"
              />
              <span>I've reviewed the auto-filled fields and corrected the amber (needs-review) ones. This confirm is the intake verification step, and the dropped file will be attached on save.</span>
            </label>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={resetAddModal}
              className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || (parsedFile && !confirmReviewed)}
              className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
            >
              {saving ? 'Saving…' : parsedFile ? 'Create SOP + Attach File' : 'Create SOP'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Bulk Content Reader Results Modal */}
      <Modal 
        isOpen={showBulkReader} 
        onClose={() => setShowBulkReader(false)} 
        title="Bulk SOP Content Analysis Results"
        size="large"
      >
        {bulkResults && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <Zap className="w-5 h-5 text-blue-600" />
                <h4 className="font-medium text-blue-800">Processed {bulkResults.processed} SOPs</h4>
              </div>
              <p className="text-sm text-blue-700 mt-1">
                Content analysis complete. Review the results below and apply updates individually.
              </p>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {bulkResults.results?.map((result, index) => (
                <div key={index} className={`border rounded-lg p-4 ${
                  result.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <h5 className="font-medium text-gray-900">
                      {result.sop_number || `SOP ID: ${result.sop_id}`}
                    </h5>
                    {result.success ? (
                      <span className="text-sm text-green-600 bg-green-100 px-2 py-1 rounded">
                        ✓ Success
                      </span>
                    ) : (
                      <span className="text-sm text-red-600 bg-red-100 px-2 py-1 rounded">
                        ✗ Failed
                      </span>
                    )}
                  </div>

                  {result.success ? (
                    <div className="space-y-2">
                      {result.preview?.hasUpdates ? (
                        <div>
                          <p className="text-sm text-green-700 mb-2">
                            Found {Object.keys(result.preview.updates).length} potential update(s)
                          </p>
                          <div className="space-y-1">
                            {Object.entries(result.preview.updates).map(([field, change]) => (
                              <div key={field} className="text-xs text-green-600">
                                • <span className="capitalize">{field.replace('_', ' ')}</span>: 
                                {change.proposed ? ' Will update' : ' No change'}
                              </div>
                            ))}
                          </div>
                          <div className="mt-2">
                            <button
                              onClick={() => navigate(`/sops/${result.sop_id}`)}
                              className="text-xs text-blue-600 hover:text-blue-800 underline"
                            >
                              View SOP to apply updates →
                            </button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-sm text-green-700">No updates needed - content is current</p>
                      )}
                      
                      {result.warnings?.length > 0 && (
                        <div className="text-xs text-amber-600 mt-2">
                          <strong>Warnings:</strong> {result.warnings.join(', ')}
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-sm text-red-700">{result.error}</p>
                  )}
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-4 border-t">
              <button
                onClick={() => setShowBulkReader(false)}
                className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
