import React, { useState, useEffect } from 'react';
import { useFetch, apiPut, apiPost } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  ListTodo, Clock, CheckCircle, AlertTriangle, Play, ChevronDown, ChevronRight,
  Send, Filter, Calendar, Tag
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

const MODULE_PATHS = {
  capa: '/capas', deviation: '/deviations', complaint: '/complaints', change_request: '/change-requests',
  batch_test: '/batch-testing', equipment: '/equipment', work_order: '/work-orders',
  recall: '/recalls', supplier: '/suppliers', sop: '/sops', general: null,
};

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-CA');
}

export default function OperatorTasks() {
  const { user } = useAuth();
  const { data: tasks, loading, error, refetch } = useFetch('/api/operator-tasks/my');
  const { data: stats, refetch: refetchStats } = useFetch('/api/operator-tasks/dashboard');

  const [activeTab, setActiveTab] = useState('active');
  const [expandedId, setExpandedId] = useState(null);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [filterModule, setFilterModule] = useState('');
  const [filterPriority, setFilterPriority] = useState('');
  const [taskComments, setTaskComments] = useState({});

  const refreshAll = () => { refetch(); refetchStats(); };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await apiPut(`/api/operator-tasks/${taskId}/status`, { status: newStatus });
      refreshAll();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleAddComment = async (taskId) => {
    if (!comment.trim()) return;
    setSubmitting(true);
    try {
      const created = await apiPost(`/api/operator-tasks/${taskId}/comments`, { comment: comment.trim() });
      setComment('');
      setTaskComments(prev => ({ ...prev, [taskId]: [...(prev[taskId] || []), created] }));
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSubmitting(false); }
  };

  const loadComments = async (taskId) => {
    try {
      const res = await fetch(`/api/operator-tasks/${taskId}`, { credentials: 'include' });
      const data = await res.json();
      setTaskComments(prev => ({ ...prev, [taskId]: data.comments || [] }));
    } catch (err) { /* ignore */ }
  };

  const toggleExpand = (taskId) => {
    if (expandedId === taskId) {
      setExpandedId(null);
    } else {
      setExpandedId(taskId);
      if (!taskComments[taskId]) loadComments(taskId);
    }
  };

  if (loading) return <LoadingSpinner message="Loading your tasks..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;

  const allTasks = tasks || [];
  let filtered = allTasks;
  if (filterModule) filtered = filtered.filter(t => t.linked_module === filterModule);
  if (filterPriority) filtered = filtered.filter(t => t.priority === filterPriority);

  const activeTasks = filtered.filter(t => ['pending', 'in_progress', 'overdue'].includes(t.status));
  const completedTasks = filtered.filter(t => t.status === 'completed');
  const displayTasks = activeTab === 'active' ? activeTasks : completedTasks;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-xl">
            <ListTodo className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
            <p className="text-sm text-gray-500">Your assigned operator tasks across all modules</p>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Clock className="w-4 h-4 text-gray-400" />
            <span className="text-xs font-medium text-gray-500 uppercase">Pending</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{stats?.total_pending || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Play className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-medium text-gray-500 uppercase">In Progress</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{stats?.in_progress || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-red-200 p-4 border-l-4 border-l-red-500">
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs font-medium text-red-600 uppercase">Overdue</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{stats?.overdue || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-1">
            <Calendar className="w-4 h-4 text-amber-500" />
            <span className="text-xs font-medium text-gray-500 uppercase">Due This Week</span>
          </div>
          <p className="text-2xl font-bold text-amber-600">{stats?.due_this_week || 0}</p>
        </div>
      </div>

      {/* Tabs + Filters */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-lg">
          <button
            onClick={() => setActiveTab('active')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'active' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Active ({activeTasks.length})
          </button>
          <button
            onClick={() => setActiveTab('completed')}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-colors ${activeTab === 'completed' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            Completed ({completedTasks.length})
          </button>
        </div>
        <div className="flex gap-2">
          <select
            value={filterModule}
            onChange={e => setFilterModule(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5"
          >
            <option value="">All Modules</option>
            {Object.entries(MODULE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <select
            value={filterPriority}
            onChange={e => setFilterPriority(e.target.value)}
            className="text-sm border border-gray-300 rounded-lg px-2 py-1.5"
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>
        </div>
      </div>

      {/* Task List */}
      <div className="space-y-3">
        {displayTasks.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <ListTodo className="w-12 h-12 mx-auto mb-3 text-gray-300" />
            <p className="font-medium">No tasks</p>
            <p className="text-sm">
              {activeTab === 'active' ? 'You have no active tasks. Nice work!' : 'No completed tasks yet.'}
            </p>
          </div>
        )}
        {displayTasks.map(task => (
          <div key={task.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
            <div className="p-4 flex items-center gap-3">
              {/* Quick actions */}
              {task.status === 'pending' && (
                <button onClick={() => handleStatusChange(task.id, 'in_progress')} title="Start"
                  className="p-1.5 rounded-lg bg-blue-50 text-blue-600 hover:bg-blue-100 transition-colors flex-shrink-0">
                  <Play className="w-4 h-4" />
                </button>
              )}
              {(task.status === 'in_progress' || task.status === 'overdue') && (
                <button onClick={() => handleStatusChange(task.id, 'completed')} title="Complete"
                  className="p-1.5 rounded-lg bg-green-50 text-green-600 hover:bg-green-100 transition-colors flex-shrink-0">
                  <CheckCircle className="w-4 h-4" />
                </button>
              )}
              {task.status === 'completed' && (
                <div className="p-1.5 flex-shrink-0">
                  <CheckCircle className="w-4 h-4 text-green-500" />
                </div>
              )}

              {/* Main content */}
              <div className="flex-1 min-w-0 cursor-pointer" onClick={() => toggleExpand(task.id)}>
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="font-medium text-gray-900 text-sm">{task.title}</p>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${PRIORITY_COLORS[task.priority]}`}>
                    {task.priority}
                  </span>
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_COLORS[task.status]}`}>
                    {task.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1">
                  {task.linked_module && task.linked_module !== 'general' && (
                    <span className="text-xs text-indigo-600 font-medium">
                      {MODULE_LABELS[task.linked_module]} #{task.linked_record_id}
                    </span>
                  )}
                  {task.due_date && (
                    <span className={`text-xs ${task.status === 'overdue' ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                      Due: {formatDate(task.due_date)}
                    </span>
                  )}
                </div>
              </div>

              {/* Expand toggle */}
              <button onClick={() => toggleExpand(task.id)} className="p-1 text-gray-400 hover:text-gray-600">
                {expandedId === task.id ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
              </button>
            </div>

            {/* Expanded detail */}
            {expandedId === task.id && (
              <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                {task.description && (
                  <p className="text-sm text-gray-700">{task.description}</p>
                )}
                <div className="text-xs text-gray-500 flex gap-4 flex-wrap">
                  <span>Created by: {task.created_by}</span>
                  <span>Created: {formatDate(task.created_at)}</span>
                  {task.completed_at && <span>Completed: {formatDate(task.completed_at)} by {task.completed_by}</span>}
                </div>

                {/* Link to source */}
                {MODULE_PATHS[task.linked_module] && (
                  <a
                    href={`${MODULE_PATHS[task.linked_module]}/${task.linked_record_id}`}
                    className="inline-flex items-center gap-1 text-xs text-indigo-600 hover:underline font-medium"
                  >
                    <Tag className="w-3 h-3" /> View {MODULE_LABELS[task.linked_module]} #{task.linked_record_id}
                  </a>
                )}

                {/* Comments */}
                <div className="space-y-2 mt-3">
                  <p className="text-xs font-bold text-gray-500 uppercase">Comments</p>
                  {(taskComments[task.id] || []).length === 0 && (
                    <p className="text-xs text-gray-400 italic">No comments yet</p>
                  )}
                  {(taskComments[task.id] || []).map(c => (
                    <div key={c.id} className="text-sm bg-white p-2 rounded border border-gray-100">
                      <span className="font-medium text-gray-800">{c.author}</span>
                      <span className="text-gray-400 ml-2 text-xs">{formatDate(c.created_at)}</span>
                      <p className="text-gray-700 mt-0.5">{c.comment}</p>
                    </div>
                  ))}
                  <div className="flex gap-2 mt-2">
                    <input
                      type="text"
                      value={expandedId === task.id ? comment : ''}
                      onChange={e => setComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                      onKeyDown={e => { if (e.key === 'Enter') handleAddComment(task.id); }}
                    />
                    <button
                      onClick={() => handleAddComment(task.id)}
                      disabled={submitting || !comment.trim()}
                      className="p-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
