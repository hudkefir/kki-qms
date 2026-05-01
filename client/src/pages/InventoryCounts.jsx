import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, ClipboardList, Trash2, Printer, Filter, ChevronRight, Package } from 'lucide-react';
import { useFetch, apiPost, apiDelete } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

const SKU_OPTIONS = [
  { code: 'SC-CDN', label: 'Small Classic (CDN)' },
  { code: 'SC-USA', label: 'Small Classic (USA)' },
  { code: 'LC-CDN', label: 'Large Classic (CDN)' },
  { code: 'SCM-CDN', label: 'Small Mango (CDN)' },
  { code: 'SCM-USA', label: 'Small Mango (USA)' },
  { code: 'SCG-CDN', label: 'Small Ginger (CDN)' },
  { code: 'SCG-USA', label: 'Small Ginger (USA)' },
];

function getLocalDatetime() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
}

export default function InventoryCounts() {
  const navigate = useNavigate();
  const { canWrite } = useAuth();
  const [search, setSearch] = useState('');
  const [skuFilter, setSkuFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [adding, setAdding] = useState(false);
  const [countDate, setCountDate] = useState(getLocalDatetime());
  const [countedBy, setCountedBy] = useState('');
  const [location, setLocation] = useState('');
  const [skuRows, setSkuRows] = useState(
    SKU_OPTIONS.map(s => ({ sku: s.code, item_name: s.label, counted_qty: '', lot_number: '', notes: '' }))
  );

  const queryParams = new URLSearchParams();
  if (search) queryParams.set('search', search);
  if (skuFilter) queryParams.set('sku', skuFilter);

  const { data: counts, loading, refetch } = useFetch(`/api/inventory/counts?${queryParams}`);

  const grouped = useMemo(() => {
    if (!counts) return [];
    const map = {};
    for (const c of counts) {
      const key = `${c.count_date}|${c.counted_by}`;
      if (!map[key]) map[key] = { count_date: c.count_date, counted_by: c.counted_by, items: [], ids: [] };
      map[key].items.push(c);
      map[key].ids.push(c.id);
    }
    return Object.values(map).sort((a, b) => b.count_date.localeCompare(a.count_date));
  }, [counts]);

  const handleAdd = async (e) => {
    e.preventDefault();
    const items = skuRows.filter(r => r.counted_qty !== '' && r.counted_qty !== null);
    if (items.length === 0) return alert('Enter at least one count quantity');
    setAdding(true);
    try {
      await apiPost('/api/inventory/counts', {
        count_date: countDate,
        counted_by: countedBy,
        location,
        items: items.map(r => ({ ...r, counted_qty: parseFloat(r.counted_qty) || 0 })),
      });
      setShowAdd(false);
      setSkuRows(SKU_OPTIONS.map(s => ({ sku: s.code, item_name: s.label, counted_qty: '', lot_number: '', notes: '' })));
      refetch();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this inventory count record?')) return;
    try {
      await apiDelete(`/api/inventory/counts/${id}`);
      refetch();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  if (loading) return <LoadingSpinner message="Loading inventory counts..." />;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Physical Inventory Counts</h1>
          <p className="text-sm text-gray-500 mt-1">Count physical inventory per SKU — track variances and history</p>
        </div>
        {canWrite() && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" />
            New Count
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" placeholder="Search counts..." value={search} onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-gray-400" />
          <select value={skuFilter} onChange={e => setSkuFilter(e.target.value)}
            className="px-3 py-1.5 rounded-lg text-xs font-medium bg-gray-100 text-gray-600 border-0 focus:ring-2 focus:ring-navy-500">
            <option value="">All SKUs</option>
            {SKU_OPTIONS.map(s => <option key={s.code} value={s.code}>{s.code}</option>)}
          </select>
        </div>
      </div>

      {/* Counts List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {!counts || counts.length === 0 ? (
          <div className="text-center py-16">
            <ClipboardList className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No inventory counts yet</p>
            <p className="text-sm text-gray-400 mt-1">Start a new physical count to track inventory levels</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Date</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">SKU</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Item</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Counted Qty</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Counted By</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Location</th>
                <th className="w-20"></th>
              </tr>
            </thead>
            <tbody>
              {counts.map(c => (
                <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/50 cursor-pointer" onClick={() => navigate(`/inventory-counts/${c.id}`)}>
                  <td className="px-4 py-3 text-sm text-gray-700">{formatDate(c.count_date)}</td>
                  <td className="px-4 py-3">
                    <span className="inline-block px-2 py-0.5 rounded text-xs font-semibold bg-blue-50 text-blue-700">{c.sku}</span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-700">{c.item_name}</td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-semibold text-right">{c.counted_qty}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.counted_by}</td>
                  <td className="px-4 py-3 text-sm text-gray-600">{c.location || '-'}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      {canWrite() && (
                        <button onClick={() => handleDelete(c.id)} className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="New Physical Inventory Count">
        <form onSubmit={handleAdd}>
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Count Date/Time</label>
              <input type="datetime-local" value={countDate} onChange={e => setCountDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Counted By</label>
              <input type="text" value={countedBy} onChange={e => setCountedBy(e.target.value)} placeholder="Operator name"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Location</label>
              <input type="text" value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Walk-in Cooler"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-navy-500" />
            </div>
          </div>

          <div className="border rounded-lg overflow-hidden mb-4">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">SKU</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Item</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-500">Physical Count</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Lot #</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500">Notes</th>
                </tr>
              </thead>
              <tbody>
                {skuRows.map((row, i) => (
                  <tr key={row.sku} className="border-b border-gray-50">
                    <td className="px-3 py-2">
                      <span className="text-xs font-semibold text-blue-700">{row.sku}</span>
                    </td>
                    <td className="px-3 py-2 text-sm text-gray-600">{row.item_name}</td>
                    <td className="px-3 py-2">
                      <input type="number" step="0.5" min="0" value={row.counted_qty}
                        onChange={e => {
                          const updated = [...skuRows];
                          updated[i].counted_qty = e.target.value;
                          setSkuRows(updated);
                        }}
                        className="w-24 px-2 py-1.5 border border-gray-200 rounded text-sm text-right focus:ring-2 focus:ring-navy-500"
                        placeholder="0" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" value={row.lot_number}
                        onChange={e => {
                          const updated = [...skuRows];
                          updated[i].lot_number = e.target.value;
                          setSkuRows(updated);
                        }}
                        className="w-28 px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-navy-500"
                        placeholder="Optional" />
                    </td>
                    <td className="px-3 py-2">
                      <input type="text" value={row.notes}
                        onChange={e => {
                          const updated = [...skuRows];
                          updated[i].notes = e.target.value;
                          setSkuRows(updated);
                        }}
                        className="w-full px-2 py-1.5 border border-gray-200 rounded text-sm focus:ring-2 focus:ring-navy-500"
                        placeholder="Optional" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={adding}
              className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 disabled:opacity-50">
              {adding ? 'Saving...' : 'Save Count'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
