import React, { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useFetch, apiPut } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import { ListTodo, CalendarDays, User, ShieldCheck, CheckCircle2 } from 'lucide-react';

const STATUS_COLORS = {
  pending: 'bg-gray-100 text-gray-600 border-gray-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  overdue: 'bg-red-100 text-red-700 border-red-200',
};
const STATUS_NEXT = { pending: 'in_progress', in_progress: 'completed', completed: 'pending', overdue: 'in_progress' };

function isOverdue(t) {
  return t.status !== 'completed' && t.due_date && t.due_date < new Date().toISOString().slice(0, 10);
}

export default function MyTasks() {
  const { canWrite } = useAuth();
  const [scope, setScope] = useState('mine'); // 'mine' | 'all'
  const [statusFilter, setStatusFilter] = useState('open'); // 'open' | 'all' | 'pending' | 'in_progress' | 'completed'
  const [assignee, setAssignee] = useState('');

  const url = scope === 'mine' ? '/api/action-items?mine=true' : '/api/action-items';
  const { data: tasks, loading, refetch } = useFetch(url, [scope]);

  const assignees = useMemo(() => {
    if (!tasks) return [];
    return [...new Set(tasks.map(t => t.assigned_to).filter(Boolean))].sort();
  }, [tasks]);

  const filtered = useMemo(() => {
    if (!tasks) return [];
    return tasks.filter(t => {
      if (assignee && t.assigned_to !== assignee) return false;
      if (statusFilter === 'open') return t.status !== 'completed';
      if (statusFilter === 'all') return true;
      return t.status === statusFilter;
    });
  }, [tasks, statusFilter, assignee]);

  const advance = async (t) => {
    const next = STATUS_NEXT[t.status] || 'pending';
    try {
      await apiPut(`/api/capas/${t.capa_id}/action-items/${t.id}`, { status: next });
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  if (loading) return <LoadingSpinner />;

  const openCount = (tasks || []).filter(t => t.status !== 'completed').length;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6">
      <div className="flex items-center gap-3 mb-1">
        <ListTodo className="w-7 h-7 text-indigo-500" />
        <h1 className="text-2xl font-bold text-gray-800">My Tasks</h1>
        <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-100 text-indigo-700">{openCount} open</span>
      </div>
      <p className="text-sm text-gray-500 mb-5">CAPA action items assigned across all corrective &amp; preventive actions.</p>

      <div className="flex flex-wrap items-center gap-2 mb-4">
        <div className="inline-flex rounded-lg border border-gray-200 overflow-hidden">
          <button onClick={() => setScope('mine')} className={`px-3 py-1.5 text-sm font-medium ${scope === 'mine' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Mine</button>
          <button onClick={() => setScope('all')} className={`px-3 py-1.5 text-sm font-medium ${scope === 'all' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}>Everyone</button>
        </div>

        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg">
          <option value="open">Open (not completed)</option>
          <option value="pending">Pending</option>
          <option value="in_progress">In progress</option>
          <option value="completed">Completed</option>
          <option value="all">All statuses</option>
        </select>

        {scope === 'all' && assignees.length > 0 && (
          <select value={assignee} onChange={e => setAssignee(e.target.value)} className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg">
            <option value="">All people</option>
            {assignees.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 opacity-40" />
          <p className="text-sm">No tasks match the current filter.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(t => {
            const overdue = isOverdue(t);
            const status = overdue ? 'overdue' : t.status;
            return (
              <div key={t.id} className="border border-gray-200 rounded-lg p-3 bg-white hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2 min-w-0">
                    <button
                      onClick={() => canWrite() && advance(t)}
                      disabled={!canWrite()}
                      title={canWrite() ? 'Click to advance status' : ''}
                      className={`shrink-0 mt-0.5 px-2 py-0.5 rounded-full text-[11px] font-semibold border ${canWrite() ? 'cursor-pointer' : ''} ${STATUS_COLORS[status]}`}
                    >
                      {status.replace(/_/g, ' ')}
                    </button>
                    <div className="min-w-0">
                      <div className={`text-sm font-medium ${t.status === 'completed' ? 'line-through text-gray-400' : 'text-gray-800'}`}>{t.title}</div>
                      <Link to={`/capas/${t.capa_id}`} className="inline-flex items-center gap-1 mt-1 text-xs text-indigo-600 hover:underline">
                        <ShieldCheck className="w-3 h-3" /> {t.capa_ref || `CAPA #${t.capa_id}`}
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0 text-xs text-gray-500">
                    {t.due_date && (
                      <span className={`flex items-center gap-1 ${overdue ? 'text-red-600 font-semibold' : ''}`}>
                        <CalendarDays className="w-3 h-3" /> {t.due_date}
                      </span>
                    )}
                    <span className="flex items-center gap-1"><User className="w-3 h-3" /> {t.assigned_to}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
