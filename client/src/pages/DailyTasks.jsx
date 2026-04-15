import React, { useState, useMemo, useEffect } from 'react';
import {
  ClipboardList, CheckSquare, Square, Calendar,
  ChevronDown, Save, Shield, Eye, ArrowLeft, User, CheckCircle,
  Filter, Printer, Users, GripVertical, LayoutGrid, Lock, Unlock,
  Download, Upload, Maximize2, X, AlertTriangle
} from 'lucide-react';
import { useFetch, apiPost, apiPut } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';

const SHIFT_OPTIONS = [
  { value: 'morning', label: 'Morning', color: 'bg-amber-100 text-amber-700' },
  { value: 'afternoon', label: 'Afternoon', color: 'bg-blue-100 text-blue-700' },
  { value: 'evening', label: 'Evening', color: 'bg-indigo-100 text-indigo-700' },
];

const CATEGORY_COLORS = {
  'Pre-Production':    { border: '#3B82F6', bg: 'rgba(59,130,246,0.08)',  headerBg: 'bg-blue-100',   headerText: 'text-blue-800',   dot: 'bg-blue-500' },
  'During Production': { border: '#10B981', bg: 'rgba(16,185,129,0.08)', headerBg: 'bg-green-100',  headerText: 'text-green-800',  dot: 'bg-green-500' },
  'Post-Production':   { border: '#F59E0B', bg: 'rgba(245,158,11,0.08)', headerBg: 'bg-orange-100', headerText: 'text-orange-800', dot: 'bg-orange-500' },
  'Weekly':            { border: '#8B5CF6', bg: 'rgba(139,92,246,0.08)', headerBg: 'bg-purple-100', headerText: 'text-purple-800', dot: 'bg-purple-500' },
  'Cleaning':          { border: '#14B8A6', bg: 'rgba(20,184,166,0.08)', headerBg: 'bg-teal-100',   headerText: 'text-teal-800',   dot: 'bg-teal-500' },
  'Safety':            { border: '#EF4444', bg: 'rgba(239,68,68,0.08)',  headerBg: 'bg-red-100',    headerText: 'text-red-800',    dot: 'bg-red-500' },
};

const DEFAULT_CAT = { border: '#6B7280', bg: 'rgba(107,114,128,0.06)', headerBg: 'bg-gray-100', headerText: 'text-gray-800', dot: 'bg-gray-400' };

function getCat(category) {
  return CATEGORY_COLORS[category] || DEFAULT_CAT;
}

const CATEGORY_ORDER = ['Pre-Production', 'During Production', 'Post-Production', 'Weekly', 'Cleaning', 'Safety'];

function formatTime(isoStr) {
  if (!isoStr) return '';
  const d = new Date(isoStr.replace(' ', 'T'));
  return d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function DailyTasks() {
  const { user, hasRole } = useAuth();
  const isAdmin = hasRole('admin');
  const isSupervisor = isAdmin || hasRole('manager');
  const today = new Date().toISOString().slice(0, 10);

  const [view, setView] = useState('checklist');
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedShift, setSelectedShift] = useState('morning');
  const [saving, setSaving] = useState(false);
  const [savingProgress, setSavingProgress] = useState(false);
  const [localCompletions, setLocalCompletions] = useState({});
  const [localNotes, setLocalNotes] = useState({});
  const [historyFrom, setHistoryFrom] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() - 7); return d.toISOString().slice(0, 10);
  });
  const [historyTo, setHistoryTo] = useState(today);
  const [dragOverColumn, setDragOverColumn] = useState(null);
  const [showPrintView, setShowPrintView] = useState(false);

  // Template state
  const [showTemplateDropdown, setShowTemplateDropdown] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');
  const [templateLoading, setTemplateLoading] = useState(false);

  // Focus view state
  const [focusOperator, setFocusOperator] = useState(null);

  // Admin override state
  const [overrideModal, setOverrideModal] = useState(null); // { completionId, taskName }
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideNotes, setOverrideNotes] = useState('');
  const [overrideStatus, setOverrideStatus] = useState('');

  // Data fetching
  const { data: tasks, loading: tasksLoading, refetch: refetchTasks } = useFetch('/api/daily-tasks?active=true');
  const { data: operators } = useFetch('/api/daily-tasks/operators');
  const { data: completions, loading: compLoading, refetch: refetchCompletions } = useFetch(
    `/api/daily-tasks/completions?date=${selectedDate}&shift=${selectedShift}`
  );
  const { data: summary, loading: summaryLoading, refetch: refetchSummary } = useFetch(
    view === 'supervisor' ? `/api/daily-tasks/completions/summary?from=${historyFrom}&to=${historyTo}` : null
  );
  const { data: templates, refetch: refetchTemplates } = useFetch('/api/daily-tasks/templates');

  // Completion lookup
  const completionMap = useMemo(() => {
    const map = {};
    if (completions) {
      for (const c of completions) {
        if (!map[c.daily_task_id]) map[c.daily_task_id] = [];
        map[c.daily_task_id].push(c);
      }
    }
    return map;
  }, [completions]);

  const getMyCompletion = (taskId) => {
    const entries = completionMap[taskId] || [];
    return entries.find(c => c.completed_by === user?.username);
  };

  const getAllCompletions = (taskId) => completionMap[taskId] || [];

  // Group tasks by category
  const groupedTasks = useMemo(() => {
    if (!tasks) return {};
    const groups = {};
    for (const t of tasks) {
      if (!groups[t.category]) groups[t.category] = [];
      groups[t.category].push(t);
    }
    return groups;
  }, [tasks]);

  // Kanban columns
  const kanbanColumns = useMemo(() => {
    if (!tasks || !operators) return {};
    const columns = { __unassigned: [] };
    for (const op of operators) columns[op.username] = [];
    for (const t of tasks) {
      const key = t.assigned_to || '__unassigned';
      if (!columns[key]) columns[key] = [];
      columns[key].push(t);
    }
    return columns;
  }, [tasks, operators]);

  // Status helpers
  const getEffectiveStatus = (taskId) => {
    if (localCompletions[taskId] !== undefined) return localCompletions[taskId];
    const comp = getMyCompletion(taskId);
    return comp ? comp.status : null;
  };

  const isTaskLocked = (taskId) => {
    const comp = getMyCompletion(taskId);
    return comp?.locked === 1;
  };

  // Handlers
  const handleToggleTask = (taskId, currentStatus) => {
    if (isTaskLocked(taskId) && !isAdmin) return;
    const nextStatus = currentStatus === 'done' ? null : 'done';
    setLocalCompletions(prev => ({ ...prev, [taskId]: nextStatus }));
  };

  const handleSetStatus = (taskId, status) => {
    if (isTaskLocked(taskId) && !isAdmin) return;
    setLocalCompletions(prev => ({ ...prev, [taskId]: status }));
  };

  const handleNoteChange = (taskId, notes) => {
    if (isTaskLocked(taskId) && !isAdmin) return;
    setLocalNotes(prev => ({ ...prev, [taskId]: notes }));
  };

  // Save & Complete — sends all tasks that have status set
  const handleSaveAll = async () => {
    setSaving(true);
    try {
      const allTasks = tasks || [];
      const completionsToSave = [];
      for (const task of allTasks) {
        const effectiveStatus = getEffectiveStatus(task.id);
        if (effectiveStatus) {
          completionsToSave.push({
            daily_task_id: task.id,
            status: effectiveStatus,
            notes: localNotes[task.id] !== undefined ? localNotes[task.id] : (getMyCompletion(task.id)?.notes || ''),
          });
        }
      }
      if (completionsToSave.length > 0) {
        await apiPost('/api/daily-tasks/completions/bulk', {
          completions: completionsToSave, shift: selectedShift, date: selectedDate,
        });
      }
      setLocalCompletions({});
      setLocalNotes({});
      refetchCompletions();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  // Save Progress — saves only notes for tasks that already have completions (no status change)
  const handleSaveProgress = async () => {
    setSavingProgress(true);
    try {
      const noteTaskIds = Object.keys(localNotes);
      if (noteTaskIds.length === 0) { setSavingProgress(false); return; }

      const completionsToSave = [];
      for (const taskIdStr of noteTaskIds) {
        const taskId = parseInt(taskIdStr, 10);
        const comp = getMyCompletion(taskId);
        const effectiveStatus = getEffectiveStatus(taskId);
        // Save note with current status (or 'done' if checking off)
        completionsToSave.push({
          daily_task_id: taskId,
          status: effectiveStatus || comp?.status || 'done',
          notes: localNotes[taskId],
        });
      }
      if (completionsToSave.length > 0) {
        await apiPost('/api/daily-tasks/completions/bulk', {
          completions: completionsToSave, shift: selectedShift, date: selectedDate,
        });
      }
      setLocalNotes({});
      refetchCompletions();
    } catch (err) {
      alert('Failed to save progress: ' + err.message);
    } finally {
      setSavingProgress(false);
    }
  };

  const handleVerify = async (completionId) => {
    try {
      await apiPut(`/api/daily-tasks/completions/${completionId}/verify`, {});
      refetchCompletions();
    } catch (err) {
      alert('Verification failed: ' + err.message);
    }
  };

  // Template handlers
  const handleLoadTemplate = async (templateId) => {
    setTemplateLoading(true);
    try {
      await apiPost(`/api/daily-tasks/templates/${templateId}/load`, {});
      refetchTasks();
      setShowTemplateDropdown(false);
    } catch (err) {
      alert('Failed to load template: ' + err.message);
    } finally {
      setTemplateLoading(false);
    }
  };

  const handleSaveAsTemplate = async () => {
    if (!templateName.trim()) return;
    setTemplateLoading(true);
    try {
      const items = (tasks || []).map((t, i) => ({
        task_name: t.task_name,
        category: t.category,
        description: t.description,
        sop_reference: t.sop_reference,
        sort_order: i,
        color: t.color || getCat(t.category).border,
      }));
      await apiPost('/api/daily-tasks/templates', {
        template_name: templateName.trim(),
        description: templateDesc.trim(),
        items,
      });
      refetchTemplates();
      setShowSaveTemplate(false);
      setTemplateName('');
      setTemplateDesc('');
    } catch (err) {
      alert('Failed to save template: ' + err.message);
    } finally {
      setTemplateLoading(false);
    }
  };

  // Admin override handlers
  const handleAdminUnlock = async (completionId, taskName) => {
    setOverrideModal({ completionId, taskName, action: 'unlock' });
    setOverrideReason('');
  };

  const handleAdminOverride = async (completion) => {
    setOverrideModal({ completionId: completion.id, taskName: completion.task_name || '', action: 'override' });
    setOverrideReason('');
    setOverrideNotes(completion.notes || '');
    setOverrideStatus(completion.status || 'done');
  };

  const submitAdminAction = async () => {
    if (!overrideReason.trim()) { alert('Reason is required'); return; }
    try {
      if (overrideModal.action === 'unlock') {
        await apiPut(`/api/daily-tasks/completions/${overrideModal.completionId}/unlock`, { reason: overrideReason });
      } else {
        await apiPut(`/api/daily-tasks/completions/${overrideModal.completionId}/admin-override`, {
          status: overrideStatus, notes: overrideNotes, reason: overrideReason,
        });
      }
      setOverrideModal(null);
      refetchCompletions();
    } catch (err) {
      alert('Admin action failed: ' + err.message);
    }
  };

  // Drag-drop handlers
  const handleDragStart = (e, task) => {
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', task.id.toString());
    e.target.style.opacity = '0.5';
  };
  const handleDragEnd = (e) => { setDragOverColumn(null); e.target.style.opacity = '1'; };
  const handleDragOver = (e, col) => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDragOverColumn(col); };
  const handleDragLeave = (e) => { if (!e.currentTarget.contains(e.relatedTarget)) setDragOverColumn(null); };
  const handleDrop = async (e, targetUsername) => {
    e.preventDefault(); setDragOverColumn(null);
    const taskId = parseInt(e.dataTransfer.getData('text/plain'), 10);
    if (!taskId) return;
    try {
      await apiPut(`/api/daily-tasks/${taskId}/assign`, { assigned_to: targetUsername === '__unassigned' ? null : targetUsername });
      refetchTasks();
    } catch (err) { alert('Assignment failed: ' + err.message); }
  };

  // Counts
  const totalTasks = (tasks || []).length;
  const completedCount = (tasks || []).filter(t => getEffectiveStatus(t.id)).length;
  const hasUnsaved = Object.keys(localCompletions).length > 0;
  const hasUnsavedNotes = Object.keys(localNotes).length > 0;

  // Print handler
  const handlePrint = () => { setShowPrintView(true); setTimeout(() => { window.print(); setShowPrintView(false); }, 100); };

  if (tasksLoading) return <LoadingSpinner message="Loading daily tasks..." />;

  // ──── OPERATOR FOCUS VIEW ────
  if (focusOperator) {
    const opTasks = (tasks || []).filter(t => t.assigned_to === focusOperator.username);
    const opDisplay = focusOperator.display_name || focusOperator.username;

    return (
      <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
        <div className="max-w-3xl mx-auto p-6">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <button
              onClick={() => setFocusOperator(null)}
              className="flex items-center gap-2 text-gray-600 hover:text-gray-900 text-lg"
            >
              <ArrowLeft className="w-6 h-6" /> Back
            </button>
            <div className="text-center">
              <h1 className="text-2xl font-bold text-gray-900">{opDisplay}</h1>
              <p className="text-gray-500">{selectedDate} &mdash; {SHIFT_OPTIONS.find(s => s.value === selectedShift)?.label} Shift</p>
            </div>
            <div className="text-right">
              <span className="text-2xl font-bold text-teal-600">
                {opTasks.filter(t => getEffectiveStatus(t.id)).length}
              </span>
              <span className="text-lg text-gray-400">/{opTasks.length}</span>
            </div>
          </div>

          {/* Tasks — big, one per row, color-coded */}
          <div className="space-y-3">
            {opTasks.map(task => {
              const cat = getCat(task.category);
              const effectiveStatus = getEffectiveStatus(task.id);
              const isDone = effectiveStatus === 'done';
              const locked = isTaskLocked(task.id);
              const myComp = getMyCompletion(task.id);
              const noteValue = localNotes[task.id] !== undefined ? localNotes[task.id] : (myComp?.notes || '');

              return (
                <div
                  key={task.id}
                  className="rounded-xl border-l-4 p-5 transition-all"
                  style={{ borderLeftColor: cat.border, backgroundColor: isDone ? 'rgba(16,185,129,0.06)' : cat.bg }}
                >
                  <div className="flex items-center gap-4">
                    {/* Big checkbox */}
                    <button
                      onClick={() => !locked && handleToggleTask(task.id, effectiveStatus)}
                      disabled={locked && !isAdmin}
                      className={`flex-shrink-0 w-10 h-10 rounded-lg border-2 flex items-center justify-center transition-all ${
                        isDone
                          ? 'bg-green-500 border-green-500 text-white'
                          : locked
                            ? 'bg-gray-100 border-gray-300 text-gray-400 cursor-not-allowed'
                            : 'border-gray-300 hover:border-green-400 text-gray-300 hover:text-green-400'
                      }`}
                    >
                      {isDone ? <CheckSquare className="w-6 h-6" /> : locked ? <Lock className="w-5 h-5" /> : <Square className="w-6 h-6" />}
                    </button>

                    {/* Task name — large font */}
                    <div className="flex-1">
                      <p className={`text-lg font-semibold ${isDone ? 'text-gray-400 line-through' : 'text-gray-900'}`}>
                        {task.task_name}
                      </p>
                      {task.description && <p className="text-sm text-gray-500 mt-0.5">{task.description}</p>}
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-medium px-2 py-0.5 rounded-full" style={{ backgroundColor: cat.bg, color: cat.border }}>
                          {task.category}
                        </span>
                        {task.sop_reference && <span className="text-xs text-blue-600">{task.sop_reference}</span>}
                      </div>
                    </div>

                    {/* Lock / completion info */}
                    {locked && myComp && (
                      <div className="text-right flex-shrink-0">
                        <div className="flex items-center gap-1 text-green-600 text-sm font-medium">
                          <Lock className="w-4 h-4" />
                          Done at {formatTime(myComp.completed_at)}
                        </div>
                        <p className="text-xs text-gray-500">by {myComp.completed_by}</p>
                      </div>
                    )}
                  </div>

                  {/* Notes row */}
                  {!locked && (
                    <div className="mt-3 ml-14">
                      <input
                        type="text"
                        value={noteValue}
                        onChange={(e) => handleNoteChange(task.id, e.target.value)}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-teal-500"
                        placeholder="Add notes..."
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Save bar */}
          <div className="sticky bottom-0 bg-white border-t border-gray-200 mt-8 py-4 flex gap-3 justify-center">
            {hasUnsavedNotes && (
              <button
                onClick={handleSaveProgress}
                disabled={savingProgress}
                className="flex items-center gap-2 px-6 py-3 bg-gray-100 text-gray-700 rounded-xl text-base font-medium hover:bg-gray-200"
              >
                <Save className="w-5 h-5" /> {savingProgress ? 'Saving...' : 'Save Progress'}
              </button>
            )}
            {hasUnsaved && (
              <button
                onClick={handleSaveAll}
                disabled={saving}
                className="flex items-center gap-2 px-8 py-3 bg-teal-600 text-white rounded-xl text-base font-semibold hover:bg-teal-700"
              >
                <CheckCircle className="w-5 h-5" /> {saving ? 'Saving...' : 'Complete & Save'}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ──── PRINTABLE VIEW ────
  if (showPrintView) {
    const operatorGroups = {};
    for (const t of (tasks || [])) {
      const key = t.assigned_to || 'Unassigned';
      if (!operatorGroups[key]) operatorGroups[key] = [];
      operatorGroups[key].push(t);
    }
    const shiftLabel = SHIFT_OPTIONS.find(s => s.value === selectedShift)?.label || selectedShift;
    const dateFormatted = new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
    });

    return (
      <div className="print-daily-tasks p-4">
        <div className="text-center mb-6 border-b-2 border-gray-900 pb-4">
          <h1 className="text-2xl font-bold">Kefir Kultures Inc.</h1>
          <h2 className="text-lg font-semibold mt-1">Daily Task Checklist</h2>
          <p className="text-sm mt-1">{dateFormatted} &mdash; {shiftLabel} Shift</p>
        </div>
        {Object.entries(operatorGroups).map(([opName, opTasks]) => {
          const displayName = operators?.find(o => o.username === opName)?.display_name || opName;
          return (
            <div key={opName} className="mb-8 print-break-inside-avoid">
              <div className="flex items-center justify-between border-b-2 border-gray-700 pb-1 mb-3">
                <h3 className="text-base font-bold">Operator: {displayName}</h3>
              </div>
              <table className="w-full text-sm border-collapse">
                <thead>
                  <tr className="border-b border-gray-400">
                    <th className="text-left py-1.5 w-8">#</th>
                    <th className="text-left py-1.5 w-6 pr-2"><span className="inline-block w-3.5 h-3.5 border border-gray-600"></span></th>
                    <th className="text-left py-1.5">Task</th>
                    <th className="text-left py-1.5">Category</th>
                    <th className="text-left py-1.5 w-32">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {opTasks.map((task, idx) => (
                    <tr key={task.id} className="border-b border-gray-200">
                      <td className="py-1.5 text-gray-600">{idx + 1}</td>
                      <td className="py-1.5 pr-2"><span className="inline-block w-3.5 h-3.5 border border-gray-600"></span></td>
                      <td className="py-1.5">
                        <span className="font-medium">{task.task_name}</span>
                        {task.sop_reference && <span className="text-xs text-gray-500 ml-2">({task.sop_reference})</span>}
                      </td>
                      <td className="py-1.5 text-gray-600 text-xs">{task.category}</td>
                      <td className="py-1.5"></td>
                    </tr>
                  ))}
                  {[1, 2, 3].map(i => (
                    <tr key={`empty-${i}`} className="border-b border-gray-200">
                      <td className="py-3 text-gray-400">{opTasks.length + i}</td>
                      <td className="py-3 pr-2"><span className="inline-block w-3.5 h-3.5 border border-gray-300"></span></td>
                      <td className="py-3"></td><td className="py-3"></td><td className="py-3"></td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="mt-6 flex justify-between items-end">
                <div><p className="text-xs text-gray-500 mb-1">Signature:</p><div className="w-48 border-b border-gray-600"></div></div>
                <div><p className="text-xs text-gray-500 mb-1">Date/Time:</p><div className="w-36 border-b border-gray-600"></div></div>
              </div>
            </div>
          );
        })}
        <button onClick={() => setShowPrintView(false)} className="no-print fixed top-4 right-4 bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium">Cancel Print</button>
      </div>
    );
  }

  // ──── MAIN VIEW ────
  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <ClipboardList className="w-8 h-8 text-teal-600" />
            Daily Tasks
          </h1>
          <p className="text-gray-600 mt-2">Operator daily checklist and task tracking</p>
        </div>
        <div className="flex items-center gap-2">
          {isSupervisor && (
            <>
              {/* Load Template dropdown */}
              <div className="relative">
                <button
                  onClick={() => setShowTemplateDropdown(!showTemplateDropdown)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  Load Template
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showTemplateDropdown && (
                  <div className="absolute right-0 mt-1 w-64 bg-white rounded-xl shadow-lg border border-gray-200 z-20 overflow-hidden">
                    <div className="p-2 border-b border-gray-100">
                      <p className="text-xs font-medium text-gray-500 px-2">Available Templates</p>
                    </div>
                    {(!templates || templates.length === 0) ? (
                      <div className="px-4 py-3 text-sm text-gray-400">No templates saved yet</div>
                    ) : (
                      <div className="max-h-48 overflow-y-auto">
                        {templates.map(tpl => (
                          <button
                            key={tpl.id}
                            onClick={() => handleLoadTemplate(tpl.id)}
                            disabled={templateLoading}
                            className="w-full text-left px-4 py-2.5 hover:bg-gray-50 transition-colors border-b border-gray-50 last:border-0"
                          >
                            <p className="text-sm font-medium text-gray-900">{tpl.template_name}</p>
                            {tpl.description && <p className="text-xs text-gray-500 mt-0.5">{tpl.description}</p>}
                            <p className="text-[10px] text-gray-400 mt-0.5">by {tpl.created_by}</p>
                          </button>
                        ))}
                      </div>
                    )}
                    <div className="border-t border-gray-100 p-1">
                      <button onClick={() => { setShowTemplateDropdown(false); }} className="w-full text-left px-3 py-2 text-xs text-gray-500 hover:bg-gray-50 rounded-lg">
                        Close
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Save as Template */}
              <button
                onClick={() => setShowSaveTemplate(true)}
                className="flex items-center gap-1.5 px-3 py-2 bg-purple-50 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-100 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Save Template
              </button>
            </>
          )}

          {isSupervisor && (
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button onClick={() => setView('checklist')} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'checklist' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                <ClipboardList className="w-4 h-4 inline mr-1" /> Checklist
              </button>
              <button onClick={() => setView('kanban')} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'kanban' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                <LayoutGrid className="w-4 h-4 inline mr-1" /> Assign
              </button>
              <button onClick={() => { setView('supervisor'); refetchSummary?.(); }} className={`px-3 py-2 rounded-lg text-sm font-medium transition-colors ${view === 'supervisor' ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
                <Eye className="w-4 h-4 inline mr-1" /> Supervisor
              </button>
            </div>
          )}
          <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors no-print">
            <Printer className="w-4 h-4" /> Print
          </button>
        </div>
      </div>

      {/* Save Template Modal */}
      {showSaveTemplate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setShowSaveTemplate(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Save as Template</h3>
              <button onClick={() => setShowSaveTemplate(false)} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-sm text-gray-500 mb-4">Save the current {totalTasks} task(s) as a reusable template.</p>
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Template Name</label>
                <input type="text" value={templateName} onChange={e => setTemplateName(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="e.g., Standard Production Day" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Description (optional)</label>
                <input type="text" value={templateDesc} onChange={e => setTemplateDesc(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="Brief description..." />
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setShowSaveTemplate(false)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={handleSaveAsTemplate} disabled={!templateName.trim() || templateLoading}
                className="px-4 py-2 text-sm bg-purple-600 text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50">
                {templateLoading ? 'Saving...' : 'Save Template'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin Override / Unlock Modal */}
      {overrideModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center" onClick={() => setOverrideModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="w-5 h-5 text-amber-500" />
              <h3 className="text-lg font-semibold text-gray-900">
                {overrideModal.action === 'unlock' ? 'Unlock Completion' : 'Admin Override'}
              </h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">
              {overrideModal.action === 'unlock'
                ? `Unlock "${overrideModal.taskName}" so it can be modified?`
                : `Override completion for "${overrideModal.taskName}"?`}
            </p>
            {overrideModal.action === 'override' && (
              <div className="space-y-3 mb-4">
                <div>
                  <label className="text-sm font-medium text-gray-700">Status</label>
                  <select value={overrideStatus} onChange={e => setOverrideStatus(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm">
                    <option value="done">Done</option>
                    <option value="skipped">Skipped</option>
                    <option value="na">N/A</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Notes</label>
                  <input type="text" value={overrideNotes} onChange={e => setOverrideNotes(e.target.value)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm" />
                </div>
              </div>
            )}
            <div>
              <label className="text-sm font-medium text-red-600">Reason (required)</label>
              <input type="text" value={overrideReason} onChange={e => setOverrideReason(e.target.value)}
                className="mt-1 w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Why is this change needed?" />
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button onClick={() => setOverrideModal(null)} className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg">Cancel</button>
              <button onClick={submitAdminAction} disabled={!overrideReason.trim()}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg font-medium hover:bg-red-700 disabled:opacity-50">
                {overrideModal.action === 'unlock' ? 'Unlock' : 'Override'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ──── KANBAN VIEW ──── */}
      {view === 'kanban' && isSupervisor ? (
        <div>
          <p className="text-sm text-gray-500 mb-4">Drag task cards between operator columns to assign. Click an operator name to open their focus view.</p>
          <div className="flex gap-4 overflow-x-auto pb-4" style={{ minHeight: '60vh' }}>
            <KanbanColumn
              columnKey="__unassigned" title="Unassigned"
              icon={<Users className="w-4 h-4 text-gray-400" />}
              tasks={kanbanColumns.__unassigned || []}
              isOver={dragOverColumn === '__unassigned'}
              onDragStart={handleDragStart} onDragEnd={handleDragEnd}
              onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
              headerColor="bg-gray-100 text-gray-700"
            />
            {(operators || []).map((op, idx) => {
              const colors = ['bg-teal-100 text-teal-800','bg-blue-100 text-blue-800','bg-amber-100 text-amber-800','bg-indigo-100 text-indigo-800','bg-green-100 text-green-800','bg-rose-100 text-rose-800'];
              return (
                <KanbanColumn key={op.username} columnKey={op.username}
                  title={op.display_name || op.username} subtitle={op.role}
                  icon={<User className="w-4 h-4" />}
                  tasks={kanbanColumns[op.username] || []}
                  isOver={dragOverColumn === op.username}
                  onDragStart={handleDragStart} onDragEnd={handleDragEnd}
                  onDragOver={handleDragOver} onDragLeave={handleDragLeave} onDrop={handleDrop}
                  headerColor={colors[idx % colors.length]}
                  onTitleClick={() => setFocusOperator(op)}
                />
              );
            })}
          </div>
        </div>
      ) : view === 'checklist' ? (
        <>
          {/* Date & Shift Selector + Operator Focus buttons */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex flex-wrap gap-4 items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gray-400" />
                  <input type="date" value={selectedDate}
                    onChange={(e) => { setSelectedDate(e.target.value); setLocalCompletions({}); setLocalNotes({}); }}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                  {selectedDate === today && <span className="text-xs font-medium px-2 py-0.5 bg-teal-100 text-teal-700 rounded-full">Today</span>}
                </div>
                <div className="flex items-center gap-1">
                  {SHIFT_OPTIONS.map(s => (
                    <button key={s.value}
                      onClick={() => { setSelectedShift(s.value); setLocalCompletions({}); setLocalNotes({}); }}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${selectedShift === s.value ? s.color + ' ring-1 ring-offset-1' : 'text-gray-500 hover:bg-gray-100'}`}>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-sm text-gray-500">
                  <span className="font-semibold text-gray-900">{completedCount}</span> / {totalTasks} tasks
                </div>
                <div className="w-32 bg-gray-200 rounded-full h-2">
                  <div className="h-2 rounded-full bg-teal-500 transition-all" style={{ width: totalTasks > 0 ? `${(completedCount / totalTasks) * 100}%` : '0%' }} />
                </div>
                {hasUnsavedNotes && (
                  <button onClick={handleSaveProgress} disabled={savingProgress}
                    className="flex items-center gap-1.5 px-3 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 disabled:opacity-50 transition-colors">
                    <Save className="w-4 h-4" /> {savingProgress ? 'Saving...' : 'Save Progress'}
                  </button>
                )}
                <button onClick={handleSaveAll} disabled={saving || !hasUnsaved}
                  className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 disabled:opacity-50 transition-colors">
                  <CheckCircle className="w-4 h-4" /> {saving ? 'Saving...' : 'Complete & Save'}
                </button>
              </div>
            </div>

            {/* Operator focus buttons */}
            {operators && operators.length > 0 && (
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500 font-medium">Focus View:</span>
                {operators.map(op => (
                  <button key={op.username} onClick={() => setFocusOperator(op)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-gray-50 hover:bg-teal-50 text-gray-700 hover:text-teal-700 rounded-lg text-xs font-medium transition-colors border border-gray-200 hover:border-teal-300">
                    <Maximize2 className="w-3 h-3" /> {op.display_name || op.username}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Task groups */}
          {compLoading ? (
            <LoadingSpinner message="Loading completions..." />
          ) : (
            <div className="space-y-6">
              {CATEGORY_ORDER.map(category => {
                const catTasks = groupedTasks[category];
                if (!catTasks || catTasks.length === 0) return null;
                const cat = getCat(category);
                const catCompleted = catTasks.filter(t => getEffectiveStatus(t.id)).length;

                return (
                  <div key={category}>
                    <div className={`flex items-center justify-between px-4 py-2.5 rounded-t-xl ${cat.headerBg} ${cat.headerText}`}>
                      <h2 className="font-semibold text-sm uppercase tracking-wide">{category}</h2>
                      <span className="text-xs font-medium">{catCompleted}/{catTasks.length}</span>
                    </div>
                    <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 border-t-0 divide-y divide-gray-100">
                      {catTasks.map(task => {
                        const effectiveStatus = getEffectiveStatus(task.id);
                        const myComp = getMyCompletion(task.id);
                        const locked = isTaskLocked(task.id);
                        const isDone = effectiveStatus === 'done';
                        const noteValue = localNotes[task.id] !== undefined ? localNotes[task.id] : (myComp?.notes || '');
                        const assignedOp = operators?.find(o => o.username === task.assigned_to);
                        const allComps = getAllCompletions(task.id);

                        return (
                          <div key={task.id}
                            className="flex items-start gap-3 px-4 py-3 transition-colors border-l-4"
                            style={{
                              borderLeftColor: cat.border,
                              backgroundColor: isDone ? cat.bg : 'transparent',
                            }}
                          >
                            {/* Checkbox */}
                            <button
                              onClick={() => handleToggleTask(task.id, effectiveStatus)}
                              disabled={locked && !isAdmin}
                              className={`mt-0.5 flex-shrink-0 ${
                                locked ? 'text-green-600 cursor-not-allowed' :
                                isDone ? 'text-green-600' :
                                'text-gray-300 hover:text-green-500'
                              }`}
                            >
                              {locked ? <Lock className="w-5 h-5" /> : isDone ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                            </button>

                            {/* Task info */}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-medium ${isDone ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                  {task.task_name}
                                </span>
                                {task.frequency !== 'daily' && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded">
                                    {task.frequency === 'per_shift' ? 'Per Shift' : 'Weekly'}
                                  </span>
                                )}
                                {assignedOp && (
                                  <span className="text-[10px] font-medium px-1.5 py-0.5 bg-teal-50 text-teal-700 rounded flex items-center gap-0.5">
                                    <User className="w-2.5 h-2.5" /> {assignedOp.display_name || assignedOp.username}
                                  </span>
                                )}
                              </div>
                              {task.description && <p className="text-xs text-gray-500 mt-0.5">{task.description}</p>}
                              {task.sop_reference && <span className="text-[10px] text-blue-600 font-medium mt-0.5 inline-block">{task.sop_reference}</span>}

                              {/* Locked completion display */}
                              {locked && myComp && (
                                <div className="flex items-center gap-2 mt-1.5 text-xs">
                                  <span className="flex items-center gap-1 text-green-600 font-medium">
                                    <CheckCircle className="w-3.5 h-3.5" />
                                    Done at {formatTime(myComp.completed_at)} by {myComp.completed_by}
                                  </span>
                                  {myComp.notes && <span className="text-gray-500 italic">— {myComp.notes}</span>}
                                  {myComp.admin_modified_by && (
                                    <span className="text-amber-600 flex items-center gap-0.5">
                                      <AlertTriangle className="w-3 h-3" /> Modified by {myComp.admin_modified_by}
                                    </span>
                                  )}
                                </div>
                              )}

                              {/* Editable status + notes (only if not locked) */}
                              {!locked && (
                                <div className="flex items-center gap-2 mt-1.5">
                                  <select value={effectiveStatus || ''}
                                    onChange={(e) => handleSetStatus(task.id, e.target.value || null)}
                                    className="text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-500">
                                    <option value="">Not done</option>
                                    <option value="done">Done</option>
                                    <option value="skipped">Skipped</option>
                                    <option value="na">N/A</option>
                                  </select>
                                  <input type="text" value={noteValue}
                                    onChange={(e) => handleNoteChange(task.id, e.target.value)}
                                    className="flex-1 text-xs border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-500"
                                    placeholder="Notes..." />
                                </div>
                              )}
                            </div>

                            {/* Right side — verification + admin actions */}
                            <div className="flex-shrink-0 text-right space-y-1">
                              {myComp && !locked && (
                                <div className="text-[10px] text-gray-400">{formatTime(myComp.completed_at)}</div>
                              )}
                              {myComp?.verified_by ? (
                                <div className="flex items-center gap-1 text-[10px] text-green-600">
                                  <Shield className="w-3 h-3" /> {myComp.verified_by}
                                </div>
                              ) : (
                                isSupervisor && myComp && locked && (
                                  <button onClick={() => handleVerify(myComp.id)}
                                    className="text-[10px] text-blue-600 hover:text-blue-800 font-medium">Verify</button>
                                )
                              )}

                              {/* Admin unlock + override buttons */}
                              {isAdmin && locked && myComp && (
                                <div className="flex items-center gap-1 mt-1">
                                  <button onClick={() => handleAdminUnlock(myComp.id, task.task_name)}
                                    className="text-[10px] text-amber-600 hover:text-amber-800 font-medium flex items-center gap-0.5"
                                    title="Unlock this completion">
                                    <Unlock className="w-3 h-3" /> Unlock
                                  </button>
                                  <button onClick={() => handleAdminOverride({ ...myComp, task_name: task.task_name })}
                                    className="text-[10px] text-red-600 hover:text-red-800 font-medium flex items-center gap-0.5"
                                    title="Override this completion">
                                    <Shield className="w-3 h-3" /> Override
                                  </button>
                                </div>
                              )}

                              {/* Show all completions by other operators */}
                              {allComps.filter(c => c.completed_by !== user?.username).map(c => (
                                <div key={c.id} className="text-[10px] text-gray-400">
                                  {c.completed_by}: {c.status} at {formatTime(c.completed_at)}
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {/* Show uncategorized tasks */}
              {Object.keys(groupedTasks).filter(c => !CATEGORY_ORDER.includes(c)).map(category => {
                const catTasks = groupedTasks[category];
                if (!catTasks || catTasks.length === 0) return null;
                const cat = getCat(category);
                const catCompleted = catTasks.filter(t => getEffectiveStatus(t.id)).length;
                return (
                  <div key={category}>
                    <div className={`flex items-center justify-between px-4 py-2.5 rounded-t-xl ${cat.headerBg} ${cat.headerText}`}>
                      <h2 className="font-semibold text-sm uppercase tracking-wide">{category}</h2>
                      <span className="text-xs font-medium">{catCompleted}/{catTasks.length}</span>
                    </div>
                    <div className="bg-white rounded-b-xl shadow-sm border border-gray-200 border-t-0 divide-y divide-gray-100">
                      {catTasks.map(task => {
                        const effectiveStatus = getEffectiveStatus(task.id);
                        const isDone = effectiveStatus === 'done';
                        const locked = isTaskLocked(task.id);
                        const myComp = getMyCompletion(task.id);
                        const noteValue = localNotes[task.id] !== undefined ? localNotes[task.id] : (myComp?.notes || '');
                        return (
                          <div key={task.id} className="flex items-start gap-3 px-4 py-3 border-l-4"
                            style={{ borderLeftColor: cat.border, backgroundColor: isDone ? cat.bg : 'transparent' }}>
                            <button onClick={() => handleToggleTask(task.id, effectiveStatus)} disabled={locked && !isAdmin}
                              className={`mt-0.5 flex-shrink-0 ${locked ? 'text-green-600 cursor-not-allowed' : isDone ? 'text-green-600' : 'text-gray-300 hover:text-green-500'}`}>
                              {locked ? <Lock className="w-5 h-5" /> : isDone ? <CheckSquare className="w-5 h-5" /> : <Square className="w-5 h-5" />}
                            </button>
                            <div className="flex-1 min-w-0">
                              <span className={`text-sm font-medium ${isDone ? 'text-gray-500 line-through' : 'text-gray-900'}`}>{task.task_name}</span>
                              {locked && myComp ? (
                                <div className="flex items-center gap-2 mt-1.5 text-xs">
                                  <span className="flex items-center gap-1 text-green-600 font-medium">
                                    <CheckCircle className="w-3.5 h-3.5" /> Done at {formatTime(myComp.completed_at)} by {myComp.completed_by}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 mt-1.5">
                                  <select value={effectiveStatus || ''} onChange={(e) => handleSetStatus(task.id, e.target.value || null)}
                                    className="text-xs border border-gray-200 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-500">
                                    <option value="">Not done</option><option value="done">Done</option><option value="skipped">Skipped</option><option value="na">N/A</option>
                                  </select>
                                  <input type="text" value={noteValue} onChange={(e) => handleNoteChange(task.id, e.target.value)}
                                    className="flex-1 text-xs border border-gray-200 rounded px-2 py-0.5 focus:outline-none focus:ring-1 focus:ring-teal-500" placeholder="Notes..." />
                                </div>
                              )}
                            </div>
                            {isAdmin && locked && myComp && (
                              <div className="flex items-center gap-1">
                                <button onClick={() => handleAdminUnlock(myComp.id, task.task_name)} className="text-[10px] text-amber-600 hover:text-amber-800 font-medium flex items-center gap-0.5">
                                  <Unlock className="w-3 h-3" /> Unlock
                                </button>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      ) : (
        /* ──── SUPERVISOR VIEW ──── */
        <>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-gray-400" />
                <input type="date" value={historyFrom} onChange={(e) => setHistoryFrom(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
                <span className="text-gray-400">to</span>
                <input type="date" value={historyTo} onChange={(e) => setHistoryTo(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500" />
              </div>
              <button onClick={() => refetchSummary?.()} className="px-3 py-2 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700">
                <Filter className="w-4 h-4 inline mr-1" /> View
              </button>
            </div>
          </div>
          {summaryLoading ? (
            <LoadingSpinner message="Loading summary..." />
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50">
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Date</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Shift</th>
                    <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Operator</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Completed</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Skipped</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">N/A</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Verified</th>
                    <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {(summary || []).length === 0 ? (
                    <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-500">No completions found for this date range</td></tr>
                  ) : (
                    (summary || []).map((row, i) => {
                      const pct = row.total_tasks > 0 ? Math.round((row.completed / row.total_tasks) * 100) : 0;
                      const shiftInfo = SHIFT_OPTIONS.find(s => s.value === row.shift) || SHIFT_OPTIONS[0];
                      return (
                        <tr key={i} className="hover:bg-gray-50/50">
                          <td className="px-4 py-3 text-sm font-medium text-gray-900">{row.date}</td>
                          <td className="px-4 py-3"><span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${shiftInfo.color}`}>{shiftInfo.label}</span></td>
                          <td className="px-4 py-3 text-sm text-gray-700">{row.completed_by}</td>
                          <td className="px-4 py-3 text-center"><span className="text-sm font-medium text-green-600">{row.completed}</span></td>
                          <td className="px-4 py-3 text-center"><span className="text-sm text-amber-600">{row.skipped}</span></td>
                          <td className="px-4 py-3 text-center"><span className="text-sm text-gray-400">{row.na}</span></td>
                          <td className="px-4 py-3 text-center"><span className={`text-sm font-medium ${row.verified > 0 ? 'text-green-600' : 'text-gray-400'}`}>{row.verified}</span></td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-20 bg-gray-200 rounded-full h-1.5">
                                <div className={`h-1.5 rounded-full ${pct === 100 ? 'bg-green-500' : pct > 50 ? 'bg-teal-500' : 'bg-amber-500'}`} style={{ width: `${pct}%` }} />
                              </div>
                              <span className="text-xs text-gray-500 w-8">{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ──── KANBAN COLUMN COMPONENT ────
function KanbanColumn({ columnKey, title, subtitle, icon, tasks, isOver, onDragStart, onDragEnd, onDragOver, onDragLeave, onDrop, headerColor, onTitleClick }) {
  return (
    <div
      className={`flex-shrink-0 w-72 flex flex-col rounded-xl border transition-all ${isOver ? 'border-teal-400 bg-teal-50/30 shadow-md ring-2 ring-teal-200' : 'border-gray-200 bg-gray-50/50'}`}
      onDragOver={(e) => onDragOver(e, columnKey)}
      onDragLeave={(e) => onDragLeave(e, columnKey)}
      onDrop={(e) => onDrop(e, columnKey)}
    >
      <div className={`flex items-center gap-2 px-3 py-2.5 rounded-t-xl ${headerColor}`}>
        {icon}
        <div className="flex-1 min-w-0">
          {onTitleClick ? (
            <button onClick={onTitleClick} className="text-sm font-semibold truncate hover:underline text-left">
              {title}
            </button>
          ) : (
            <h3 className="text-sm font-semibold truncate">{title}</h3>
          )}
          {subtitle && <span className="text-[10px] opacity-70">{subtitle}</span>}
        </div>
        <span className="text-xs font-bold bg-white/50 px-1.5 py-0.5 rounded-full">{tasks.length}</span>
      </div>
      <div className="flex-1 p-2 space-y-2 overflow-y-auto" style={{ minHeight: '120px', maxHeight: '70vh' }}>
        {tasks.length === 0 && (
          <div className="flex items-center justify-center h-20 text-xs text-gray-400 border-2 border-dashed border-gray-200 rounded-lg">Drop tasks here</div>
        )}
        {tasks.map(task => {
          const cat = getCat(task.category);
          return (
            <div key={task.id} draggable onDragStart={(e) => onDragStart(e, task)} onDragEnd={onDragEnd}
              className="bg-white rounded-lg border border-gray-200 p-2.5 shadow-sm cursor-grab active:cursor-grabbing hover:shadow-md transition-shadow group border-l-4"
              style={{ borderLeftColor: cat.border }}>
              <div className="flex items-start gap-2">
                <GripVertical className="w-3.5 h-3.5 text-gray-300 mt-0.5 flex-shrink-0 group-hover:text-gray-500" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 leading-snug">{task.task_name}</p>
                  <div className="flex items-center gap-1.5 mt-1.5">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${cat.dot}`}></span>
                    <span className="text-[10px] text-gray-500 truncate">{task.category}</span>
                    {task.frequency !== 'daily' && (
                      <span className="text-[10px] px-1 py-0 bg-gray-100 text-gray-500 rounded ml-auto">
                        {task.frequency === 'per_shift' ? 'Shift' : 'Wkly'}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
