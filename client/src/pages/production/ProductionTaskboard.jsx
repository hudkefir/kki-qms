import React, { useState, useMemo } from 'react';
import { ListTodo, Plus, Calendar, Trash2, Edit2, Play, CheckCircle, RotateCcw } from 'lucide-react';
import { useFetch, apiPost, apiPut, apiDelete } from '../../hooks/useApi';
import LoadingSpinner from '../../components/LoadingSpinner';
import Modal from '../../components/Modal';

const STATUS_OPTIONS = ['pending', 'in_progress', 'done'];
const STATUS_STYLES = {
  pending:     'bg-gray-100 text-gray-700 border-gray-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  done:        'bg-green-100 text-green-800 border-green-200',
};

const SECTION_OPTIONS = ['Fermentation', 'Pouring', 'Packing', 'Cleaning'];
const SECTION_ORDER = [...SECTION_OPTIONS, 'Other'];

function StatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
      {status.replace(/_/g, ' ')}
    </span>
  );
}

export default function ProductionTaskboard() {
  const today = new Date().toISOString().slice(0, 10);
  const [date, setDate] = useState(today);
  const { data: tasks, loading, error, refetch } = useFetch(`/api/production/taskboard?date=${date}`, [date]);
  const { data: operators } = useFetch('/api/daily-tasks/operators');

  const [showAddModal, setShowAddModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const grouped = useMemo(() => {
    if (!tasks) return {};
    const out = {};
    for (const t of tasks) {
      const key = t.section || 'Other';
      if (!out[key]) out[key] = [];
      out[key].push(t);
    }
    return out;
  }, [tasks]);

  const openAdd = () => {
    setEditingTask(null);
    setFormData({ task_date: date, status: 'pending', priority: 0, section: SECTION_OPTIONS[0] });
    setShowAddModal(true);
  };

  const openEdit = (task) => {
    setEditingTask(task);
    setFormData({ ...task, task_date: task.task_date?.slice(0, 10) || date });
    setShowAddModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (editingTask) {
        const { id, status, ...rest } = formData;
        await apiPut(`/api/production/taskboard/${editingTask.id}`, rest);
      } else {
        await apiPost('/api/production/taskboard', formData);
      }
      setShowAddModal(false);
      setFormData({});
      setEditingTask(null);
      refetch();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleStatus = async (id, status) => {
    try {
      await apiPut(`/api/production/taskboard/${id}/status`, { status });
      refetch();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this task?')) return;
    try {
      await apiDelete(`/api/production/taskboard/${id}`);
      refetch();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;

  const counts = STATUS_OPTIONS.reduce((acc, s) => {
    acc[s] = (tasks || []).filter(t => t.status === s).length;
    return acc;
  }, {});

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500 font-medium">Production</p>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ListTodo className="w-8 h-8 text-amber-600" />
            Production Taskboard
          </h1>
        </div>
        <button onClick={openAdd} className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700">
          <Plus className="w-4 h-4" /> Add Task
        </button>
      </div>

      {/* Date selector + counts */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input type="date" value={date} onChange={e => setDate(e.target.value)}
              className="border border-gray-300 rounded-lg text-sm px-3 py-2" />
            {date === today && <span className="text-xs font-medium px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Today</span>}
          </div>
          <div className="flex items-center gap-3 text-sm">
            <span className="text-gray-500">Pending: <span className="font-bold text-gray-700">{counts.pending}</span></span>
            <span className="text-gray-500">In Progress: <span className="font-bold text-blue-700">{counts.in_progress}</span></span>
            <span className="text-gray-500">Done: <span className="font-bold text-green-700">{counts.done}</span></span>
          </div>
        </div>
      </div>

      {/* Tasks grouped by section */}
      {loading ? (
        <LoadingSpinner message="Loading tasks..." />
      ) : (
        <div className="space-y-5">
          {SECTION_ORDER.filter(s => grouped[s]?.length).map(section => (
            <div key={section}>
              <div className="flex items-center justify-between px-4 py-2.5 bg-gray-100 rounded-t-xl">
                <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{section}</h2>
                <span className="text-xs text-gray-500">{grouped[section].length} tasks</span>
              </div>
              <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 border-t-0 divide-y divide-gray-100">
                {grouped[section].map(t => (
                  <div key={t.id} className="flex items-start gap-3 px-4 py-3 hover:bg-gray-50">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className={`text-sm font-medium ${t.status === 'done' ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                          {t.task}
                        </p>
                        {t.priority > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-red-100 text-red-700 rounded uppercase">
                            P{t.priority}
                          </span>
                        )}
                        <StatusBadge status={t.status} />
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                        {t.assigned_to && <span>👤 {t.assigned_to}</span>}
                        {t.notes && <span className="italic truncate">— {t.notes}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {t.status === 'pending' && (
                        <button onClick={() => handleStatus(t.id, 'in_progress')} title="Start"
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded">
                          <Play className="w-4 h-4" />
                        </button>
                      )}
                      {t.status === 'in_progress' && (
                        <button onClick={() => handleStatus(t.id, 'done')} title="Mark done"
                          className="p-1.5 text-green-600 hover:bg-green-50 rounded">
                          <CheckCircle className="w-4 h-4" />
                        </button>
                      )}
                      {t.status === 'done' && (
                        <button onClick={() => handleStatus(t.id, 'pending')} title="Reopen"
                          className="p-1.5 text-gray-500 hover:bg-gray-100 rounded">
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      )}
                      <button onClick={() => openEdit(t)} title="Edit"
                        className="p-1.5 text-gray-500 hover:bg-gray-100 rounded">
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(t.id)} title="Delete"
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {(tasks || []).length === 0 && (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm border border-gray-200">
              <ListTodo className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No tasks for {date}</p>
              <button onClick={openAdd} className="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm hover:bg-navy-700">
                <Plus className="w-4 h-4" /> Add the first task
              </button>
            </div>
          )}
        </div>
      )}

      <Modal isOpen={showAddModal} onClose={() => { setShowAddModal(false); setEditingTask(null); }} title={editingTask ? 'Edit Task' : 'Add Task'}>
        <form onSubmit={handleSave} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Description *</label>
            <input type="text" required value={formData.task || ''} onChange={e => setFormData({ ...formData, task: e.target.value })}
              className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Date *</label>
              <input type="date" required value={formData.task_date?.slice(0, 10) || ''} onChange={e => setFormData({ ...formData, task_date: e.target.value })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Section</label>
              <select value={formData.section || ''} onChange={e => setFormData({ ...formData, section: e.target.value })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                <option value="">— None —</option>
                {SECTION_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Operator</label>
              <select value={formData.assigned_to || ''} onChange={e => setFormData({ ...formData, assigned_to: e.target.value || null })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                <option value="">Unassigned</option>
                {(operators || []).map(op => <option key={op.username} value={op.username}>{op.display_name || op.username}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={formData.priority ?? 0} onChange={e => setFormData({ ...formData, priority: Number(e.target.value) })}
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                <option value={0}>Normal</option>
                <option value={1}>High (P1)</option>
                <option value={2}>Urgent (P2)</option>
              </select>
            </div>
            {!editingTask && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={formData.status || 'pending'} onChange={e => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                  {STATUS_OPTIONS.map(s => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
                </select>
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={3} value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })}
              className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="flex justify-end gap-3 pt-2">
            <button type="button" onClick={() => { setShowAddModal(false); setEditingTask(null); }} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button type="submit" disabled={saving} className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 disabled:opacity-50">
              {saving ? 'Saving...' : (editingTask ? 'Save Changes' : 'Add Task')}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
