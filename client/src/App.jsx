import React from 'react';
import { Routes, Route, NavLink } from 'react-router-dom';
import { Home, FileText, ClipboardCheck, Shield, AlertCircle, FileCheck, BarChart3, Users, ScrollText, LogOut, FolderOpen, FlaskConical, ClipboardList, GitPullRequest, AlertOctagon, ShieldCheck, Cog, Wrench, AlertTriangle, Package, Archive, CalendarDays, Beaker } from 'lucide-react';
import { useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import SOPLibrary from './pages/SOPLibrary';
import SOPDetail from './pages/SOPDetail';
import Complaints from './pages/Complaints';
import ComplaintDetail from './pages/ComplaintDetail';
import CCRs from './pages/CCRs';
import CCRDetail from './pages/CCRDetail';
import Analytics from './pages/Analytics';
import UserManagement from './pages/UserManagement';
import AuditLogs from './pages/AuditLogs';
import DocumentLibrary from './pages/DocumentLibrary';
import BatchTesting from './pages/BatchTesting';
import BatchTestDetail from './pages/BatchTestDetail';
import DailyTasks from './pages/DailyTasks';
import ChangeRequests from './pages/ChangeRequests';
import ChangeRequestDetail from './pages/ChangeRequestDetail';
import Deviations from './pages/Deviations';
import DeviationDetail from './pages/DeviationDetail';
import CAPAs from './pages/CAPAs';
import CAPADetail from './pages/CAPADetail';
import Equipment from './pages/Equipment';
import EquipmentDetail from './pages/EquipmentDetail';
import Maintenance from './pages/Maintenance';
import WorkOrderDetail from './pages/WorkOrderDetail';
import RecallCenter from './pages/RecallCenter';
import Suppliers from './pages/Suppliers';
import SupplierDetail from './pages/SupplierDetail';
import RecallDetail from './pages/RecallDetail';
import TraceabilityDetail from './pages/TraceabilityDetail';
import CrisisDetail from './pages/CrisisDetail';
import InventoryCounts from './pages/InventoryCounts';
import InventoryCountDetail from './pages/InventoryCountDetail';
import PickLists from './pages/PickLists';
import PickListDetail from './pages/PickListDetail';
import useWebSocket from './hooks/useWebSocket';
import Planner from './pages/Planner';
import PlannerBatchDetail from './pages/PlannerBatchDetail';
import PlannerPODetail from './pages/PlannerPODetail';
import Fermentation from './pages/Fermentation';
import AccessDenied from "./components/AccessDenied";
import ProtectedRoute from "./components/ProtectedRoute";



const ROLE_COLORS = {
  admin: 'bg-red-500/20 text-red-300',
  manager: 'bg-blue-500/20 text-blue-300',
  viewer: 'bg-gray-500/20 text-gray-300',
  operator: 'bg-green-500/20 text-green-300',
};

function DateTimeClock() {
  const [now, setNow] = React.useState(new Date());
  React.useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);
  const days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return (
    <div className="text-center">
      <p className="text-xs font-semibold text-navy-200">
        {days[now.getDay()]}, {months[now.getMonth()]} {now.getDate()}, {now.getFullYear()}
      </p>
      <p className="text-lg font-bold text-white tracking-wide">
        {now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
      </p>
    </div>
  );
}

export default function App() {
  const { user, loading, logout, hasRole } = useAuth();
  const { connected } = useWebSocket();

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

  const navGroups = [
    { items: [{ to: '/', icon: Home, label: 'Dashboard', end: true }] },
    { label: 'Quality & Compliance',
      items: [
        { to: '/complaints', icon: AlertCircle, label: 'Complaints' },
        { to: '/ccrs', icon: FileCheck, label: 'CCRs' },
        { to: '/deviations', icon: AlertOctagon, label: 'Deviations' },
        { to: '/capas', icon: ShieldCheck, label: 'CAPAs' },
        { to: '/change-requests', icon: GitPullRequest, label: 'Change Control' },
      ]
    },
    { label: 'Production',
      items: [
        { to: '/planner', icon: CalendarDays, label: 'Planner' },
        { to: '/fermentation', icon: Beaker, label: 'Fermentation' },
        { to: '/batch-testing', icon: FlaskConical, label: 'Batch Testing' },
        { to: '/daily-tasks', icon: ClipboardList, label: 'Daily Tasks' },
        { to: '/inventory-counts', icon: Archive, label: 'Inventory Counts' },
        { to: '/pick-lists', icon: ClipboardCheck, label: 'Pick Lists' },
        { to: '/equipment', icon: Cog, label: 'Equipment' },
        { to: '/maintenance', icon: Wrench, label: 'Maintenance' },
      ]
    },
    { label: 'Documents & Suppliers',
      items: [
        { to: '/sops', icon: FileText, label: 'SOP Library' },
        { to: '/documents', icon: FolderOpen, label: 'Documents' },
        { to: '/suppliers', icon: Package, label: 'Suppliers' },
      ]
    },
    { label: 'Risk & Readiness',
      items: [
        { to: '/recalls', icon: AlertTriangle, label: 'Recall Center' },
        { to: '/analytics', icon: BarChart3, label: 'Analytics' },
      ]
    },
    ...(hasRole('admin') ? [{ label: 'Admin',
      items: [
        { to: '/users', icon: Users, label: 'Users' },
        { to: '/audit-logs', icon: ScrollText, label: 'Audit Log' },
      ]
    }] : []),
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

        {/* Date & Time */}
        <div className="px-4 py-2.5 border-b border-navy-700 bg-navy-750">
          <DateTimeClock />
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
          {navGroups.map((group, gi) => (
            <div key={gi} className={gi > 0 ? 'mt-3 pt-3 border-t border-navy-700/50' : ''}>
              {group.label && (
                <p className="px-3 mb-1.5 text-[10px] font-bold text-navy-500 uppercase tracking-wider">{group.label}</p>
              )}
              {group.items.map(({ to, icon: Icon, label, end }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={end}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-navy-600 text-white'
                        : 'text-navy-300 hover:bg-navy-700 hover:text-white'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  {label}
                </NavLink>
              ))}
            </div>
          ))}
        </div>

        <div className="px-4 py-4 border-t border-navy-700">
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
            <Route path="/planner" element={<Planner />} />
            <Route path="/planner/batches/:id" element={<PlannerBatchDetail />} />
            <Route path="/planner/purchase-orders/:id" element={<PlannerPODetail />} />
            <Route path="/fermentation" element={<Fermentation />} />
            <Route path="/batch-testing" element={<BatchTesting />} />
            <Route path="/batch-testing/:id" element={<BatchTestDetail />} />
            <Route path="/daily-tasks" element={<DailyTasks />} />
            <Route path="/inventory-counts" element={<InventoryCounts />} />
            <Route path="/inventory-counts/:id" element={<InventoryCountDetail />} />
            <Route path="/pick-lists" element={<PickLists />} />
            <Route path="/pick-lists/:id" element={<PickListDetail />} />
            <Route path="/change-requests" element={<ChangeRequests />} />
            <Route path="/change-requests/:id" element={<ChangeRequestDetail />} />
            <Route path="/deviations" element={<Deviations />} />
            <Route path="/deviations/:id" element={<DeviationDetail />} />
            <Route path="/capas" element={<CAPAs />} />
            <Route path="/capas/:id" element={<CAPADetail />} />
            <Route path="/equipment" element={<Equipment />} />
            <Route path="/equipment/:id" element={<EquipmentDetail />} />
            <Route path="/maintenance" element={<Maintenance />} />
            <Route path="/work-orders/:id" element={<WorkOrderDetail />} />
            <Route path="/recalls" element={<RecallCenter />} />
            <Route path="/suppliers" element={<Suppliers />} />
            <Route path="/suppliers/:id" element={<SupplierDetail />} />
            <Route path="/recalls/:id" element={<RecallDetail />} />
            <Route path="/traceability-exercises/:id" element={<TraceabilityDetail />} />
            <Route path="/crisis-events/:id" element={<CrisisDetail />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/users" element={
              <ProtectedRoute roles={["admin"]} label="Admin">
                <UserManagement />
              </ProtectedRoute>
            } />
            <Route path="/audit-logs" element={
              <ProtectedRoute roles={["admin"]} label="Admin">
                <AuditLogs />
              </ProtectedRoute>
            } />
            <Route path="*" element={
              <div className="min-h-[60vh] flex items-center justify-center">
                <div className="text-center">
                  <h2 className="text-xl font-bold text-gray-200 mb-2">Page Not Found</h2>
                  <p className="text-gray-400">The page you are looking for does not exist.</p>
                </div>
              </div>
            } />
          </Routes>
        </div>
      </main>
    </div>
  );
}
