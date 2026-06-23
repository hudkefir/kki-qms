import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Tags, Plus, Edit2, Check, X, Trash2, Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { useFetch, apiPost, apiPut, apiDelete } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SOPCategoriesAdmin() {
  const navigate = useNavigate();
  const { data: catData, loading, refetch } = useFetch('/api/sop-categories?all=1');
  const { data: sopsData } = useFetch('/api/sops');
  const cats = Array.isArray(catData) ? catData : (catData?.categories || []);
  const sops = sopsData?.sops || sopsData || [];

  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // SOP usage count per category code (drives the in-use delete guard display).
  const usage = useMemo(() => {
    const m = {};
    (Array.isArray(sops) ? sops : []).forEach(s => {
      if (s.category_code) m[s.category_code] = (m[s.category_code] || 0) + 1;
    });
    return m;
  }, [sops]);

  const run = async (fn) => {
    setError(''); setBusy(true);
    try { await fn(); await refetch(); }
    catch (err) { setError(err.message || 'Operation failed'); }
    finally { setBusy(false); }
  };

  const handleAdd = () => {
    const name = newName.trim();
    if (!name) return;
    run(async () => { await apiPost('/api/sop-categories', { name }); setNewName(''); });
  };

  const startEdit = (c) => { setEditingId(c.id); setEditName(c.name); setError(''); };
  const saveEdit = (c) => {
    const name = editName.trim();
    if (!name) return;
    run(async () => { await apiPut(`/api/sop-categories/${c.id}`, { name }); setEditingId(null); });
  };
  const toggleActive = (c) => run(async () => { await apiPut(`/api/sop-categories/${c.id}`, { is_active: !c.is_active }); });
  const handleDelete = (c) => {
    if (!window.confirm(`Delete category "${c.name}"? This cannot be undone.`)) return;
    run(async () => { await apiDelete(`/api/sop-categories/${c.id}`); });
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      <button onClick={() => navigate('/sops')}
        className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-200 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to SOP Library
      </button>

      <div className="flex items-center gap-2.5 mb-1">
        <Tags className="w-5 h-5 text-navy-400" />
        <h1 className="text-xl font-bold text-gray-100">SOP Categories</h1>
      </div>
      <p className="text-sm text-gray-400 mb-6">
        Controlled list of SOP categories. Renaming a category updates every SOP that uses it.
        Categories in use can't be deleted — deactivate them to hide from the picker instead.
      </p>

      {error && (
        <div className="mb-4 px-4 py-2.5 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-300">
          {error}
        </div>
      )}

      {/* Add new */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-4">
        <label className="block text-sm font-medium text-gray-700 mb-1">Add a category</label>
        <div className="flex gap-2">
          <input
            type="text" value={newName} onChange={e => setNewName(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') handleAdd(); }}
            placeholder="e.g. Sanitation"
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
          />
          <button type="button" onClick={handleAdd} disabled={busy || !newName.trim()}
            className="flex items-center gap-1.5 px-4 py-2 bg-navy-600 text-white rounded-lg text-sm hover:bg-navy-700 disabled:opacity-50">
            <Plus className="w-4 h-4" /> Add
          </button>
        </div>
        <p className="mt-1 text-[11px] text-gray-400">Code is auto-derived from the name (e.g. “Sanitation” → <code>sanitation</code>).</p>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-gray-500 text-[11px] uppercase tracking-wide">
            <tr>
              <th className="text-left font-medium px-4 py-2.5">Category</th>
              <th className="text-left font-medium px-4 py-2.5">Code</th>
              <th className="text-center font-medium px-4 py-2.5">SOPs</th>
              <th className="text-center font-medium px-4 py-2.5">Status</th>
              <th className="text-right font-medium px-4 py-2.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {cats.length === 0 && (
              <tr><td colSpan={5} className="px-4 py-6 text-center text-gray-400">No categories yet.</td></tr>
            )}
            {cats.map(c => (
              <tr key={c.id} className={c.is_active ? '' : 'bg-gray-50/60'}>
                <td className="px-4 py-2.5">
                  {editingId === c.id ? (
                    <input
                      type="text" autoFocus value={editName} onChange={e => setEditName(e.target.value)}
                      onKeyDown={e => { if (e.key === 'Enter') saveEdit(c); if (e.key === 'Escape') setEditingId(null); }}
                      className="w-full px-2 py-1 border border-navy-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                    />
                  ) : (
                    <span className={`font-medium ${c.is_active ? 'text-gray-900' : 'text-gray-400'}`}>{c.name}</span>
                  )}
                </td>
                <td className="px-4 py-2.5"><code className="text-xs text-gray-500">{c.code}</code></td>
                <td className="px-4 py-2.5 text-center text-gray-600">{usage[c.code] || 0}</td>
                <td className="px-4 py-2.5 text-center">
                  <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${c.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-500'}`}>
                    {c.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center justify-end gap-1.5">
                    {editingId === c.id ? (
                      <>
                        <button onClick={() => saveEdit(c)} disabled={busy} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Save"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditingId(null)} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded" title="Cancel"><X className="w-4 h-4" /></button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => startEdit(c)} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title="Rename"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => toggleActive(c)} disabled={busy} className="p-1.5 text-gray-500 hover:bg-gray-100 rounded" title={c.is_active ? 'Deactivate' : 'Activate'}>
                          {c.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                        <button onClick={() => handleDelete(c)} disabled={busy || (usage[c.code] || 0) > 0}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded disabled:opacity-30 disabled:cursor-not-allowed"
                          title={(usage[c.code] || 0) > 0 ? 'In use — deactivate instead' : 'Delete'}>
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
