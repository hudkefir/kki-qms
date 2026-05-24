import React, { useState, useMemo } from 'react';
import { ClipboardList, Plus, Search, ChevronRight, Trash2 } from 'lucide-react';
import { useFetch, apiPost, apiPut, apiDelete } from '../../hooks/useApi';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';

const STATUS_OPTIONS = [
  'planned', 'in_progress', 'flavouring', 'pouring', 'packing',
  'qa_hold', 'released', 'shipped', 'cancelled',
];

const STATUS_STYLES = {
  planned:     'bg-gray-100 text-gray-700 border-gray-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  flavouring:  'bg-amber-100 text-amber-800 border-amber-200',
  pouring:     'bg-cyan-100 text-cyan-800 border-cyan-200',
  packing:     'bg-indigo-100 text-indigo-800 border-indigo-200',
  qa_hold:     'bg-orange-100 text-orange-800 border-orange-200',
  released:    'bg-green-100 text-green-800 border-green-200',
  shipped:     'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled:   'bg-red-100 text-red-700 border-red-200',
};

// Allowed next states per workflow
const NEXT_STATES = {
  planned: ['in_progress', 'cancelled'],
  in_progress: ['flavouring', 'pouring', 'qa_hold', 'cancelled'],
  flavouring: ['pouring', 'qa_hold'],
  pouring: ['packing', 'qa_hold'],
  packing: ['qa_hold', 'released'],
  qa_hold: ['released'],
  released: ['shipped'],
  shipped: [],
  cancelled: [],
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[status] || STATUS_STYLES.planned}`}>
      {(status || '').replace(/_/g, ' ')}
    </span>
  );
}

export default function ProductionOrders() {
  const { data: orders, loading, error, refetch } = useFetch('/api/production/orders');
  const { data: fermentations } = useFetch('/api/production/fermentation');
  const { data: operators } = useFetch('/api/daily-tasks/operators');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!orders) return [];
    let list = [...orders];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(o => o.order_number?.toLowerCase().includes(s) || (o.notes || '').toLowerCase().includes(s));
    }
    if (filterStatus) list = list.filter(o => o.status === filterStatus);
    if (dateFrom) list = list.filter(o => (o.planned_date || '') >= dateFrom);
    if (dateTo) list = list.filter(o => (o.planned_date || '') <= dateTo);
    return list;
  }, [orders, search, filterStatus, dateFrom, dateTo]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost('/api/production/orders', formData);
      setShowAddModal(false);
      setFormData({});
      refetch();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatusChange = async (id, status) => {
    try {
      await apiPut(`/api/production/orders/${id}/status`, { status });
      refetch();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (id, order_number) => {
    if (!confirm(`Delete order ${order_number}? Only 'planned' orders can be deleted.`)) return;
    try {
      await apiDelete(`/api/production/orders/${id}`);
      refetch();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) return <LoadingSpinner message="Loading production orders..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500 font-medium">Production</p>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-indigo-600" />
            Production Orders
          </h1>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700">
          <Plus className="w-4 h-4" /> New Order
        </button>
      </div>

      {/* Search & filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="relative md:col-span-2">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search by order # or notes..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2">
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
          </select>
          <div className="flex items-center gap-2">
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="flex-1 border border-gray-300 rounded-lg text-sm px-2 py-2" />
            <span className="text-gray-400 text-xs">to</span>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="flex-1 border border-gray-300 rounded-lg text-sm px-2 py-2" />
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Order #', 'SKU', 'Fermentation Batch', 'Planned Date', 'Status', 'Target Qty', 'Actual Qty', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No production orders found</td></tr>
              ) : filtered.map(o => (
                <tr key={o.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm font-medium text-navy-700">{o.order_number}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">#{o.sku_id}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 font-mono">{o.fermentation_batch_code || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{o.planned_date?.slice(0, 10) || '—'}</td>
                  <td className="px-4 py-3"><StatusBadge status={o.status} /></td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">{o.target_quantity ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">{o.actual_quantity ?? '—'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {(NEXT_STATES[o.status] || []).map(next => (
                        <button key={next} onClick={() => handleStatusChange(o.id, next)}
                          className="flex items-center gap-1 px-2 py-0.5 bg-navy-50 hover:bg-navy-100 text-navy-700 text-xs font-medium rounded">
                          <ChevronRight className="w-3 h-3" /> {next.replace(/_/g, ' ')}
                        </button>
                      ))}
                      {o.status === 'planned' && (
                        <button onClick={() => handleDelete(o.id, o.order_number)} className="p-1 text-gray-400 hover:text-red-600" title="Delete">
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="New Production Order">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU ID *</label>
              <input type="number" required value={formData.sku_id || ''} onChange={e => setFormData({ ...formData, sku_id: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" placeholder="Enter sku_id" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Fermentation Batch</label>
              <select value={formData.fermentation_id || ''} onChange={e => setFormData({ ...formData, fermentation_id: e.target.value ? Number(e.target.value) : null })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                <option value="">Select batch...</option>
                {(fermentations || []).filter(f => f.status === 'ready' || f.status === 'fermenting').map(f => (
                  <option key={f.id} value={f.id}>{f.batch_code} ({f.culture_type}, {f.status})</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Planned Date</label>
              <input type="date" value={formData.planned_date || ''} onChange={e => setFormData({ ...formData, planned_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Target Quantity</label>
              <input type="number" value={formData.target_quantity || ''} onChange={e => setFormData({ ...formData, target_quantity: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bins Used</label>
              <input type="number" value={formData.bins_used || ''} onChange={e => setFormData({ ...formData, bins_used: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Operator</label>
              <select value={formData.operator_id || ''} onChange={e => setFormData({ ...formData, operator_id: e.target.value || null })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                <option value="">Select operator...</option>
                {(operators || []).map(op => <option key={op.id} value={op.id}>{op.display_name || op.username}</option>)}
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={3} value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 disabled:opacity-50">
              {saving ? 'Creating...' : 'Create Order'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
