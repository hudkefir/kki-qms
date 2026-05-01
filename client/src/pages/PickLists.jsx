import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ClipboardCheck, Trash2, Printer, Filter, ChevronRight, Package, Download } from 'lucide-react';
import { useFetch, apiPost, apiDelete } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

const STATUS_CONFIG = {
  pending: { label: 'Pending', color: 'bg-amber-100 text-amber-700' },
  in_progress: { label: 'In Progress', color: 'bg-blue-100 text-blue-700' },
  completed: { label: 'Completed', color: 'bg-green-100 text-green-700' },
  shipped: { label: 'Shipped', color: 'bg-purple-100 text-purple-700' },
};

function getLocalDatetime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export default function PickLists() {
  const navigate = useNavigate();
  const { canWrite } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [showSOS, setShowSOS] = useState(false);
  const [adding, setAdding] = useState(false);

  // Manual add form
  const [form, setForm] = useState({
    sales_order_number: '', customer_name: '', customer_po: '',
    pick_date: getLocalDatetime(), picked_by: '', notes: '',
    items: [{ sku: '', item_name: '', ordered_qty: '', uom: 'cases', bin_location: '', lot_number: '' }],
  });

  const queryParams = new URLSearchParams();
  if (search) queryParams.set('search', search);
  if (statusFilter) queryParams.set('status', statusFilter);

  const { data: pickLists, loading, refetch } = useFetch(`/api/picklists?${queryParams}`);

  // SOS Sales Orders — fetch on demand
  const [sosOrders, setSosOrders] = useState(null);
  const [sosLoading, setSosLoading] = useState(false);

  React.useEffect(() => {
    if (!showSOS) return;
    setSosLoading(true);
    fetch('/api/picklists/sos/salesorders', { credentials: 'include' })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(data => setSosOrders(data))
      .catch(() => setSosOrders([]))
      .finally(() => setSosLoading(false));
  }, [showSOS]);

  const handleManualAdd = async (e) => {
    e.preventDefault();
    if (!form.sales_order_number || !form.pick_date) return alert('SO# and pick date are required');
    setAdding(true);
    try {
      const payload = {
        ...form,
        items: form.items.filter(i => i.sku).map(i => ({ ...i, ordered_qty: parseFloat(i.ordered_qty) || 0 })),
      };
      const created = await apiPost('/api/picklists', payload);
      setShowAdd(false);
      refetch();
      navigate(`/pick-lists/${created.id}`);
    } catch (err) {
      alert('Failed to create: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleSOSImport = async (order) => {
    setAdding(true);
    try {
      const payload = {
        sales_order_number: order.number,
        customer_name: order.customer,
        customer_po: order.po,
        pick_date: getLocalDatetime(),
        items: order.items.map(i => ({
          sku: i.sku, item_name: i.item_name, ordered_qty: i.ordered_qty, uom: i.uom || 'cases',
        })),
      };
      const created = await apiPost('/api/picklists', payload);
      setShowSOS(false);
      refetch();
      navigate(`/pick-lists/${created.id}`);
    } catch (err) {
      alert('Failed to import: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id, e) => {
    e.stopPropagation();
    if (!confirm('Delete this pick list?')) return;
    try {
      await apiDelete(`/api/picklists/${id}`);
      refetch();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const addItemRow = () => {
    setForm({ ...form, items: [...form.items, { sku: '', item_name: '', ordered_qty: '', uom: 'cases', bin_location: '', lot_number: '' }] });
  };

  const updateItemRow = (idx, field, value) => {
    const updated = [...form.items];
    updated[idx][field] = value;
    setForm({ ...form, items: updated });
  };

  const removeItemRow = (idx) => {
    const updated = form.items.filter((_, i) => i !== idx);
    setForm({ ...form, items: updated.length ? updated : [{ sku: '', item_name: '', ordered_qty: '', uom: 'cases', bin_location: '', lot_number: '' }] });
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <LoadingSpinner message="Loading pick lists..." />;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pick Lists</h1>
          <p className="text-sm text-gray-500 mt-1">Generate and manage warehouse pick lists for sales orders</p>
        </div>
        {canWrite() && (
          <div className="flex items-center gap-2">
            <button onClick={() => setShowSOS(true)} className="flex items-center gap-2 px-4 py-2 border border-navy-800 text-navy-800 rounded-lg hover:bg-navy-50 transition-colors text-sm font-medium">
              <Download className="w-4 h-4" /> From SOS
            </button>
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors text-sm font-medium">
              <Plus className="w-4 h-4" /> Manual Pick List
            </button>
          </div>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search pick lists..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-gray-400" />
          {['', 'pending', 'in_progress', 'completed', 'shipped'].map(s => (
            <button key={s} onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-navy-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {s ? STATUS_CONFIG[s]?.label : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Pick Lists Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {!pickLists || pickLists.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No pick lists yet</p>
            <p className="text-sm text-gray-400 mt-1">Create a pick list from a sales order or manually</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SO #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Customer</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">PO #</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Picked By</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {pickLists.map(pl => {
                const statusCfg = STATUS_CONFIG[pl.status] || STATUS_CONFIG.pending;
                return (
                  <tr key={pl.id} className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer" onClick={() => navigate(`/pick-lists/${pl.id}`)}>
                    <td className="px-4 py-3 text-sm text-gray-700">{formatDate(pl.pick_date)}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-gray-900">{pl.sales_order_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-700">{pl.customer_name || '-'}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{pl.customer_po || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${statusCfg.color}`}>{statusCfg.label}</span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">{pl.picked_by || '-'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {canWrite() && (
                          <button onClick={(e) => handleDelete(pl.id, e)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                        <ChevronRight className="w-4 h-4 text-gray-300" />
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Manual Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Create Pick List">
        <form onSubmit={handleManualAdd}>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Sales Order #</label>
              <input type="text" value={form.sales_order_number} onChange={e => setForm({ ...form, sales_order_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer Name</label>
              <input type="text" value={form.customer_name} onChange={e => setForm({ ...form, customer_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Customer PO #</label>
              <input type="text" value={form.customer_po} onChange={e => setForm({ ...form, customer_po: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Pick Date</label>
              <input type="datetime-local" value={form.pick_date} onChange={e => setForm({ ...form, pick_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Picked By</label>
              <input type="text" value={form.picked_by} onChange={e => setForm({ ...form, picked_by: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
              <input type="text" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500" />
            </div>
          </div>

          <h3 className="text-sm font-semibold text-gray-700 mb-2">Line Items</h3>
          <div className="border rounded-lg overflow-hidden mb-4">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">SKU</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Item Name</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Qty</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">UOM</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Bin</th>
                  <th className="w-8"></th>
                </tr>
              </thead>
              <tbody>
                {form.items.map((item, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="px-3 py-2">
                      <input type="text" value={item.sku} onChange={e => updateItemRow(i, 'sku', e.target.value)}
                        className="w-24 px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="SKU" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" value={item.item_name} onChange={e => updateItemRow(i, 'item_name', e.target.value)}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="Item name" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.5" min="0" value={item.ordered_qty} onChange={e => updateItemRow(i, 'ordered_qty', e.target.value)}
                        className="w-20 px-2 py-1.5 border border-gray-200 rounded text-sm text-right" placeholder="0" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" value={item.uom} onChange={e => updateItemRow(i, 'uom', e.target.value)}
                        className="w-20 px-2 py-1.5 border border-gray-200 rounded text-sm" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" value={item.bin_location} onChange={e => updateItemRow(i, 'bin_location', e.target.value)}
                        className="w-24 px-2 py-1.5 border border-gray-200 rounded text-sm" placeholder="Bin" />
                    </td>
                    <td className="px-3 py-2">
                      <button type="button" onClick={() => removeItemRow(i)} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button type="button" onClick={addItemRow} className="text-sm text-navy-700 hover:text-navy-900 font-medium mb-4">+ Add Line Item</button>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={adding}
              className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 disabled:opacity-50">
              {adding ? 'Creating...' : 'Create Pick List'}
            </button>
          </div>
        </form>
      </Modal>

      {/* SOS Import Modal */}
      <Modal isOpen={showSOS} onClose={() => setShowSOS(false)} title="Import from SOS Inventory">
        {sosLoading ? (
          <LoadingSpinner message="Loading SOS sales orders..." />
        ) : !sosOrders || sosOrders.length === 0 ? (
          <div className="text-center py-8">
            <Package className="w-10 h-10 text-gray-300 mx-auto mb-2" />
            <p className="text-gray-500 text-sm">No open sales orders found in SOS</p>
          </div>
        ) : (
          <div className="space-y-2 max-h-[60vh] overflow-y-auto">
            {sosOrders.map(order => (
              <div key={order.id || order.number} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                onClick={() => handleSOSImport(order)}>
                <div className="flex items-center justify-between mb-2">
                  <span className="font-semibold text-gray-900">SO# {order.number}</span>
                  <span className="text-xs text-gray-500">{order.shipDate || order.date}</span>
                </div>
                <p className="text-sm text-gray-600">{order.customer} {order.po && `(PO: ${order.po})`}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {order.items?.map((item, i) => (
                    <span key={i} className="inline-block px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs">
                      {item.sku || item.item_name} x{item.ordered_qty}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
}
