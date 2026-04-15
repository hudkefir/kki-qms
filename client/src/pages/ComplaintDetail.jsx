import React, { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Save, X, AlertCircle, ExternalLink, Camera, Trash2
} from 'lucide-react';
import LinkedDocuments from '../components/LinkedDocuments';
import { useFetch, apiPut, apiDelete } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import { SeverityBadge, ComplaintStatusBadge, PRODUCT_OPTIONS, ISSUE_TYPES, SEVERITY_OPTIONS, STATUS_OPTIONS, STATUS_LABELS } from './Complaints';

export default function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { data: complaint, loading, error, refetch } = useFetch(`/api/complaints/${id}`);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);

  const handleAdminDelete = async () => {
    if (!confirm(`Delete complaint ${complaint.complaint_number}? This cannot be undone.`)) return;
    try {
      await apiDelete(`/api/admin/complaints/${id}`);
      navigate('/complaints');
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  if (loading) return <LoadingSpinner message="Loading complaint..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;
  if (!complaint) return <div className="text-center py-16 text-gray-500">Complaint not found</div>;

  const startEdit = () => {
    setFormData({ ...complaint });
    setEditing(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const product = PRODUCT_OPTIONS.find(p => p.sku === formData.product_sku);
      await apiPut(`/api/complaints/${id}`, {
        ...formData,
        product_name: product?.name || formData.product_name,
      });
      setEditing(false);
      refetch();
    } catch (err) {
      alert('Error: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const infoFields = [
    { label: 'Complaint ID', value: complaint.complaint_number, mono: true },
    { label: 'Date Received', value: complaint.date_received, editField: 'date_received', type: 'date' },
    { label: 'Source', value: complaint.source, editField: 'source' },
    { label: 'Reporter', value: complaint.reporter, editField: 'reporter' },
    { label: 'Store/Location', value: complaint.store_location, editField: 'store_location' },
    { label: 'Product', value: `${complaint.product_sku} ${complaint.product_name}`, editField: 'product_sku', type: 'product_select' },
    { label: 'Lot Number', value: complaint.lot_number || '—', editField: 'lot_number', mono: true },
    { label: 'Best Before', value: complaint.best_before || '—', editField: 'best_before', type: 'date' },
    { label: 'Quantity Affected', value: complaint.quantity_affected || '—', editField: 'quantity_affected', type: 'number' },
    { label: 'Issue Type', value: complaint.issue_type, editField: 'issue_type', type: 'issue_select' },
  ];

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <button onClick={() => navigate('/complaints')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Complaints
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{complaint.complaint_number}</h1>
              <SeverityBadge severity={complaint.severity} />
              <ComplaintStatusBadge status={complaint.status} />
            </div>
            <p className="text-gray-600">{complaint.product_sku} {complaint.product_name} — {complaint.issue_type}</p>
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
            {hasRole('admin') && !editing && (
              <button onClick={handleAdminDelete} className="flex items-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700">
                <Trash2 className="w-4 h-4" /> Delete
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Info Grid */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Complaint Details</h2>
            <div className="grid grid-cols-2 gap-4">
              {infoFields.map(field => (
                <div key={field.label}>
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{field.label}</p>
                  {editing && field.editField ? (
                    field.type === 'product_select' ? (
                      <select value={formData.product_sku || ''} onChange={e => setFormData({ ...formData, product_sku: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-1.5">
                        {PRODUCT_OPTIONS.map(p => <option key={p.sku} value={p.sku}>{p.sku} {p.name}</option>)}
                      </select>
                    ) : field.type === 'issue_select' ? (
                      <select value={formData.issue_type || ''} onChange={e => setFormData({ ...formData, issue_type: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-1.5">
                        {ISSUE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    ) : (
                      <input type={field.type || 'text'} value={formData[field.editField] || ''} onChange={e => setFormData({ ...formData, [field.editField]: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-1.5" />
                    )
                  ) : (
                    <p className={`text-sm text-gray-900 ${field.mono ? 'font-mono' : ''}`}>{field.value}</p>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Severity & Status (editable) */}
          {editing && (
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Status & Severity</h2>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                  <select value={formData.severity || ''} onChange={e => setFormData({ ...formData, severity: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                    {SEVERITY_OPTIONS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                  <select value={formData.status || ''} onChange={e => setFormData({ ...formData, status: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
                    {STATUS_OPTIONS.map(s => <option key={s} value={s}>{STATUS_LABELS[s]}</option>)}
                  </select>
                </div>
              </div>
            </div>
          )}

          {/* Description */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Description</h2>
            {editing ? (
              <textarea rows={4} value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            ) : (
              <p className="text-sm text-gray-700 leading-relaxed">{complaint.description || 'No description provided.'}</p>
            )}
          </div>

          {/* Photos placeholder */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-3">Photos</h2>
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
              <Camera className="w-8 h-8 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Photo upload coming soon</p>
              <p className="text-xs text-gray-400 mt-1">Drag and drop or click to upload complaint photos</p>
            </div>
          </div>

          {/* Linked Documents */}
          <LinkedDocuments linkedType="complaint" linkedId={id} category="complaint" />
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Status Timeline */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-4">Status Progress</h3>
            <div className="space-y-3">
              {STATUS_OPTIONS.map((s, i) => {
                const statusIndex = STATUS_OPTIONS.indexOf(complaint.status);
                const isActive = i <= statusIndex;
                const isCurrent = s === complaint.status;
                return (
                  <div key={s} className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full flex-shrink-0 ${isCurrent ? 'bg-navy-600 ring-4 ring-navy-100' : isActive ? 'bg-green-500' : 'bg-gray-200'}`} />
                    <span className={`text-sm ${isCurrent ? 'font-semibold text-navy-700' : isActive ? 'text-gray-700' : 'text-gray-400'}`}>
                      {STATUS_LABELS[s]}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Linked CCR */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Linked CCR</h3>
            {complaint.linkedCCR ? (
              <Link to={`/ccrs/${complaint.linkedCCR.id}`} className="block p-3 border border-navy-100 bg-navy-50 rounded-lg hover:bg-navy-100 transition-colors group">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-navy-700">{complaint.linkedCCR.ccr_number}</span>
                  <ExternalLink className="w-3 h-3 text-navy-400 group-hover:text-navy-600" />
                </div>
                <p className="text-xs text-navy-600 mt-1">{complaint.linkedCCR.title}</p>
              </Link>
            ) : (
              <p className="text-sm text-gray-400">No CCR linked</p>
            )}
          </div>

          {/* Timestamps */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-3">Timestamps</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-700">{complaint.created_at?.slice(0, 10)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Updated</span>
                <span className="text-gray-700">{complaint.updated_at?.slice(0, 10)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
