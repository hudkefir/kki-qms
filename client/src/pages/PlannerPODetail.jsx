import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useFetch, apiPut, apiDelete, apiPatch } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';
import FIFOAllocation from '../components/FIFOAllocation';
import {
  ArrowLeft, Save, Trash2, Truck, RefreshCw, Plus, X, Package,
} from 'lucide-react';

const SKUS = [
  { code: 'CK001-CAD', label: 'SC-CDN' },
  { code: 'CK001-USA', label: 'SC-USA' },
  { code: 'CK002-CAD', label: 'LC-CDN' },
  { code: 'CK003-CAD', label: 'SCM-CDN' },
  { code: 'CK003-USA', label: 'SCM-USA' },
  { code: 'CK004-CAD', label: 'SCG-CDN' },
  { code: 'CK004-USA', label: 'SCG-USA' },
];
const SKU_LABELS = SKUS.map(s => s.label);

const STATUS_STYLES = {
  pending:  'bg-amber-100 text-amber-700 border-amber-200',
  shipped:  'bg-green-100 text-green-700 border-green-200',
  cancelled:'bg-gray-100 text-gray-600 border-gray-200',
};

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toISOString().slice(0, 10);
}

function formatDateTime(d) {
  if (!d) return '—';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-CA') + ' ' + dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function PlannerPODetail() {
  const { id } = useParams();
  const navigate = useNavigate();

  const { data: po, loading, error, refetch } = useFetch(`/api/planner/purchase-orders/${id}`);
  const { data: fifoData, refetch: refetchFifo } = useFetch('/api/planner/inventory/fifo');
  const { data: batches } = useFetch('/api/planner/batches');

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    if (po && !form) {
      const skusObj = typeof po.skus === 'string' ? JSON.parse(po.skus || '{}') : (po.skus || {});
      const lines = Object.entries(skusObj).map(([sku, qty]) => ({ sku, cases: Number(qty) || 0 }));
      if (lines.length === 0) lines.push({ sku: SKU_LABELS[0], cases: 0 });
      setForm({
        po_number: po.po_number || '',
        customer: po.customer || '',
        ship_date: formatDate(po.ship_date),
        status: po.status || 'pending',
        notes: po.notes || '',
        lines,
      });
    }
  }, [po]);

  const set = (field, value) => setForm(f => ({ ...f, [field]: value }));
  const updateLine = (i, field, val) => setForm(f => ({
    ...f,
    lines: f.lines.map((l, j) => j === i ? { ...l, [field]: val } : l),
  }));
  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { sku: SKU_LABELS[0], cases: 0 }] }));
  const removeLine = (i) => setForm(f => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }));

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const skus = {};
      form.lines.forEach(l => {
        if (l.sku && Number(l.cases) > 0) skus[l.sku] = Number(l.cases);
      });
      await apiPut(`/api/planner/purchase-orders/${id}`, {
        po_number: form.po_number,
        customer: form.customer,
        ship_date: form.ship_date || null,
        status: form.status,
        shipped: po.shipped,
        shipped_at: po.shipped_at,
        enabled: po.enabled,
        skus,
        notes: form.notes,
      });
      setSaveMsg('Saved');
      refetch();
      refetchFifo();
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (e) {
      setSaveMsg(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleShip = async () => {
    if (!window.confirm(`Mark PO ${po?.po_number} as shipped?`)) return;
    try {
      await apiPatch(`/api/planner/purchase-orders/${id}/ship`, {});
      refetch();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleUnship = async () => {
    try {
      await apiPatch(`/api/planner/purchase-orders/${id}/unship`, {});
      refetch();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm(`Delete PO ${po?.po_number}? This cannot be undone.`)) return;
    try {
      await apiDelete(`/api/planner/purchase-orders/${id}`);
      navigate('/planner');
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <LoadingSpinner message="Loading purchase order..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;
  if (!form) return null;

  const totalCases = form.lines.reduce((s, l) => s + (Number(l.cases) || 0), 0);

  // Build FIFO allocation data for this PO
  const poAllocations = fifoData?.allocations?.[po.id] ? { [po.id]: fifoData.allocations[po.id] } : {};
  const poShortages = fifoData?.shortages?.[po.id] ? { [po.id]: fifoData.shortages[po.id] } : {};

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/planner')} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div className="bg-blue-50 p-2 rounded-lg">
            <Package className="w-6 h-6 text-blue-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">PO# {po.po_number}</h1>
            <p className="text-sm text-gray-500">{po.customer} | Created: {formatDateTime(po.created_at)}</p>
          </div>
          <span className={`ml-3 px-2.5 py-1 rounded-full text-xs font-semibold border ${STATUS_STYLES[po.status] || 'bg-gray-100 text-gray-600'}`}>
            {po.status}
          </span>
          {po.shipped === 1 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full font-medium">
              <Truck className="w-3 h-3" /> Shipped {formatDate(po.shipped_at)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {saveMsg && (
            <span className={`text-sm font-medium ${saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {saveMsg}
            </span>
          )}
          {!po.shipped ? (
            <button onClick={handleShip}
              className="flex items-center gap-1.5 px-3 py-2 bg-green-50 text-green-700 rounded-lg text-sm font-medium hover:bg-green-100 transition-colors">
              <Truck className="w-4 h-4" /> Ship
            </button>
          ) : (
            <button onClick={handleUnship}
              className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors">
              <RefreshCw className="w-4 h-4" /> Unship
            </button>
          )}
          <button onClick={handleDelete}
            className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors">
            <Trash2 className="w-4 h-4" /> Delete
          </button>
        </div>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 space-y-6 mb-6">
        <div className="grid grid-cols-3 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
            <input type="text" value={form.po_number} onChange={e => set('po_number', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <input type="text" value={form.customer} onChange={e => set('customer', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ship Date</label>
            <input type="date" value={form.ship_date} onChange={e => set('ship_date', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>

        {/* SKU Lines */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">SKU Lines ({totalCases} cases total)</label>
            <button onClick={addLine} className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
              <Plus className="w-3 h-3" /> Add Line
            </button>
          </div>
          <div className="space-y-2">
            {form.lines.map((line, i) => (
              <div key={i} className="flex items-center gap-3">
                <select value={line.sku} onChange={e => updateLine(i, 'sku', e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
                  {SKU_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <input type="number" min="0" value={line.cases} onChange={e => updateLine(i, 'cases', e.target.value)}
                  placeholder="Cases"
                  className="w-28 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500" />
                {form.lines.length > 1 && (
                  <button onClick={() => removeLine(i)} className="p-1.5 text-gray-400 hover:text-red-500 transition-colors">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea rows={3} value={form.notes} onChange={e => set('notes', e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 resize-none"
            placeholder="Optional notes..." />
        </div>

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <button onClick={() => navigate('/planner')} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">
            Cancel
          </button>
          <button onClick={handleSave} disabled={saving}
            className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Order'}
          </button>
        </div>
      </div>

      {/* FIFO Allocation for this PO */}
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-3">FIFO Allocation</h2>
        <FIFOAllocation
          allocations={poAllocations}
          shortages={poShortages}
          purchaseOrders={po ? [po] : []}
          batches={batches || []}
        />
      </div>
    </div>
  );
}
