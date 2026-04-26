import React from 'react';
import { Link } from 'react-router-dom';
import {
  FileText, CheckCircle, AlertTriangle, XCircle, Clock,
  ChevronRight, Shield, TrendingUp, AlertCircle, FileCheck, BarChart3, Users, Activity,
  GitPullRequest, AlertOctagon
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


      {/* QMS Module Overview */}
      {dashboard?.qms && (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {[
            { label: 'Complaints', total: dashboard.qms.complaints.total, open: dashboard.qms.complaints.open, color: 'text-orange-600', bg: 'bg-orange-50', link: '/complaints' },
            { label: 'CCRs', total: dashboard.qms.ccrs.total, open: dashboard.qms.ccrs.open, color: 'text-blue-600', bg: 'bg-blue-50', link: '/ccrs' },
            { label: 'CAPAs', total: dashboard.qms.capas.total, open: dashboard.qms.capas.open, color: 'text-green-600', bg: 'bg-green-50', link: '/capas' },
            { label: 'Deviations', total: dashboard.qms.deviations.total, open: dashboard.qms.deviations.open, color: 'text-red-600', bg: 'bg-red-50', link: '/deviations' },
            { label: 'Change Requests', total: dashboard.qms.changeRequests.total, open: dashboard.qms.changeRequests.open, color: 'text-purple-600', bg: 'bg-purple-50', link: '/change-requests' },
            { label: 'Suppliers', total: dashboard.qms.suppliers.total, open: dashboard.qms.suppliers.approved, color: 'text-cyan-600', bg: 'bg-cyan-50', link: '/suppliers', openLabel: 'approved' },
          ].map(mod => (
            <Link key={mod.label} to={mod.link} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{mod.label}</p>
              <p className={`text-2xl font-bold ${mod.color} mt-1`}>{mod.total}</p>
              <p className="text-xs text-gray-400 mt-1">{mod.open} {mod.openLabel || 'open'}</p>
            </Link>
          ))}
        </div>
      )}

      {/* Upcoming Deadlines */}
      {dashboard?.deadlines?.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-amber-50 p-2.5 rounded-lg">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Upcoming Deadlines</h2>
              <p className="text-xs text-gray-500">Next 10 action items by due date</p>
            </div>
          </div>
          <div className="space-y-2">
            {dashboard.deadlines.map((item, i) => {
              const daysLeft = Math.ceil((new Date(item.deadline) - new Date()) / (1000 * 60 * 60 * 24));
              const isOverdue = daysLeft < 0;
              const isUrgent = daysLeft >= 0 && daysLeft <= 7;
              const typeColors = { CAPA: 'bg-green-100 text-green-700', CR: 'bg-purple-100 text-purple-700', DEV: 'bg-red-100 text-red-700' };
              return (
                <Link key={i} to={item.type === 'CAPA' ? '/capas' : item.type === 'CR' ? '/change-requests' : '/deviations'}
                  className={`flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-gray-50 ${isOverdue ? 'bg-red-50 border-red-200' : isUrgent ? 'bg-amber-50 border-amber-200' : 'border-gray-100'}`}>
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`flex-shrink-0 px-2 py-0.5 rounded text-[10px] font-bold ${typeColors[item.type] || 'bg-gray-100 text-gray-600'}`}>{item.type}</span>
                    <span className="text-xs font-medium text-gray-500">{item.ref_id}</span>
                    <span className="text-sm text-gray-900 truncate">{item.title?.slice(0, 50)}</span>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                    <span className={`text-xs font-semibold ${isOverdue ? 'text-red-600' : isUrgent ? 'text-amber-600' : 'text-gray-500'}`}>
                      {isOverdue ? `${Math.abs(daysLeft)}d overdue` : daysLeft === 0 ? 'Today' : `${daysLeft}d left`}
                    </span>
                    <span className="text-xs text-gray-400">{item.deadline}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

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

      {/* QMS Decision Guide */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <details className="group">
          <summary className="flex items-center gap-3 mb-4 cursor-pointer list-none">
            <div className="bg-indigo-50 p-2.5 rounded-lg">
              <FileText className="w-5 h-5 text-indigo-600" />
            </div>
            <div className="flex-1">
              <h2 className="text-lg font-bold text-gray-900">QMS Decision Guide</h2>
              <p className="text-xs text-gray-500">Which module to use and when — click to expand</p>
            </div>
            <ChevronRight className="w-5 h-5 text-gray-400 transition-transform group-open:rotate-90" />
          </summary>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          {/* Complaint */}
          <Link to="/complaints" className="block p-4 rounded-lg border-2 border-orange-200 bg-orange-50 hover:bg-orange-100 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <AlertCircle className="w-5 h-5 text-orange-600" />
              <h3 className="font-bold text-orange-800">Complaint</h3>
            </div>
            <p className="text-sm text-orange-700 mb-2">A customer or retailer reported a problem with the product.</p>
            <p className="text-xs text-orange-600 font-medium">Examples: taste issues, packaging damage, illness report, foreign material found</p>
          </Link>

          {/* CCR */}
          <Link to="/ccrs" className="block p-4 rounded-lg border-2 border-blue-200 bg-blue-50 hover:bg-blue-100 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <FileCheck className="w-5 h-5 text-blue-600" />
              <h3 className="font-bold text-blue-800">CCR</h3>
            </div>
            <p className="text-sm text-blue-700 mb-2">Complaint investigation reveals a safety concern, illness, foreign material, or recurring pattern.</p>
            <p className="text-xs text-blue-600 font-medium">Triggered by: critical/high severity complaints, multiple complaints on same issue, regulatory concern</p>
          </Link>

          {/* CAPA */}
          <Link to="/capas" className="block p-4 rounded-lg border-2 border-green-200 bg-green-50 hover:bg-green-100 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="w-5 h-5 text-green-600" />
              <h3 className="font-bold text-green-800">CAPA</h3>
            </div>
            <p className="text-sm text-green-700 mb-2">Root cause analysis shows a systemic issue needing a permanent fix and prevention plan.</p>
            <p className="text-xs text-green-600 font-medium">Triggered by: CCR findings, audit observations, deviation patterns, SOP/GMP gaps</p>
          </Link>

          {/* Change Control */}
          <Link to="/change-requests" className="block p-4 rounded-lg border-2 border-purple-200 bg-purple-50 hover:bg-purple-100 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <GitPullRequest className="w-5 h-5 text-purple-600" />
              <h3 className="font-bold text-purple-800">Change Control</h3>
            </div>
            <p className="text-sm text-purple-700 mb-2">You want to intentionally change a process, supplier, equipment, or document.</p>
            <p className="text-xs text-purple-600 font-medium">Examples: new supplier, recipe change, equipment swap, SOP update, packaging change</p>
          </Link>

          {/* Deviation */}
          <Link to="/deviations" className="block p-4 rounded-lg border-2 border-red-200 bg-red-50 hover:bg-red-100 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <AlertOctagon className="w-5 h-5 text-red-600" />
              <h3 className="font-bold text-red-800">Deviation</h3>
            </div>
            <p className="text-sm text-red-700 mb-2">Something during production deviated from an SOP, spec, or expected procedure.</p>
            <p className="text-xs text-red-600 font-medium">Examples: temperature excursion, wrong ingredient amount, missed cleaning step, equipment malfunction</p>
          </Link>

          {/* Batch Testing */}
          <Link to="/batch-testing" className="block p-4 rounded-lg border-2 border-cyan-200 bg-cyan-50 hover:bg-cyan-100 transition-colors">
            <div className="flex items-center gap-2 mb-2">
              <Activity className="w-5 h-5 text-cyan-600" />
              <h3 className="font-bold text-cyan-800">Batch Testing</h3>
            </div>
            <p className="text-sm text-cyan-700 mb-2">Record and review quality test results for each production batch.</p>
            <p className="text-xs text-cyan-600 font-medium">Tests: pH, coliform, E. coli, Salmonella, yeast & mold, seal integrity</p>
          </Link>
        </div>

        {/* Decision Flow */}
        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
          <h3 className="text-sm font-bold text-gray-700 mb-3">Decision Flow: Something Happened — What Do I Do?</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-orange-100 text-orange-700 flex items-center justify-center text-xs font-bold">1</span>
              <p className="text-gray-700"><strong>Customer/retailer reports a problem?</strong> → Open a <span className="text-orange-700 font-semibold">Complaint</span>. Investigate and document findings.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-bold">2</span>
              <p className="text-gray-700"><strong>Investigation reveals safety/health risk or recurring pattern?</strong> → Escalate to a <span className="text-blue-700 font-semibold">CCR</span>. Not every complaint needs one — only safety, illness, foreign material, or trends.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-bold">3</span>
              <p className="text-gray-700"><strong>Root cause is systemic and needs a permanent fix?</strong> → Create a <span className="text-green-700 font-semibold">CAPA</span>. Define corrective + preventive actions, assign responsibility, verify effectiveness.</p>
            </div>
            <div className="flex items-start gap-3 pt-2 border-t border-gray-200">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 text-red-700 flex items-center justify-center text-xs font-bold">!</span>
              <p className="text-gray-700"><strong>Production deviated from procedure?</strong> → File a <span className="text-red-700 font-semibold">Deviation</span> immediately. Assess impact, determine if product can be released or must be held.</p>
            </div>
            <div className="flex items-start gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-xs font-bold">Δ</span>
              <p className="text-gray-700"><strong>Planning an intentional change?</strong> → Submit a <span className="text-purple-700 font-semibold">Change Request</span> before making any modification. Must be approved before implementation.</p>
            </div>
          </div>
        </div>
        </details>
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
