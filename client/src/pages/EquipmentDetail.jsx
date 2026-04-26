import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Save, X, Plus, Clock, CheckCircle, AlertTriangle, Wrench
} from 'lucide-react';
import { useFetch, apiPut, apiPost } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { EquipmentStatusBadge, FREQUENCY_LABELS, STATUS_LABELS } from './Equipment';

const CATEGORY_LABELS = {
  inspection: 'Inspection', cleaning: 'Cleaning', lubrication: 'Lubrication',
  calibration_check: 'Calibration Check', replacement: 'Replacement',
  passivation: 'Passivation', general: 'General',
};

const WO_STATUS_STYLES = {
  open: 'bg-gray-100 text-gray-700 border-gray-200',
  in_progress: 'bg-blue-100 text-blue-700 border-blue-200',
  awaiting_parts: 'bg-amber-100 text-amber-800 border-amber-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
};

const WO_STATUS_LABELS = {
  open: 'Open', in_progress: 'In Progress', awaiting_parts: 'Awaiting Parts',
  completed: 'Completed', closed: 'Closed',
};

export { WO_STATUS_STYLES, WO_STATUS_LABELS };

function getDueColor(nextDueDate) {
  if (!nextDueDate) return '';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(nextDueDate);
  const diff = (due - today) / (1000 * 60 * 60 * 24);
  if (diff < 0) return 'border-l-4 border-l-red-500 bg-red-50';
  if (diff <= 3) return 'border-l-4 border-l-amber-400 bg-amber-50';
  return 'border-l-4 border-l-green-400';
}

export default function EquipmentDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: equip, loading, error, refetch } = useFetch(`/api/equipment/${id}`);

  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');

  // Modals
  const [showPMModal, setShowPMModal] = useState(false);
  const [pmForm, setPMForm] = useState({ frequency: 'monthly', category: 'general' });
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeForm, setCompleteForm] = useState({});
  const [completingScheduleId, setCompletingScheduleId] = useState(null);
  const [showWOModal, setShowWOModal] = useState(false);
  const [woForm, setWOForm] = useState({ type: 'preventive', priority: 'routine' });

  if (loading) return <LoadingSpinner message="Loading Equipment..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;
  if (!equip) return <div className="text-center py-16 text-gray-500">Equipment not found</div>;

  const startEdit = () => { setFormData({ ...equip }); setEditing(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut(`/api/equipment/${id}`, formData);
      setEditing(false);
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleCreatePM = async (e) => {
    e.preventDefault();
    try {
      await apiPost('/api/pm-schedules', { ...pmForm, equipment_id: equip.id });
      setShowPMModal(false);
      setPMForm({ frequency: 'monthly', category: 'general' });
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const openComplete = (scheduleId) => {
    setCompletingScheduleId(scheduleId);
    setCompleteForm({ completed_by: user?.display_name || user?.username || '', completed_at: new Date().toISOString().slice(0, 10), status: 'completed' });
    setShowCompleteModal(true);
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    try {
      await apiPost(`/api/pm-schedules/${completingScheduleId}/complete`, completeForm);
      setShowCompleteModal(false);
      setCompleteForm({});
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleCreateWO = async (e) => {
    e.preventDefault();
    try {
      await apiPost('/api/work-orders', { ...woForm, equipment_id: equip.id, reported_by: user?.display_name || user?.username || '' });
      setShowWOModal(false);
      setWOForm({ type: 'preventive', priority: 'routine' });
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const schedules = equip.schedules || [];
  const workOrders = equip.workOrders || [];
  const associatedSops = typeof equip.associated_sops === 'string' ? JSON.parse(equip.associated_sops || '[]') : (equip.associated_sops || []);

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'pm', label: `PM Schedules (${schedules.length})` },
    { id: 'workorders', label: `Work Orders (${workOrders.length})` },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate('/equipment')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Equipment
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{equip.equipment_id}</h1>
              <EquipmentStatusBadge status={equip.status} />
              {equip.is_critical === 1 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                  <AlertTriangle className="w-3 h-3" /> Critical
                </span>
              )}
            </div>
            <p className="text-gray-700 font-medium">{equip.name}</p>
            <p className="text-sm text-gray-500 mt-1">{equip.location} — PM: {FREQUENCY_LABELS[equip.pm_frequency] || equip.pm_frequency}</p>
          </div>
          <div className="flex items-center gap-2">
            {editing ? (
              <>
                <button onClick={() => setEditing(false)} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                  <X className="w-4 h-4" /> Cancel
                </button>
                <button onClick={handleSave} disabled={saving} className="flex items-center gap-2 px-3 py-2 bg-navy-800 text-white rounded-lg text-sm hover:bg-navy-700 disabled:opacity-50">
                  <Save className="w-4 h-4" /> {saving ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button onClick={startEdit} className="flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-600 hover:bg-gray-50">
                <Edit2 className="w-4 h-4" /> Edit
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${
              activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Equipment Details</h2>
          {editing ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Name</label>
                <input type="text" value={formData.name || ''} onChange={e => setFormData({ ...formData, name: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                <input type="text" value={formData.location || ''} onChange={e => setFormData({ ...formData, location: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={formData.status || ''} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                  {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PM Frequency</label>
                <select value={formData.pm_frequency || ''} onChange={e => setFormData({ ...formData, pm_frequency: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                  {Object.entries(FREQUENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Manufacturer</label>
                <input type="text" value={formData.manufacturer || ''} onChange={e => setFormData({ ...formData, manufacturer: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                <input type="text" value={formData.model || ''} onChange={e => setFormData({ ...formData, model: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={2} value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea rows={2} value={formData.notes || ''} onChange={e => setFormData({ ...formData, notes: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-6">
                {[
                  { label: 'Equipment ID', value: equip.equipment_id },
                  { label: 'Location', value: equip.location },
                  { label: 'Manufacturer', value: equip.manufacturer || '—' },
                  { label: 'Model', value: equip.model || '—' },
                  { label: 'Serial Number', value: equip.serial_number || '—' },
                  { label: 'Date Installed', value: equip.date_installed || '—' },
                  { label: 'PM Frequency', value: FREQUENCY_LABELS[equip.pm_frequency] || equip.pm_frequency },
                  { label: 'Critical', value: equip.is_critical ? 'Yes' : 'No' },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{item.label}</p>
                    <p className="text-sm text-gray-900">{item.value}</p>
                  </div>
                ))}
              </div>
              {equip.description && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{equip.description}</p>
                </div>
              )}
              {equip.notes && (
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Notes</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{equip.notes}</p>
                </div>
              )}
              {associatedSops.length > 0 && (
                <div className="mt-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Associated SOPs</p>
                  <div className="flex flex-wrap gap-2">
                    {associatedSops.map((sop, i) => (
                      <span key={i} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-navy-100 text-navy-700">{sop}</span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* PM Schedules Tab */}
      {activeTab === 'pm' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">PM Schedules</h2>
            <button onClick={() => setShowPMModal(true)} className="flex items-center gap-2 px-3 py-2 bg-navy-800 text-white rounded-lg text-sm hover:bg-navy-700">
              <Plus className="w-4 h-4" /> Add PM Task
            </button>
          </div>

          {schedules.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No PM schedules for this equipment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {schedules.map(s => (
                <div key={s.id} className={`bg-white rounded-xl shadow-sm border border-gray-200 p-5 ${getDueColor(s.next_due_date)}`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-gray-900">{s.task_name}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-600">
                        {CATEGORY_LABELS[s.category] || s.category}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-600">
                        {FREQUENCY_LABELS[s.frequency] || s.frequency}
                      </span>
                      {!s.is_active && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-500">Inactive</span>}
                    </div>
                    <button onClick={() => openComplete(s.id)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700">
                      Complete Task
                    </button>
                  </div>
                  {s.description && <p className="text-sm text-gray-600 mb-2">{s.description}</p>}
                  <div className="flex items-center gap-4 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Next due: {s.next_due_date}
                    </span>
                    {s.last_completed_date && (
                      <span className="flex items-center gap-1 text-green-600">
                        <CheckCircle className="w-3 h-3" /> Last: {s.last_completed_date}
                      </span>
                    )}
                    {s.assigned_to && <span>Assigned: {s.assigned_to}</span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Work Orders Tab */}
      {activeTab === 'workorders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Work Orders</h2>
            <button onClick={() => setShowWOModal(true)} className="flex items-center gap-2 px-3 py-2 bg-navy-800 text-white rounded-lg text-sm hover:bg-navy-700">
              <Plus className="w-4 h-4" /> Create Work Order
            </button>
          </div>

          {workOrders.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <p className="text-gray-500">No work orders for this equipment</p>
            </div>
          ) : (
            <div className="space-y-3">
              {workOrders.map(wo => (
                <div key={wo.id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 cursor-pointer hover:bg-gray-50" onClick={() => navigate(`/work-orders/${wo.id}`)}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-medium text-navy-700">{wo.work_order_number}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${WO_STATUS_STYLES[wo.status] || WO_STATUS_STYLES.open}`}>
                        {WO_STATUS_LABELS[wo.status] || wo.status}
                      </span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                        wo.priority === 'emergency' ? 'bg-red-100 text-red-700' : wo.priority === 'urgent' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500">{wo.created_at?.slice(0, 10)}</span>
                  </div>
                  <p className="text-sm text-gray-900">{wo.title}</p>
                  <p className="text-xs text-gray-500 mt-1">Type: {wo.type} — Reported by: {wo.reported_by}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Add PM Task Modal */}
      <Modal isOpen={showPMModal} onClose={() => setShowPMModal(false)} title="Add PM Task">
        <form onSubmit={handleCreatePM} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task Name *</label>
            <input type="text" required value={pmForm.task_name || ''} onChange={e => setPMForm({ ...pmForm, task_name: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
            <textarea rows={2} value={pmForm.description || ''} onChange={e => setPMForm({ ...pmForm, description: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Frequency *</label>
              <select required value={pmForm.frequency || ''} onChange={e => setPMForm({ ...pmForm, frequency: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                {Object.entries(FREQUENCY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category *</label>
              <select required value={pmForm.category || ''} onChange={e => setPMForm({ ...pmForm, category: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Next Due Date *</label>
              <input type="date" required value={pmForm.next_due_date || ''} onChange={e => setPMForm({ ...pmForm, next_due_date: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
              <input type="text" value={pmForm.assigned_to || ''} onChange={e => setPMForm({ ...pmForm, assigned_to: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowPMModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm">Create</button>
          </div>
        </form>
      </Modal>

      {/* Complete PM Task Modal */}
      <Modal isOpen={showCompleteModal} onClose={() => setShowCompleteModal(false)} title="Complete PM Task">
        <form onSubmit={handleComplete} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Completed By *</label>
              <input type="text" required value={completeForm.completed_by || ''} onChange={e => setCompleteForm({ ...completeForm, completed_by: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Completed At *</label>
              <input type="date" required value={completeForm.completed_at || ''} onChange={e => setCompleteForm({ ...completeForm, completed_at: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={completeForm.status || 'completed'} onChange={e => setCompleteForm({ ...completeForm, status: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
              <option value="completed">Completed</option>
              <option value="completed_with_issues">Completed with Issues</option>
              <option value="skipped">Skipped</option>
              <option value="deferred">Deferred</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={2} value={completeForm.notes || ''} onChange={e => setCompleteForm({ ...completeForm, notes: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Issues Found</label>
            <textarea rows={2} value={completeForm.issues_found || ''} onChange={e => setCompleteForm({ ...completeForm, issues_found: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowCompleteModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Record Completion</button>
          </div>
        </form>
      </Modal>

      {/* Create Work Order Modal */}
      <Modal isOpen={showWOModal} onClose={() => setShowWOModal(false)} title="Create Work Order">
        <form onSubmit={handleCreateWO} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input type="text" required value={woForm.title || ''} onChange={e => setWOForm({ ...woForm, title: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
            <textarea rows={2} required value={woForm.description || ''} onChange={e => setWOForm({ ...woForm, description: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
              <select required value={woForm.type || ''} onChange={e => setWOForm({ ...woForm, type: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                <option value="preventive">Preventive</option>
                <option value="corrective">Corrective</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select value={woForm.priority || 'routine'} onChange={e => setWOForm({ ...woForm, priority: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                <option value="routine">Routine</option>
                <option value="urgent">Urgent</option>
                <option value="emergency">Emergency</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
            <input type="text" value={woForm.assigned_to || ''} onChange={e => setWOForm({ ...woForm, assigned_to: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowWOModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm">Create</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
