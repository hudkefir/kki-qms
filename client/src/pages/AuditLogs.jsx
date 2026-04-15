import React, { useState, useEffect, useCallback } from 'react';
import { ScrollText, Search, Filter, Download, ChevronLeft, ChevronRight, ChevronDown, ChevronUp } from 'lucide-react';

const ACTION_COLORS = {
  login: 'bg-green-100 text-green-700',
  logout: 'bg-gray-100 text-gray-600',
  login_failed: 'bg-red-100 text-red-700',
  create_sops: 'bg-blue-100 text-blue-700',
  update_sops: 'bg-amber-100 text-amber-700',
  delete_sops: 'bg-red-100 text-red-700',
  create_complaints: 'bg-blue-100 text-blue-700',
  update_complaints: 'bg-amber-100 text-amber-700',
  delete_complaints: 'bg-red-100 text-red-700',
  create_ccrs: 'bg-blue-100 text-blue-700',
  update_ccrs: 'bg-amber-100 text-amber-700',
  delete_ccrs: 'bg-red-100 text-red-700',
  create_user: 'bg-purple-100 text-purple-700',
  update_user: 'bg-purple-100 text-purple-700',
  delete_user: 'bg-red-100 text-red-700',
  reset_password: 'bg-amber-100 text-amber-700',
  upload_file: 'bg-indigo-100 text-indigo-700',
  download_file: 'bg-indigo-100 text-indigo-700',
  export_audit_logs: 'bg-gray-100 text-gray-700',
  view_audit_logs: 'bg-gray-100 text-gray-700',
  view_users: 'bg-gray-100 text-gray-700',
  create_revision: 'bg-blue-100 text-blue-700',
  create_comment: 'bg-blue-100 text-blue-700',
  create_action: 'bg-blue-100 text-blue-700',
  update_action: 'bg-amber-100 text-amber-700',
  link_complaints: 'bg-blue-100 text-blue-700',
  // Admin actions
  admin_update_sops: 'bg-orange-100 text-orange-700',
  admin_delete_sops: 'bg-red-200 text-red-800',
  admin_update_complaints: 'bg-orange-100 text-orange-700',
  admin_delete_complaints: 'bg-red-200 text-red-800',
  admin_update_ccrs: 'bg-orange-100 text-orange-700',
  admin_delete_ccrs: 'bg-red-200 text-red-800',
  admin_update_audit_checklist: 'bg-orange-100 text-orange-700',
  admin_delete_audit_checklist: 'bg-red-200 text-red-800',
  admin_update_users: 'bg-orange-100 text-orange-700',
  admin_delete_users: 'bg-red-200 text-red-800',
  admin_update_documents: 'bg-orange-100 text-orange-700',
  admin_delete_documents: 'bg-red-200 text-red-800',
  admin_update_corrective_actions: 'bg-orange-100 text-orange-700',
  admin_delete_corrective_actions: 'bg-red-200 text-red-800',
};

export default function AuditLogs() {
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ user: '', action: '', resource_type: '', date_from: '', date_to: '', search: '' });
  const [filterOptions, setFilterOptions] = useState({ users: [], actions: [], resourceTypes: [] });
  const [expandedRow, setExpandedRow] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', page);
      params.set('limit', 50);
      if (filters.user) params.set('user', filters.user);
      if (filters.action) params.set('action', filters.action);
      if (filters.resource_type) params.set('resource_type', filters.resource_type);
      if (filters.date_from) params.set('date_from', filters.date_from);
      if (filters.date_to) params.set('date_to', filters.date_to);
      if (filters.search) params.set('search', filters.search);

      const res = await fetch(`/api/audit-logs?${params}`, { credentials: 'include' });
      const data = await res.json();
      setLogs(data.logs || []);
      setTotal(data.total || 0);
      setTotalPages(data.totalPages || 1);
    } catch {
      setLogs([]);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  const fetchFilterOptions = useCallback(async () => {
    try {
      const res = await fetch('/api/audit-logs/filters', { credentials: 'include' });
      const data = await res.json();
      setFilterOptions(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);
  useEffect(() => { fetchFilterOptions(); }, [fetchFilterOptions]);

  const handleFilter = (key, value) => {
    setFilters(f => ({ ...f, [key]: value }));
    setPage(1);
  };

  const clearFilters = () => {
    setFilters({ user: '', action: '', resource_type: '', date_from: '', date_to: '', search: '' });
    setPage(1);
  };

  const handleExport = () => {
    const params = new URLSearchParams();
    if (filters.user) params.set('user', filters.user);
    if (filters.action) params.set('action', filters.action);
    if (filters.resource_type) params.set('resource_type', filters.resource_type);
    if (filters.date_from) params.set('date_from', filters.date_from);
    if (filters.date_to) params.set('date_to', filters.date_to);
    window.open(`/api/audit-logs/export?${params}`, '_blank');
  };

  const formatDate = (d) => {
    if (!d) return '-';
    const date = new Date(d + 'Z');
    return date.toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const getActionColor = (action) => ACTION_COLORS[action] || 'bg-gray-100 text-gray-700';

  const hasActiveFilters = Object.values(filters).some(v => v !== '');

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Audit Log</h1>
          <p className="text-sm text-gray-500 mt-1">{total} total entries</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${hasActiveFilters ? 'border-navy-300 bg-navy-50 text-navy-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <Filter className="w-4 h-4" />
            Filters
            {hasActiveFilters && <span className="w-2 h-2 rounded-full bg-navy-500" />}
          </button>
          <button
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Search</label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={filters.search}
                  onChange={e => handleFilter('search', e.target.value)}
                  placeholder="Search..."
                  className="w-full pl-8 pr-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500"
                />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">User</label>
              <select value={filters.user} onChange={e => handleFilter('user', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500">
                <option value="">All Users</option>
                {filterOptions.users.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Action</label>
              <select value={filters.action} onChange={e => handleFilter('action', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500">
                <option value="">All Actions</option>
                {filterOptions.actions.map(a => <option key={a} value={a}>{a}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">Resource</label>
              <select value={filters.resource_type} onChange={e => handleFilter('resource_type', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-navy-500">
                <option value="">All Resources</option>
                {filterOptions.resourceTypes.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">From Date</label>
              <input type="date" value={filters.date_from} onChange={e => handleFilter('date_from', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1">To Date</label>
              <input type="date" value={filters.date_to} onChange={e => handleFilter('date_to', e.target.value)} className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500" />
            </div>
          </div>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="mt-3 text-xs text-navy-600 hover:text-navy-800 font-medium">Clear all filters</button>
          )}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-16">
            <div className="w-6 h-6 border-2 border-navy-200 border-t-navy-600 rounded-full animate-spin" />
          </div>
        ) : logs.length === 0 ? (
          <div className="text-center py-16">
            <ScrollText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No audit logs found</p>
          </div>
        ) : (
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase w-8"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Timestamp</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Resource</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {logs.map(log => (
                <React.Fragment key={log.id}>
                  <tr
                    className="hover:bg-gray-50 cursor-pointer"
                    onClick={() => setExpandedRow(expandedRow === log.id ? null : log.id)}
                  >
                    <td className="px-4 py-3">
                      {expandedRow === log.id ? <ChevronUp className="w-3.5 h-3.5 text-gray-400" /> : <ChevronDown className="w-3.5 h-3.5 text-gray-400" />}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{formatDate(log.timestamp)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">{log.username}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${getActionColor(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div>
                        {log.resource_type && <span className="text-xs text-gray-500">{log.resource_type}</span>}
                        {log.resource_name && <span className="text-xs font-medium text-gray-700 ml-1">{log.resource_name}</span>}
                        {log.resource_id && <span className="text-xs text-gray-400 ml-1">#{log.resource_id}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-400">{log.ip_address}</td>
                  </tr>
                  {expandedRow === log.id && (
                    <tr className="bg-gray-50">
                      <td colSpan={6} className="px-8 py-4">
                        <div className="space-y-3">
                          {/* Old/New Values diff */}
                          {log.old_values && Object.keys(log.old_values).length > 0 && (
                            <div>
                              <span className="text-xs font-semibold text-gray-500 uppercase block mb-1">Changes</span>
                              <div className="bg-white rounded border border-gray-200 overflow-hidden">
                                <table className="w-full text-xs">
                                  <thead>
                                    <tr className="bg-gray-100">
                                      <th className="px-3 py-1.5 text-left text-gray-500 font-medium">Field</th>
                                      <th className="px-3 py-1.5 text-left text-red-500 font-medium">Old Value</th>
                                      <th className="px-3 py-1.5 text-left text-green-600 font-medium">New Value</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-gray-100">
                                    {Object.keys(log.old_values).map(key => (
                                      <tr key={key}>
                                        <td className="px-3 py-1.5 font-medium text-gray-700">{key}</td>
                                        <td className="px-3 py-1.5 text-red-600 bg-red-50/50 font-mono break-all max-w-xs">{String(log.old_values[key] ?? '-').slice(0, 200)}</td>
                                        <td className="px-3 py-1.5 text-green-700 bg-green-50/50 font-mono break-all max-w-xs">{String((log.new_values?.[key]) ?? '-').slice(0, 200)}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                            <div>
                              <span className="text-gray-400 block mb-0.5">Session ID</span>
                              <span className="text-gray-600 font-mono">{log.session_id?.slice(0, 16) || '-'}...</span>
                            </div>
                            <div>
                              <span className="text-gray-400 block mb-0.5">User Agent</span>
                              <span className="text-gray-600 truncate block max-w-xs">{log.user_agent?.slice(0, 60) || '-'}</span>
                            </div>
                            <div className="col-span-2">
                              <span className="text-gray-400 block mb-0.5">Details</span>
                              <pre className="text-gray-600 bg-white p-2 rounded border border-gray-200 overflow-x-auto max-h-32 text-[11px]">
                                {JSON.stringify(log.details, null, 2)}
                              </pre>
                            </div>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-200 bg-gray-50">
            <p className="text-xs text-gray-500">
              Page {page} of {totalPages} ({total} entries)
            </p>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage(p => p - 1)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="w-3.5 h-3.5" /> Prev
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage(p => p + 1)}
                className="flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
