import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, Package, CheckCircle, AlertTriangle, XCircle, Clock, Filter, ChevronRight, Building2, Star } from 'lucide-react';
import { useFetch, apiPost } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

const STATUS_CONFIG = {
  approved: { label: 'Approved', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  conditional: { label: 'Conditional', color: 'bg-amber-100 text-amber-700', icon: AlertTriangle },
  suspended: { label: 'Suspended', color: 'bg-red-100 text-red-700', icon: XCircle },
  pending: { label: 'Pending', color: 'bg-gray-100 text-gray-600', icon: Clock },
};

const RISK_CONFIG = {
  low: { label: 'Low', color: 'bg-green-50 text-green-600' },
  medium: { label: 'Medium', color: 'bg-amber-50 text-amber-600' },
  high: { label: 'High', color: 'bg-red-50 text-red-600' },
};

export default function Suppliers() {
  const navigate = useNavigate();
  const { canWrite } = useAuth();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showAdd, setShowAdd] = useState(false);
  const [addForm, setAddForm] = useState({ name: '', contact_name: '', contact_email: '', contact_phone: '', products_supplied: '', risk_level: 'low', notes: '' });
  const [adding, setAdding] = useState(false);

  const queryParams = new URLSearchParams();
  if (search) queryParams.set('search', search);
  if (statusFilter) queryParams.set('status', statusFilter);

  const { data: suppliers, loading, refetch } = useFetch(`/api/suppliers?${queryParams}`);
  const { data: checklistSummary } = useFetch('/api/suppliers/checklist/summary');
  const { data: summary } = useFetch('/api/suppliers/summary');

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim()) return;
    setAdding(true);
    try {
      const created = await apiPost('/api/suppliers', addForm);
      setShowAdd(false);
      setAddForm({ name: '', contact_name: '', contact_email: '', contact_phone: '', products_supplied: '', risk_level: 'low', notes: '' });
      refetch();
      navigate(`/suppliers/${created.id}`);
    } catch (err) {
      alert('Failed to add supplier: ' + err.message);
    } finally {
      setAdding(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (loading) return <LoadingSpinner message="Loading suppliers..." />;

  return (
    <div className="max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Supplier Management</h1>
          <p className="text-sm text-gray-500 mt-1">Approved Supplier Program — track qualifications, reviews, and compliance</p>
        </div>
        {canWrite() && (
          <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700 transition-colors text-sm font-medium">
            <Plus className="w-4 h-4" />
            Add Supplier
          </button>
        )}
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
          {[
            { label: 'Total', value: summary.total, icon: Building2, color: 'text-gray-700', bg: 'bg-gray-50' },
            { label: 'Approved', value: summary.approved, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
            { label: 'Conditional', value: summary.conditional, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
            { label: 'Pending', value: summary.pending, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
            { label: 'Review Overdue', value: summary.overdue, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
          ].map(card => (
            <div key={card.label} className={`${card.bg} rounded-xl p-4 border border-gray-100`}>
              <div className="flex items-center gap-2 mb-1">
                <card.icon className={`w-4 h-4 ${card.color}`} />
                <span className="text-xs text-gray-500 font-medium">{card.label}</span>
              </div>
              <p className={`text-2xl font-bold ${card.color}`}>{card.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search suppliers..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
          />
        </div>
        <div className="flex items-center gap-1">
          <Filter className="w-4 h-4 text-gray-400" />
          {['', 'approved', 'conditional', 'pending', 'suspended'].map(s => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${statusFilter === s ? 'bg-navy-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
            >
              {s ? STATUS_CONFIG[s]?.label : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Supplier List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {!suppliers || suppliers.length === 0 ? (
          <div className="text-center py-16">
            <Package className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">No suppliers found</p>
            <p className="text-sm text-gray-400 mt-1">Add your first supplier to get started</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50/50">
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Supplier</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Products</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Risk</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Checklist</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wide">Next Review</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map(s => {
                const statusCfg = STATUS_CONFIG[s.status] || STATUS_CONFIG.pending;
                const riskCfg = RISK_CONFIG[s.risk_level] || RISK_CONFIG.low;
                const StatusIcon = statusCfg.icon;
                const isOverdue = s.next_review_date && new Date(s.next_review_date) < new Date();
                return (
                  <tr key={s.id} onClick={() => navigate(`/suppliers/${s.id}`)} className="border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3">
                      <p className="text-sm font-medium text-gray-900">{s.name}</p>
                      {s.contact_name && <p className="text-xs text-gray-400">{s.contact_name}</p>}
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-gray-600 truncate max-w-[200px]">{s.products_supplied || '-'}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${statusCfg.color}`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusCfg.label}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${riskCfg.color}`}>{riskCfg.label}</span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-sm ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                    <td className="px-4 py-3">
                      {(() => {
                        const cs = (checklistSummary || []).find(c => c.id === s.id);
                        if (!cs) return <span className="text-xs text-gray-400">—</span>;
                        return (
                          <div className="flex items-center gap-2">
                            <div className="w-16 bg-gray-200 rounded-full h-2">
                              <div className={`h-2 rounded-full ${cs.percentage === 100 ? 'bg-green-500' : cs.percentage >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: cs.percentage + '%' }} />
                            </div>
                            <span className={`text-xs font-semibold ${cs.percentage === 100 ? 'text-green-600' : cs.percentage >= 50 ? 'text-blue-600' : 'text-amber-600'}`}>{cs.percentage}%</span>
                          </div>
                        );
                      })()}
                    </td>
                        {isOverdue ? '⚠ ' : ''}{formatDate(s.next_review_date)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <ChevronRight className="w-4 h-4 text-gray-300" />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Add Supplier Modal */}
      <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} title="Add New Supplier">
        <form onSubmit={handleAdd} className="p-4 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Supplier Name *</label>
            <input type="text" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" required />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Name</label>
              <input type="text" value={addForm.contact_name} onChange={e => setAddForm(f => ({ ...f, contact_name: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contact Email</label>
              <input type="email" value={addForm.contact_email} onChange={e => setAddForm(f => ({ ...f, contact_email: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
              <input type="text" value={addForm.contact_phone} onChange={e => setAddForm(f => ({ ...f, contact_phone: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Risk Level</label>
              <select value={addForm.risk_level} onChange={e => setAddForm(f => ({ ...f, risk_level: e.target.value }))} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 bg-white">
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Products Supplied</label>
            <input type="text" value={addForm.products_supplied} onChange={e => setAddForm(f => ({ ...f, products_supplied: e.target.value }))} placeholder="e.g., Coconut milk, Probiotics" className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea value={addForm.notes} onChange={e => setAddForm(f => ({ ...f, notes: e.target.value }))} rows={2} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 resize-none" />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={() => setShowAdd(false)} className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={adding} className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 disabled:bg-navy-400">
              {adding ? 'Adding...' : 'Add Supplier'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
