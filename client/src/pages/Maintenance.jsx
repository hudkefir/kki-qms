import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Wrench, Plus, Search, ChevronDown, ChevronUp, Clock, AlertTriangle,
  CheckCircle, BarChart3, ClipboardList, Calendar
} from 'lucide-react';
import { useFetch, apiPost } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { FREQUENCY_LABELS } from './Equipment';
import { WO_STATUS_STYLES, WO_STATUS_LABELS } from './EquipmentDetail';

const PRIORITY_STYLES = {
  routine: 'bg-gray-100 text-gray-600',
  urgent: 'bg-amber-100 text-amber-700',
  emergency: 'bg-red-100 text-red-700',
};

export default function Maintenance() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('overview');

  // Data
  const { data: dashboard, loading: dashLoading } = useFetch('/api/maintenance/dashboard');
  const { data: overdueTasks } = useFetch('/api/pm-schedules/overdue');
  const { data: upcomingTasks } = useFetch('/api/pm-schedules/upcoming');
  const { data: workOrders, loading: woLoading, refetch: refetchWO } = useFetch('/api/work-orders');
  const { data: allSchedules } = useFetch('/api/pm-schedules');
  const { data: equipmentList } = useFetch('/api/equipment');

  // WO filters
  const [woSearch, setWoSearch] = useState('');
  const [woStatus, setWoStatus] = useState('');
  const [woType, setWoType] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  // WO modal
  const [showWOModal, setShowWOModal] = useState(false);
  const [woForm, setWOForm] = useState({ type: 'preventive', priority: 'routine' });
  const [submitting, setSubmitting] = useState(false);

  const filteredWO = useMemo(() => {
    if (!workOrders) return [];
    let list = [...workOrders];
    if (woSearch) {
      const s = woSearch.toLowerCase();
      list = list.filter(w => w.work_order_number?.toLowerCase().includes(s) || w.title?.toLowerCase().includes(s) || w.equipment_name?.toLowerCase().includes(s));
    }
    if (woStatus) list = list.filter(w => w.status === woStatus);
    if (woType) list = list.filter(w => w.type === woType);
    list.sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [workOrders, woSearch, woStatus, woType, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-navy-600" /> : <ChevronDown className="w-3 h-3 text-navy-600" />;
  };

  const handleCreateWO = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiPost('/api/work-orders', { ...woForm, reported_by: user?.display_name || user?.username || '' });
      setShowWOModal(false);
      setWOForm({ type: 'preventive', priority: 'routine' });
      refetchWO();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSubmitting(false); }
  };

  // Group PM schedules by frequency for calendar view
  const groupedSchedules = useMemo(() => {
    if (!allSchedules) return {};
    const groups = {};
    for (const s of allSchedules) {
      if (!s.is_active) continue;
      const freq = s.frequency || 'other';
      if (!groups[freq]) groups[freq] = [];
      groups[freq].push(s);
    }
    return groups;
  }, [allSchedules]);

  if (dashLoading) return <LoadingSpinner message="Loading Maintenance..." />;

  const tabs = [
    { id: 'overview', label: 'Overview', icon: BarChart3 },
    { id: 'workorders', label: 'Work Orders', icon: Wrench },
    { id: 'calendar', label: 'PM Calendar', icon: Calendar },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500 font-medium">KK-SOP-00800</p>
          <h1 className="text-3xl font-bold text-gray-900">Maintenance</h1>
        </div>
        <button onClick={() => { setActiveTab('workorders'); setShowWOModal(true); }} className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors">
          <Plus className="w-4 h-4" />
          New Work Order
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* ========== OVERVIEW TAB ========== */}
      {activeTab === 'overview' && dashboard && (
        <div className="space-y-6">
          {/* Dashboard Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Overdue PM', value: dashboard.overdueCount, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
              { label: 'Upcoming (7d)', value: dashboard.upcomingThisWeek, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
              { label: 'Open Work Orders', value: dashboard.openWorkOrders, icon: Wrench, color: 'text-blue-600', bg: 'bg-blue-50' },
              { label: 'Completion Rate', value: `${dashboard.completionRateThisMonth}%`, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
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

          {/* Overdue PM Tasks */}
          {overdueTasks && overdueTasks.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-red-700 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" /> Overdue PM Tasks
              </h2>
              <div className="space-y-2">
                {overdueTasks.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t.task_name}</p>
                      <p className="text-xs text-gray-500">{t.equip_code} — {t.equipment_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-red-600">Due: {t.next_due_date}</p>
                      <p className="text-xs text-gray-400">{FREQUENCY_LABELS[t.frequency] || t.frequency}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Upcoming PM Tasks */}
          {upcomingTasks && upcomingTasks.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <Clock className="w-5 h-5 text-amber-500" /> Upcoming This Week
              </h2>
              <div className="space-y-2">
                {upcomingTasks.map(t => (
                  <div key={t.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{t.task_name}</p>
                      <p className="text-xs text-gray-500">{t.equip_code} — {t.equipment_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-semibold text-amber-600">Due: {t.next_due_date}</p>
                      <p className="text-xs text-gray-400">{t.assigned_to || 'Unassigned'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recent Work Orders */}
          {workOrders && workOrders.length > 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Work Orders</h2>
              <div className="space-y-2">
                {workOrders.slice(0, 5).map(wo => (
                  <div key={wo.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0 cursor-pointer hover:bg-gray-50 px-2 rounded" onClick={() => navigate(`/work-orders/${wo.id}`)}>
                    <div>
                      <p className="text-sm font-medium text-navy-700">{wo.work_order_number} — {wo.title}</p>
                      <p className="text-xs text-gray-500">{wo.equipment_name}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${WO_STATUS_STYLES[wo.status] || ''}`}>
                        {WO_STATUS_LABELS[wo.status] || wo.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ========== WORK ORDERS TAB ========== */}
      {activeTab === 'workorders' && (
        <div className="space-y-4">
          {/* Search & Filters */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search work orders..."
                  value={woSearch}
                  onChange={e => setWoSearch(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
                />
              </div>
              <select value={woStatus} onChange={e => setWoStatus(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2">
                <option value="">All Statuses</option>
                {Object.entries(WO_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <select value={woType} onChange={e => setWoType(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2">
                <option value="">All Types</option>
                <option value="preventive">Preventive</option>
                <option value="corrective">Corrective</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    {[
                      { field: 'work_order_number', label: 'WO #' },
                      { field: 'title', label: 'Title' },
                      { field: 'equipment_name', label: 'Equipment' },
                      { field: 'type', label: 'Type' },
                      { field: 'priority', label: 'Priority' },
                      { field: 'status', label: 'Status' },
                      { field: 'created_at', label: 'Date' },
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
                  {filteredWO.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-4 py-12 text-center text-gray-500">No work orders found</td>
                    </tr>
                  ) : (
                    filteredWO.map(wo => (
                      <tr
                        key={wo.id}
                        onClick={() => navigate(`/work-orders/${wo.id}`)}
                        className="hover:bg-gray-50 cursor-pointer transition-colors"
                      >
                        <td className="px-4 py-3 text-sm font-medium text-navy-700">{wo.work_order_number}</td>
                        <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{wo.title}</td>
                        <td className="px-4 py-3 text-sm text-gray-600">{wo.equipment_name}</td>
                        <td className="px-4 py-3 text-sm text-gray-600 capitalize">{wo.type}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_STYLES[wo.priority] || ''}`}>
                            {wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${WO_STATUS_STYLES[wo.status] || ''}`}>
                            {WO_STATUS_LABELS[wo.status] || wo.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-600">{wo.created_at?.slice(0, 10)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========== PM CALENDAR TAB ========== */}
      {activeTab === 'calendar' && (
        <div className="space-y-6">
          {Object.entries(FREQUENCY_LABELS).map(([freq, label]) => {
            const tasks = groupedSchedules[freq] || [];
            if (tasks.length === 0) return null;
            return (
              <div key={freq} className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-navy-600" />
                  {label} Tasks ({tasks.length})
                </h2>
                <div className="space-y-2">
                  {tasks.map(t => {
                    const today = new Date();
                    today.setHours(0, 0, 0, 0);
                    const due = new Date(t.next_due_date);
                    const diff = (due - today) / (1000 * 60 * 60 * 24);
                    const isOverdue = diff < 0;
                    const isDueSoon = diff >= 0 && diff <= 3;

                    return (
                      <div key={t.id} className={`flex items-center justify-between py-2 px-3 rounded-lg border ${isOverdue ? 'border-red-200 bg-red-50' : isDueSoon ? 'border-amber-200 bg-amber-50' : 'border-gray-100'}`}>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{t.task_name}</p>
                          <p className="text-xs text-gray-500">{t.equip_code} — {t.equipment_name} — {t.category}</p>
                        </div>
                        <div className="text-right">
                          <p className={`text-xs font-semibold ${isOverdue ? 'text-red-600' : isDueSoon ? 'text-amber-600' : 'text-green-600'}`}>
                            {isOverdue ? 'OVERDUE' : isDueSoon ? 'Due Soon' : 'On Track'}: {t.next_due_date}
                          </p>
                          <p className="text-xs text-gray-400">{t.assigned_to || 'Unassigned'}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {Object.keys(groupedSchedules).length === 0 && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No PM schedules configured yet</p>
            </div>
          )}
        </div>
      )}

      {/* Create Work Order Modal */}
      <Modal isOpen={showWOModal} onClose={() => setShowWOModal(false)} title="New Work Order">
        <form onSubmit={handleCreateWO} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Equipment *</label>
            <select required value={woForm.equipment_id || ''} onChange={e => setWOForm({ ...woForm, equipment_id: Number(e.target.value) })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
              <option value="">Select equipment...</option>
              {(equipmentList || []).filter(e => e.status === 'active').map(e => (
                <option key={e.id} value={e.id}>{e.equipment_id} — {e.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input type="text" required value={woForm.title || ''} onChange={e => setWOForm({ ...woForm, title: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea rows={3} required value={woForm.description || ''} onChange={e => setWOForm({ ...woForm, description: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select required value={woForm.type || ''} onChange={e => setWOForm({ ...woForm, type: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                <option value="preventive">Preventive</option>
                <option value="corrective">Corrective</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={woForm.priority || 'routine'} onChange={e => setWOForm({ ...woForm, priority: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
            <input type="text" value={woForm.assigned_to || ''} onChange={e => setWOForm({ ...woForm, assigned_to: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => setShowWOModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" disabled={submitting} className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm disabled:opacity-50">
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
