import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch, apiPut, apiPost } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  LayoutDashboard, ListTodo, ShieldCheck, Wrench, ClipboardList, CalendarDays,
  Package, Beaker, Clock, AlertTriangle, CheckCircle, Play, ChevronDown,
  ChevronRight, Settings, Eye, EyeOff, GripVertical, Activity, Send,
  ArrowRight, RefreshCw, Star, Filter, Zap, BarChart3, TrendingUp,
  Undo, Circle, X
} from 'lucide-react';

const PRIORITY_COLORS = {
  low: 'bg-gray-100 text-gray-600',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-amber-100 text-amber-700',
  critical: 'bg-red-100 text-red-700',
  emergency: 'bg-red-100 text-red-700',
  routine: 'bg-gray-100 text-gray-600',
};

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-600',
  in_progress: 'bg-blue-100 text-blue-700',
  completed: 'bg-green-100 text-green-700',
  overdue: 'bg-red-100 text-red-700',
  open: 'bg-amber-100 text-amber-700',
  on_hold: 'bg-purple-100 text-purple-700',
};

const MODULE_PATHS = {
  capa: '/capas', deviation: '/deviations', complaint: '/complaints', change_request: '/change-requests',
  batch_test: '/batch-testing', equipment: '/equipment', work_order: '/work-orders',
  recall: '/recalls', supplier: '/suppliers', sop: '/sops', pm_schedule: '/maintenance',
  traceability: '/traceability-exercises', general: null, pick_list: '/pick-lists',
  planner_batch: '/planner/batches',
};

const MODULE_LABELS = {
  capa: 'CAPA', deviation: 'Deviation', complaint: 'Complaint', change_request: 'Change Request',
  batch_test: 'Batch Test', equipment: 'Equipment', pm_schedule: 'PM Schedule',
  work_order: 'Work Order', recall: 'Recall', supplier: 'Supplier', sop: 'SOP',
  traceability: 'Traceability', general: 'General', pick_list: 'Pick List',
  planner_batch: 'Batch',
};

const WIDGET_CONFIG = {
  stats: { label: 'Overview Stats', icon: BarChart3, color: 'indigo' },
  operator_tasks: { label: 'Assigned Tasks', icon: ListTodo, color: 'indigo' },
  capa_items: { label: 'CAPA Action Items', icon: ShieldCheck, color: 'emerald' },
  pm_tasks: { label: 'Preventive Maintenance', icon: Wrench, color: 'orange' },
  work_orders: { label: 'Work Orders', icon: ClipboardList, color: 'purple' },
  daily_tasks: { label: 'Daily Tasks', icon: CalendarDays, color: 'sky' },
  pick_lists: { label: 'Pick Lists', icon: Package, color: 'teal' },
  batches: { label: 'Production Batches', icon: Beaker, color: 'pink' },
  activity: { label: 'Recent Activity', icon: Activity, color: 'gray' },
};

function formatDate(d) {
  if (!d) return '';
  return new Date(d).toLocaleDateString('en-CA');
}

function formatTime(d) {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
}

function timeAgo(d) {
  if (!d) return '';
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

// ─── Stats Overview Widget ──────────────────────────────────────────────────
function StatsWidget({ stats }) {
  if (!stats) return null;
  const cards = [
    { label: 'Active Items', value: stats.total_active, icon: Zap, color: 'text-indigo-600', bg: 'bg-indigo-50' },
    { label: 'Overdue', value: stats.overdue, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50', highlight: stats.overdue > 0 },
    { label: 'Due This Week', value: stats.due_this_week, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Completed Today', value: stats.completed_today, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map(c => (
        <div key={c.label} className={`bg-white rounded-xl shadow-sm border p-4 ${c.highlight ? 'border-red-300 ring-1 ring-red-100' : 'border-gray-200'}`}>
          <div className="flex items-center gap-2 mb-1">
            <div className={`p-1.5 rounded-lg ${c.bg}`}><c.icon className={`w-4 h-4 ${c.color}`} /></div>
            <span className="text-xs font-medium text-gray-500 uppercase">{c.label}</span>
          </div>
          <p className={`text-2xl font-bold ${c.highlight ? 'text-red-600' : 'text-gray-900'}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Module Breakdown Bar ───────────────────────────────────────────────────
function ModuleBreakdown({ stats }) {
  if (!stats) return null;
  const modules = [
    { key: 'operator_tasks', label: 'Tasks', count: stats.operator_tasks?.active || 0, color: 'bg-indigo-500' },
    { key: 'capa_items', label: 'CAPA', count: stats.capa_items?.active || 0, color: 'bg-emerald-500' },
    { key: 'pm_tasks', label: 'PM', count: stats.pm_tasks?.due || 0, color: 'bg-orange-500' },
    { key: 'work_orders', label: 'WO', count: stats.work_orders?.active || 0, color: 'bg-purple-500' },
    { key: 'daily_tasks', label: 'Daily', count: stats.daily_tasks?.assigned - stats.daily_tasks?.completed_today || 0, color: 'bg-sky-500' },
    { key: 'pick_lists', label: 'Picks', count: stats.pick_lists?.active || 0, color: 'bg-teal-500' },
    { key: 'batches', label: 'Batches', count: stats.batches?.active || 0, color: 'bg-pink-500' },
  ].filter(m => m.count > 0);

  const total = modules.reduce((a, m) => a + m.count, 0);
  if (total === 0) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <p className="text-xs font-medium text-gray-500 uppercase mb-3">Workload by Module</p>
      <div className="flex rounded-full overflow-hidden h-3 bg-gray-100">
        {modules.map(m => (
          <div key={m.key} className={`${m.color} transition-all`} style={{ width: `${(m.count / total) * 100}%` }} title={`${m.label}: ${m.count}`} />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 mt-2">
        {modules.map(m => (
          <div key={m.key} className="flex items-center gap-1.5">
            <div className={`w-2.5 h-2.5 rounded-full ${m.color}`} />
            <span className="text-xs text-gray-600">{m.label} ({m.count})</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Operator Tasks Widget ──────────────────────────────────────────────────
function OperatorTasksWidget({ tasks, onStatusChange, navigate }) {
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [confirmTask, setConfirmTask] = useState(null);
  const [undoInfo, setUndoInfo] = useState(null);
  const active = (tasks || []).filter(t => t.status !== 'completed');
  if (active.length === 0) return <EmptyWidget message="No active tasks" />;

  const handleStatusSelect = (task, newStatus) => {
    setDropdownOpen(null);
    if (newStatus === 'completed') {
      setConfirmTask(task);
    } else {
      onStatusChange(task.id, newStatus);
    }
  };

  const handleConfirmComplete = () => {
    const task = confirmTask;
    setConfirmTask(null);
    const prevStatus = task.status;
    onStatusChange(task.id, 'completed');
    setUndoInfo({ task, prevStatus, message: `"${task.title}" completed` });
  };

  const handleUndo = () => {
    if (!undoInfo) return;
    onStatusChange(undoInfo.task.id, undoInfo.prevStatus);
    setUndoInfo(null);
  };

  return (
    <div className="space-y-2">
      {active.slice(0, 10).map(task => (
        <div key={task.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
          {task.status === 'pending' && (
            <button onClick={() => handleStatusSelect(task, 'in_progress')} className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100 flex-shrink-0" title="Start">
              <Play className="w-3.5 h-3.5" />
            </button>
          )}
          {(task.status === 'in_progress' || task.status === 'overdue') && (
            <button onClick={() => setConfirmTask(task)} className="p-1 rounded bg-green-50 text-green-600 hover:bg-green-100 flex-shrink-0" title="Complete">
              <CheckCircle className="w-3.5 h-3.5" />
            </button>
          )}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {task.linked_module && task.linked_module !== 'general' && (
                <span className="text-[11px] text-indigo-600 font-medium">{MODULE_LABELS[task.linked_module]} #{task.linked_record_id}</span>
              )}
              {task.due_date && (
                <span className={`text-[11px] ${task.status === 'overdue' ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
                  Due: {formatDate(task.due_date)}
                </span>
              )}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${PRIORITY_COLORS[task.priority] || ''}`}>{task.priority}</span>
            <div className="relative">
              <button onClick={() => setDropdownOpen(dropdownOpen === task.id ? null : task.id)}
                className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${STATUS_COLORS[task.status] || 'bg-gray-100 text-gray-600'}`}>
                {task.status?.replace('_', ' ')} ▾
              </button>
              {dropdownOpen === task.id && (
                <StatusDropdown current={task.status} onSelect={(s) => handleStatusSelect(task, s)} onClose={() => setDropdownOpen(null)} />
              )}
            </div>
          </div>
          {MODULE_PATHS[task.linked_module] && (
            <button onClick={() => navigate(`${MODULE_PATHS[task.linked_module]}/${task.linked_record_id}`)} className="p-1 text-gray-400 hover:text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      ))}
      {active.length > 10 && <p className="text-xs text-gray-500 text-center pt-2">+{active.length - 10} more tasks</p>}
      {confirmTask && <ConfirmCompleteDialog title={confirmTask.title} onConfirm={handleConfirmComplete} onCancel={() => setConfirmTask(null)} />}
      {undoInfo && <UndoToast message={undoInfo.message} onUndo={handleUndo} onDismiss={() => setUndoInfo(null)} />}
    </div>
  );
}

// ─── Status Dropdown (shared) ──────────────────────────────────────────────
const ALL_STATUSES = [
  { value: 'pending', label: 'Pending', icon: Circle, color: 'text-amber-600', bg: 'bg-amber-50 hover:bg-amber-100' },
  { value: 'in_progress', label: 'In Progress', icon: Play, color: 'text-blue-600', bg: 'bg-blue-50 hover:bg-blue-100' },
  { value: 'completed', label: 'Completed', icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50 hover:bg-green-100' },
];

function StatusDropdown({ current, onSelect, onClose }) {
  const ref = React.useRef(null);
  useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose(); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [onClose]);

  return (
    <div ref={ref} className="absolute left-0 top-full mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-[140px]">
      {ALL_STATUSES.filter(s => s.value !== current).map(s => {
        const Icon = s.icon;
        return (
          <button key={s.value} onClick={() => onSelect(s.value)}
            className={`w-full flex items-center gap-2 px-3 py-1.5 text-xs font-medium ${s.color} hover:bg-gray-50 transition-colors`}>
            <Icon className="w-3.5 h-3.5" />
            {s.label}
          </button>
        );
      })}
    </div>
  );
}

// ─── Confirm Complete Dialog ───────────────────────────────────────────────
function ConfirmCompleteDialog({ title, onConfirm, onCancel }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/30" onClick={onCancel}>
      <div className="bg-white rounded-xl shadow-xl p-5 max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <p className="text-sm font-semibold text-gray-900 mb-1">Complete this task?</p>
        <p className="text-xs text-gray-600 mb-4 truncate">"{title}"</p>
        <div className="flex justify-end gap-2">
          <button onClick={onCancel} className="px-3 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200">Cancel</button>
          <button onClick={onConfirm} className="px-3 py-1.5 text-xs font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 flex items-center gap-1">
            <CheckCircle className="w-3.5 h-3.5" /> Complete
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Undo Toast ────────────────────────────────────────────────────────────
function UndoToast({ message, onUndo, onDismiss }) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, 6000);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] bg-gray-900 text-white px-4 py-2.5 rounded-lg shadow-xl flex items-center gap-3 animate-slide-up">
      <span className="text-sm">{message}</span>
      <button onClick={onUndo} className="flex items-center gap-1 text-sm font-semibold text-amber-400 hover:text-amber-300">
        <Undo className="w-3.5 h-3.5" /> Undo
      </button>
      <button onClick={onDismiss} className="text-gray-400 hover:text-white ml-1">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ─── CAPA Action Items Widget ───────────────────────────────────────────────
function CAPAItemsWidget({ items, onStatusChange, navigate }) {
  const [dropdownOpen, setDropdownOpen] = useState(null);
  const [confirmItem, setConfirmItem] = useState(null);
  const [undoInfo, setUndoInfo] = useState(null);
  const active = (items || []).filter(t => t.status !== 'completed');
  if (active.length === 0) return <EmptyWidget message="No active CAPA action items" />;

  const handleStatusSelect = (item, newStatus) => {
    setDropdownOpen(null);
    if (newStatus === 'completed') {
      setConfirmItem(item);
    } else {
      onStatusChange(item.capa_id, item.id, newStatus);
    }
  };

  const handleConfirmComplete = () => {
    const item = confirmItem;
    setConfirmItem(null);
    const prevStatus = item.status;
    onStatusChange(item.capa_id, item.id, 'completed');
    setUndoInfo({ item, prevStatus, message: `"${item.title}" completed` });
  };

  const handleUndo = () => {
    if (!undoInfo) return;
    onStatusChange(undoInfo.item.capa_id, undoInfo.item.id, undoInfo.prevStatus);
    setUndoInfo(null);
  };

  return (
    <div className="space-y-2">
      {active.slice(0, 8).map(item => (
        <div key={item.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
          <div className="relative flex-shrink-0">
            {item.status === 'pending' && (
              <button onClick={() => handleStatusSelect(item, 'in_progress')} className="p-1 rounded bg-blue-50 text-blue-600 hover:bg-blue-100" title="Start">
                <Play className="w-3.5 h-3.5" />
              </button>
            )}
            {(item.status === 'in_progress' || item.computed_overdue) && (
              <button onClick={() => setConfirmItem(item)} className="p-1 rounded bg-green-50 text-green-600 hover:bg-green-100" title="Complete">
                <CheckCircle className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{item.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-emerald-600 font-medium">{item.capa_number}</span>
              <span className="text-[11px] text-gray-500 truncate">{item.capa_title}</span>
            </div>
          </div>
          <div className="relative flex-shrink-0">
            <button onClick={() => setDropdownOpen(dropdownOpen === item.id ? null : item.id)}
              className={`px-1.5 py-0.5 rounded text-[10px] font-bold cursor-pointer ${STATUS_COLORS[item.status] || 'bg-gray-100 text-gray-600'}`}>
              {item.status?.replace('_', ' ')} ▾
            </button>
            {dropdownOpen === item.id && (
              <StatusDropdown current={item.status} onSelect={(s) => handleStatusSelect(item, s)} onClose={() => setDropdownOpen(null)} />
            )}
          </div>
          {item.due_date && (
            <span className={`text-[11px] whitespace-nowrap ${item.computed_overdue ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
              {formatDate(item.due_date)}
            </span>
          )}
          <button onClick={() => navigate(`/capas/${item.capa_id}`)} className="p-1 text-gray-400 hover:text-emerald-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      {active.length > 8 && <p className="text-xs text-gray-500 text-center pt-2">+{active.length - 8} more items</p>}
      {confirmItem && <ConfirmCompleteDialog title={confirmItem.title} onConfirm={handleConfirmComplete} onCancel={() => setConfirmItem(null)} />}
      {undoInfo && <UndoToast message={undoInfo.message} onUndo={handleUndo} onDismiss={() => setUndoInfo(null)} />}
    </div>
  );
}

// ─── PM Tasks Widget ────────────────────────────────────────────────────────
function PMTasksWidget({ schedules, navigate }) {
  if (!schedules || schedules.length === 0) return <EmptyWidget message="No PM tasks assigned" />;

  return (
    <div className="space-y-2">
      {schedules.slice(0, 8).map(pm => (
        <div key={pm.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
          <div className={`p-1.5 rounded-lg flex-shrink-0 ${pm.computed_overdue ? 'bg-red-50' : 'bg-orange-50'}`}>
            <Wrench className={`w-3.5 h-3.5 ${pm.computed_overdue ? 'text-red-600' : 'text-orange-600'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{pm.task_name}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-orange-600 font-medium">{pm.equipment_code}</span>
              <span className="text-[11px] text-gray-500">{pm.equipment_name}</span>
              {pm.category && <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{pm.category}</span>}
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <span className={`text-[11px] block ${pm.computed_overdue ? 'text-red-600 font-bold' : 'text-gray-500'}`}>
              {pm.computed_overdue ? 'OVERDUE' : 'Next due'}
            </span>
            <span className="text-[11px] text-gray-700">{formatDate(pm.next_due_date)}</span>
          </div>
          <button onClick={() => navigate(`/equipment/${pm.equipment_id}`)} className="p-1 text-gray-400 hover:text-orange-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Work Orders Widget ─────────────────────────────────────────────────────
function WorkOrdersWidget({ orders, navigate }) {
  if (!orders || orders.length === 0) return <EmptyWidget message="No active work orders" />;

  return (
    <div className="space-y-2">
      {orders.slice(0, 6).map(wo => (
        <div key={wo.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
          <div className={`p-1.5 rounded-lg flex-shrink-0 ${wo.priority === 'emergency' ? 'bg-red-50' : 'bg-purple-50'}`}>
            <ClipboardList className={`w-3.5 h-3.5 ${wo.priority === 'emergency' ? 'text-red-600' : 'text-purple-600'}`} />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{wo.title || wo.work_order_number}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-purple-600 font-medium">{wo.work_order_number}</span>
              {wo.equipment_name && <span className="text-[11px] text-gray-500">{wo.equipment_name}</span>}
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${PRIORITY_COLORS[wo.priority] || ''}`}>{wo.priority}</span>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_COLORS[wo.status] || ''}`}>{wo.status?.replace('_', ' ')}</span>
          </div>
          <button onClick={() => navigate(`/work-orders/${wo.id}`)} className="p-1 text-gray-400 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Daily Tasks Widget ─────────────────────────────────────────────────────
function DailyTasksWidget({ tasks, completions }) {
  if (!tasks || tasks.length === 0) return <EmptyWidget message="No daily tasks assigned" />;

  const completedIds = new Set((completions || []).map(c => c.daily_task_id));

  return (
    <div className="space-y-2">
      {tasks.map(task => {
        const isDone = completedIds.has(task.id);
        return (
          <div key={task.id} className={`flex items-center gap-3 p-3 rounded-lg transition-colors ${isDone ? 'bg-green-50' : 'bg-gray-50 hover:bg-gray-100'}`}>
            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${isDone ? 'border-green-500 bg-green-500' : 'border-gray-300'}`}>
              {isDone && <CheckCircle className="w-3.5 h-3.5 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${isDone ? 'text-green-700 line-through' : 'text-gray-900'}`}>{task.task_name}</p>
              {task.category && <span className="text-[11px] text-gray-500">{task.category}</span>}
            </div>
            {task.frequency && (
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-50 text-sky-600 font-medium">{task.frequency}</span>
            )}
          </div>
        );
      })}
      <div className="text-center pt-2">
        <span className="text-xs text-gray-500">
          {completedIds.size}/{tasks.length} completed today
        </span>
      </div>
    </div>
  );
}

// ─── Pick Lists Widget ──────────────────────────────────────────────────────
function PickListsWidget({ lists, navigate }) {
  if (!lists || lists.length === 0) return <EmptyWidget message="No active pick lists" />;

  return (
    <div className="space-y-2">
      {lists.slice(0, 5).map(pl => (
        <div key={pl.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
          <div className="p-1.5 rounded-lg bg-teal-50 flex-shrink-0">
            <Package className="w-3.5 h-3.5 text-teal-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{pl.sales_order_number}</p>
            <div className="flex items-center gap-2 mt-0.5">
              {pl.customer_name && <span className="text-[11px] text-gray-500">{pl.customer_name}</span>}
              {pl.pick_date && <span className="text-[11px] text-gray-500">Pick: {formatDate(pl.pick_date)}</span>}
            </div>
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_COLORS[pl.status] || 'bg-gray-100 text-gray-600'}`}>{pl.status}</span>
          <button onClick={() => navigate(`/pick-lists/${pl.id}`)} className="p-1 text-gray-400 hover:text-teal-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Planner Batches Widget ─────────────────────────────────────────────────
function BatchesWidget({ batches, navigate }) {
  if (!batches || batches.length === 0) return <EmptyWidget message="No active batches" />;

  return (
    <div className="space-y-2">
      {batches.slice(0, 5).map(b => (
        <div key={b.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors group">
          <div className="p-1.5 rounded-lg bg-pink-50 flex-shrink-0">
            <Beaker className="w-3.5 h-3.5 text-pink-600" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{b.batch_number} — {b.sku}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-[11px] text-gray-500">Production: {formatDate(b.production_date)}</span>
              {b.estimated_cases && <span className="text-[11px] text-gray-500">{b.estimated_cases} cases</span>}
            </div>
          </div>
          <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${STATUS_COLORS[b.status] || 'bg-gray-100 text-gray-600'}`}>{b.status?.replace('_', ' ')}</span>
          <button onClick={() => navigate(`/planner/batches/${b.id}`)} className="p-1 text-gray-400 hover:text-pink-600 opacity-0 group-hover:opacity-100 transition-opacity">
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Activity Feed Widget ───────────────────────────────────────────────────
function ActivityWidget({ activity }) {
  if (!activity || activity.length === 0) return <EmptyWidget message="No recent activity" />;

  const actionLabels = {
    create: 'Created', update: 'Updated', delete: 'Deleted', login: 'Logged in',
    create_operator_task: 'Created task', update_operator_task: 'Updated task',
    status_change_operator_task: 'Changed status',
  };

  return (
    <div className="space-y-1">
      {activity.slice(0, 15).map(a => (
        <div key={a.id} className="flex items-center gap-3 py-2 px-3 hover:bg-gray-50 rounded-lg transition-colors">
          <div className="w-1.5 h-1.5 rounded-full bg-gray-300 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-gray-700">
              <span className="font-medium">{actionLabels[a.action] || a.action}</span>
              {' '}
              <span className="text-gray-500">{a.resource_type?.replace('_', ' ')}</span>
              {a.resource_name && <span className="text-gray-900 font-medium"> — {a.resource_name}</span>}
            </p>
          </div>
          <span className="text-[10px] text-gray-400 whitespace-nowrap">{timeAgo(a.timestamp)}</span>
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ────────────────────────────────────────────────────────────
function EmptyWidget({ message }) {
  return (
    <div className="text-center py-6 text-gray-400">
      <CheckCircle className="w-8 h-8 mx-auto mb-2 text-green-200" />
      <p className="text-sm">{message}</p>
    </div>
  );
}

// ─── Widget Wrapper ─────────────────────────────────────────────────────────
function WidgetCard({ id, config, children, onToggle, isCustomizing }) {
  const [collapsed, setCollapsed] = useState(false);
  const Icon = config.icon;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2">
          {isCustomizing && <GripVertical className="w-4 h-4 text-gray-300 cursor-grab" />}
          <div className={`p-1.5 rounded-lg bg-${config.color}-50`}>
            <Icon className={`w-4 h-4 text-${config.color}-600`} />
          </div>
          <h3 className="text-sm font-semibold text-gray-900">{config.label}</h3>
        </div>
        <div className="flex items-center gap-1">
          {isCustomizing && (
            <button onClick={() => onToggle(id)} className="p-1 text-gray-400 hover:text-red-500">
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          )}
          <button onClick={() => setCollapsed(!collapsed)} className="p-1 text-gray-400 hover:text-gray-600">
            {collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>
      {!collapsed && <div className="p-4">{children}</div>}
    </div>
  );
}

// ─── Settings Panel ─────────────────────────────────────────────────────────
function SettingsPanel({ preferences, onUpdate, onClose }) {
  const allWidgets = Object.keys(WIDGET_CONFIG);

  const toggleWidget = (id) => {
    const visible = preferences.visible_widgets.includes(id)
      ? preferences.visible_widgets.filter(w => w !== id)
      : [...preferences.visible_widgets, id];
    onUpdate({ ...preferences, visible_widgets: visible });
  };

  return (
    <div className="fixed inset-0 bg-black/30 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6" onClick={e => e.stopPropagation()}>
        <h2 className="text-lg font-bold text-gray-900 mb-4">Customize Dashboard</h2>
        <p className="text-sm text-gray-500 mb-4">Toggle which sections appear on your dashboard.</p>
        <div className="space-y-2">
          {allWidgets.map(id => {
            const cfg = WIDGET_CONFIG[id];
            const Icon = cfg.icon;
            const isVisible = preferences.visible_widgets.includes(id);
            return (
              <button
                key={id}
                onClick={() => toggleWidget(id)}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg border transition-colors ${isVisible ? 'border-indigo-200 bg-indigo-50' : 'border-gray-200 bg-gray-50 opacity-60'}`}
              >
                <Icon className={`w-4 h-4 ${isVisible ? 'text-indigo-600' : 'text-gray-400'}`} />
                <span className={`text-sm font-medium ${isVisible ? 'text-indigo-900' : 'text-gray-500'}`}>{cfg.label}</span>
                <div className="ml-auto">
                  {isVisible ? <Eye className="w-4 h-4 text-indigo-500" /> : <EyeOff className="w-4 h-4 text-gray-400" />}
                </div>
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3 mt-6">
          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={preferences.compact_mode}
              onChange={(e) => onUpdate({ ...preferences, compact_mode: e.target.checked })}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
            />
            Compact mode
          </label>
          <div className="flex-1" />
          <button onClick={onClose} className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard Component ───────────────────────────────────────────────
export default function OperatorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { data, loading, error, refetch } = useFetch('/api/operator-dashboard/unified');
  const [preferences, setPreferences] = useState(null);
  const [showSettings, setShowSettings] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Load preferences from localStorage (instant) + server (persistent)
  useEffect(() => {
    const stored = localStorage.getItem(`dashboard_prefs_${user?.username}`);
    if (stored) {
      setPreferences(JSON.parse(stored));
    } else {
      setPreferences({
        visible_widgets: ['stats', 'operator_tasks', 'capa_items', 'pm_tasks', 'work_orders', 'daily_tasks', 'pick_lists', 'batches', 'activity'],
        widget_order: ['stats', 'operator_tasks', 'capa_items', 'pm_tasks', 'work_orders', 'daily_tasks', 'pick_lists', 'batches', 'activity'],
        compact_mode: false,
      });
    }
  }, [user]);

  const updatePreferences = useCallback((newPrefs) => {
    setPreferences(newPrefs);
    localStorage.setItem(`dashboard_prefs_${user?.username}`, JSON.stringify(newPrefs));
    // Also persist to server (fire and forget)
    apiPut('/api/operator-dashboard/preferences', newPrefs).catch(() => {});
  }, [user]);

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      await apiPut(`/api/operator-tasks/${taskId}/status`, { status: newStatus });
      refetch();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleCAPAItemStatusChange = async (capaId, itemId, newStatus) => {
    try {
      await apiPut(`/api/capas/${capaId}/action-items/${itemId}`, { status: newStatus });
      refetch();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await refetch();
    setTimeout(() => setRefreshing(false), 500);
  };

  if (loading || !preferences) return <LoadingSpinner message="Loading your dashboard..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;

  const {
    stats, operator_tasks, capa_action_items, pm_schedules,
    work_orders, daily_tasks, daily_completions, pick_lists,
    planner_batches, recent_activity
  } = data || {};

  const isVisible = (id) => preferences.visible_widgets.includes(id);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-xl">
            <LayoutDashboard className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">My Dashboard</h1>
            <p className="text-sm text-gray-500">
              Welcome back, {user?.display_name || user?.username}. Here's your work across all modules.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRefresh}
            className={`p-2 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors ${refreshing ? 'animate-spin' : ''}`}
            title="Refresh"
          >
            <RefreshCw className="w-4.5 h-4.5" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 border border-gray-200 transition-colors"
          >
            <Settings className="w-4 h-4" />
            Customize
          </button>
        </div>
      </div>

      {/* Stats Overview */}
      {isVisible('stats') && (
        <>
          <StatsWidget stats={stats} />
          <ModuleBreakdown stats={stats} />
        </>
      )}

      {/* Widget Grid */}
      <div className={`grid gap-6 ${preferences.compact_mode ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
        {isVisible('operator_tasks') && (
          <WidgetCard id="operator_tasks" config={WIDGET_CONFIG.operator_tasks}>
            <OperatorTasksWidget tasks={operator_tasks} onStatusChange={handleStatusChange} navigate={navigate} />
          </WidgetCard>
        )}

        {isVisible('capa_items') && (
          <WidgetCard id="capa_items" config={WIDGET_CONFIG.capa_items}>
            <CAPAItemsWidget items={capa_action_items} onStatusChange={handleCAPAItemStatusChange} navigate={navigate} />
          </WidgetCard>
        )}

        {isVisible('pm_tasks') && (
          <WidgetCard id="pm_tasks" config={WIDGET_CONFIG.pm_tasks}>
            <PMTasksWidget schedules={pm_schedules} navigate={navigate} />
          </WidgetCard>
        )}

        {isVisible('work_orders') && (
          <WidgetCard id="work_orders" config={WIDGET_CONFIG.work_orders}>
            <WorkOrdersWidget orders={work_orders} navigate={navigate} />
          </WidgetCard>
        )}

        {isVisible('daily_tasks') && (
          <WidgetCard id="daily_tasks" config={WIDGET_CONFIG.daily_tasks}>
            <DailyTasksWidget tasks={daily_tasks} completions={daily_completions} />
          </WidgetCard>
        )}

        {isVisible('pick_lists') && (
          <WidgetCard id="pick_lists" config={WIDGET_CONFIG.pick_lists}>
            <PickListsWidget lists={pick_lists} navigate={navigate} />
          </WidgetCard>
        )}

        {isVisible('batches') && (
          <WidgetCard id="batches" config={WIDGET_CONFIG.batches}>
            <BatchesWidget batches={planner_batches} navigate={navigate} />
          </WidgetCard>
        )}

        {isVisible('activity') && (
          <WidgetCard id="activity" config={WIDGET_CONFIG.activity}>
            <ActivityWidget activity={recent_activity} />
          </WidgetCard>
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsPanel
          preferences={preferences}
          onUpdate={updatePreferences}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
