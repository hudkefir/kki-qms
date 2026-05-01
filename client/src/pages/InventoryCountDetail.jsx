import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Printer } from 'lucide-react';
import { useFetch, apiPut, apiDelete } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';

export default function InventoryCountDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canWrite } = useAuth();
  const { data: count, loading, error, refetch } = useFetch(`/api/inventory/counts/${id}`);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  if (loading) return <LoadingSpinner message="Loading count..." />;
  if (error || !count) return (
    <div className="max-w-4xl mx-auto">
      <button onClick={() => navigate('/inventory-counts')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Inventory Counts
      </button>
      <div className="text-center py-16 text-red-600">Count not found</div>
    </div>
  );

  const startEdit = () => {
    setForm({
      counted_qty: count.counted_qty,
      count_date: count.count_date?.slice(0, 16),
      counted_by: count.counted_by,
      location: count.location,
      lot_number: count.lot_number,
      notes: count.notes,
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut(`/api/inventory/counts/${id}`, form);
      setEditing(false);
      refetch();
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this inventory count record? This cannot be undone.')) return;
    try {
      await apiDelete(`/api/inventory/counts/${id}`);
      navigate('/inventory-counts');
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/inventory-counts')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Inventory Count #{id}</h1>
            <p className="text-sm text-gray-500">{count.sku} &mdash; {count.item_name}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="flex items-center gap-2 px-3 py-2 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
            <Printer className="w-4 h-4" /> Print
          </button>
          {canWrite() && !editing && (
            <>
              <button onClick={startEdit} className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700">Edit</button>
              <button onClick={handleDelete} className="flex items-center gap-2 px-3 py-2 border border-red-200 rounded-lg text-sm text-red-600 hover:bg-red-50">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            </>
          )}
          {editing && (
            <>
              <button onClick={() => setEditing(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
              <button onClick={handleSave} disabled={saving}
                className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 disabled:opacity-50">
                <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Print Header */}
      <div className="hidden print:block mb-6 text-center border-b-2 border-gray-800 pb-4">
        <h1 className="text-xl font-bold">Kefir Kultures Inc.</h1>
        <h2 className="text-lg font-semibold mt-1">Physical Inventory Count Record</h2>
        <p className="text-sm text-gray-600 mt-1">Date: {formatDate(count.count_date)}</p>
      </div>

      {/* Detail Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">SKU</label>
            <p className="text-sm font-semibold text-gray-900">{count.sku}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Item Name</label>
            <p className="text-sm text-gray-900">{count.item_name}</p>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Count Date</label>
            {editing ? (
              <input type="datetime-local" value={form.count_date} onChange={e => setForm({ ...form, count_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500" />
            ) : (
              <p className="text-sm text-gray-900">{formatDate(count.count_date)}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Counted Qty</label>
            {editing ? (
              <input type="number" step="0.5" min="0" value={form.counted_qty} onChange={e => setForm({ ...form, counted_qty: parseFloat(e.target.value) || 0 })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500" />
            ) : (
              <p className="text-2xl font-bold text-gray-900">{count.counted_qty}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Counted By</label>
            {editing ? (
              <input type="text" value={form.counted_by} onChange={e => setForm({ ...form, counted_by: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500" />
            ) : (
              <p className="text-sm text-gray-900">{count.counted_by || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Location</label>
            {editing ? (
              <input type="text" value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500" />
            ) : (
              <p className="text-sm text-gray-900">{count.location || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Lot Number</label>
            {editing ? (
              <input type="text" value={form.lot_number} onChange={e => setForm({ ...form, lot_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500" />
            ) : (
              <p className="text-sm text-gray-900">{count.lot_number || '-'}</p>
            )}
          </div>
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            {editing ? (
              <textarea value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500" />
            ) : (
              <p className="text-sm text-gray-900">{count.notes || '-'}</p>
            )}
          </div>
        </div>

        {/* Print Signature Lines */}
        <div className="hidden print:block mt-12 pt-8 border-t border-gray-300">
          <div className="grid grid-cols-2 gap-16">
            <div>
              <div className="border-b border-gray-400 mb-1 h-8"></div>
              <p className="text-xs text-gray-500">Counted By (Signature)</p>
            </div>
            <div>
              <div className="border-b border-gray-400 mb-1 h-8"></div>
              <p className="text-xs text-gray-500">Verified By (Signature)</p>
            </div>
          </div>
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-4 text-xs text-gray-400 print:hidden">
        Created: {formatDate(count.created_at)} by {count.created_by || '-'}
        {count.updated_by && <> &bull; Updated: {formatDate(count.updated_at)} by {count.updated_by}</>}
      </div>
    </div>
  );
}
