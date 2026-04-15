import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FileCheck, Plus, Search, ChevronDown, ChevronUp, Clock, AlertTriangle, CheckCircle
} from 'lucide-react';
import { useFetch, apiPost } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import CCRWizard from '../components/CCRWizard';

const CCR_STATUS_OPTIONS = ['draft', 'in_review', 'approved', 'sent', 'closed'];

const CCR_STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  in_review: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  sent: 'bg-green-100 text-green-800 border-green-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
};

const CCR_STATUS_LABELS = {
  draft: 'Draft',
  in_review: 'In Review',
  approved: 'Approved',
  sent: 'Sent',
  closed: 'Closed',
};

function CCRStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${CCR_STATUS_STYLES[status] || CCR_STATUS_STYLES.draft}`}>
      {CCR_STATUS_LABELS[status] || status}
    </span>
  );
}

export { CCRStatusBadge, CCR_STATUS_OPTIONS, CCR_STATUS_STYLES, CCR_STATUS_LABELS };

export default function CCRs() {
  const navigate = useNavigate();
  const { data: ccrs, loading, error, refetch } = useFetch('/api/ccrs');
  const { data: allComplaints } = useFetch('/api/complaints');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [sortField, setSortField] = useState('date_created');
  const [sortDir, setSortDir] = useState('desc');
  const [showWizard, setShowWizard] = useState(false);

  const filtered = useMemo(() => {
    if (!ccrs) return [];
    let list = [...ccrs];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c => c.ccr_number?.toLowerCase().includes(s) || c.title?.toLowerCase().includes(s) || c.recipient_company?.toLowerCase().includes(s));
    }
    if (filterStatus) list = list.filter(c => c.status === filterStatus);
    list.sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [ccrs, search, filterStatus, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-navy-600" /> : <ChevronDown className="w-3 h-3 text-navy-600" />;
  };

  const handleWizardComplete = (newCCR) => {
    setShowWizard(false);
    refetch();
  };

  if (loading) return <LoadingSpinner message="Loading CCRs..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500 font-medium">Customer Complaint Responses</p>
          <h1 className="text-3xl font-bold text-gray-900">CCR Registry</h1>
        </div>
        <button onClick={() => setShowWizard(true)} className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors">
          <Plus className="w-4 h-4" />
          New CCR
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search CCRs..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2">
            <option value="">All Statuses</option>
            {CCR_STATUS_OPTIONS.map(s => <option key={s} value={s}>{CCR_STATUS_LABELS[s]}</option>)}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total CCRs', value: ccrs?.length || 0, icon: FileCheck, color: 'text-gray-900', bg: 'bg-gray-50' },
          { label: 'Open', value: ccrs?.filter(c => c.status !== 'closed').length || 0, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Overdue Actions', value: ccrs?.reduce((sum, c) => sum + (c.overdueActions || 0), 0) || 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Completed Actions', value: ccrs?.reduce((sum, c) => sum + (c.completedActions || 0), 0) || 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
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

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {[
                  { field: 'ccr_number', label: 'CCR #' },
                  { field: 'title', label: 'Title' },
                  { field: 'date_created', label: 'Date' },
                  { field: 'recipient_company', label: 'Recipient' },
                  { field: 'status', label: 'Status' },
                  { field: 'complaintCount', label: 'Complaints' },
                  { field: 'totalActions', label: 'Actions' },
                ].map(col => (
                  <th
                    key={col.field}
                    onClick={() => handleSort(col.field)}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <SortIcon field={col.field} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">No CCRs found</td>
                </tr>
              ) : (
                filtered.map(ccr => (
                  <tr
                    key={ccr.id}
                    onClick={() => navigate(`/ccrs/${ccr.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-navy-700">{ccr.ccr_number}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{ccr.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ccr.date_created}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{ccr.recipient_company}</td>
                    <td className="px-4 py-3"><CCRStatusBadge status={ccr.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-600 text-center">{ccr.complaintCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <div className="flex-1 bg-gray-100 rounded-full h-2 w-20">
                          <div
                            className={`h-2 rounded-full ${ccr.overdueActions > 0 ? 'bg-red-500' : 'bg-green-500'}`}
                            style={{ width: `${ccr.totalActions > 0 ? (ccr.completedActions / ccr.totalActions) * 100 : 0}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-500">{ccr.completedActions}/{ccr.totalActions}</span>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CCR Creation Wizard */}
      {showWizard && (
        <CCRWizard
          onClose={() => setShowWizard(false)}
          onComplete={handleWizardComplete}
        />
      )}
    </div>
  );
}
