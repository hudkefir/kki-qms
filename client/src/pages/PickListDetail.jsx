import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Save, Trash2, Printer, CheckCircle } from 'lucide-react';
import { useFetch, apiPut, apiDelete } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-700' },
};

export default function PickListDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canWrite } = useAuth();
  const { data: pickList, loading, error, refetch } = useFetch(`/api/picklists/${id}`);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  if (loading) return <LoadingSpinner message="Loading pick list..." />;
  if (error || !pickList) return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate('/pick-lists')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Pick Lists
      </button>
      <div className="text-center py-16 text-red-600">Pick list not found</div>
    </div>
  );

  const statusCfg = STATUS_CONFIG[pickList.status] || STATUS_CONFIG.pending;

  const startEdit = () => {
    setForm({
      pick_date: pickList.pick_date?.slice(0, 16),
      picked_by: pickList.picked_by || '',
      customer_name: pickList.customer_name || '',
      customer_po: pickList.customer_po || '',
      status: pickList.status || 'pending',
      notes: pickList.notes || '',
      items: (pickList.items || []).map(i => ({
        sku: i.sku, item_name: i.item_name, ordered_qty: i.ordered_qty,
        picked_qty: i.picked_qty || 0, uom: i.uom || 'cases',
        bin_location: i.bin_location || '', lot_number: i.lot_number || '', notes: i.notes || '',
      })),
    });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut(`/api/picklists/${id}`, form);
      setEditing(false);
      refetch();
    } catch (err) {
      alert('Save failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Delete this pick list? This cannot be undone.')) return;
    try {
      await apiDelete(`/api/picklists/${id}`);
      navigate('/pick-lists');
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handlePrint = () => window.print();

  const updateItem = (idx, field, value) => {
    const items = [...form.items];
    items[idx][field] = value;
    setForm({ ...form, items });
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const items = pickList.items || [];

  return (
    <div className="max-w-5xl mx-auto">
      {/* Screen Header */}
      <div className="flex items-center justify-between mb-6 print:hidden">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/pick-lists')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Pick List — SO# {pickList.sales_order_number}</h1>
            <p className="text-sm text-gray-500">{pickList.customer_name} {pickList.customer_po && `(PO: ${pickList.customer_po})`}</p>
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
        <h2 className="text-lg font-semibold mt-1">Warehouse Pick List</h2>
        <div className="flex justify-between text-sm text-gray-600 mt-2 px-4">
          <span>SO#: <strong>{pickList.sales_order_number}</strong></span>
          <span>Customer: <strong>{pickList.customer_name}</strong></span>
          <span>PO#: <strong>{pickList.customer_po || 'N/A'}</strong></span>
        </div>
        <div className="flex justify-between text-sm text-gray-600 mt-1 px-4">
          <span>Pick Date: <strong>{formatDate(pickList.pick_date)}</strong></span>
          <span>Picked By: <strong>{pickList.picked_by || '________________'}</strong></span>
        </div>
      </div>

      {/* Info Card */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6 print:shadow-none print:border-0 print:p-0 print:mb-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Pick Date</label>
            {editing ? (
              <input type="datetime-local" value={form.pick_date} onChange={e => setForm({ ...form, pick_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500" />
            ) : (
              <p className="text-sm text-gray-900">{formatDate(pickList.pick_date)}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Picked By</label>
            {editing ? (
              <input type="text" value={form.picked_by} onChange={e => setForm({ ...form, picked_by: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500" />
            ) : (
              <p className="text-sm text-gray-900">{pickList.picked_by || '-'}</p>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
            {editing ? (
              <select value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500">
                {Object.entries(STATUS_CONFIG).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            ) : (
              <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${statusCfg.color}`}>{statusCfg.label}</span>
            )}
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Notes</label>
            {editing ? (
              <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500" />
            ) : (
              <p className="text-sm text-gray-900">{pickList.notes || '-'}</p>
            )}
          </div>
        </div>
      </div>

      {/* Line Items */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden print:shadow-none print:border print:border-gray-400">
        <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50 print:bg-gray-100">
          <h3 className="text-sm font-semibold text-gray-700">Line Items</h3>
        </div>
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100 bg-gray-50/30 print:bg-gray-100">
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">SKU</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Item</th>
              <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Ordered</th>
              <th className="text-right px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Picked</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">UOM</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Bin</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Lot #</th>
              <th className="text-left px-4 py-2 text-xs font-semibold text-gray-500 uppercase print:block hidden print:table-cell">Initials</th>
            </tr>
          </thead>
          <tbody>
            {editing ? (
              form.items.map((item, i) => (
                <tr key={i} className="border-b border-gray-50">
                  <td className="px-4 py-2"><span className="text-xs font-semibold text-blue-700">{item.sku}</span></td>
                  <td className="px-4 py-2 text-sm text-gray-700">{item.item_name}</td>
                  <td className="px-4 py-2 text-sm text-right">{item.ordered_qty}</td>
                  <td className="px-4 py-2">
                    <input type="number" step="0.5" min="0" value={item.picked_qty}
                      onChange={e => updateItem(i, 'picked_qty', parseFloat(e.target.value) || 0)}
                      className="w-20 px-2 py-1 border border-gray-200 rounded text-sm text-right focus:ring-2 focus:ring-navy-500" />
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">{item.uom}</td>
                  <td className="px-4 py-2">
                    <input type="text" value={item.bin_location} onChange={e => updateItem(i, 'bin_location', e.target.value)}
                      className="w-24 px-2 py-1 border border-gray-200 rounded text-sm" />
                  </td>
                  <td className="px-4 py-2">
                    <input type="text" value={item.lot_number} onChange={e => updateItem(i, 'lot_number', e.target.value)}
                      className="w-28 px-2 py-1 border border-gray-200 rounded text-sm" />
                  </td>
                </tr>
              ))
            ) : (
              items.map(item => (
                <tr key={item.id} className="border-b border-gray-50">
                  <td className="px-4 py-2">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">{item.sku}</span>
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-700">{item.item_name}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 font-semibold text-right">{item.ordered_qty}</td>
                  <td className="px-4 py-2 text-sm text-right">
                    {item.picked_qty > 0 ? (
                      <span className={item.picked_qty === item.ordered_qty ? 'text-green-600 font-semibold' : 'text-amber-600 font-semibold'}>
                        {item.picked_qty}
                      </span>
                    ) : (
                      <span className="text-gray-400 print:border-b print:border-gray-400 print:inline-block print:w-16">&mdash;</span>
                    )}
                  </td>
                  <td className="px-4 py-2 text-sm text-gray-600">{item.uom}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{item.bin_location || '-'}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{item.lot_number || '-'}</td>
                  <td className="px-4 py-2 hidden print:table-cell">
                    <div className="border-b border-gray-400 w-16 h-5"></div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Print Signature Lines */}
      <div className="hidden print:block mt-12 pt-8 border-t border-gray-300">
        <div className="grid grid-cols-3 gap-12">
          <div>
            <div className="border-b border-gray-400 mb-1 h-8"></div>
            <p className="text-xs text-gray-500">Picked By (Signature)</p>
          </div>
          <div>
            <div className="border-b border-gray-400 mb-1 h-8"></div>
            <p className="text-xs text-gray-500">Verified By (Signature)</p>
          </div>
          <div>
            <div className="border-b border-gray-400 mb-1 h-8"></div>
            <p className="text-xs text-gray-500">Date</p>
          </div>
        </div>
        <div className="mt-6 text-xs text-gray-400 text-center">
          Printed: {new Date().toLocaleString()} | Kefir Kultures Inc. QMS
        </div>
      </div>

      {/* Metadata */}
      <div className="mt-4 text-xs text-gray-400 print:hidden">
        Created: {formatDate(pickList.created_at)} by {pickList.created_by || '-'}
        {pickList.updated_by && <> &bull; Updated: {formatDate(pickList.updated_at)} by {pickList.updated_by}</>}
      </div>
    </div>
  );
}
