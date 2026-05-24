import React, { useState, useEffect } from 'react';
import { FileSpreadsheet, Plus, ChevronDown, ChevronRight, CheckCircle, Trash2, Edit2 } from 'lucide-react';
import { useFetch, apiPost, apiPut, apiDelete } from '../../hooks/useApi';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';

const STATUS_OPTIONS = ['draft', 'active', 'superseded'];
const STATUS_STYLES = {
  draft:       'bg-gray-100 text-gray-700 border-gray-200',
  active:      'bg-green-100 text-green-800 border-green-200',
  superseded:  'bg-amber-100 text-amber-700 border-amber-200',
};

const ITEM_TYPES = ['ingredient', 'packaging', 'label', 'consumable', 'other'];
const UNITS = ['kg', 'g', 'L', 'mL', 'ea', 'case', 'box', 'roll'];

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[status] || STATUS_STYLES.draft}`}>
      {status}
    </span>
  );
}

export default function BOMs() {
  const { data: boms, loading, error, refetch } = useFetch('/api/production/boms');
  const [expandedId, setExpandedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const filtered = (boms || []).filter(b => !filterStatus || b.status === filterStatus);

  const handleAdd = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiPost('/api/production/boms', formData);
      setShowAddModal(false);
      setFormData({});
      refetch();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id) => {
    if (!confirm('Activate this BOM? Any previously active version for this SKU will be superseded.')) return;
    try {
      await apiPut(`/api/production/boms/${id}/activate`, {});
      refetch();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (loading) return <LoadingSpinner message="Loading BOMs..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500 font-medium">Production</p>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FileSpreadsheet className="w-8 h-8 text-purple-600" />
            BOMs / Recipes
          </h1>
        </div>
        <button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700">
          <Plus className="w-4 h-4" /> New BOM
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6 flex items-center gap-3">
        <span className="text-sm font-medium text-gray-700">Status filter:</span>
        <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2">
          <option value="">All</option>
          {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
        </select>
        <span className="text-xs text-gray-500 ml-auto">{filtered.length} BOM version(s)</span>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 w-8"></th>
                {['SKU', 'Version', 'Name', 'Status', 'Effective Date', 'Created By', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={8} className="px-4 py-12 text-center text-gray-500">No BOMs found</td></tr>
              ) : filtered.map(b => {
                const isExpanded = expandedId === b.id;
                return (
                  <React.Fragment key={b.id}>
                    <tr className="hover:bg-gray-50 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : b.id)}>
                      <td className="px-4 py-3">
                        {isExpanded ? <ChevronDown className="w-4 h-4 text-gray-400" /> : <ChevronRight className="w-4 h-4 text-gray-400" />}
                      </td>
                      <td className="px-4 py-3 text-sm font-medium text-navy-700">
                        {b.sku_code || `#${b.sku_id}`}
                        {b.sku_description && <div className="text-xs text-gray-400 font-normal">{b.sku_description}</div>}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-700">v{b.version}</td>
                      <td className="px-4 py-3 text-sm text-gray-700">{b.name || '—'}</td>
                      <td className="px-4 py-3"><StatusBadge status={b.status} /></td>
                      <td className="px-4 py-3 text-sm text-gray-600">{b.effective_date?.slice(0, 10) || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-500">{b.created_by || '—'}</td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        {b.status === 'draft' && (
                          <button onClick={() => handleActivate(b.id)} className="flex items-center gap-1 px-2 py-1 bg-green-600 hover:bg-green-700 text-white text-xs font-medium rounded">
                            <CheckCircle className="w-3 h-3" /> Activate
                          </button>
                        )}
                      </td>
                    </tr>
                    {isExpanded && <BOMDetailRow bomId={b.id} onRefresh={refetch} />}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <Modal isOpen={showAddModal} onClose={() => setShowAddModal(false)} title="New BOM Version">
        <form onSubmit={handleAdd} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">SKU ID *</label>
              <input type="number" required value={formData.sku_id || ''} onChange={e => setFormData({ ...formData, sku_id: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Version (auto if blank)</label>
              <input type="number" value={formData.version || ''} onChange={e => setFormData({ ...formData, version: e.target.value ? Number(e.target.value) : null })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div className="col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" placeholder="e.g., Classic Coconut Kefir 359ml" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effective Date</label>
              <input type="date" value={formData.effective_date || ''} onChange={e => setFormData({ ...formData, effective_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select value={formData.status || 'draft'} onChange={e => setFormData({ ...formData, status: e.target.value })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
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
              {saving ? 'Creating...' : 'Create BOM'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

function BOMDetailRow({ bomId, onRefresh }) {
  const { data: bom, loading, refetch } = useFetch(`/api/production/boms/${bomId}`);
  const [adding, setAdding] = useState(false);
  const [editingLineId, setEditingLineId] = useState(null);
  const [lineForm, setLineForm] = useState({ item_type: 'ingredient', unit: 'kg' });
  const [saving, setSaving] = useState(false);

  const startAdd = () => {
    setEditingLineId(null);
    setLineForm({ item_type: 'ingredient', unit: 'kg', sort_order: (bom?.lines?.length || 0) + 1 });
    setAdding(true);
  };

  const startEdit = (line) => {
    setEditingLineId(line.id);
    setLineForm({ ...line });
    setAdding(true);
  };

  const handleSaveLine = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingLineId) {
        await apiPut(`/api/production/boms/${bomId}/lines/${editingLineId}`, lineForm);
      } else {
        await apiPost(`/api/production/boms/${bomId}/lines`, lineForm);
      }
      setAdding(false);
      setEditingLineId(null);
      setLineForm({ item_type: 'ingredient', unit: 'kg' });
      refetch();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteLine = async (lineId) => {
    if (!confirm('Remove this BOM line item?')) return;
    try {
      await apiDelete(`/api/production/boms/${bomId}/lines/${lineId}`);
      refetch();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  return (
    <tr className="bg-gray-50/50">
      <td colSpan={8} className="px-6 py-4">
        {loading ? (
          <p className="text-sm text-gray-500">Loading BOM lines...</p>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-700">Line Items ({bom?.lines?.length || 0})</h3>
              <button onClick={startAdd} className="flex items-center gap-1 px-3 py-1.5 bg-navy-800 text-white text-xs font-medium rounded hover:bg-navy-700">
                <Plus className="w-3 h-3" /> Add Line
              </button>
            </div>
            {bom?.notes && <p className="text-xs text-gray-500 mb-3 italic">{bom.notes}</p>}
            <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-100">
                    {['Item Name', 'Type', 'Quantity', 'Unit', 'Notes', ''].map((h, i) => (
                      <th key={i} className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(bom?.lines || []).length === 0 ? (
                    <tr><td colSpan={6} className="px-3 py-4 text-center text-sm text-gray-500">No line items. Click "Add Line" to start.</td></tr>
                  ) : bom.lines.map(line => (
                    <tr key={line.id} className="hover:bg-gray-50">
                      <td className="px-3 py-2 text-sm font-medium text-gray-900">{line.item_name}</td>
                      <td className="px-3 py-2 text-xs text-gray-600">{line.item_type || '—'}</td>
                      <td className="px-3 py-2 text-sm text-gray-700 text-right">{line.quantity}</td>
                      <td className="px-3 py-2 text-sm text-gray-600">{line.unit}</td>
                      <td className="px-3 py-2 text-xs text-gray-500 max-w-xs truncate">{line.notes || '—'}</td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-1">
                          <button onClick={() => startEdit(line)} className="p-1 text-gray-500 hover:text-navy-700" title="Edit">
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={() => handleDeleteLine(line.id)} className="p-1 text-gray-400 hover:text-red-600" title="Delete">
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {adding && (
          <Modal isOpen={adding} onClose={() => { setAdding(false); setEditingLineId(null); }} title={editingLineId ? 'Edit BOM Line' : 'Add BOM Line'}>
            <form onSubmit={handleSaveLine} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Item Name *</label>
                  <input type="text" required value={lineForm.item_name || ''} onChange={e => setLineForm({ ...lineForm, item_name: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={lineForm.item_type || ''} onChange={e => setLineForm({ ...lineForm, item_type: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                    {ITEM_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Sort Order</label>
                  <input type="number" value={lineForm.sort_order ?? 0} onChange={e => setLineForm({ ...lineForm, sort_order: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                  <input type="number" step="0.001" required value={lineForm.quantity ?? ''} onChange={e => setLineForm({ ...lineForm, quantity: Number(e.target.value) })}
                    className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unit *</label>
                  <select required value={lineForm.unit || ''} onChange={e => setLineForm({ ...lineForm, unit: e.target.value })}
                    className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                    {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={2} value={lineForm.notes || ''} onChange={e => setLineForm({ ...lineForm, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => { setAdding(false); setEditingLineId(null); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={saving} className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 disabled:opacity-50">
                  {saving ? 'Saving...' : (editingLineId ? 'Save Changes' : 'Add Line')}
                </button>
              </div>
            </form>
          </Modal>
        )}
      </td>
    </tr>
  );
}
