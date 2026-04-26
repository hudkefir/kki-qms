import React, { useState, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Archive,
  AlertCircle, Plus, Search, Filter, Download, ChevronDown, ChevronUp,
  X, ExternalLink
} from 'lucide-react';
import { useFetch, apiPost } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

const PRODUCT_OPTIONS = [
  { sku: '39505', name: 'CocoFam 630ml' },
  { sku: '39506', name: 'CocoMng 359ml' },
  { sku: '39507', name: 'CocoGua 359ml' },
  { sku: '39508', name: 'CocoOrig 359ml' },
];

const ISSUE_TYPES = [
  'Leaking', 'Separation', 'Mold', 'Fermentation/Bloating',
  'Seal Failure', 'Off-Odor', 'Foreign Material', 'Illness/Adverse Reaction', 'Other'
];

const SEVERITY_OPTIONS = ['low', 'medium', 'high', 'critical'];
const STATUS_OPTIONS = ['open', 'investigating', 'corrective_action', 'resolved', 'closed'];

const SEVERITY_STYLES = {
  low: 'bg-gray-100 text-gray-700 border-gray-200',
  medium: 'bg-amber-100 text-amber-800 border-amber-200',
  high: 'bg-orange-100 text-orange-800 border-orange-200',
  critical: 'bg-red-100 text-red-800 border-red-200',
};

const STATUS_STYLES = {
  open: 'bg-blue-100 text-blue-800 border-blue-200',
  investigating: 'bg-purple-100 text-purple-800 border-purple-200',
  corrective_action: 'bg-amber-100 text-amber-800 border-amber-200',
  resolved: 'bg-green-100 text-green-800 border-green-200',
  closed: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_LABELS = {
  open: 'Open',
  investigating: 'Under Investigation',
  corrective_action: 'Pending Response',
  resolved: 'Resolved',
  closed: 'Closed',
};

function SeverityBadge({ severity }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${SEVERITY_STYLES[severity] || SEVERITY_STYLES.low}`}>
      {severity?.charAt(0).toUpperCase() + severity?.slice(1)}
    </span>
  );
}

function ComplaintStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[status] || STATUS_STYLES.open}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export { SeverityBadge, ComplaintStatusBadge, SEVERITY_STYLES, STATUS_STYLES, STATUS_LABELS, PRODUCT_OPTIONS, ISSUE_TYPES, SEVERITY_OPTIONS, STATUS_OPTIONS };

export default function Complaints() {
  const navigate = useNavigate();
  const [showArchived, setShowArchived] = useState(false);
  const { data: complaints, loading, error, refetch } = useFetch(showArchived ? '/api/complaints?include_archived=true' : '/api/complaints');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSeverity, setFilterSeverity] = useState('');
  const [filterProduct, setFilterProduct] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [filterIssueType, setFilterIssueType] = useState('');
  const [filterLot, setFilterLot] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [sortField, setSortField] = useState('date_received');
  const [sortDir, setSortDir] = useState('desc');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!complaints) return [];
    let list = [...complaints];

    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c =>
        c.complaint_number?.toLowerCase().includes(s) ||
        c.description?.toLowerCase().includes(s) ||
        c.reporter?.toLowerCase().includes(s) ||
        c.store_location?.toLowerCase().includes(s) ||
        c.lot_number?.toLowerCase().includes(s) ||
        c.product_name?.toLowerCase().includes(s)
      );
    }
    if (filterStatus) list = list.filter(c => c.status === filterStatus);
    if (filterSeverity) list = list.filter(c => c.severity === filterSeverity);
    if (filterProduct) list = list.filter(c => c.product_sku === filterProduct);
    if (filterSource) list = list.filter(c => c.source?.toLowerCase().includes(filterSource.toLowerCase()));
    if (filterIssueType) list = list.filter(c => c.issue_type === filterIssueType);
    if (filterLot) list = list.filter(c => c.lot_number === filterLot);

    list.sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      const cmp = typeof aVal === 'number' ? aVal - bVal : String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });

    return list;
  }, [complaints, search, filterStatus, filterSeverity, filterProduct, filterSource, filterLot, filterIssueType, sortField, sortDir]);

  const activeFilterCount = [filterStatus, filterSeverity, filterProduct, filterSource, filterLot, filterIssueType].filter(Boolean).length;

  const handleSort = (field) => {
    if (sortField === field) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-navy-600" /> : <ChevronDown className="w-3 h-3 text-navy-600" />;
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const product = PRODUCT_OPTIONS.find(p => p.sku === formData.product_sku);
      await apiPost('/api/complaints', {
        ...formData,
        product_name: product?.name || '',
      });
      setShowAddModal(false);
      setFormData({});
      refetch();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = ['Complaint ID', 'Date Received', 'Source', 'Reporter', 'Store/Location', 'Product', 'Lot', 'Best Before', 'Qty', 'Issue Type', 'Severity', 'Status', 'Description'];
    const rows = filtered.map(c => [
      c.complaint_number, c.date_received, c.source, c.reporter, c.store_location,
      `${c.product_sku} ${c.product_name}`, c.lot_number, c.best_before,
      c.quantity_affected, c.issue_type, c.severity, c.status, `"${(c.description || '').replace(/"/g, '""')}"`
    ]);
    const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `complaints-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Get unique lot numbers for filter
  const lotNumbers = useMemo(() => {
    if (!complaints) return [];
    return [...new Set(complaints.map(c => c.lot_number).filter(Boolean))].sort();
  }, [complaints]);

  if (loading) return <LoadingSpinner message="Loading complaints..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500 font-medium">Customer Complaints</p>
          <h1 className="text-3xl font-bold text-gray-900">Complaint Registry</h1>
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 max-w-2xl">
            <p className="font-semibold mb-1">Complaint Handling Process</p>
            <p className="mb-2">All customer complaints are logged here and triaged by severity. The investigation workflow is:</p>
            <ol className="list-decimal ml-5 mb-2 space-y-0.5">
              <li><strong>Log</strong> — record complaint details, product, lot number, and customer info</li>
              <li><strong>Investigate</strong> — add investigation comments, review batch testing, check SOS Inventory data</li>
              <li><strong>Escalate if needed</strong> — create a CCR for safety-critical complaints (illness, foreign object, contamination, recurring issues)</li>
              <li><strong>Resolve</strong> — document root cause, corrective action, and customer disposition</li>
              <li><strong>Close</strong> — mark resolved with documented evidence; archive when no longer active</li>
            </ol>
            <p><strong>Not every complaint needs a CCR.</strong> One-off quality issues (taste, texture, shipping damage) are resolved with investigation comments and proper closure. CCRs are reserved for safety-critical or recurring issues.</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setShowArchived(!showArchived); setTimeout(refetch, 100); }}
            className={"flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors " + (showArchived ? 'bg-amber-50 border-amber-300 text-amber-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50')}
          >
            <Archive className="w-4 h-4" />
            {showArchived ? 'Hide Archived' : 'Show Archived'}
          </button>
          <button onClick={exportCSV} className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors">
            <Download className="w-4 h-4" />
            Export CSV
          </button>
          <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors">
            <Plus className="w-4 h-4" />
            New Complaint
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search complaints..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
            />
          </div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-4 py-2 border rounded-lg text-sm font-medium transition-colors ${showFilters ? 'bg-navy-50 border-navy-300 text-navy-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'}`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="bg-navy-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeFilterCount}</span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 md:grid-cols-6 gap-3">
            <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2">
              <option value="">All Statuses</option>
              {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
            </select>
            <select value={filterSeverity} onChange={e => setFilterSeverity(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2">
              <option value="">All Severities</option>
              {SEVERITY_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
            </select>
            <select value={filterProduct} onChange={e => setFilterProduct(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2">
              <option value="">All Products</option>
              {PRODUCT_OPTIONS.map(p => <option key={p.sku} value={p.sku}>{p.sku} {p.name}</option>)}
            </select>
            <select value={filterIssueType} onChange={e => setFilterIssueType(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2">
              <option value="">All Issue Types</option>
              {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select value={filterLot} onChange={e => setFilterLot(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2">
              <option value="">All Lots</option>
              {lotNumbers.map(l => <option key={l} value={l}>{l}</option>)}
            </select>
            <div className="flex items-center gap-2">
              <input
                type="text"
                placeholder="Source..."
                value={filterSource}
                onChange={e => setFilterSource(e.target.value)}
                className="flex-1 border border-gray-300 rounded-lg text-sm px-3 py-2"
              />
              {activeFilterCount > 0 && (
                <button
                  onClick={() => { setFilterStatus(''); setFilterSeverity(''); setFilterProduct(''); setFilterSource(''); setFilterLot(''); setFilterIssueType(''); }}
                  className="text-xs text-navy-600 hover:text-navy-800 whitespace-nowrap"
                >
                  Clear all
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-6">
        {[
          { label: 'Total', value: complaints?.length || 0, color: 'text-gray-900' },
          { label: 'Open', value: complaints?.filter(c => c.status === 'open').length || 0, color: 'text-blue-600' },
          { label: 'Investigating', value: complaints?.filter(c => c.status === 'investigating').length || 0, color: 'text-purple-600' },
          { label: 'Corrective Action', value: complaints?.filter(c => c.status === 'corrective_action').length || 0, color: 'text-amber-600' },
          { label: 'Critical', value: complaints?.filter(c => c.severity === 'critical').length || 0, color: 'text-red-600' },
          { label: 'Archived', value: complaints?.filter(c => c.archived).length || 0, color: 'text-gray-400' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
            <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            <p className="text-xs text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {[
                  { field: 'complaint_number', label: 'ID' },
                  { field: 'date_received', label: 'Date' },
                  { field: 'source', label: 'Source' },
                  { field: 'product_name', label: 'Product' },
                  { field: 'lot_number', label: 'Lot' },
                  { field: 'issue_type', label: 'Issue Type' },
                  { field: 'severity', label: 'Severity' },
                  { field: 'quantity_affected', label: 'Qty' },
                  { field: 'status', label: 'Status' },
                ].map(col => (
                  <th
                    key={col.field}
                    onClick={() => handleSort(col.field)}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <SortIcon field={col.field} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-gray-500">
                    No complaints found
                  </td>
                </tr>
              ) : (
                filtered.map(c => (
                  <tr
                    key={c.id}
                    onClick={() => navigate(`/complaints/${c.id}`)}
                    className={"cursor-pointer transition-colors " + (c.archived ? "bg-gray-100 opacity-60 hover:opacity-80" : "hover:bg-gray-50")}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-navy-700">{c.complaint_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.date_received}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.source}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="text-gray-400 text-xs">{c.product_sku}</span> {c.product_name}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 font-mono">{c.lot_number || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{c.issue_type}</td>
                    <td className="px-4 py-3"><SeverityBadge severity={c.severity} /></td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{c.quantity_affected || '—'}</td>
                    <td className="px-4 py-3"><div className="flex items-center gap-1"><ComplaintStatusBadge status={c.status} />{c.archived ? <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-500">Archived</span> : null}</div></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 bg-gray-50 text-sm text-gray-500">
            Showing {filtered.length} of {complaints?.length || 0} complaints
          </div>
        )}
      </div>

      {/* Add Complaint Modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="New Complaint">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Received *</label>
              <input type="date" required value={formData.date_received || ''} onChange={e => setFormData({ ...formData, date_received: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Source (Distributor)</label>
              <input type="text" value={formData.source || ''} onChange={e => setFormData({ ...formData, source: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" placeholder="e.g., Purity Life" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Reporter</label>
              <input type="text" value={formData.reporter || ''} onChange={e => setFormData({ ...formData, reporter: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Store/Location</label>
              <input type="text" value={formData.store_location || ''} onChange={e => setFormData({ ...formData, store_location: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product SKU</label>
              <select value={formData.product_sku || ''} onChange={e => setFormData({ ...formData, product_sku: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                <option value="">Select product...</option>
                {PRODUCT_OPTIONS.map(p => <option key={p.sku} value={p.sku}>{p.sku} {p.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Lot Number</label>
              <input type="text" value={formData.lot_number || ''} onChange={e => setFormData({ ...formData, lot_number: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Best Before</label>
              <input type="date" value={formData.best_before || ''} onChange={e => setFormData({ ...formData, best_before: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Quantity Affected</label>
              <input type="number" min="0" value={formData.quantity_affected || ''} onChange={e => setFormData({ ...formData, quantity_affected: parseInt(e.target.value) || 0 })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Issue Type</label>
              <select value={formData.issue_type || ''} onChange={e => setFormData({ ...formData, issue_type: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                <option value="">Select issue...</option>
                {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
              <select value={formData.severity || 'low'} onChange={e => setFormData({ ...formData, severity: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                {SEVERITY_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={3} value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Complaint'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
