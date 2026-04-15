import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { Home, FileText, ClipboardCheck, Shield, AlertCircle, FileCheck, BarChart3, Users, ScrollText, LogOut, FolderOpen, FlaskConical, ClipboardList } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SOPLibrary from './pages/SOPLibrary';
import SOPDetail from './pages/SOPDetail';
import AuditPrep from './pages/AuditPrep';
import Complaints from './pages/Complaints';
import ComplaintDetail from './pages/ComplaintDetail';
import CCRs from './pages/CCRs';
import CCRDetail from './pages/CCRDetail';
import Analytics from './pages/Analytics';
import UserManagement from './pages/UserManagement';
import AuditLogs from './pages/AuditLogs';
import DocumentLibrary from './pages/DocumentLibrary';
import BatchTesting from './pages/BatchTesting';
import DailyTasks from './pages/DailyTasks';
import useWebSocket from './hooks/useWebSocket';

function getDaysUntilAudit() {
  const audit = new Date('2026-04-23');
  const now = new Date();
  const diff = audit - now;
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

const ROLE_COLORS = {
  admin: 'bg-red-500/20 text-red-300',
  manager: 'bg-blue-500/20 text-blue-300',
  viewer: 'bg-gray-500/20 text-gray-300',
  operator: 'bg-green-500/20 text-green-300',
};

export default function App() {
  const { user, loading, logout, hasRole } = useAuth();
  const { connected } = useWebSocket();
  const daysUntil = getDaysUntilAudit();
  const totalDays = 365;
  const progress = Math.max(0, Math.min(100, ((totalDays - daysUntil) / totalDays) * 100));

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-navy-200 border-t-navy-600 rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  // Not authenticated - show login
  if (!user) {
    return <Login />;
  }

  const navItems = [
    { to: '/', icon: Home, label: 'Dashboard', end: true },
    { to: '/sops', icon: FileText, label: 'SOP Library' },
    { to: '/complaints', icon: AlertCircle, label: 'Complaints' },
    { to: '/ccrs', icon: FileCheck, label: 'CCRs' },
    { to: '/documents', icon: FolderOpen, label: 'Documents' },
    { to: '/batch-testing', icon: FlaskConical, label: 'Batch Testing' },
    { to: '/daily-tasks', icon: ClipboardList, label: 'Daily Tasks' },
    { to: '/analytics', icon: BarChart3, label: 'Analytics' },
    { to: '/audit', icon: ClipboardCheck, label: 'Audit Prep' },
    // Admin-only items
    ...(hasRole('admin') ? [
      { to: '/users', icon: Users, label: 'Users', divider: true },
      { to: '/audit-logs', icon: ScrollText, label: 'Audit Log' },
    ] : []),
  ];

  return (
    <div className="min-h-screen">
      {/* Sidebar */}
      <nav className="sidebar fixed left-0 top-0 bottom-0 w-64 bg-navy-800 text-white flex flex-col z-40">
        {/* Branding */}
        <div className="px-6 py-6 border-b border-navy-700">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-navy-600 rounded-lg flex items-center justify-center">
              <Shield className="w-6 h-6 text-navy-200" />
            </div>
            <div>
              <h1 className="text-base font-bold leading-tight">Kefir Kultures Inc</h1>
              <p className="text-xs text-navy-300 leading-tight">Document Control System</p>
            </div>
          </div>
        </div>

        {/* User Info */}
        <div className="px-4 py-3 border-b border-navy-700">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-7 h-7 bg-navy-600 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-xs font-bold text-navy-200">{user.display_name?.[0]?.toUpperCase() || user.username[0].toUpperCase()}</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.display_name || user.username}</p>
                <span className={`inline-block px-1.5 py-0 rounded text-[10px] font-semibold ${ROLE_COLORS[user.role] || 'bg-gray-500/20 text-gray-300'}`}>
                  {user.role}
                </span>
              </div>
            </div>
            <button
              onClick={logout}
              className="p-1.5 text-navy-400 hover:text-white hover:bg-navy-700 rounded-lg transition-colors"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Navigation */}
        <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map(({ to, icon: Icon, label, end, divider }) => (
            <React.Fragment key={to}>
              {divider && <div className="border-t border-navy-700 my-2" />}
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                    isActive
                      ? 'bg-navy-600 text-white'
                      : 'text-navy-300 hover:bg-navy-700 hover:text-white'
                  }`
                }
              >
                <Icon className="w-5 h-5" />
                {label}
              </NavLink>
            </React.Fragment>
          ))}
        </div>

        {/* Audit Countdown */}
        <div className="px-4 py-4 border-t border-navy-700">
          <div className="bg-navy-700/50 rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-navy-300 uppercase tracking-wide">SGS Audit</span>
              <span className={`text-xs font-bold ${daysUntil <= 30 ? 'text-red-400' : daysUntil <= 90 ? 'text-amber-400' : 'text-green-400'}`}>
                {daysUntil} days
              </span>
            </div>
            <div className="w-full bg-navy-900 rounded-full h-1.5">
              <div
                className={`h-1.5 rounded-full transition-all ${
                  daysUntil <= 30 ? 'bg-red-400' : daysUntil <= 90 ? 'bg-amber-400' : 'bg-green-400'
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-[10px] text-navy-400 mt-1.5">April 23, 2026</p>
          </div>
          {/* Connection indicator */}
          <div className="flex items-center gap-2 mt-3 px-1">
            <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-400' : 'bg-red-400'}`} />
            <span className="text-[10px] text-navy-400">
              {connected ? 'Live updates active' : 'Reconnecting...'}
            </span>
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="main-content ml-64 min-h-screen">
        <div className="p-8">
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/sops" element={<SOPLibrary />} />
            <Route path="/sops/:id" element={<SOPDetail />} />
            <Route path="/complaints" element={<Complaints />} />
            <Route path="/complaints/:id" element={<ComplaintDetail />} />
            <Route path="/ccrs" element={<CCRs />} />
            <Route path="/ccrs/:id" element={<CCRDetail />} />
            <Route path="/documents" element={<DocumentLibrary />} />
            <Route path="/batch-testing" element={<BatchTesting />} />
            <Route path="/daily-tasks" element={<DailyTasks />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/audit" element={<AuditPrep />} />
            {hasRole('admin') && (
              <>
                <Route path="/users" element={<UserManagement />} />
                <Route path="/audit-logs" element={<AuditLogs />} />
              </>
            )}
          </Routes>
        </div>
      </main>
    </div>
  );
}
