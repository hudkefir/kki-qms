import React, { useState, useMemo } from 'react';
import { Beaker, Plus, Filter, Search, Play, CheckCircle, Trash2, X } from 'lucide-react';
import { useFetch, apiPost, apiPut, apiDelete } from '../../hooks/useApi';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';

const STATUS_OPTIONS = ['planned', 'fermenting', 'ready', 'used', 'discarded'];

const STATUS_STYLES = {
  planned:    'bg-gray-100 text-gray-700 border-gray-200',
  fermenting: 'bg-blue-100 text-blue-800 border-blue-200',
  ready:      'bg-green-100 text-green-800 border-green-200',
  used:       'bg-purple-100 text-purple-700 border-purple-200',
  discarded:  'bg-red-100 text-red-700 border-red-200',
};

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[status] || STATUS_STYLES.planned}`}>
      {status}
    </span>
  );
}

const NEXT_STATUS_MAP = {
  planned: [{ to: 'fermenting', label: 'Start Fermenting', icon: Play, color: 'bg-blue-600 hover:bg-blue-700' }],
  fermenting: [{ to: 'ready', label: 'Mark Ready', icon: CheckCircle, color: 'bg-green-600 hover:bg-green-700' }],
  ready: [],
  used: [],
  discarded: [],
};

export default function FermentationSchedule() {
  const { data: batches, loading, error, refetch } = useFetch('/api/production/fermentation');
  const { data: operators } = useFetch('/api/daily-tasks/operators');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [expandedId, setExpandedId] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [editData, setEditData] = useState({});
  const [saving, setSaving] = useState(false);

  const filtered = useMemo(() => {
    if (!batches) return [];
    let list = [...batches];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(b =>
        b.batch_code?.toLowerCase().includes(s) ||
        b.culture_type?.toLowerCase().includes(s) ||
        b.vessel?.toLowerCase().includes(s)
      );
    }
    if (filterStatus) list = list.filter(b => b.status === filterStatus);
    return list;
  }, [batches, search, filterStatus]);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost('/api/production/fermentation', formData);
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
      await apiPut(`/api/production/fermentation/${id}/status`, { status });
      refetch();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleEdit = (batch) => {
    setExpandedId(batch.id);
    setEditData(batch);
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const { id, status, ...rest } = editData;
      await apiPut(`/api/production/fermentation/${id}`, rest);
      setExpandedId(null);
      refetch();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id, batch_code) => {
    if (!confirm(`Delete fermentation batch '${batch_code}'? This cannot be undone.`)) return;
    try {
      await apiDelete(`/api/production/fermentation/${id}`);
      refetch();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) return <LoadingSpinner message="Loading fermentation batches..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = (batches || []).filter(b => b.status === s).length;
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500 font-medium">Production</p>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <Beaker className="w-8 h-8 text-blue-600" />
            Fermentation Schedule
          </h1>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700">
          <Plus className="w-4 h-4" /> New Fermentation
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        {STATUS_OPTIONS.map(s => (
          <div key={s} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 text-center">
            <p className="text-2xl font-bold text-gray-900">{counts[s]}</p>
            <p className="text-xs text-gray-500 mt-1 capitalize">{s}</p>
          </div>
        ))}
      </div>

      {/* Search & filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-3">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text" placeholder="Search batch code, culture, vessel..." value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2">
            <option value="">All Statuses</option>
            {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {['Batch Code', 'Culture', 'Vessel', 'Start', 'Expected Ready', 'pH', 'Status', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No fermentation batches found</td></tr>
              ) : filtered.map(b => (
                <React.Fragment key={b.id}>
                  <tr onClick={() => expandedId === b.id ? setExpandedId(null) : handleEdit(b)} className="cursor-pointer hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-navy-700">{b.batch_code}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{b.culture_type}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.vessel || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.start_date?.slice(0, 10) || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.expected_ready_date?.slice(0, 10) || '—'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{b.actual_ph ?? b.target_ph ?? '—'}</td>
                    <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {(NEXT_STATUS_MAP[b.status] || []).map(n => (
                          <button key={n.to} onClick={() => handleStatusChange(b.id, n.to)}
                            className={`flex items-center gap-1 px-2 py-1 text-white text-xs font-medium rounded ${n.color}`}>
                            <n.icon className="w-3 h-3" /> {n.label}
                          </button>
                        ))}
                        <button onClick={() => handleDelete(b.id, b.batch_code)} className="p-1 text-gray-400 hover:text-red-600" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedId === b.id && (
                    <tr className="bg-gray-50/50">
                      <td colSpan={8} className="px-6 py-4">
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                          <Field label="Substrate" value={editData.substrate} onChange={v => setEditData({ ...editData, substrate: v })} />
                          <Field label="Volume (L)" type="number" value={editData.volume_litres} onChange={v => setEditData({ ...editData, volume_litres: v })} />
                          <Field label="Grain weight (kg)" type="number" value={editData.grain_weight_kg} onChange={v => setEditData({ ...editData, grain_weight_kg: v })} />
                          <Field label="Temperature (°C)" type="number" value={editData.temperature_c} onChange={v => setEditData({ ...editData, temperature_c: v })} />
                          <Field label="Target pH" type="number" value={editData.target_ph} onChange={v => setEditData({ ...editData, target_ph: v })} />
                          <Field label="Actual pH" type="number" value={editData.actual_ph} onChange={v => setEditData({ ...editData, actual_ph: v })} />
                          <Field label="Target TA" type="number" value={editData.target_ta} onChange={v => setEditData({ ...editData, target_ta: v })} />
                          <Field label="Actual TA" type="number" value={editData.actual_ta} onChange={v => setEditData({ ...editData, actual_ta: v })} />
                          <Field label="Expected Ready" type="date" value={editData.expected_ready_date?.slice(0, 10)} onChange={v => setEditData({ ...editData, expected_ready_date: v })} />
                          <Field label="Actual Ready" type="date" value={editData.actual_ready_date?.slice(0, 10)} onChange={v => setEditData({ ...editData, actual_ready_date: v })} />
                        </div>
                        <div className="mt-3">
                          <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
                          <textarea rows={2} value={editData.notes || ''} onChange={e => setEditData({ ...editData, notes: e.target.value })}
                            className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                        </div>
                        <div className="flex justify-end gap-2 mt-3">
                          <button onClick={() => setExpandedId(null)} className="px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-100 rounded-lg">Cancel</button>
                          <button onClick={handleSaveEdit} disabled={saving} className="px-3 py-1.5 text-sm bg-navy-800 text-white rounded-lg hover:bg-navy-700 disabled:opacity-50">
                            {saving ? 'Saving...' : 'Save'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add modal */}
      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="New Fermentation Batch">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Input label="Batch Code *" required value={formData.batch_code} onChange={v => setFormData({ ...formData, batch_code: v })} />
            <Input label="Culture Type *" required value={formData.culture_type} onChange={v => setFormData({ ...formData, culture_type: v })} />
            <Input label="Substrate" value={formData.substrate} onChange={v => setFormData({ ...formData, substrate: v })} />
            <Input label="Vessel" value={formData.vessel} onChange={v => setFormData({ ...formData, vessel: v })} />
            <Input label="Volume (L)" type="number" value={formData.volume_litres} onChange={v => setFormData({ ...formData, volume_litres: v ? Number(v) : null })} />
            <Input label="Grain weight (kg)" type="number" value={formData.grain_weight_kg} onChange={v => setFormData({ ...formData, grain_weight_kg: v ? Number(v) : null })} />
            <Input label="Start Date *" required type="date" value={formData.start_date} onChange={v => setFormData({ ...formData, start_date: v })} />
            <Input label="Expected Ready" type="date" value={formData.expected_ready_date} onChange={v => setFormData({ ...formData, expected_ready_date: v })} />
            <Input label="Target pH" type="number" value={formData.target_ph} onChange={v => setFormData({ ...formData, target_ph: v ? Number(v) : null })} />
            <Input label="Target TA" type="number" value={formData.target_ta} onChange={v => setFormData({ ...formData, target_ta: v ? Number(v) : null })} />
            <Input label="Temperature (°C)" type="number" value={formData.temperature_c} onChange={v => setFormData({ ...formData, temperature_c: v ? Number(v) : null })} />
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
              {saving ? 'Creating...' : 'Create Batch'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function Input({ label, type = 'text', value, onChange, required = false }) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input type={type} required={required} value={value ?? ''} onChange={e => onChange(e.target.value)}
        className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
    </div>
  );
}

function Field({ label, type = 'text', value, onChange }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input type={type} value={value ?? ''} onChange={e => onChange(type === 'number' && e.target.value ? Number(e.target.value) : e.target.value)}
        className="w-full border border-gray-300 rounded-lg text-sm px-2 py-1.5" />
    </div>
  );
}
