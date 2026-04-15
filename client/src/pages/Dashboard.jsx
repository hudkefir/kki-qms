import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, CheckCircle, AlertTriangle, XCircle, Clock,
  ChevronRight, Shield, TrendingUp, AlertCircle, FileCheck, BarChart3, Users, Activity
} from 'lucide-react';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { useFetch } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import { SeverityBadge, ComplaintStatusBadge } from './Complaints';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

function getDaysUntilAudit() {
  const audit = new Date('2026-04-23');
  const now = new Date();
  return Math.max(0, Math.ceil((audit - now) / (1000 * 60 * 60 * 24)));
}

export default function Dashboard() {
  const { user } = useAuth();
  const { data: dashboard, loading: dashLoading, error: dashError } = useFetch('/api/dashboard');
  const { data: sopsData, loading: sopsLoading } = useFetch('/api/sops');
  const { data: qaData, loading: qaLoading } = useFetch('/api/qa-dashboard');
  const { data: auditStats } = useFetch('/api/audit-logs/stats');

  const loading = dashLoading || sopsLoading || qaLoading;
  const sops = sopsData?.sops || sopsData || [];

  if (loading) return <LoadingSpinner message="Loading dashboard..." />;
  if (dashError) {
    return (
      <div className="text-center py-16">
        <XCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
        <p className="text-red-600 font-medium">Failed to load dashboard</p>
        <p className="text-sm text-gray-500 mt-1">{dashError}</p>
      </div>
    );
  }

  const stats = dashboard || {};
  const totalSOPs = stats.totalSops || sops.length || 0;
  const clean = stats.cleanCount || sops.filter(s => s.costco_cleanup_status === 'clean').length || 0;
  const needsStrip = stats.needsCostcoStripCount || sops.filter(s => s.costco_cleanup_status === 'needs_costco_strip').length || 0;
  const notBuilt = stats.notYetBuiltCount || sops.filter(s => s.costco_cleanup_status === 'not_yet_built').length || 0;
  const readiness = totalSOPs > 0 ? Math.round((clean / totalSOPs) * 100) : 0;
  const daysUntil = getDaysUntilAudit();

  const blockers = sops.filter(s => s.costco_cleanup_status === 'not_yet_built');
  const warnings = sops.filter(s => s.costco_cleanup_status === 'needs_costco_strip');

  // Category breakdown
  const categories = {};
  sops.forEach(s => {
    const cat = s.category_name || 'Uncategorized';
    if (!categories[cat]) categories[cat] = { total: 0, clean: 0 };
    categories[cat].total++;
    if (s.costco_cleanup_status === 'clean') categories[cat].clean++;
  });

  const qa = qaData || {};
  const complaints = qa.complaints || {};
  const ccrs = qa.ccrs || {};

  // Trend chart data
  const trendData = complaints.trend && complaints.trend.length > 0 ? {
    labels: complaints.trend.map(t => {
      const [y, m] = t.month.split('-');
      return new Date(y, m - 1).toLocaleString('default', { month: 'short' });
    }),
    datasets: [{
      data: complaints.trend.map(t => t.count),
      borderColor: 'rgba(59, 130, 246, 1)',
      backgroundColor: 'rgba(59, 130, 246, 0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: 3,
      pointBackgroundColor: 'rgba(59, 130, 246, 1)',
    }],
  } : null;

  const trendOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false }, tooltip: { backgroundColor: '#1a2847', cornerRadius: 8 } },
    scales: {
      y: { beginAtZero: true, ticks: { stepSize: 1, font: { size: 10 } }, grid: { color: 'rgba(0,0,0,0.05)' } },
      x: { ticks: { font: { size: 10 } }, grid: { display: false } },
    },
  };

  const sopStatCards = [
    { label: 'Total SOPs', value: totalSOPs, icon: FileText, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    { label: 'Audit Ready', value: clean, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-100', badge: clean > 0 ? 'Clean' : null, badgeColor: 'bg-green-100 text-green-700' },
    { label: 'Needs Costco Strip', value: needsStrip, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100', badge: needsStrip > 0 ? 'Action Needed' : null, badgeColor: 'bg-amber-100 text-amber-700' },
    { label: 'Not Yet Built', value: notBuilt, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', badge: notBuilt > 0 ? 'BLOCKER' : null, badgeColor: 'bg-red-100 text-red-700' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <p className="text-sm text-gray-500 font-medium">Welcome to</p>
        <h1 className="text-3xl font-bold text-gray-900">QMS Dashboard</h1>
      </div>

      {/* SOP Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {sopStatCards.map(card => (
          <div key={card.label} className={`bg-white rounded-xl shadow-sm border ${card.border} p-5 hover:shadow-md transition-shadow`}>
            <div className="flex items-start justify-between">
              <div className={`${card.bg} p-2.5 rounded-lg`}>
                <card.icon className={`w-5 h-5 ${card.color}`} />
              </div>
              {card.badge && (
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide ${card.badgeColor}`}>
                  {card.badge}
                </span>
              )}
            </div>
            <p className="text-3xl font-bold text-gray-900 mt-3">{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Complaint & CCR Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 mb-8">
        <Link to="/complaints" className="bg-white rounded-xl shadow-sm border border-orange-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-orange-500" />
            <span className="text-xs text-gray-500 font-medium">Open Complaints</span>
          </div>
          <p className="text-2xl font-bold text-orange-600">{complaints.open || 0}</p>
        </Link>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertCircle className="w-4 h-4 text-gray-400" />
            <span className="text-xs text-gray-500 font-medium">Total Complaints</span>
          </div>
          <p className="text-2xl font-bold text-gray-900">{complaints.total || 0}</p>
        </div>
        <Link to="/ccrs" className="bg-white rounded-xl shadow-sm border border-blue-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <FileCheck className="w-4 h-4 text-blue-500" />
            <span className="text-xs text-gray-500 font-medium">Open CCRs</span>
          </div>
          <p className="text-2xl font-bold text-blue-600">{ccrs.open || 0}</p>
        </Link>
        <div className="bg-white rounded-xl shadow-sm border border-red-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle className="w-4 h-4 text-red-500" />
            <span className="text-xs text-gray-500 font-medium">Overdue Actions</span>
          </div>
          <p className="text-2xl font-bold text-red-600">{ccrs.overdueActions || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-green-100 p-4">
          <div className="flex items-center gap-2 mb-2">
            <CheckCircle className="w-4 h-4 text-green-500" />
            <span className="text-xs text-gray-500 font-medium">Action Completion</span>
          </div>
          <p className="text-2xl font-bold text-green-600">{ccrs.resolutionRate || 0}%</p>
        </div>
        <Link to="/analytics" className="bg-white rounded-xl shadow-sm border border-purple-100 p-4 hover:shadow-md transition-shadow">
          <div className="flex items-center gap-2 mb-2">
            <BarChart3 className="w-4 h-4 text-purple-500" />
            <span className="text-xs text-gray-500 font-medium">View Analytics</span>
          </div>
          <p className="text-sm font-medium text-purple-600 mt-2">Full Report →</p>
        </Link>
      </div>

      {/* Audit Readiness */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="bg-navy-50 p-2.5 rounded-lg">
              <Shield className="w-5 h-5 text-navy-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Audit Readiness</h2>
              <p className="text-sm text-gray-500">SGS Audit compliance status</p>
            </div>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2">
              <Clock className={`w-4 h-4 ${daysUntil <= 30 ? 'text-red-500' : daysUntil <= 90 ? 'text-amber-500' : 'text-gray-400'}`} />
              <span className={`text-sm font-semibold ${daysUntil <= 30 ? 'text-red-600' : daysUntil <= 90 ? 'text-amber-600' : 'text-gray-600'}`}>
                {daysUntil} days until SGS Audit
              </span>
            </div>
          </div>
        </div>
        <div className="flex items-end gap-6">
          <div>
            <span className={`text-5xl font-bold ${readiness >= 80 ? 'text-green-600' : readiness >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
              {readiness}%
            </span>
          </div>
          <div className="flex-1">
            <div className="w-full bg-gray-100 rounded-full h-4">
              <div
                className={`h-4 rounded-full transition-all duration-500 ${readiness >= 80 ? 'bg-green-500' : readiness >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                style={{ width: `${readiness}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Complaint Trend */}
        {trendData && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-50 p-2.5 rounded-lg">
                <TrendingUp className="w-5 h-5 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">Complaint Trend</h2>
            </div>
            <div className="h-48">
              <Line data={trendData} options={trendOptions} />
            </div>
          </div>
        )}

        {/* Top Affected Products */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-orange-50 p-2.5 rounded-lg">
              <AlertCircle className="w-5 h-5 text-orange-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Top Affected Products</h2>
          </div>
          {(complaints.byProduct || []).length === 0 ? (
            <p className="text-sm text-gray-400">No complaints data</p>
          ) : (
            <div className="space-y-3">
              {complaints.byProduct.map(p => (
                <div key={p.product_sku} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                  <span className="text-sm text-gray-700">{p.product_sku || ''} {p.product_name || 'Unknown Product'}</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    p.count >= 3 ? 'bg-red-100 text-red-700' : p.count >= 2 ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-700'
                  }`}>{p.count}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Top Affected Lots */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-purple-50 p-2.5 rounded-lg">
              <BarChart3 className="w-5 h-5 text-purple-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Top Affected Lots</h2>
          </div>
          {(qa.topLots || []).length === 0 ? (
            <p className="text-sm text-gray-400">No lot data</p>
          ) : (
            <div className="space-y-2">
              {qa.topLots.map(lot => (
                <div key={lot.lot_number} className="flex items-center justify-between p-3 border border-gray-100 rounded-lg">
                  <div>
                    <span className="text-sm font-mono font-medium text-gray-900">{lot.lot_number}</span>
                    <span className="text-xs text-gray-500 ml-2">{lot.product_name}</span>
                  </div>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                    lot.count >= 3 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                  }`}>{lot.count} complaints</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Activity Feed */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-navy-50 p-2.5 rounded-lg">
              <Activity className="w-5 h-5 text-navy-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Activity Feed</h2>
          </div>

          {/* Active Users */}
          {(auditStats?.activeUsers || []).length > 0 && (
            <div className="flex items-center gap-2 mb-3 pb-3 border-b border-gray-100">
              <Users className="w-3.5 h-3.5 text-green-500" />
              <span className="text-xs text-gray-500">Active now:</span>
              {auditStats.activeUsers.slice(0, 5).map(u => (
                <span key={u.username} className="text-xs font-medium text-gray-700 bg-green-50 px-1.5 py-0.5 rounded">{u.username}</span>
              ))}
            </div>
          )}

          {/* Failed Login Alerts */}
          {(auditStats?.failedLogins || []).length > 0 && (
            <div className="bg-red-50 border border-red-100 rounded-lg p-2.5 mb-3">
              <div className="flex items-center gap-1.5 mb-1">
                <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                <span className="text-xs font-semibold text-red-700">Failed Login Attempts (24h)</span>
              </div>
              {auditStats.failedLogins.slice(0, 3).map(f => (
                <div key={f.id} className="text-xs text-red-600 ml-5">
                  {f.details?.reason || 'Failed'} — {f.resource_name || 'unknown'} at {f.timestamp?.slice(11, 19)}
                </div>
              ))}
            </div>
          )}

          {/* Recent Actions */}
          <div className="space-y-1.5 max-h-56 overflow-y-auto">
            {(auditStats?.recentActivity || []).map(a => {
              const isLogin = a.action === 'login' || a.action === 'logout';
              const isCreate = a.action.startsWith('create_');
              const isUpdate = a.action.startsWith('update_');
              const isDelete = a.action.startsWith('delete_');
              const iconColor = isLogin ? 'text-green-500' : isCreate ? 'text-blue-500' : isUpdate ? 'text-amber-500' : isDelete ? 'text-red-500' : 'text-gray-400';

              return (
                <div key={a.id} className="flex items-center justify-between p-2 rounded-lg hover:bg-gray-50">
                  <div className="flex items-center gap-2 min-w-0">
                    <Activity className={`w-3 h-3 flex-shrink-0 ${iconColor}`} />
                    <span className="text-xs font-medium text-gray-700">{a.username}</span>
                    <span className="text-xs text-gray-500">{a.action.replace(/_/g, ' ')}</span>
                    {a.resource_name && <span className="text-xs text-gray-400 truncate max-w-[150px]">{a.resource_name}</span>}
                  </div>
                  <span className="text-[10px] text-gray-400 whitespace-nowrap ml-2">{a.timestamp?.slice(11, 16)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Priority Action Items */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-50 p-2.5 rounded-lg">
              <AlertTriangle className="w-5 h-5 text-red-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Priority Action Items</h2>
          </div>
          {blockers.length === 0 && warnings.length === 0 ? (
            <div className="text-center py-8">
              <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
              <p className="text-sm text-gray-500">All SOPs are audit ready!</p>
            </div>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto">
              {blockers.map(sop => (
                <Link key={sop.id} to={`/sops/${sop.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-red-50 border border-red-100 hover:bg-red-100 transition-colors group">
                  <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{sop.sop_number} - {sop.title}</p>
                    <p className="text-xs text-red-600">Not Yet Built - Requires immediate action</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </Link>
              ))}
              {warnings.map(sop => (
                <Link key={sop.id} to={`/sops/${sop.id}`} className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 border border-amber-100 hover:bg-amber-100 transition-colors group">
                  <AlertTriangle className="w-4 h-4 text-amber-500 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{sop.sop_number} - {sop.title}</p>
                    <p className="text-xs text-amber-600">Needs Costco strip removal</p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-gray-400 group-hover:text-gray-600" />
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Category Breakdown */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-navy-50 p-2.5 rounded-lg">
              <TrendingUp className="w-5 h-5 text-navy-600" />
            </div>
            <h2 className="text-lg font-semibold text-gray-900">Category Breakdown</h2>
          </div>
          {Object.keys(categories).length === 0 ? (
            <div className="text-center py-8">
              <p className="text-sm text-gray-500">No categories found</p>
            </div>
          ) : (
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {Object.entries(categories)
                .sort((a, b) => b[1].total - a[1].total)
                .map(([name, cat]) => {
                  const pct = cat.total > 0 ? Math.round((cat.clean / cat.total) * 100) : 0;
                  return (
                    <div key={name} className="p-3 rounded-lg border border-gray-100 hover:border-gray-200 transition-colors">
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-sm font-medium text-gray-900">{name}</span>
                        <span className="text-xs text-gray-500">{cat.clean}/{cat.total} SOPs ready</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full transition-all ${pct >= 80 ? 'bg-green-500' : pct >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <p className="text-[11px] text-gray-400 mt-1">{pct}% ready</p>
                    </div>
                  );
                })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
