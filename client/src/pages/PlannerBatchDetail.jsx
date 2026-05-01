import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Package, ArrowLeft, Save, Trash2, Clock, CheckCircle, AlertTriangle, Ban } from 'lucide-react';
import { useFetch, apiPut, apiDelete, apiPatch } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

/* ── Status helpers ────────────────────────────────────────────────── */
const STATUS_OPTIONS = ['available', 'depleted', 'on-hold'];

const STATUS_STYLES = {
  available: 'bg-green-100 text-green-700 border-green-200',
  depleted:  'bg-gray-100 text-gray-600 border-gray-200',
  'on-hold': 'bg-amber-100 text-amber-700 border-amber-200',
};

const STATUS_ICONS = {
  available: CheckCircle,
  depleted:  Ban,
  'on-hold': AlertTriangle,
};

/* ══════════════════════════════════════════════════════════════════════
   BATCH DETAIL PAGE
   ══════════════════════════════════════════════════════════════════════ */
export default function PlannerBatchDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { data: batch, loading, error, refetch } = useFetch(`/api/planner/batches/${id}`);

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const [showDelete, setShowDelete] = useState(false);
  const [showAdjust, setShowAdjust] = useState(false);
  const [adjustQty, setAdjustQty] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  /* Populate form when data loads */
  React.useEffect(() => {
    if (batch && !form) {
      setForm({ ...batch });
    }
  }, [batch]);

  /* ── Field change ────────────────────────────────────────────────── */
  const set = (field, value) => {
    setForm(prev => {
      const next = { ...prev, [field]: value };
      // Recompute estimated cases when bins or cases_per_bin change
      if (field === 'bins' || field === 'cases_per_bin') {
        const bins = Number(field === 'bins' ? value : next.bins) || 0;
        const cpb  = Number(field === 'cases_per_bin' ? value : next.cases_per_bin) || 0;
        next.estimated_cases = Math.round(bins * cpb * 10) / 10;
      }
      return next;
    });
  };

  /* ── Save ─────────────────────────────────────────────────────────── */
  const handleSave = async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      await apiPut(`/api/planner/batches/${id}`, {
        batch_number: form.batch_number,
        sku: form.sku,
        production_date: form.production_date,
        bins: Number(form.bins) || 0,
        cases_per_bin: Number(form.cases_per_bin) || 0,
        estimated_cases: Number(form.estimated_cases) || 0,
        actual_cases: form.actual_cases !== '' && form.actual_cases != null ? Number(form.actual_cases) : null,
        inventory_remaining: form.inventory_remaining != null ? Number(form.inventory_remaining) : null,
        status: form.status,
        notes: form.notes || '',
      });
      setSaveMsg('Saved');
      refetch();
      setTimeout(() => setSaveMsg(''), 3000);
    } catch (e) {
      setSaveMsg(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  };

  /* ── Hold / Release toggle ───────────────────────────────────────── */
  const handleHoldToggle = async () => {
    try {
      await apiPatch(`/api/planner/batches/${id}/hold`, {});
      refetch();
      setForm(null); // force re-populate from server
    } catch (e) {
      alert(e.message);
    }
  };

  /* ── Adjust Inventory ────────────────────────────────────────────── */
  const handleAdjust = async () => {
    if (!adjustQty) return;
    try {
      await apiPatch(`/api/planner/batches/${id}/adjust`, {
        quantity: Number(adjustQty),
        reason: adjustReason,
      });
      setShowAdjust(false);
      setAdjustQty('');
      setAdjustReason('');
      refetch();
      setForm(null);
    } catch (e) {
      alert(e.message);
    }
  };

  /* ── Delete ──────────────────────────────────────────────────────── */
  const handleDelete = async () => {
    try {
      await apiDelete(`/api/planner/batches/${id}`);
      navigate('/planner');
    } catch (e) {
      alert(e.message);
    }
  };

  /* ── Loading / Error states ──────────────────────────────────────── */
  if (loading) return <LoadingSpinner message="Loading batch..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;
  if (!batch) return <div className="text-center py-16 text-gray-500">Batch not found</div>;
  if (!form) return <LoadingSpinner message="Loading batch..." />;

  const StatusIcon = STATUS_ICONS[form.status] || Package;
  const statusStyle = STATUS_STYLES[form.status] || STATUS_STYLES.available;
  const isOnHold = form.status === 'on-hold' || batch.status === 'on-hold';
  const picks = batch.picks || [];

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Back button */}
      <button
        onClick={() => navigate('/planner')}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Planner
      </button>

      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-100 rounded-xl">
            <Package className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Batch #{form.batch_number || '—'}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">{form.sku || 'No SKU'}</p>
          </div>
        </div>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium border ${statusStyle}`}>
          <StatusIcon className="w-4 h-4" />
          {form.status || 'available'}
        </span>
      </div>

      {/* Form */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Batch Details</h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Batch Number */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number</label>
            <input
              type="text"
              value={form.batch_number || ''}
              onChange={e => set('batch_number', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* SKU */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
            <input
              type="text"
              value={form.sku || ''}
              onChange={e => set('sku', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Production Date */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Production Date</label>
            <input
              type="date"
              value={form.production_date || form.pour_date || ''}
              onChange={e => set('production_date', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Bins */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bins</label>
            <input
              type="number"
              min="0"
              value={form.bins ?? ''}
              onChange={e => set('bins', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Cases Per Bin */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Cases Per Bin</label>
            <input
              type="number"
              min="0"
              step="0.1"
              value={form.cases_per_bin ?? ''}
              onChange={e => set('cases_per_bin', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Estimated Cases (computed) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cases</label>
            <input
              type="number"
              value={form.estimated_cases ?? ''}
              readOnly
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600 cursor-not-allowed"
            />
            <p className="text-xs text-gray-400 mt-0.5">Auto-calculated from bins x cases/bin</p>
          </div>

          {/* Actual Cases */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Actual Cases</label>
            <input
              type="number"
              min="0"
              value={form.actual_cases ?? ''}
              onChange={e => set('actual_cases', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Inventory Remaining */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Inventory Remaining</label>
            <input
              type="number"
              min="0"
              value={form.inventory_remaining ?? form.remaining_cases ?? ''}
              onChange={e => set('inventory_remaining', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          {/* Status */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select
              value={form.status || 'available'}
              onChange={e => set('status', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            >
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{s.replace('-', ' ').replace(/\b\w/g, c => c.toUpperCase())}</option>
              ))}
            </select>
          </div>

          {/* Notes — full width */}
          <div className="sm:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              rows={3}
              value={form.notes || ''}
              onChange={e => set('notes', e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* Pick History */}
      {picks.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Clock className="w-5 h-5 text-gray-400" />
            Pick History
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Date</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">PO</th>
                  <th className="text-right py-2 px-3 text-xs font-medium text-gray-500 uppercase">Cases</th>
                  <th className="text-left py-2 px-3 text-xs font-medium text-gray-500 uppercase">Picked By</th>
                </tr>
              </thead>
              <tbody>
                {picks.map((pick, i) => (
                  <tr key={pick.id || i} className="border-b border-gray-50 last:border-0">
                    <td className="py-2 px-3 font-mono text-gray-700">{pick.picked_at || pick.created_at || '—'}</td>
                    <td className="py-2 px-3 text-gray-700">{pick.po_number || pick.po_id || '—'}</td>
                    <td className="py-2 px-3 text-right font-mono font-medium text-gray-900">{pick.cases ?? '—'}</td>
                    <td className="py-2 px-3 text-gray-600">{pick.picked_by || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-1.5 px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          <Save className="w-4 h-4" />
          {saving ? 'Saving...' : 'Save'}
        </button>

        <button
          onClick={handleHoldToggle}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border transition-colors ${
            isOnHold
              ? 'border-green-300 text-green-700 hover:bg-green-50'
              : 'border-amber-300 text-amber-700 hover:bg-amber-50'
          }`}
        >
          {isOnHold ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
          {isOnHold ? 'Release Hold' : 'Place on Hold'}
        </button>

        <button
          onClick={() => setShowAdjust(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors"
        >
          <Package className="w-4 h-4" />
          Adjust Inventory
        </button>

        <button
          onClick={() => setShowDelete(true)}
          className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors ml-auto"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>

        {saveMsg && (
          <span className={`text-sm font-medium ${saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
            {saveMsg}
          </span>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      <Modal isOpen={showDelete} onClose={() => setShowDelete(false)} title="Delete Batch">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Are you sure you want to delete batch <strong>{form.batch_number}</strong>?
            This action cannot be undone and will remove all associated inventory records.
          </p>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setShowDelete(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleDelete}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
            >
              Delete Batch
            </button>
          </div>
        </div>
      </Modal>

      {/* Adjust Inventory Modal */}
      <Modal isOpen={showAdjust} onClose={() => setShowAdjust(false)} title="Adjust Inventory">
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            Enter a positive or negative number to adjust the inventory for batch <strong>{form.batch_number}</strong>.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Quantity</label>
            <input
              type="number"
              value={adjustQty}
              onChange={e => setAdjustQty(e.target.value)}
              placeholder="e.g. -5 or +10"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Reason</label>
            <textarea
              rows={2}
              value={adjustReason}
              onChange={e => setAdjustReason(e.target.value)}
              placeholder="Reason for adjustment..."
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
          <div className="flex items-center justify-end gap-3">
            <button
              onClick={() => setShowAdjust(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleAdjust}
              disabled={!adjustQty}
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              Apply Adjustment
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
