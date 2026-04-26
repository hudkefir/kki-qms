import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Save, X, CheckCircle, AlertTriangle,
  Shield, Phone, Users, Zap
} from 'lucide-react';
import { useFetch, apiPut, apiPost } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { SeverityBadge, CRISIS_STATUS_STYLES, CRISIS_TYPE_LABELS, HelpTip, HelpToggle } from './RecallCenter';

const NOTIFICATION_CONTACTS = [
  { role: 'QA Manager', type: 'internal', required: true },
  { role: 'Plant Manager', type: 'internal', required: true },
  { role: 'Owner/President', type: 'internal', required: true },
  { role: 'Production Supervisor', type: 'internal', required: true },
  { role: 'CFIA (if food safety)', type: 'external', required: false },
  { role: 'Insurance Company', type: 'external', required: false },
  { role: 'Legal Counsel', type: 'external', required: false },
  { role: 'Key Customers (if affected)', type: 'external', required: false },
];

export default function CrisisDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: event, loading, error, refetch } = useFetch(`/api/crisis-events/${id}`);

  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [showResolveModal, setShowResolveModal] = useState(false);
  const [resolution, setResolution] = useState('');
  const [showTips, setShowTips] = useState(true);

  if (loading) return <LoadingSpinner message="Loading Crisis Event..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;
  if (!event) return <div className="text-center py-16 text-gray-500">Crisis event not found</div>;

  const startEdit = () => { setFormData({ ...event }); setEditing(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut(`/api/crisis-events/${id}`, formData);
      setEditing(false); refetch();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleResolve = async (e) => {
    e.preventDefault();
    try {
      await apiPost(`/api/crisis-events/${id}/resolve`, { resolution });
      setShowResolveModal(false); setResolution(''); refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const handleClose = async () => {
    if (!confirm('Close this crisis event?')) return;
    try { await apiPost(`/api/crisis-events/${id}/close`, {}); refetch(); }
    catch (err) { alert('Error: ' + err.message); }
  };

  const handleNotificationToggle = async (role, checked) => {
    const currentNotifs = Array.isArray(event.notifications_sent) ? event.notifications_sent : JSON.parse(event.notifications_sent || '[]');
    const updated = checked ? [...currentNotifs, role] : currentNotifs.filter(r => r !== role);
    try {
      await apiPut(`/api/crisis-events/${id}`, { notifications_sent: updated });
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const notificationsSent = Array.isArray(event.notifications_sent) ? event.notifications_sent : JSON.parse(event.notifications_sent || '[]');
  const affectedAreas = Array.isArray(event.affected_areas) ? event.affected_areas : JSON.parse(event.affected_areas || '[]');
  const affectedProducts = Array.isArray(event.affected_products) ? event.affected_products : JSON.parse(event.affected_products || '[]');

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'notifications', label: 'Notifications' },
    { id: 'product', label: 'Product Control' },
    { id: 'resolution', label: 'Resolution' },
  ];

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate('/recalls')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Recall Center
      </button>

      <div className="flex justify-end mb-2"><HelpToggle visible={showTips} setVisible={setShowTips} /></div>
      {showTips && (
        <div className="space-y-2 mb-4">
          <HelpTip>
            <p className="font-semibold mb-1">Immediate priorities: (1) Personnel safety (2) Stop production if needed (3) Protect product — close and secure all product (4) Notify key roles</p>
          </HelpTip>
          <HelpTip>
            <p className="font-semibold mb-1">Emergency Contacts</p>
            <p>Hudson Liao: 647-321-4288 / 647-774-1095 &bull; Jimmy Tran: 647-863-4771 &bull; Timothy Wang: 613-770-6816</p>
            <p className="mt-1">CFIA Recall Coordinator: 416-665-5049 &bull; After-hours: 1-866-225-2342</p>
          </HelpTip>
          {event?.type === 'refrigeration_failure' && (
            <HelpTip>
              <p className="font-semibold text-red-700">Refrigeration failure: If FRIDGE-01 or FRIDGE-02 exceeded 5°C for &gt;2 hours or product temp &gt;7°C: hold for QA disposition per CCP-1.</p>
            </HelpTip>
          )}
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{event.event_id}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${CRISIS_STATUS_STYLES[event.status] || ''}`}>
                {event.status?.charAt(0).toUpperCase() + event.status?.slice(1)}
              </span>
              <SeverityBadge severity={event.severity} />
            </div>
            <p className="text-gray-700 font-medium">{event.title}</p>
            <p className="text-sm text-gray-500 mt-1">
              {CRISIS_TYPE_LABELS[event.type] || event.type} — Reported by {event.reported_by} on {event.reported_at?.slice(0, 10)}
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

        {/* Severity Indicator Bar */}
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className={`h-2 rounded-full ${
            event.severity === 'critical' ? 'bg-red-500' :
            event.severity === 'high' ? 'bg-orange-500' :
            event.severity === 'moderate' ? 'bg-amber-500' : 'bg-green-500'
          }`} />
        </div>

        {/* Action Buttons */}
        {!editing && !['closed', 'resolved'].includes(event.status) && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
            {event.status === 'active' && (
              <button onClick={() => {
                apiPut(`/api/crisis-events/${id}`, { status: 'contained' }).then(refetch).catch(err => alert('Error: ' + err.message));
              }} className="px-3 py-1.5 bg-amber-600 text-white rounded-lg text-sm hover:bg-amber-700">
                Mark Contained
              </button>
            )}
            {['active', 'contained'].includes(event.status) && (
              <button onClick={() => setShowResolveModal(true)} className="px-3 py-1.5 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700">
                Resolve
              </button>
            )}
            {event.status === 'resolved' && (
              <button onClick={handleClose} className="px-3 py-1.5 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-700">
                Close Event
              </button>
            )}
          </div>
        )}
        {!editing && event.status === 'resolved' && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap gap-2">
            <button onClick={handleClose} className="px-3 py-1.5 bg-slate-600 text-white rounded-lg text-sm hover:bg-slate-700">
              Close Event
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 rounded-lg p-1">
        {tabs.map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex-1 px-4 py-2 rounded-md text-sm font-medium transition-colors ${activeTab === tab.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Event Details</h2>
            {editing ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
                  <input type="text" value={formData.title || ''} onChange={e => setFormData({ ...formData, title: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
                  <select value={formData.type || ''} onChange={e => setFormData({ ...formData, type: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                    {Object.entries(CRISIS_TYPE_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                  <select value={formData.severity || ''} onChange={e => setFormData({ ...formData, severity: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                    <option value="low">Low</option>
                    <option value="moderate">Moderate</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={formData.status || ''} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                    <option value="active">Active</option>
                    <option value="contained">Contained</option>
                    <option value="resolved">Resolved</option>
                    <option value="closed">Closed</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea rows={3} value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
                </div>
                <div className="col-span-2 flex items-center gap-4">
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={formData.production_stopped || false} onChange={e => setFormData({ ...formData, production_stopped: e.target.checked ? 1 : 0 })} className="rounded border-gray-300" />
                    Production Stopped
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={formData.product_held || false} onChange={e => setFormData({ ...formData, product_held: e.target.checked ? 1 : 0 })} className="rounded border-gray-300" />
                    Product Held
                  </label>
                  <label className="flex items-center gap-2 text-sm text-gray-700">
                    <input type="checkbox" checked={formData.food_safety_impact || false} onChange={e => setFormData({ ...formData, food_safety_impact: e.target.checked ? 1 : 0 })} className="rounded border-gray-300" />
                    Food Safety Impact
                  </label>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-y-4 gap-x-8 mb-6">
                  {[
                    { label: 'Event ID', value: event.event_id },
                    { label: 'Type', value: CRISIS_TYPE_LABELS[event.type] || event.type },
                    { label: 'Reported By', value: event.reported_by },
                    { label: 'Reported At', value: event.reported_at?.slice(0, 16) },
                    { label: 'Production Stopped', value: event.production_stopped ? 'Yes' : 'No' },
                    { label: 'Product Held', value: event.product_held ? 'Yes' : 'No' },
                    { label: 'Food Safety Impact', value: event.food_safety_impact ? 'Yes' : 'No' },
                    { label: 'Recall Triggered', value: event.recall_triggered ? 'Yes' : 'No' },
                  ].map(item => (
                    <div key={item.label}>
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{item.label}</p>
                      <p className="text-sm text-gray-900">{item.value}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Description</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{event.description}</p>
                </div>
              </>
            )}
          </div>

          {(affectedAreas.length > 0 || affectedProducts.length > 0) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-3">Affected Areas & Products</h2>
              <div className="grid grid-cols-2 gap-6">
                {affectedAreas.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Areas</p>
                    <div className="flex flex-wrap gap-2">
                      {affectedAreas.map((a, i) => (
                        <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700 border border-orange-200">{a}</span>
                      ))}
                    </div>
                  </div>
                )}
                {affectedProducts.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Products</p>
                    <div className="flex flex-wrap gap-2">
                      {affectedProducts.map((p, i) => (
                        <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-700 border border-gray-200">{p}</span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notifications */}
      {activeTab === 'notifications' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Notification Checklist</h2>
            <p className="text-xs text-gray-500 mb-4">Per KK-SOP-00903 Crisis Management Protocol</p>

            <div className="space-y-1">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">Internal Contacts</h3>
              {NOTIFICATION_CONTACTS.filter(c => c.type === 'internal').map(contact => (
                <label key={contact.role} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationsSent.includes(contact.role)}
                    onChange={e => handleNotificationToggle(contact.role, e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{contact.role}</span>
                  {contact.required && <span className="text-[10px] text-red-500 font-semibold">REQUIRED</span>}
                </label>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200 space-y-1">
              <h3 className="text-sm font-semibold text-gray-700 mb-2">External Contacts</h3>
              {NOTIFICATION_CONTACTS.filter(c => c.type === 'external').map(contact => (
                <label key={contact.role} className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={notificationsSent.includes(contact.role)}
                    onChange={e => handleNotificationToggle(contact.role, e.target.checked)}
                    className="rounded border-gray-300"
                  />
                  <span className="text-sm text-gray-700">{contact.role}</span>
                </label>
              ))}
            </div>

            <div className="mt-4 pt-4 border-t border-gray-200">
              <p className="text-xs text-gray-500">
                {notificationsSent.length} of {NOTIFICATION_CONTACTS.length} contacts notified
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Product Control */}
      {activeTab === 'product' && (
        <div className="space-y-6">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Control</h2>
            <div className="grid grid-cols-2 gap-y-4 gap-x-8">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Production Stopped</p>
                <p className={`text-sm font-semibold ${event.production_stopped ? 'text-red-600' : 'text-green-600'}`}>
                  {event.production_stopped ? 'Yes - Production halted' : 'No'}
                </p>
              </div>
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Product Held</p>
                <p className={`text-sm font-semibold ${event.product_held ? 'text-amber-600' : 'text-green-600'}`}>
                  {event.product_held ? 'Yes - Product on hold' : 'No'}
                </p>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Food Safety Assessment</h2>
            <div className="mb-4">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Food Safety Impact</p>
              <p className={`text-sm font-semibold ${event.food_safety_impact ? 'text-red-600' : 'text-green-600'}`}>
                {event.food_safety_impact ? 'Yes - Food safety is affected' : 'No food safety impact identified'}
              </p>
            </div>
            {event.food_safety_assessment && (
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Assessment Details</p>
                <p className="text-sm text-gray-700">{event.food_safety_assessment}</p>
              </div>
            )}
          </div>

          {(event.product_disposition || event.disposition_rationale) && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Product Disposition</h2>
              <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Disposition</p>
                  <p className="text-sm text-gray-900">{event.product_disposition || '--'}</p>
                </div>
                <div>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Rationale</p>
                  <p className="text-sm text-gray-900">{event.disposition_rationale || '--'}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Resolution */}
      {activeTab === 'resolution' && (
        <div className="space-y-6">
          {event.resolution ? (
            <div className="bg-green-50 rounded-xl border border-green-200 p-6">
              <h2 className="text-lg font-semibold text-green-800 mb-3">Resolution</h2>
              <p className="text-sm text-gray-700">{event.resolution}</p>
              {event.resolved_at && (
                <p className="text-xs text-gray-500 mt-3">Resolved: {event.resolved_at?.slice(0, 16)}</p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
              <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-3" />
              <p className="text-gray-500">This crisis event has not been resolved yet</p>
            </div>
          )}

          {event.closed_at && (
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-6">
              <h2 className="text-lg font-semibold text-slate-700 mb-2">Closed</h2>
              <p className="text-xs text-gray-500">Closed on {event.closed_at?.slice(0, 10)}</p>
            </div>
          )}
        </div>
      )}

      {/* Resolve Modal */}
      <Modal isOpen={showResolveModal} onClose={() => setShowResolveModal(false)} title="Resolve Crisis Event">
        <form onSubmit={handleResolve} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Resolution Details *</label>
            <textarea rows={4} required value={resolution} onChange={e => setResolution(e.target.value)} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" placeholder="Describe how the crisis was resolved..." />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowResolveModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Resolve</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
