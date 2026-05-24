import React, { useState, useMemo } from 'react';
import { Droplets, Plus, Trash2 } from 'lucide-react';
import { useFetch, apiPost, apiDelete } from '../../hooks/useApi';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';

export default function PouringSchedule() {
  const { data: pours, loading, error, refetch } = useFetch('/api/production/pours');
  const { data: orders } = useFetch('/api/production/orders');
  const { data: operators } = useFetch('/api/daily-tasks/operators');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!pours) return [];
    let list = [...pours];
    if (dateFrom) list = list.filter(p => (p.pour_date || '') >= dateFrom);
    if (dateTo) list = list.filter(p => (p.pour_date || '') <= dateTo);
    return list;
  }, [pours, dateFrom, dateTo]);

  const totals = useMemo(() => {
    return filtered.reduce((acc, p) => ({
      bins: acc.bins + (Number(p.bins_poured) || 0),
      cases: acc.cases + (Number(p.cases_produced) || 0),
    }), { bins: 0, cases: 0 });
  }, [filtered]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost('/api/production/pours', formData);
      setShowAddModal(false);
      setFormData({});
      refetch();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm(`Delete pour record #${id}?`)) return;
    try {
      await apiDelete(`/api/production/pours/${id}`);
      refetch();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) return <LoadingSpinner message="Loading pour records..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500 font-medium">Production</p>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Droplets className="w-8 h-8 text-cyan-600" />
            Pouring Schedule
          </h1>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700">
          <Plus className="w-4 h-4" /> Record Pour
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-gray-900">{filtered.length}</p>
          <p className="text-xs text-gray-500 mt-1">Pour Records</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-cyan-600">{totals.bins}</p>
          <p className="text-xs text-gray-500 mt-1">Bins Poured</p>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">{totals.cases}</p>
          <p className="text-xs text-gray-500 mt-1">Cases Produced</p>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500 font-medium">Filter dates:</span>
          <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2" />
          <span className="text-gray-400 text-xs">to</span>
          <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2" />
          {(dateFrom || dateTo) && (
            <button onClick={() => { setDateFrom(''); setDateTo(''); }} className="text-xs text-navy-600 hover:text-navy-800">Clear</button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Date', 'Order', 'SKU', 'Jar Size', 'Bins Poured', 'Cases Produced', 'Operator', 'Notes', ''].map((h, i) => (
                  <th key={i} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={9} className="px-4 py-12 text-center text-gray-500">No pour records</td></tr>
              ) : filtered.map(p => (
                <tr key={p.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-700">{p.pour_date?.slice(0, 10) || '—'}</td>
                  <td className="px-4 py-3 text-sm text-navy-700 font-medium">{p.production_order_id ? `#${p.production_order_id}` : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.sku_id ? `#${p.sku_id}` : '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.jar_size || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">{p.bins_poured ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 text-right">{p.cases_produced ?? '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{p.operator_id || '—'}</td>
                  <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate" title={p.notes}>{p.notes || '—'}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => handleDelete(p.id)} className="p-1 text-gray-400 hover:text-red-600" title="Delete">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="Record Pour">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Production Order</label>
              <select value={formData.production_order_id || ''} onChange={e => setFormData({ ...formData, production_order_id: e.target.value ? Number(e.target.value) : null })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                <option value="">Select order...</option>
                {(orders || []).map(o => <option key={o.id} value={o.id}>{o.order_number} ({o.status})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU ID</label>
              <input type="number" value={formData.sku_id || ''} onChange={e => setFormData({ ...formData, sku_id: e.target.value ? Number(e.target.value) : null })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pour Date *</label>
              <input type="date" required value={formData.pour_date || ''} onChange={e => setFormData({ ...formData, pour_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jar Size</label>
              <input type="text" value={formData.jar_size || ''} onChange={e => setFormData({ ...formData, jar_size: e.target.value })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" placeholder="e.g., 359ml, 630ml" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Bins Poured</label>
              <input type="number" value={formData.bins_poured || ''} onChange={e => setFormData({ ...formData, bins_poured: e.target.value ? Number(e.target.value) : null })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cases Produced</label>
              <input type="number" value={formData.cases_produced || ''} onChange={e => setFormData({ ...formData, cases_produced: e.target.value ? Number(e.target.value) : null })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div className="col-span-2">
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
              {saving ? 'Saving...' : 'Record Pour'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
