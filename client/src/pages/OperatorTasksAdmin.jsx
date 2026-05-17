import React, { useState } from 'react';
import { useFetch, apiPut } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ListTodo, Users, AlertTriangle, CheckCircle, Clock, Play,
  User, Filter, ArrowRight
} from 'lucide-react';

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600 border-gray-200',
  medium: 'bg-blue-100 text-blue-700 border-blue-200',
  high: 'bg-amber-100 text-amber-700 border-amber-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
};

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
};

const MODULE_LABELS = {
  capa: 'CAPA', deviation: 'Deviation', complaint: 'Complaint', change_request: 'Change Request',
  batch_test: 'Batch Test', equipment: 'Equipment', pm_schedule: 'PM Schedule',
  work_order: 'Work Order', recall: 'Recall', supplier: 'Supplier', sop: 'SOP',
  traceability: 'Traceability', general: 'General',
};

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-CA');
}

export default function OperatorTasksAdmin() {
  const { user } = useAuth();
  const { data, loading, error, refetch } = useFetch('/api/operator-tasks/admin');
  const { data: usersData } = useFetch('/api/users');

  const [viewMode, setViewMode] = useState('grouped'); // 'grouped' | 'flat'
  const [filterOperator, setFilterOperator] = useState('');
  const [filterModule, setFilterModule] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [selected, setSelected] = useState(new Set());
  const [reassignTo, setReassignTo] = useState('');
  const [reassigning, setReassigning] = useState(false);

  if (loading) return <LoadingSpinner message="Loading all tasks..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;

  const allTasks = data?.tasks || [];
  const grouped = data?.grouped || {};
  const operators = Object.keys(grouped);
  const usersList = (usersData || []).filter(u => u.active);

  // Apply filters
  let filtered = allTasks;
  if (filterOperator) filtered = filtered.filter(t => t.assigned_to === filterOperator);
  if (filterModule) filtered = filtered.filter(t => t.linked_module === filterModule);
  if (filterStatus) filtered = filtered.filter(t => t.status === filterStatus);
  if (filterPriority) filtered = filtered.filter(t => t.priority === filterPriority);

  // Stats per operator
  const operatorStats = {};
  for (const op of operators) {
    const opTasks = grouped[op] || [];
    operatorStats[op] = {
      total: opTasks.length,
      overdue: opTasks.filter(t => t.status === 'overdue').length,
      pending: opTasks.filter(t => t.status === 'pending').length,
      in_progress: opTasks.filter(t => t.status === 'in_progress').length,
    };
  }

  const toggleSelect = (id) => {
    const newSet = new Set(selected);
    if (newSet.has(id)) newSet.delete(id);
    else newSet.add(id);
    setSelected(newSet);
  };

  const toggleSelectAll = () => {
    if (selected.size === filtered.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(filtered.map(t => t.id)));
    }
  };

  const handleBulkReassign = async () => {
    if (!reassignTo || selected.size === 0) return;
    setReassigning(true);
    try {
      const promises = [...selected].map(id =>
        apiPut(`/api/operator-tasks/${id}`, { assigned_to: reassignTo })
      );
      await Promise.all(promises);
      setSelected(new Set());
      setReassignTo('');
      refetch();
    } catch (err) { alert('Error reassigning: ' + err.message); }
    finally { setReassigning(false); }
  };

  const renderTaskRow = (task) => (
    <div key={task.id} className="flex items-center gap-3 p-3 border-b border-gray-100 last:border-0 hover:bg-gray-50">
      <input
        type="checkbox"
        checked={selected.has(task.id)}
        onChange={() => toggleSelect(task.id)}
        className="rounded border-gray-300"
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-medium text-gray-900 text-sm truncate">{task.title}</p>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${PRIORITY_COLORS[task.priority]}`}>
            {task.priority}
          </span>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_COLORS[task.status]}`}>
            {task.status.replace('_', ' ')}
          </span>
          <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-indigo-50 text-indigo-600">
            {MODULE_LABELS[task.linked_module]}
          </span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 text-xs text-gray-500">
          <span className="flex items-center gap-1"><User className="w-3 h-3" />{task.assigned_to}</span>
          {task.due_date && (
            <span className={task.status === 'overdue' ? 'text-red-600 font-bold' : ''}>
              Due: {formatDate(task.due_date)}
            </span>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-purple-50 rounded-xl">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Task Administration</h1>
            <p className="text-sm text-gray-500">{allTasks.length} total tasks across {operators.length} operators</p>
          </div>
        </div>
      </div>

      {/* Operator Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
        {operators.map(op => (
          <div key={op} className={`bg-white rounded-xl shadow-sm border p-3 cursor-pointer transition-colors ${filterOperator === op ? 'border-indigo-300 ring-2 ring-indigo-100' : 'border-gray-200 hover:border-gray-300'}`}
            onClick={() => setFilterOperator(filterOperator === op ? '' : op)}>
            <p className="text-sm font-medium text-gray-900 truncate">{op}</p>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="text-gray-500">{operatorStats[op].total} tasks</span>
              {operatorStats[op].overdue > 0 && (
                <span className="text-red-600 font-bold">{operatorStats[op].overdue} overdue</span>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Filters + View Toggle */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-2 flex-wrap">
          <select value={filterOperator} onChange={e => setFilterOperator(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5">
            <option value="">All Operators</option>
            {operators.map(op => <option key={op} value={op}>{op}</option>)}
          </select>
          <select value={filterModule} onChange={e => setFilterModule(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5">
            <option value="">All Modules</option>
            {Object.entries(MODULE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5">
            <option value="">All Statuses</option>
            <option value="pending">Pending</option>
            <option value="in_progress">In Progress</option>
            <option value="overdue">Overdue</option>
            <option value="completed">Completed</option>
          </select>
          <select value={filterPriority} onChange={e => setFilterPriority(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5">
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button onClick={() => setViewMode('grouped')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${viewMode === 'grouped' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            Grouped
          </button>
          <button onClick={() => setViewMode('flat')}
            className={`px-3 py-1.5 rounded-md text-sm font-medium ${viewMode === 'flat' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
            Flat List
          </button>
        </div>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 flex items-center gap-3 flex-wrap">
          <span className="text-sm font-medium text-indigo-700">{selected.size} selected</span>
          <ArrowRight className="w-4 h-4 text-indigo-400" />
          <select value={reassignTo} onChange={e => setReassignTo(e.target.value)}
            className="text-sm border border-indigo-200 rounded-lg px-2 py-1.5 bg-white">
            <option value="">Reassign to...</option>
            {usersList.map(u => <option key={u.id} value={u.username}>{u.display_name || u.username}</option>)}
          </select>
          <button onClick={handleBulkReassign} disabled={!reassignTo || reassigning}
            className="px-3 py-1.5 bg-indigo-600 text-white text-sm rounded-lg hover:bg-indigo-700 disabled:opacity-50">
            {reassigning ? 'Reassigning...' : 'Reassign'}
          </button>
          <button onClick={() => setSelected(new Set())} className="text-sm text-gray-500 hover:text-gray-700 ml-2">
            Clear
          </button>
        </div>
      )}

      {/* Task List */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        {/* Select All header */}
        <div className="flex items-center gap-3 p-3 border-b border-gray-200 bg-gray-50 rounded-t-xl">
          <input type="checkbox" checked={selected.size === filtered.length && filtered.length > 0}
            onChange={toggleSelectAll} className="rounded border-gray-300" />
          <span className="text-xs font-medium text-gray-500">{filtered.length} tasks</span>
        </div>

        {viewMode === 'flat' ? (
          filtered.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <ListTodo className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm">No tasks match filters</p>
            </div>
          ) : (
            filtered.map(renderTaskRow)
          )
        ) : (
          operators.filter(op => !filterOperator || op === filterOperator).map(op => {
            const opTasks = (grouped[op] || []).filter(t => {
              if (filterModule && t.linked_module !== filterModule) return false;
              if (filterStatus && t.status !== filterStatus) return false;
              if (filterPriority && t.priority !== filterPriority) return false;
              return true;
            });
            if (opTasks.length === 0) return null;
            return (
              <div key={op}>
                <div className="px-4 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-gray-400" />
                  <span className="text-sm font-semibold text-gray-700">{op}</span>
                  <span className="text-xs text-gray-400">({opTasks.length})</span>
                  {operatorStats[op].overdue > 0 && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-red-100 text-red-600">
                      {operatorStats[op].overdue} overdue
                    </span>
                  )}
                </div>
                {opTasks.map(renderTaskRow)}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
