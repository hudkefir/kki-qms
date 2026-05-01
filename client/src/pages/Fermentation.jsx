import React, { useState, useMemo } from 'react';
import { Beaker, Plus, Trash2, CheckCircle, Clock, AlertTriangle, RefreshCw } from 'lucide-react';
import { useFetch, apiPost, apiPut, apiDelete, apiPatch } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

const FLAVOURS = ['Original', 'Mango', 'Guava', 'Unflavoured'];

const STATUS_STYLES = {
  fermenting: 'bg-amber-100 text-amber-800 border-amber-200',
  resting:    'bg-red-100 text-red-700 border-red-200',
  ready:      'bg-green-100 text-green-700 border-green-200',
};

const STATUS_LABELS = {
  fermenting: 'Fermenting',
  resting:    'Resting',
  ready:      'Ready',
};

const STATUS_ICONS = {
  fermenting: Clock,
  resting:    AlertTriangle,
  ready:      CheckCircle,
};

function StatusBadge({ status }) {
  const Icon = STATUS_ICONS[status] || Clock;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[status] || STATUS_STYLES.fermenting}`}>
      <Icon className="w-3 h-3" />
      {STATUS_LABELS[status] || status}
    </span>
  );
}

function daysBetween(dateStr) {
  if (!dateStr) return null;
  const d = new Date(dateStr);
  const now = new Date();
  return Math.floor((now - d) / (1000 * 60 * 60 * 24));
}

function AgeBadge({ days }) {
  if (days === null || days === undefined) return <span className="text-gray-400">--</span>;
  let cls = 'bg-green-100 text-green-700';
  if (days > 5) cls = 'bg-red-100 text-red-700';
  else if (days >= 3) cls = 'bg-amber-100 text-amber-700';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${cls}`}>
      {days}d
    </span>
  );
}

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

export default function Fermentation() {
  const { user } = useAuth();
  const { data: batches, loading, error, refetch } = useFetch('/api/planner/fermentation');
  const { data: fridge, loading: fridgeLoading, refetch: refetchFridge } = useFetch('/api/planner/fridge');

  const [editing, setEditing] = useState({}); // { [id]: { field: value } }
  const [saving, setSaving] = useState(null);

  // ── summary metrics ──
  const metrics = useMemo(() => {
    if (!batches) return { total: 0, ready: 0, resting: 0, fermenting: 0 };
    const enabled = batches.filter(b => b.enabled);
    return {
      total: enabled.reduce((sum, b) => sum + (b.bins || 0), 0),
      ready: enabled.filter(b => b.status === 'ready').reduce((sum, b) => sum + (b.bins || 0), 0),
      resting: enabled.filter(b => b.status === 'resting').reduce((sum, b) => sum + (b.bins || 0), 0),
      fermenting: enabled.filter(b => b.status === 'fermenting').reduce((sum, b) => sum + (b.bins || 0), 0),
    };
  }, [batches]);

  // ── inline edit helpers ──
  const startEdit = (id, field, value) => {
    setEditing(prev => ({
      ...prev,
      [id]: { ...(prev[id] || {}), [field]: value },
    }));
  };

  const getEditValue = (batch, field) => {
    if (editing[batch.id] && editing[batch.id][field] !== undefined) {
      return editing[batch.id][field];
    }
    return batch[field] ?? '';
  };

  const commitEdit = async (batch, field) => {
    const val = editing[batch.id]?.[field];
    if (val === undefined || val === (batch[field] ?? '')) {
      // no change — clear edit state
      setEditing(prev => {
        const copy = { ...prev };
        if (copy[batch.id]) {
          delete copy[batch.id][field];
          if (Object.keys(copy[batch.id]).length === 0) delete copy[batch.id];
        }
        return copy;
      });
      return;
    }
    setSaving(batch.id);
    try {
      await apiPut(`/api/planner/fermentation/${batch.id}`, { [field]: val });
      refetch();
      refetchFridge();
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(null);
      setEditing(prev => {
        const copy = { ...prev };
        delete copy[batch.id];
        return copy;
      });
    }
  };

  // ── actions ──
  const handleAdd = async () => {
    try {
      await apiPost('/api/planner/fermentation', {
        ferment_date: new Date().toISOString().slice(0, 10),
      });
      refetch();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this GRP batch?')) return;
    try {
      await apiDelete(`/api/planner/fermentation/${id}`);
      refetch();
      refetchFridge();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleToggle = async (id) => {
    try {
      await apiPatch(`/api/planner/fermentation/${id}/toggle`);
      refetch();
      refetchFridge();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleClearOld = async () => {
    if (!batches) return;
    const readyBatches = batches.filter(b => b.status === 'ready' && b.enabled);
    if (readyBatches.length === 0) return alert('No ready batches to clear.');
    if (!window.confirm(`Disable ${readyBatches.length} ready batch(es)?`)) return;
    try {
      for (const b of readyBatches) {
        await apiPatch(`/api/planner/fermentation/${b.id}/toggle`);
      }
      refetch();
      refetchFridge();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) return <LoadingSpinner message="Loading Fermentation Pipeline..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-amber-50 p-2 rounded-lg">
            <Beaker className="w-6 h-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Fermentation Pipeline</h1>
            <p className="text-sm text-gray-500">GRP batch management &amp; fridge tracking</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleClearOld}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Clear Old GRP
          </button>
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add GRP
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total GRP Bins', value: metrics.total, icon: Beaker, color: 'text-gray-900', bg: 'bg-gray-50' },
          { label: 'Ready Now', value: metrics.ready, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Still Resting', value: metrics.resting, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Fermenting', value: metrics.fermenting, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
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

      {/* GRP Batches Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mb-6">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">GRP Batches</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-10">On</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">GRP#</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Batch#</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-20">Bins</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Flavour</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ferment Date</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Strain Date</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Ready Date</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider w-16">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {(!batches || batches.length === 0) && (
                <tr>
                  <td colSpan={10} className="px-4 py-8 text-center text-gray-400 text-sm">
                    No GRP batches yet. Click "Add GRP" to start.
                  </td>
                </tr>
              )}
              {batches?.map(batch => (
                <tr
                  key={batch.id}
                  className={`hover:bg-gray-50 transition-colors ${!batch.enabled ? 'opacity-40' : ''} ${saving === batch.id ? 'bg-blue-50' : ''}`}
                >
                  {/* Enable toggle */}
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={!!batch.enabled}
                      onChange={() => handleToggle(batch.id)}
                      className="w-4 h-4 rounded border-gray-300 text-navy-600 focus:ring-navy-500"
                    />
                  </td>
                  {/* GRP# */}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={getEditValue(batch, 'grp_number')}
                      onChange={e => startEdit(batch.id, 'grp_number', e.target.value)}
                      onBlur={() => commitEdit(batch, 'grp_number')}
                      className="w-full bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-navy-500 focus:ring-0 text-sm px-0 py-1"
                      placeholder="GRP-001"
                    />
                  </td>
                  {/* Batch# */}
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={getEditValue(batch, 'batch_number')}
                      onChange={e => startEdit(batch.id, 'batch_number', e.target.value)}
                      onBlur={() => commitEdit(batch, 'batch_number')}
                      className="w-full bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-navy-500 focus:ring-0 text-sm px-0 py-1"
                      placeholder="B-001"
                    />
                  </td>
                  {/* Bins */}
                  <td className="px-3 py-2">
                    <input
                      type="number"
                      min="0"
                      value={getEditValue(batch, 'bins')}
                      onChange={e => startEdit(batch.id, 'bins', e.target.value === '' ? '' : Number(e.target.value))}
                      onBlur={() => commitEdit(batch, 'bins')}
                      className="w-20 bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-navy-500 focus:ring-0 text-sm px-0 py-1"
                      placeholder="0"
                    />
                  </td>
                  {/* Flavour */}
                  <td className="px-3 py-2">
                    <select
                      value={getEditValue(batch, 'flavour')}
                      onChange={async e => {
                        const val = e.target.value;
                        setSaving(batch.id);
                        try {
                          await apiPut(`/api/planner/fermentation/${batch.id}`, { flavour: val });
                          refetch();
                          refetchFridge();
                        } catch (err) {
                          alert('Save failed: ' + err.message);
                        } finally {
                          setSaving(null);
                        }
                      }}
                      className="bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-navy-500 focus:ring-0 text-sm px-0 py-1"
                    >
                      <option value="">--</option>
                      {FLAVOURS.map(f => (
                        <option key={f} value={f}>{f}</option>
                      ))}
                    </select>
                  </td>
                  {/* Ferment Date */}
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={formatDate(getEditValue(batch, 'ferment_date'))}
                      onChange={e => startEdit(batch.id, 'ferment_date', e.target.value)}
                      onBlur={() => commitEdit(batch, 'ferment_date')}
                      className="bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-navy-500 focus:ring-0 text-sm px-0 py-1"
                    />
                  </td>
                  {/* Strain Date */}
                  <td className="px-3 py-2">
                    <input
                      type="date"
                      value={formatDate(getEditValue(batch, 'strain_date'))}
                      onChange={e => startEdit(batch.id, 'strain_date', e.target.value)}
                      onBlur={() => commitEdit(batch, 'strain_date')}
                      className="bg-transparent border-0 border-b border-transparent hover:border-gray-300 focus:border-navy-500 focus:ring-0 text-sm px-0 py-1"
                    />
                  </td>
                  {/* Ready Date (computed, read-only) */}
                  <td className="px-3 py-2 text-sm text-gray-500">
                    {batch.ready_date ? formatDate(batch.ready_date) : '--'}
                  </td>
                  {/* Status */}
                  <td className="px-3 py-2">
                    <StatusBadge status={batch.status} />
                  </td>
                  {/* Actions */}
                  <td className="px-3 py-2">
                    <button
                      onClick={() => handleDelete(batch.id)}
                      className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors"
                      title="Delete batch"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Fridge Section */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">Fridge — Ready GRP</h2>
          <button
            onClick={refetchFridge}
            className="p-1 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh fridge"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
        {fridgeLoading ? (
          <div className="px-4 py-8 text-center text-gray-400 text-sm">Loading fridge...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Batch#</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">GRP#</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Bins</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Remaining</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Strain Date</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Days in Fridge</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Flavour</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Status</th>
                  <th className="px-3 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Consumed By</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {(!fridge || fridge.length === 0) && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-gray-400 text-sm">
                      No ready GRP in the fridge.
                    </td>
                  </tr>
                )}
                {fridge?.map((item, idx) => {
                  const daysInFridge = daysBetween(item.strain_date);
                  return (
                    <tr key={item.id || idx} className="hover:bg-gray-50 transition-colors">
                      <td className="px-3 py-2 text-sm text-gray-900 font-medium">{item.batch_number || '--'}</td>
                      <td className="px-3 py-2 text-sm text-gray-700">{item.grp_number || '--'}</td>
                      <td className="px-3 py-2 text-sm text-gray-700">{item.bins ?? '--'}</td>
                      <td className="px-3 py-2 text-sm text-gray-700">{item.remaining ?? item.bins ?? '--'}</td>
                      <td className="px-3 py-2 text-sm text-gray-700">{item.strain_date ? formatDate(item.strain_date) : '--'}</td>
                      <td className="px-3 py-2">
                        <AgeBadge days={daysInFridge} />
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-700">{item.flavour || '--'}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={item.status || 'ready'} />
                      </td>
                      <td className="px-3 py-2 text-sm text-gray-500">{item.consumed_by || '--'}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
