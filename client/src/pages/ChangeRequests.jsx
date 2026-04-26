import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  GitPullRequest, Plus, Search, ChevronDown, ChevronUp, Clock, AlertTriangle, CheckCircle, FileText, X
} from 'lucide-react';
import { useFetch, apiPost } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

const CC_STATUS_OPTIONS = ['draft', 'pending_review', 'approved', 'rejected', 'implementing', 'monitoring', 'effectiveness_check', 'closed'];

const CC_STATUS_STYLES = {
  draft: 'bg-gray-100 text-gray-700 border-gray-200',
  pending_review: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  rejected: 'bg-red-100 text-red-700 border-red-200',
  implementing: 'bg-purple-100 text-purple-800 border-purple-200',
  monitoring: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  effectiveness_check: 'bg-orange-100 text-orange-800 border-orange-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
};

const CC_STATUS_LABELS = {
  draft: 'Draft',
  pending_review: 'Pending Review',
  approved: 'Approved',
  rejected: 'Rejected',
  implementing: 'Implementing',
  monitoring: 'Monitoring',
  effectiveness_check: 'Effectiveness Check',
  closed: 'Closed',
};

const CATEGORY_LABELS = {
  ingredient: 'Ingredient', process: 'Process', equipment: 'Equipment',
  packaging: 'Packaging', cleaning: 'Cleaning', document: 'Document',
  system: 'System', facility: 'Facility', ccp: 'CCP',
};

const CR_CATEGORY_CONFIG = {
  ingredient: {
    label: 'Ingredient / Supplier Change',
    desc: 'Change to an ingredient, raw material, or supplier — new supplier, reformulation, allergen change.',
    color: 'border-orange-300 bg-orange-50 hover:bg-orange-100',
    fields: [
      { key: 'current_ingredient', label: 'Current ingredient / supplier', type: 'text', placeholder: 'e.g. Aroy-D Coconut Milk via TI Foods', required: true },
      { key: 'proposed_change', label: 'Proposed change', type: 'text', placeholder: 'e.g. Add New World Imports as second supplier', required: true },
      { key: 'allergen_impact', label: 'Allergen impact?', type: 'select', options: ['No change to allergen profile', 'New allergen introduced', 'Allergen removed', 'Cross-contamination risk change', 'Under assessment'], required: true },
      { key: 'coa_spec_change', label: 'COA / specification change?', type: 'select', options: ['No — same spec', 'Yes — new spec needed', 'Pending comparison'] },
      { key: 'affected_products', label: 'Affected products', type: 'text', placeholder: 'e.g. All coconut kefir SKUs' },
    ],
  },
  process: {
    label: 'Process Change',
    desc: 'Change to manufacturing process — fermentation, filling, temperatures, times, equipment settings.',
    color: 'border-blue-300 bg-blue-50 hover:bg-blue-100',
    fields: [
      { key: 'current_process', label: 'Current process / parameter', type: 'text', placeholder: 'e.g. Grain-based fermentation at 22-25°C for 24h', required: true },
      { key: 'proposed_change', label: 'Proposed change', type: 'text', placeholder: 'e.g. Switch to DVS lyophilized starter culture', required: true },
      { key: 'ccp_impact', label: 'Does this affect any CCP?', type: 'select', options: ['No CCP affected', 'Yes — CCP limits may change', 'Yes — new CCP needed', 'Under assessment'], required: true },
      { key: 'validation_needed', label: 'Validation required?', type: 'select', options: ['Yes — full process validation', 'Yes — partial validation', 'No — minor parameter change', 'Under assessment'], required: true },
      { key: 'affected_sops', label: 'SOPs that need updating', type: 'text', placeholder: 'e.g. KK-SOP-00206, BPR-001, BPR-002' },
    ],
  },
  equipment: {
    label: 'Equipment Change',
    desc: 'New equipment, replacement, modification, or decommissioning.',
    color: 'border-gray-400 bg-gray-50 hover:bg-gray-100',
    fields: [
      { key: 'current_equipment', label: 'Current equipment', type: 'text', placeholder: 'e.g. Manual capping, pH meter model X', required: true },
      { key: 'proposed_change', label: 'Proposed change', type: 'text', placeholder: 'e.g. Automated torque capper, new pH probe', required: true },
      { key: 'qualification_needed', label: 'Installation/operational qualification needed?', type: 'select', options: ['Yes — IQ/OQ required', 'Yes — OQ only', 'No — like-for-like replacement', 'Under assessment'], required: true },
      { key: 'calibration_impact', label: 'Calibration program impact', type: 'select', options: ['New calibration needed', 'Existing calibration applies', 'N/A'] },
    ],
  },
  packaging: {
    label: 'Packaging Change',
    desc: 'Change to packaging materials, labels, seal technology, container format.',
    color: 'border-purple-300 bg-purple-50 hover:bg-purple-100',
    fields: [
      { key: 'current_packaging', label: 'Current packaging', type: 'text', placeholder: 'e.g. 630mL glass jar, standard PE liner, 12 in-lbs torque', required: true },
      { key: 'proposed_change', label: 'Proposed change', type: 'text', placeholder: 'e.g. Foamed PE liner, 14 in-lbs torque, 360mL format', required: true },
      { key: 'label_change', label: 'Label change required?', type: 'select', options: ['Yes — new label design', 'Yes — text/regulatory update', 'No — packaging only', 'N/A'], required: true },
      { key: 'seal_integrity_test', label: 'Seal integrity testing needed?', type: 'select', options: ['Yes — destructive test', 'Yes — non-destructive', 'No', 'Under assessment'] },
      { key: 'supplier_involved', label: 'Packaging supplier', type: 'text', placeholder: 'e.g. I.M. Packaging, Berlin Packaging, Lorpon Labels' },
    ],
  },
  document: {
    label: 'Document / SOP Change',
    desc: 'Update to SOPs, forms, HACCP plan, labels, or other controlled documents.',
    color: 'border-cyan-300 bg-cyan-50 hover:bg-cyan-100',
    fields: [
      { key: 'document_id', label: 'Document number', type: 'text', placeholder: 'e.g. KK-SOP-00300, KK-HACCP-001, KK-FRM-00900-A', required: true },
      { key: 'current_version', label: 'Current version', type: 'text', placeholder: 'e.g. v0.9.2' },
      { key: 'change_summary', label: 'Summary of changes', type: 'textarea', placeholder: 'What is being added, removed, or modified?', required: true },
      { key: 'reason_for_change', label: 'Reason for change', type: 'select', options: ['Regulatory requirement', 'Audit finding', 'Process improvement', 'Error correction', 'New process/product', 'Periodic review', 'Other'], required: true },
    ],
  },
  cleaning: {
    label: 'Cleaning / Sanitation Change',
    desc: 'Change to cleaning chemicals, procedures, frequencies, or verification methods.',
    color: 'border-teal-300 bg-teal-50 hover:bg-teal-100',
    fields: [
      { key: 'current_method', label: 'Current cleaning method', type: 'text', placeholder: 'e.g. SHS-900 at 200ppm, weekly CIP', required: true },
      { key: 'proposed_change', label: 'Proposed change', type: 'text', placeholder: 'e.g. Switch to Neuquat, daily CIP, add UV-C step', required: true },
      { key: 'chemical_change', label: 'Chemical/concentration change?', type: 'select', options: ['Yes — new chemical', 'Yes — concentration change', 'No — procedure change only', 'No — frequency change only'], required: true },
      { key: 'verification_method', label: 'Verification method', type: 'text', placeholder: 'e.g. ATP swab <200 RLU, visual inspection' },
    ],
  },
};

const CLASSIFICATION_STYLES = {
  minor: 'bg-green-100 text-green-700 border-green-200',
  major: 'bg-amber-100 text-amber-800 border-amber-200',
  critical: 'bg-red-100 text-red-700 border-red-200',
};

export function CCStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${CC_STATUS_STYLES[status] || CC_STATUS_STYLES.draft}`}>
      {CC_STATUS_LABELS[status] || status}
    </span>
  );
}

export function ClassificationBadge({ classification }) {
  if (!classification) return <span className="text-xs text-gray-400">—</span>;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${CLASSIFICATION_STYLES[classification] || ''}`}>
      {classification.charAt(0).toUpperCase() + classification.slice(1)}
    </span>
  );
}

export { CC_STATUS_OPTIONS, CC_STATUS_STYLES, CC_STATUS_LABELS, CATEGORY_LABELS, CLASSIFICATION_STYLES };

export default function ChangeRequests() {
  const navigate = useNavigate();
  const { data: items, loading, error, refetch } = useFetch('/api/change-requests');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClassification, setFilterClassification] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const [showModal, setShowModal] = useState(false);
  const [wizardStep, setWizardStep] = useState(1);
  const [form, setForm] = useState({ category: 'process' });
  const [submitting, setSubmitting] = useState(false);

  const filtered = useMemo(() => {
    if (!items) return [];
    let list = [...items];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c => c.request_id?.toLowerCase().includes(s) || c.title?.toLowerCase().includes(s) || c.initiator?.toLowerCase().includes(s));
    }
    if (filterStatus) list = list.filter(c => c.status === filterStatus);
    if (filterClassification) list = list.filter(c => c.classification === filterClassification);
    list.sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [items, search, filterStatus, filterClassification, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-navy-600" /> : <ChevronDown className="w-3 h-3 text-navy-600" />;
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await apiPost('/api/change-requests', form);
      setShowModal(false);
      setForm({ category: 'process' });
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSubmitting(false); }
  };

  if (loading) return <LoadingSpinner message="Loading Change Requests..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;

  const openCount = items?.filter(c => !['closed', 'rejected'].includes(c.status)).length || 0;
  const criticalCount = items?.filter(c => c.classification === 'critical').length || 0;
  const majorCount = items?.filter(c => c.classification === 'major').length || 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500 font-medium">KK-SOP-01400</p>
          <h1 className="text-3xl font-bold text-gray-900">Change Control</h1>
          <div className="mt-2 p-3 bg-purple-50 border border-purple-200 rounded-lg text-sm text-purple-800 max-w-2xl">
            <p className="font-semibold mb-1">What is a Change Request?</p>
            <p className="mb-2">A <strong>Change Request (CR)</strong> is a formal document required before making any planned modification to processes, equipment, materials, suppliers, or documentation that could impact product quality or safety. Change Control is required when:</p>
            <ul className="list-disc ml-5 mb-2 space-y-0.5">
              <li>Changing a raw material supplier or ingredient specification</li>
              <li>Modifying manufacturing equipment or production processes</li>
              <li>Updating SOPs, formulations, or packaging specifications</li>
              <li>Changing facility layout, storage conditions, or environmental controls</li>
              <li>Introducing new products, SKUs, or label changes</li>
            </ul>
            <p className="font-semibold mb-1">How to initiate:</p>
            <p>Click <strong>"New Change Request"</strong> above. Describe the proposed change, provide justification, assess the risk/impact, and submit for review. Changes must be approved before implementation. After implementation, verify effectiveness and close the CR.</p>
          </div>
        </div>
        <button onClick={() => setShowModal(true)} className="flex items-center gap-2 px-4 py-2 bg-navy-800 text-white rounded-lg text-sm font-medium hover:bg-navy-700 transition-colors">
          <Plus className="w-4 h-4" />
          New Change Request
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search change requests..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2">
            <option value="">All Statuses</option>
            {CC_STATUS_OPTIONS.map(s => <option key={s} value={s}>{CC_STATUS_LABELS[s]}</option>)}
          </select>
          <select value={filterClassification} onChange={e => setFilterClassification(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2">
            <option value="">All Classifications</option>
            <option value="minor">Minor</option>
            <option value="major">Major</option>
            <option value="critical">Critical</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: items?.length || 0, icon: GitPullRequest, color: 'text-gray-900', bg: 'bg-gray-50' },
          { label: 'Open', value: openCount, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Critical', value: criticalCount, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Major', value: majorCount, icon: FileText, color: 'text-amber-600', bg: 'bg-amber-50' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`${card.bg} p-2 rounded-lg`}>
                <card.icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div>
                <p className={`text-xl font-bold ${card.color}`}>{card.value}</p>
                <p className="text-xs text-gray-500">{card.label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                {[
                  { field: 'request_id', label: 'ID' },
                  { field: 'title', label: 'Title' },
                  { field: 'category', label: 'Category' },
                  { field: 'classification', label: 'Classification' },
                  { field: 'status', label: 'Status' },
                  { field: 'initiator', label: 'Initiator' },
                  { field: 'created_at', label: 'Date' },
                ].map(col => (
                  <th
                    key={col.field}
                    onClick={() => handleSort(col.field)}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none"
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      <SortIcon field={col.field} />
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-500">No change requests found</td>
                </tr>
              ) : (
                filtered.map(cr => (
                  <tr
                    key={cr.id}
                    onClick={() => navigate(`/change-requests/${cr.id}`)}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                  >
                    <td className="px-4 py-3 text-sm font-medium text-navy-700">{cr.request_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate">{cr.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{CATEGORY_LABELS[cr.category] || cr.category}</td>
                    <td className="px-4 py-3"><ClassificationBadge classification={cr.classification} /></td>
                    <td className="px-4 py-3"><CCStatusBadge status={cr.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{cr.initiator}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{cr.created_at?.slice(0, 10)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Change Request Wizard */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">New Change Request</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {wizardStep === 1 ? 'Step 1 of 2 — What type of change?' : 'Step 2 of 2 — ' + (CR_CATEGORY_CONFIG[form.category]?.label || CATEGORY_LABELS[form.category] || 'Details')}
                </p>
              </div>
              <button onClick={() => { setShowModal(false); setWizardStep(1); }} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            <div className="px-6 py-5 max-h-[65vh] overflow-y-auto">
              {/* Step 1: Category picker */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="p-4 bg-purple-50 border border-purple-200 rounded-lg">
                    <p className="text-sm text-purple-800 font-medium">What type of change are you proposing?</p>
                    <p className="text-xs text-purple-700 mt-1">Select the category. The form will adapt with fields specific to that type of change.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(CR_CATEGORY_CONFIG).map(([key, cfg]) => (
                      <button key={key} onClick={() => { setForm({ ...form, category: key }); setWizardStep(2); }}
                        className={`p-4 rounded-lg border-2 text-left transition-all ${cfg.color}`}>
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="text-sm font-bold text-gray-900">{cfg.label}</h4>
                            <p className="text-xs text-gray-600 mt-1">{cfg.desc}</p>
                            <p className="text-xs text-gray-400 mt-1 italic">→ You'll document: {cfg.fields.slice(0, 3).map(f => f.label.toLowerCase()).join(', ')}...</p>
                          </div>
                          <ChevronDown className="w-4 h-4 text-gray-400 -rotate-90 flex-shrink-0 mt-1" />
                        </div>
                      </button>
                    ))}
                    {/* Other categories without specific configs */}
                    {Object.entries(CATEGORY_LABELS).filter(([k]) => !CR_CATEGORY_CONFIG[k]).map(([key, label]) => (
                      <button key={key} onClick={() => { setForm({ ...form, category: key }); setWizardStep(2); }}
                        className="p-3 rounded-lg border-2 border-gray-200 text-left hover:border-gray-400 hover:bg-gray-50">
                        <h4 className="text-sm font-semibold text-gray-800">{label}</h4>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Step 2: Details */}
              {wizardStep === 2 && (
                <form onSubmit={handleCreate} className="space-y-5">
                  {CR_CATEGORY_CONFIG[form.category] && (
                    <div className="p-3 bg-purple-50 border border-purple-100 rounded-lg">
                      <p className="text-sm text-purple-800"><strong>{CR_CATEGORY_CONFIG[form.category].label}</strong> — {CR_CATEGORY_CONFIG[form.category].desc}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
                    <input type="text" required value={form.title || ''} onChange={e => setForm({ ...form, title: e.target.value })}
                      placeholder="Brief description of the proposed change..."
                      className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-navy-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Description / Justification *</label>
                    <textarea rows={3} required value={form.description || ''} onChange={e => setForm({ ...form, description: e.target.value })}
                      placeholder="Why is this change needed? What is the business reason, quality improvement, or regulatory requirement?"
                      className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-navy-500" />
                  </div>

                  {/* Category-specific fields */}
                  {(CR_CATEGORY_CONFIG[form.category]?.fields || []).map(field => (
                    <div key={field.key}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{field.label} {field.required && '*'}</label>
                      {field.type === 'select' ? (
                        <select value={form[field.key] || ''} onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                          className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5">
                          <option value="">Select...</option>
                          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea rows={2} value={form[field.key] || ''} onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                          placeholder={field.placeholder || ''} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-navy-500" />
                      ) : (
                        <input type="text" value={form[field.key] || ''} onChange={e => setForm({ ...form, [field.key]: e.target.value })}
                          placeholder={field.placeholder || ''} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-navy-500" />
                      )}
                    </div>
                  ))}

                  <div className="grid grid-cols-2 gap-4 pt-2 border-t border-gray-200">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Initiator *</label>
                      <input type="text" required value={form.initiator || ''} onChange={e => setForm({ ...form, initiator: e.target.value })}
                        placeholder="Your name" className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Proposed Effective Date</label>
                      <input type="date" value={form.proposed_effective_date || ''} onChange={e => setForm({ ...form, proposed_effective_date: e.target.value })}
                        className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5" />
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={form.is_emergency || false} onChange={e => setForm({ ...form, is_emergency: e.target.checked })} className="rounded border-gray-300" />
                      Emergency Change
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={form.training_required || false} onChange={e => setForm({ ...form, training_required: e.target.checked })} className="rounded border-gray-300" />
                      Training Required
                    </label>
                  </div>

                  <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                    <button type="button" onClick={() => setWizardStep(1)}
                      className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100">
                      Back
                    </button>
                    <button type="submit" disabled={submitting}
                      className="px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50">
                      {submitting ? 'Creating...' : '✓ Create Change Request'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Footer for step 1 */}
            {wizardStep === 1 && (
              <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
                <button onClick={() => { setShowModal(false); setWizardStep(1); }}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100">
                  Cancel
                </button>
                <div />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
