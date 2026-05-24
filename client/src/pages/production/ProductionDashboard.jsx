import React from 'react';
import { Link } from 'react-router-dom';
import {
  Factory, Beaker, ClipboardList, Droplets, ListTodo, FileSpreadsheet,
  CheckCircle, Clock, Activity, ChevronRight,
} from 'lucide-react';
import { useFetch } from '../../hooks/useApi';
import LoadingSpinner from '../../components/LoadingSpinner';

const FERMENTATION_STATUS_STYLES = {
  planned:    'bg-gray-100 text-gray-700 border-gray-200',
  fermenting: 'bg-blue-100 text-blue-800 border-blue-200',
  ready:      'bg-green-100 text-green-800 border-green-200',
  used:       'bg-purple-100 text-purple-700 border-purple-200',
  discarded:  'bg-red-100 text-red-700 border-red-200',
};

const ORDER_STATUS_STYLES = {
  planned:     'bg-gray-100 text-gray-700 border-gray-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  flavouring:  'bg-amber-100 text-amber-800 border-amber-200',
  pouring:     'bg-cyan-100 text-cyan-800 border-cyan-200',
  packing:     'bg-indigo-100 text-indigo-800 border-indigo-200',
  qa_hold:     'bg-orange-100 text-orange-800 border-orange-200',
  released:    'bg-green-100 text-green-800 border-green-200',
  shipped:     'bg-emerald-100 text-emerald-800 border-emerald-200',
  cancelled:   'bg-red-100 text-red-700 border-red-200',
};

const TASK_STATUS_STYLES = {
  pending:     'bg-gray-100 text-gray-700 border-gray-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  done:        'bg-green-100 text-green-800 border-green-200',
};

function Badge({ map, value }) {
  const cls = map[value] || 'bg-gray-100 text-gray-600 border-gray-200';
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${cls}`}>
      {(value || '').replace(/_/g, ' ')}
    </span>
  );
}

export default function ProductionDashboard() {
  const { data, loading, error } = useFetch('/api/production/dashboard');

  if (loading) return <LoadingSpinner message="Loading production overview..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;

  const fermActive = data?.fermentation_active || { count: 0, list: [] };
  const fermReady = data?.fermentation_ready || { count: 0, list: [] };
  const ordersToday = data?.orders_today || { count: 0, list: [] };
  const ordersInProgress = data?.orders_in_progress || { count: 0, list: [] };
  const poursToday = data?.pours_today || { count: 0, list: [] };
  const tasksToday = data?.tasks_today || { count: 0, list: [] };
  const recentActivity = data?.recent_activity || [];

  const cards = [
    { label: 'Fermenting', value: fermActive.count, icon: Beaker, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', link: '/production/fermentation' },
    { label: 'Ready', value: fermReady.count, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', link: '/production/fermentation' },
    { label: 'Orders Today', value: ordersToday.count, icon: ClipboardList, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-100', link: '/production/orders' },
    { label: 'Pours Today', value: poursToday.count, icon: Droplets, color: 'text-cyan-600', bg: 'bg-cyan-50', border: 'border-cyan-100', link: '/production/pouring' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <p className="text-sm text-gray-500 font-medium">Production</p>
        <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
          <Factory className="w-8 h-8 text-navy-600" />
          Production Dashboard
        </h1>
      </div>

      {/* Top KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {cards.map(c => (
          <Link key={c.label} to={c.link} className={`bg-white rounded-xl shadow-sm border ${c.border} p-5 hover:shadow-md transition-shadow`}>
            <div className={`${c.bg} p-2.5 rounded-lg inline-block`}>
              <c.icon className={`w-5 h-5 ${c.color}`} />
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-3">{c.value}</p>
            <p className="text-sm text-gray-500 mt-1">{c.label}</p>
          </Link>
        ))}
      </div>

      {/* Active fermentation batches */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-blue-50 p-2.5 rounded-lg">
              <Beaker className="w-5 h-5 text-blue-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Active Fermentation Batches</h2>
          </div>
          <Link to="/production/fermentation" className="text-sm text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1">
            View all <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        {fermActive.list.length === 0 ? (
          <p className="text-sm text-gray-400">No active fermentation batches</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Batch Code</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Culture</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Vessel</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Start</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Expected Ready</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">pH</th>
                  <th className="px-4 py-2.5 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {fermActive.list.map(f => (
                  <tr key={f.id} className="hover:bg-gray-50">
                    <td className="px-4 py-2.5 text-sm font-medium text-navy-700">{f.batch_code}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-700">{f.culture_type}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600">{f.vessel || '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600">{f.start_date?.slice(0, 10) || '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600">{f.expected_ready_date?.slice(0, 10) || '—'}</td>
                    <td className="px-4 py-2.5 text-sm text-gray-600">{f.actual_ph ?? f.target_ph ?? '—'}</td>
                    <td className="px-4 py-2.5"><Badge map={FERMENTATION_STATUS_STYLES} value={f.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Today's production orders */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 p-2.5 rounded-lg">
                <ClipboardList className="w-5 h-5 text-indigo-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Today's Production Orders</h2>
            </div>
            <Link to="/production/orders" className="text-sm text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {ordersToday.list.length === 0 ? (
            <p className="text-sm text-gray-400">No production orders planned for today</p>
          ) : (
            <div className="space-y-2">
              {ordersToday.list.map(o => (
                <div key={o.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-gray-200">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-navy-700">{o.order_number}</p>
                    <p className="text-xs text-gray-500">
                      SKU #{o.sku_id} · Batch: {o.fermentation_batch_code || '—'}
                    </p>
                  </div>
                  <Badge map={ORDER_STATUS_STYLES} value={o.status} />
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Today's production tasks */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="bg-amber-50 p-2.5 rounded-lg">
                <ListTodo className="w-5 h-5 text-amber-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Today's Production Tasks</h2>
            </div>
            <Link to="/production/taskboard" className="text-sm text-navy-600 hover:text-navy-800 font-medium flex items-center gap-1">
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          {tasksToday.list.length === 0 ? (
            <p className="text-sm text-gray-400">No tasks scheduled for today</p>
          ) : (
            <div className="space-y-2">
              {tasksToday.list.map(t => (
                <div key={t.id} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg hover:border-gray-200">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{t.task}</p>
                    <p className="text-xs text-gray-500">
                      {t.section ? `${t.section} · ` : ''}{t.assigned_to || 'Unassigned'}
                    </p>
                  </div>
                  <Badge map={TASK_STATUS_STYLES} value={t.status} />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent production activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-purple-50 p-2.5 rounded-lg">
            <Activity className="w-5 h-5 text-purple-600" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">Recent Production Activity</h2>
        </div>
        {recentActivity.length === 0 ? (
          <p className="text-sm text-gray-400">No recent activity</p>
        ) : (
          <div className="space-y-1 max-h-96 overflow-y-auto">
            {recentActivity.map(row => (
              <div key={row.id} className="flex items-center gap-3 py-2 px-2 border-b border-gray-50 last:border-0 text-sm">
                <Clock className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-400 w-32 flex-shrink-0">{row.timestamp?.slice(0, 19).replace('T', ' ')}</span>
                <span className="text-xs font-medium text-gray-700 w-24 flex-shrink-0">{row.username}</span>
                <span className="text-xs uppercase font-semibold text-gray-500 w-24 flex-shrink-0">{row.action}</span>
                <span className="text-xs text-gray-500 truncate flex-1">
                  <span className="text-gray-400">{row.resource_type}</span> {row.resource_name || `#${row.resource_id}`}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
