import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Save, X, Clock, CheckCircle, AlertTriangle, Wrench, Shield
} from 'lucide-react';
import { useFetch, apiPut, apiPost } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { WO_STATUS_STYLES, WO_STATUS_LABELS } from './EquipmentDetail';

const PRIORITY_STYLES = {
  routine: 'bg-gray-100 text-gray-600 border-gray-200',
  urgent: 'bg-amber-100 text-amber-700 border-amber-200',
  emergency: 'bg-red-100 text-red-700 border-red-200',
};

export default function WorkOrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { data: wo, loading, error, refetch } = useFetch(`/api/work-orders/${id}`);

  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  // Action modals
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeForm, setCompleteForm] = useState({});

  if (loading) return <LoadingSpinner message="Loading Work Order..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;
  if (!wo) return <div className="text-center py-16 text-gray-500">Work order not found</div>;

  const startEdit = () => { setFormData({ ...wo }); setEditing(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut(`/api/work-orders/${id}`, formData);
      setEditing(false);
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleStartWork = async () => {
    try {
      await apiPut(`/api/work-orders/${id}`, { status: 'in_progress' });
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    try {
      await apiPost(`/api/work-orders/${id}/complete`, completeForm);
      setShowCompleteModal(false);
      setCompleteForm({});
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleVerify = async () => {
    if (!confirm('Verify and close this work order?')) return;
    try {
      await apiPost(`/api/work-orders/${id}/verify`, {});
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const partsUsed = typeof wo.parts_used === 'string' ? JSON.parse(wo.parts_used || '[]') : (wo.parts_used || []);

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate('/maintenance')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Maintenance
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{wo.work_order_number}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${WO_STATUS_STYLES[wo.status] || ''}`}>
                {WO_STATUS_LABELS[wo.status] || wo.status}
              </span>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${PRIORITY_STYLES[wo.priority] || ''}`}>
                {wo.priority.charAt(0).toUpperCase() + wo.priority.slice(1)}
              </span>
              {wo.food_safety_impact === 1 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                  <AlertTriangle className="w-3 h-3" /> Food Safety
                </span>
              )}
            </div>
            <p className="text-gray-700 font-medium">{wo.title}</p>
            <p className="text-sm text-gray-500 mt-1">
              {wo.equip_code} — {wo.equipment_name} — Type: {wo.type}
            </p>
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

        {/* Action Buttons */}
        {!editing && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
            {wo.status === 'open' && (
              <button onClick={handleStartWork} className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700">
                Start Work
              </button>
            )}
            {['open', 'in_progress', 'awaiting_parts'].includes(wo.status) && (
              <button onClick={() => { setCompleteForm({}); setShowCompleteModal(true); }} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                Complete
              </button>
            )}
            {wo.status === 'completed' && (
              <button onClick={handleVerify} className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700">
                Verify & Close
              </button>
            )}
          </div>
        )}
      </div>

      {/* Details */}
      <div className="space-y-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Work Order Details</h2>
          {editing ? (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                <input type="text" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                <select value={formData.status || ''} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                  {Object.entries(WO_STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
                <select value={formData.priority || ''} onChange={e => setFormData({ ...formData, priority: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                  <option value="routine">Routine</option>
                  <option value="urgent">Urgent</option>
                  <option value="emergency">Emergency</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                <input type="text" value={formData.assigned_to || ''} onChange={e => setFormData({ ...formData, assigned_to: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea rows={3} value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Affected Product</label>
                <input type="text" value={formData.affected_product || ''} onChange={e => setFormData({ ...formData, affected_product: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
              </div>
              <div className="col-span-2 flex gap-4">
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={formData.food_safety_impact || false} onChange={e => setFormData({ ...formData, food_safety_impact: e.target.checked ? 1 : 0 })} className="rounded border-gray-300" />
                  Food Safety Impact
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-700">
                  <input type="checkbox" checked={formData.is_temporary_repair || false} onChange={e => setFormData({ ...formData, is_temporary_repair: e.target.checked ? 1 : 0 })} className="rounded border-gray-300" />
                  Temporary Repair
                </label>
              </div>
              {formData.is_temporary_repair ? (
                <div className="col-span-2 grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Temp Repair Deadline</label>
                    <input type="date" value={formData.temporary_repair_deadline || ''} onChange={e => setFormData({ ...formData, temporary_repair_deadline: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Approved By</label>
                    <input type="text" value={formData.temporary_repair_approved_by || ''} onChange={e => setFormData({ ...formData, temporary_repair_approved_by: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-6">
                {[
                  { label: 'Work Order #', value: wo.work_order_number },
                  { label: 'Equipment', value: `${wo.equip_code} — ${wo.equipment_name}` },
                  { label: 'Type', value: wo.type.charAt(0).toUpperCase() + wo.type.slice(1) },
                  { label: 'Reported By', value: wo.reported_by },
                  { label: 'Assigned To', value: wo.assigned_to || '—' },
                  { label: 'Created', value: wo.created_at?.slice(0, 10) },
                  { label: 'Completed By', value: wo.completed_by || '—' },
                  { label: 'Completed At', value: wo.completed_at?.slice(0, 10) || '—' },
                  { label: 'Verified By', value: wo.verified_by || '—' },
                  { label: 'Food Safety Impact', value: wo.food_safety_impact ? 'Yes' : 'No' },
                ].map(item => (
                  <div key={item.label}>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{item.label}</p>
                    <p className="text-sm text-gray-900">{item.value}</p>
                  </div>
                ))}
              </div>
              <div className="mb-4">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description</p>
                <p className="text-sm text-gray-700 leading-relaxed">{wo.description}</p>
              </div>
              {wo.work_performed && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Work Performed</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{wo.work_performed}</p>
                </div>
              )}
              {wo.affected_product && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Affected Product</p>
                  <p className="text-sm text-gray-700">{wo.affected_product}</p>
                </div>
              )}
              {wo.product_disposition && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Product Disposition</p>
                  <p className="text-sm text-gray-700">{wo.product_disposition}</p>
                </div>
              )}
            </>
          )}
        </div>

        {/* Temporary Repair Section */}
        {wo.is_temporary_repair === 1 && !editing && (
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
            <h2 className="text-lg font-semibold text-amber-800 mb-3 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" /> Temporary Repair
            </h2>
            <div className="grid grid-cols-2 gap-y-3 gap-x-8">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Deadline</p>
                <p className="text-sm text-gray-900">{wo.temporary_repair_deadline || '—'}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Approved By</p>
                <p className="text-sm text-gray-900">{wo.temporary_repair_approved_by || '—'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Post-Maintenance Section */}
        {!editing && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Post-Maintenance</h2>
            <div className="grid grid-cols-2 gap-y-3 gap-x-8">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Post-Maintenance Sanitation</p>
                <p className="text-sm text-gray-900 flex items-center gap-1">
                  {wo.post_maintenance_sanitation ? <><CheckCircle className="w-4 h-4 text-green-500" /> Yes</> : 'No'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Equipment Returned to Service</p>
                <p className="text-sm text-gray-900 flex items-center gap-1">
                  {wo.equipment_returned_to_service ? <><CheckCircle className="w-4 h-4 text-green-500" /> Yes — {wo.returned_to_service_at?.slice(0, 10)}</> : 'No'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Parts Used */}
        {partsUsed.length > 0 && !editing && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Parts Used</h2>
            <ul className="space-y-1">
              {partsUsed.map((part, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-center gap-2">
                  <Wrench className="w-3 h-3 text-gray-400" /> {typeof part === 'string' ? part : JSON.stringify(part)}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Link to equipment */}
        <div className="flex gap-3">
          <Link to={`/equipment/${wo.equipment_id}`} className="text-sm text-navy-600 hover:underline flex items-center gap-1">
            <Shield className="w-4 h-4" /> View Equipment: {wo.equip_code}
          </Link>
          {wo.linked_deviation_id && (
            <Link to={`/deviations/${wo.linked_deviation_id}`} className="text-sm text-navy-600 hover:underline flex items-center gap-1">
              <AlertTriangle className="w-4 h-4" /> View Linked Deviation
            </Link>
          )}
        </div>
      </div>

      {/* Complete Modal */}
      <Modal isOpen={showCompleteModal} onClose={() => setShowCompleteModal(false)} title="Complete Work Order">
        <form onSubmit={handleComplete} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Work Performed *</label>
            <textarea rows={3} required value={completeForm.work_performed || ''} onChange={e => setCompleteForm({ ...completeForm, work_performed: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="flex gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={completeForm.post_maintenance_sanitation || false} onChange={e => setCompleteForm({ ...completeForm, post_maintenance_sanitation: e.target.checked })} className="rounded border-gray-300" />
              Post-Maintenance Sanitation Done
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={completeForm.equipment_returned_to_service || false} onChange={e => setCompleteForm({ ...completeForm, equipment_returned_to_service: e.target.checked })} className="rounded border-gray-300" />
              Equipment Returned to Service
            </label>
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowCompleteModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Complete</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
