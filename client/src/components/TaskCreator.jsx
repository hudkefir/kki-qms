import React, { useState, useEffect } from 'react';
import { apiPost, apiPut, useFetch } from '../hooks/useApi';
import {
  ListTodo, Plus, CheckCircle, Clock, Play, AlertTriangle, X, Send, User
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

const STATUS_ICONS = {
  pending: Clock,
  in_progress: Play,
  completed: CheckCircle,
  overdue: AlertTriangle,
};

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-CA');
}

export default function TaskCreator({ linkedModule, linkedRecordId, canEdit = false }) {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({ title: '', description: '', assigned_to: '', due_date: '', priority: 'medium' });
  const [submitting, setSubmitting] = useState(false);

  const fetchTasks = async () => {
    try {
      const res = await fetch(`/api/operator-tasks/by-module/${linkedModule}/${linkedRecordId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setTasks(data);
      }
    } catch (err) { /* ignore */ }
    finally { setLoading(false); }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users', { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setUsers(data.filter(u => u.active));
      }
    } catch (err) { /* ignore */ }
  };

  useEffect(() => {
    fetchTasks();
    fetchUsers();
  }, [linkedModule, linkedRecordId]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.assigned_to) return;
    setSubmitting(true);
    try {
      await apiPost('/api/operator-tasks', {
        ...form,
        linked_module: linkedModule,
        linked_record_id: linkedRecordId,
      });
      setForm({ title: '', description: '', assigned_to: '', due_date: '', priority: 'medium' });
      setShowForm(false);
      fetchTasks();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSubmitting(false); }
  };

  const handleQuickComplete = async (taskId) => {
    try {
      await apiPut(`/api/operator-tasks/${taskId}/status`, { status: 'completed' });
      fetchTasks();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const activeCount = tasks.filter(t => t.status !== 'completed').length;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-3 border-b border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ListTodo className="w-4 h-4 text-indigo-600" />
          <h3 className="text-sm font-semibold text-gray-900">Operator Tasks</h3>
          {activeCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-100 text-indigo-700">
              {activeCount}
            </span>
          )}
        </div>
        {canEdit && (
          <button
            onClick={() => setShowForm(!showForm)}
            className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
          >
            {showForm ? <X className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {showForm ? 'Cancel' : 'Add Task'}
          </button>
        )}
      </div>

      {/* Add Task Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="p-4 border-b border-gray-100 bg-gray-50 space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
            <input
              type="text"
              required
              value={form.title}
              onChange={e => setForm({ ...form, title: e.target.value })}
              placeholder="Task title..."
              className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
            <textarea
              rows={2}
              value={form.description}
              onChange={e => setForm({ ...form, description: e.target.value })}
              placeholder="Optional details..."
              className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Assign To *</label>
              <select
                required
                value={form.assigned_to}
                onChange={e => setForm({ ...form, assigned_to: e.target.value })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2"
              >
                <option value="">Select...</option>
                {users.map(u => (
                  <option key={u.id} value={u.username}>{u.display_name || u.username}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Due Date</label>
              <input
                type="date"
                value={form.due_date}
                onChange={e => setForm({ ...form, due_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Priority</label>
              <select
                value={form.priority}
                onChange={e => setForm({ ...form, priority: e.target.value })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={submitting}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50"
            >
              {submitting ? 'Creating...' : 'Create Task'}
            </button>
          </div>
        </form>
      )}

      {/* Task List */}
      <div className="divide-y divide-gray-100">
        {loading && (
          <div className="p-4 text-center text-sm text-gray-400">Loading tasks...</div>
        )}
        {!loading && tasks.length === 0 && (
          <div className="p-4 text-center text-sm text-gray-400 italic">
            No operator tasks for this record
          </div>
        )}
        {tasks.map(task => {
          const StatusIcon = STATUS_ICONS[task.status] || Clock;
          return (
            <div key={task.id} className="px-4 py-2.5 flex items-center gap-3 hover:bg-gray-50">
              <StatusIcon className={`w-4 h-4 flex-shrink-0 ${task.status === 'overdue' ? 'text-red-500' : task.status === 'completed' ? 'text-green-500' : task.status === 'in_progress' ? 'text-blue-500' : 'text-gray-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className={`text-sm font-medium ${task.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-900'}`}>
                    {task.title}
                  </p>
                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold border ${PRIORITY_COLORS[task.priority]}`}>
                    {task.priority}
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                  <span className="flex items-center gap-0.5"><User className="w-3 h-3" />{task.assigned_to}</span>
                  {task.due_date && (
                    <span className={task.status === 'overdue' ? 'text-red-600 font-bold' : ''}>
                      Due: {formatDate(task.due_date)}
                    </span>
                  )}
                </div>
              </div>
              {canEdit && task.status !== 'completed' && (
                <button
                  onClick={() => handleQuickComplete(task.id)}
                  title="Mark complete"
                  className="p-1 rounded-lg text-green-600 hover:bg-green-50 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
