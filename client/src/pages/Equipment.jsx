import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Cog, Plus, Search, ChevronDown, ChevronUp, AlertTriangle, CheckCircle, XCircle
} from 'lucide-react';
import { useFetch, apiPost } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-700 border-green-200',
  out_of_service: 'bg-amber-100 text-amber-800 border-amber-200',
  decommissioned: 'bg-gray-100 text-gray-600 border-gray-200',
};

const STATUS_LABELS = {
  active: 'Active',
  out_of_service: 'Out of Service',
  decommissioned: 'Decommissioned',
};

const FREQUENCY_LABELS = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly',
  quarterly: 'Quarterly', semi_annual: 'Semi-Annual', annual: 'Annual',
};

export function EquipmentStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[status] || STATUS_STYLES.active}`}>
      {STATUS_LABELS[status] || status}
    </span>
  );
}

export { STATUS_STYLES, STATUS_LABELS, FREQUENCY_LABELS };

export default function Equipment() {
  const navigate = useNavigate();
  const { data: items, loading, error, refetch } = useFetch('/api/equipment');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCritical, setFilterCritical] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState({ pm_frequency: 'monthly' });
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    if (!items) return [];
    let list = [...items];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(e => e.equipment_id?.toLowerCase().includes(s) || e.name?.toLowerCase().includes(s) || e.location?.toLowerCase().includes(s));
    }
    if (filterStatus) list = list.filter(e => e.status === filterStatus);
    if (filterCritical !== '') list = list.filter(e => e.is_critical === Number(filterCritical));
    list.sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [items, search, filterStatus, filterCritical, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-navy-600" /> : <ChevronDown className="w-3 h-3 text-navy-600" />;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiPost('/api/equipment', form);
      setShowModal(false);
      setForm({ pm_frequency: 'monthly' });
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return <LoadingSpinner message="Loading Equipment..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;

  const activeCount = items?.filter(e => e.status === 'active').length || 0;
  const criticalCount = items?.filter(e => e.is_critical === 1 && e.status === 'active').length || 0;
  const oosCount = items?.filter(e => e.status === 'out_of_service').length || 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500 font-medium">KK-SOP-00800</p>
          <h1 className="text-3xl font-bold text-gray-900">Equipment Register</h1>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors">
          <Plus className="w-4 h-4" />
          Add Equipment
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search equipment..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2">
            <option value="">All Statuses</option>
            {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterCritical} onChange={e => setFilterCritical(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2">
            <option value="">All Equipment</option>
            <option value="1">Critical Only</option>
            <option value="0">Non-Critical</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: items?.length || 0, icon: Cog, color: 'text-gray-900', bg: 'bg-gray-50' },
          { label: 'Active', value: activeCount, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Critical', value: criticalCount, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Out of Service', value: oosCount, icon: XCircle, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`${card.bg} p-2 rounded-lg`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-xs text-gray-500">{card.label}</p>
              </div>
            </div>
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
                  { field: 'equipment_id', label: 'ID' },
                  { field: 'name', label: 'Name' },
                  { field: 'location', label: 'Location' },
                  { field: 'is_critical', label: 'Critical' },
                  { field: 'pm_frequency', label: 'PM Frequency' },
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
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-500">No equipment found</td>
                </tr>
              ) : (
                filtered.map(eq => (
                  <tr
                    key={eq.id}
                    onClick={() => navigate(`/equipment/${eq.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-navy-700">{eq.equipment_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900">{eq.name}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{eq.location}</td>
                    <td className="px-4 py-3">
                      {eq.is_critical ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                          <AlertTriangle className="w-3 h-3" /> Critical
                        </span>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{FREQUENCY_LABELS[eq.pm_frequency] || eq.pm_frequency}</td>
                    <td className="px-4 py-3"><EquipmentStatusBadge status={eq.status} /></td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Modal */}
      <Modal isOpen={showModal} onClose={() => setShowModal(false)} title="Add Equipment">
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Equipment ID *</label>
              <input type="text" required value={form.equipment_id || ''} onChange={e => setForm({ ...form, equipment_id: e.target.value })} placeholder="e.g. EQ-001" className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
              <input type="text" required value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={2} value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Location *</label>
              <input type="text" required value={form.location || ''} onChange={e => setForm({ ...form, location: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">PM Frequency *</label>
              <select required value={form.pm_frequency || ''} onChange={e => setForm({ ...form, pm_frequency: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                {Object.entries(FREQUENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
              <input type="text" value={form.manufacturer || ''} onChange={e => setForm({ ...form, manufacturer: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
              <input type="text" value={form.model || ''} onChange={e => setForm({ ...form, model: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
              <input type="text" value={form.serial_number || ''} onChange={e => setForm({ ...form, serial_number: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date Installed</label>
              <input type="date" value={form.date_installed || ''} onChange={e => setForm({ ...form, date_installed: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div className="flex items-end">
              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input type="checkbox" checked={form.is_critical || false} onChange={e => setForm({ ...form, is_critical: e.target.checked })} className="rounded border-gray-300" />
                Critical Equipment
              </label>
            </div>
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
