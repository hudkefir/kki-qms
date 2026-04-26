import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShieldCheck, Search, ChevronDown, ChevronUp, Clock, AlertTriangle, CheckCircle, Users, Plus, X
} from 'lucide-react';
import { useFetch, apiPut, apiPost } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

const CAPA_STATUS_OPTIONS = ['open', 'investigating', 'action_defined', 'in_progress', 'pending_review', 'completed', 'overdue', 'closed'];

const CAPA_STATUS_STYLES = {
  open: 'bg-gray-100 text-gray-700 border-gray-200',
  investigating: 'bg-orange-100 text-orange-800 border-orange-200',
  action_defined: 'bg-cyan-100 text-cyan-800 border-cyan-200',
  in_progress: 'bg-blue-100 text-blue-800 border-blue-200',
  pending_review: 'bg-purple-100 text-purple-800 border-purple-200',
  completed: 'bg-green-100 text-green-700 border-green-200',
  overdue: 'bg-red-100 text-red-700 border-red-200',
  closed: 'bg-slate-100 text-slate-600 border-slate-200',
};

const CAPA_STATUS_LABELS = {
  open: 'Open',
  investigating: 'Investigating',
  action_defined: 'Actions Defined',
  in_progress: 'In Progress',
  pending_review: 'Pending Review',
  completed: 'Completed',
  overdue: 'Overdue',
  closed: 'Closed',
};

const SOURCE_LABELS = {
  change_request: 'Change Request',
  deviation: 'Deviation',
  ccr: 'CCR',
  complaint: 'Complaint',
  audit: 'Audit',
  other: 'Other',
};

const CAPA_CATEGORY_CONFIG = {
  product_quality: {
    label: 'Product Quality',
    desc: 'Product does not meet specs — taste, texture, pH, shelf life, CFU, appearance.',
    color: 'border-blue-300 bg-blue-50 hover:bg-blue-100',
    fields: [
      { key: 'affected_skus', label: 'Affected SKU(s)', type: 'text', placeholder: 'e.g. 630mL Original, 359mL Mango', required: true },
      { key: 'batch_numbers', label: 'Affected batch number(s)', type: 'text', placeholder: 'e.g. B2026-041, B2026-042' },
      { key: 'parameter_out_of_spec', label: 'Parameter out of spec', type: 'text', placeholder: 'e.g. pH 3.4 (spec: 3.8-4.3)', required: true },
      { key: 'test_results', label: 'Test results / evidence', type: 'textarea', placeholder: 'Lab results, sensory panel findings, customer feedback...' },
      { key: 'complaint_pattern', label: 'Complaint pattern (if applicable)', type: 'text', placeholder: 'e.g. 15 leaking complaints in Apr 2026' },
    ],
  },
  food_safety: {
    label: 'Food Safety',
    desc: 'Potential health hazard — pathogen, allergen, contamination, illness report.',
    color: 'border-red-300 bg-red-50 hover:bg-red-100',
    fields: [
      { key: 'hazard_type', label: 'Type of hazard', type: 'select', options: ['Biological (pathogen)', 'Chemical (allergen, cleaning agent)', 'Physical (foreign material)', 'Radiological', 'Other'], required: true },
      { key: 'affected_products', label: 'Affected products / lots', type: 'text', placeholder: 'e.g. All coconut kefir SKUs, Lot B2026-040', required: true },
      { key: 'customer_impact', label: 'Customer impact', type: 'select', options: ['Illness reported', 'No illness but potential risk', 'Product recall initiated', 'Precautionary hold', 'No customer impact yet'], required: true },
      { key: 'regulatory_notification', label: 'CFIA/regulatory notification needed?', type: 'select', options: ['Yes — already notified', 'Yes — pending', 'No — not required', 'Under assessment'], required: true },
      { key: 'retained_samples', label: 'Retained sample testing status', type: 'text', placeholder: 'e.g. Submitted to CREM Co Labs, results pending' },
    ],
  },
  gmp: {
    label: 'GMP Non-Conformance',
    desc: 'Failure to follow Good Manufacturing Practices — hygiene, dress code, documentation.',
    color: 'border-amber-300 bg-amber-50 hover:bg-amber-100',
    fields: [
      { key: 'sop_reference', label: 'Which SOP was not followed?', type: 'text', placeholder: 'e.g. KK-SOP-00200, KK-SOP-00201', required: true },
      { key: 'area_affected', label: 'Area of facility', type: 'text', placeholder: 'e.g. Production floor, filling area, storage', required: true },
      { key: 'personnel_involved', label: 'Personnel involved (if applicable)', type: 'text', placeholder: 'Role/position (not necessarily name)' },
      { key: 'observation_details', label: 'What was observed?', type: 'textarea', placeholder: 'Describe the non-conformance in detail...', required: true },
      { key: 'audit_finding', label: 'Was this from an audit?', type: 'select', options: ['Yes — internal audit', 'Yes — external audit (SGS)', 'Yes — customer audit', 'No — routine observation', 'No — complaint investigation'] },
    ],
  },
  packaging: {
    label: 'Packaging / Seal',
    desc: 'Seal failure, leaking, labelling error, packaging material issue.',
    color: 'border-purple-300 bg-purple-50 hover:bg-purple-100',
    fields: [
      { key: 'failure_mode', label: 'Type of packaging failure', type: 'select', options: ['Seal failure / leaking', 'Lid pop / bloating', 'Label error', 'Damaged container', 'Wrong packaging material', 'Torque out of spec', 'Other'], required: true },
      { key: 'affected_skus', label: 'Affected SKU(s)', type: 'text', placeholder: 'e.g. 630mL Original, 359mL Mango', required: true },
      { key: 'current_spec', label: 'Current specification', type: 'text', placeholder: 'e.g. Torque 12 in-lbs, standard PE liner' },
      { key: 'proposed_change', label: 'Proposed corrective change', type: 'text', placeholder: 'e.g. Increase to 14 in-lbs, switch to foamed PE liner' },
      { key: 'supplier_involved', label: 'Packaging supplier involved', type: 'text', placeholder: 'e.g. I.M. Packaging, Berlin Packaging' },
    ],
  },
  sanitation: {
    label: 'Sanitation',
    desc: 'Cleaning failure, environmental contamination, sanitation SOP non-compliance.',
    color: 'border-teal-300 bg-teal-50 hover:bg-teal-100',
    fields: [
      { key: 'area_equipment', label: 'Area / equipment affected', type: 'text', placeholder: 'e.g. Filling nozzle, fermentation vessel CV-003', required: true },
      { key: 'contamination_type', label: 'Type of contamination', type: 'select', options: ['Mold', 'Bacterial', 'Chemical residue', 'Biofilm', 'Visible soil/residue', 'ATP failure', 'Other'], required: true },
      { key: 'detection_method', label: 'How was it detected?', type: 'select', options: ['Environmental swab', 'ATP test', 'Visual inspection', 'Customer complaint', 'Routine audit', 'Product testing'], required: true },
      { key: 'cleaning_sop', label: 'Relevant cleaning SOP', type: 'text', placeholder: 'e.g. KK-SOP-00300, KK-SOP-00301' },
      { key: 'environmental_results', label: 'Environmental monitoring results', type: 'textarea', placeholder: 'Swab results, ATP readings, air plate counts...' },
    ],
  },
  process: {
    label: 'Process Control',
    desc: 'Process parameter deviation — fermentation, filling, temperature, timing.',
    color: 'border-indigo-300 bg-indigo-50 hover:bg-indigo-100',
    fields: [
      { key: 'process_step', label: 'Which process step?', type: 'select', options: ['Fermentation', 'Straining', 'Flavouring', 'Filling', 'Capping', 'Cooling', 'Storage', 'Other'], required: true },
      { key: 'parameter_name', label: 'Parameter that deviated', type: 'text', placeholder: 'e.g. Fermentation temperature, pH, fill volume', required: true },
      { key: 'expected_value', label: 'Expected / target value', type: 'text', placeholder: 'e.g. 22-25°C, pH 4.0-4.5' },
      { key: 'actual_value', label: 'Actual value observed', type: 'text', placeholder: 'e.g. 28°C, pH 3.6' },
      { key: 'frequency', label: 'Is this recurring?', type: 'select', options: ['First occurrence', 'Recurring — 2-3 times', 'Chronic — ongoing pattern', 'Unknown'] },
    ],
  },
  supplier: {
    label: 'Supplier Issue',
    desc: 'Supplier non-conformance — ingredient quality, documentation, delivery.',
    color: 'border-orange-300 bg-orange-50 hover:bg-orange-100',
    fields: [
      { key: 'supplier_name', label: 'Supplier name', type: 'text', placeholder: 'e.g. TI Foods, New World Imports, Beanwise', required: true },
      { key: 'material_name', label: 'Material / ingredient', type: 'text', placeholder: 'e.g. Aroy-D Coconut Milk, Monin Syrup', required: true },
      { key: 'nc_type', label: 'Type of non-conformance', type: 'select', options: ['COA out of spec', 'Wrong item delivered', 'Damaged/contaminated', 'Missing documentation', 'Late delivery', 'Allergen concern', 'Other'], required: true },
      { key: 'lot_numbers', label: 'Lot number(s)', type: 'text', placeholder: 'Supplier lot/batch numbers' },
      { key: 'supplier_response', label: 'Supplier response / action', type: 'textarea', placeholder: 'Has the supplier been contacted? What was their response?' },
    ],
  },
  equipment: {
    label: 'Equipment',
    desc: 'Equipment failure, calibration issue, maintenance gap.',
    color: 'border-gray-400 bg-gray-50 hover:bg-gray-100',
    fields: [
      { key: 'equipment_id', label: 'Equipment ID / name', type: 'text', placeholder: 'e.g. MT-01, BRITE tank, pH meter', required: true },
      { key: 'failure_type', label: 'Type of issue', type: 'select', options: ['Breakdown', 'Calibration drift', 'Wear/damage', 'Software error', 'Temp control failure', 'PM overdue', 'Other'], required: true },
      { key: 'impact_on_product', label: 'Impact on product', type: 'select', options: ['Product affected — on hold', 'Product affected — released', 'No product impact', 'Unknown'], required: true },
      { key: 'maintenance_action', label: 'Maintenance/repair action taken', type: 'textarea', placeholder: 'What was done to fix it?' },
    ],
  },
};

function CAPAStatusBadge({ status, isOverdue }) {
  const effectiveStatus = isOverdue ? 'overdue' : status;
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${CAPA_STATUS_STYLES[effectiveStatus] || CAPA_STATUS_STYLES.open}`}>
      {CAPA_STATUS_LABELS[effectiveStatus] || effectiveStatus}
    </span>
  );
}

const EMPTY_FORM = {
  title: '',
  description: '',
  source_type: 'deviation',
  source_id: '',
  classification: 'major',
  priority: 'medium',
  risk_assessment: 'medium',
  category: '',
  department: '',
  initiated_by: '',
  corrective_action: '',
  preventive_action: '',
  root_cause_analysis: '',
  investigation_details: '',
  verification_method: '',
  responsible_person: '',
  target_date: '',
  linked_change_request_id: '',
  linked_complaints_json: '[]',
};

export default function CAPAs() {
  const navigate = useNavigate();
  const { data: items, loading, error, refetch } = useFetch('/api/capas');
  const { data: allDeviations } = useFetch('/api/deviations');
  const { data: allComplaints } = useFetch('/api/complaints');
  const { data: allCcrs } = useFetch('/api/ccrs');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterSource, setFilterSource] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ ...EMPTY_FORM });
  const [createStep, setCreateStep] = useState(1);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState('');

  // Effectiveness modal
  const [showEffModal, setShowEffModal] = useState(false);
  const [effCapaId, setEffCapaId] = useState(null);
  const [effForm, setEffForm] = useState({});

  // Status update
  const [updatingId, setUpdatingId] = useState(null);

  const filtered = useMemo(() => {
    if (!items) return [];
    let list = [...items];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c =>
        c.capa_id?.toLowerCase().includes(s) ||
        c.title?.toLowerCase().includes(s) ||
        c.corrective_action?.toLowerCase().includes(s) ||
        c.responsible_person?.toLowerCase().includes(s) ||
        c.source_ref?.toLowerCase().includes(s)
      );
    }
    if (filterStatus) {
      if (filterStatus === 'overdue') {
        list = list.filter(c => c.isOverdue);
      } else {
        list = list.filter(c => c.status === filterStatus);
      }
    }
    if (filterSource) list = list.filter(c => c.source_type === filterSource);
    list.sort((a, b) => {
      const aVal = a[sortField] || '';
      const bVal = b[sortField] || '';
      const cmp = String(aVal).localeCompare(String(bVal));
      return sortDir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [items, search, filterStatus, filterSource, sortField, sortDir]);

  const handleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir('desc'); }
  };

  const SortIcon = ({ field }) => {
    if (sortField !== field) return <ChevronDown className="w-3 h-3 text-gray-300" />;
    return sortDir === 'asc' ? <ChevronUp className="w-3 h-3 text-navy-600" /> : <ChevronDown className="w-3 h-3 text-navy-600" />;
  };

  const handleStatusChange = async (capaId, newStatus) => {
    setUpdatingId(capaId);
    try {
      const updates = { status: newStatus };
      if (newStatus === 'completed') updates.actual_completion_date = new Date().toISOString().slice(0, 10);
      await apiPut(`/api/capas/${capaId}`, updates);
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setUpdatingId(null); }
  };

  const handleEffectiveness = async (e) => {
    e.preventDefault();
    try {
      await apiPost(`/api/capas/${effCapaId}/effectiveness`, effForm);
      setShowEffModal(false);
      setEffForm({});
      setEffCapaId(null);
      refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const openEffModal = (capaId) => {
    setEffCapaId(capaId);
    setEffForm({});
    setShowEffModal(true);
  };

  // Create CAPA
  const handleCreateOpen = () => {
    setCreateForm({ ...EMPTY_FORM });
    setCreateStep(1);
    setCreateError('');
    setShowCreate(true);
  };

  const handleCreateSubmit = async () => {
    if (!createForm.title.trim()) { setCreateError('Title is required'); return; }
    // Append category-specific fields to description
    const catConfig = CAPA_CATEGORY_CONFIG[createForm.category];
    if (catConfig) {
      let extra = '';
      for (const f of catConfig.fields) {
        if (createForm[f.key]) extra += '**' + f.label + ':** ' + createForm[f.key] + '\n';
      }
      if (extra) createForm.description = (createForm.description || '') + '\n\n--- Category Details ---\n' + extra;
    }
    if (!createForm.responsible_person.trim()) { setCreateError('Responsible person is required'); return; }
    if (!createForm.target_date) { setCreateError('Target date is required'); return; }
    if (!createForm.corrective_action.trim()) { setCreateError('Corrective action is required'); return; }

    setCreating(true);
    setCreateError('');
    try {
      const payload = { ...createForm };
      if (!payload.source_id) delete payload.source_id;
      if (!payload.linked_change_request_id) delete payload.linked_change_request_id;
      const result = await apiPost('/api/capas', payload);
      setShowCreate(false);
      refetch();
      navigate(`/capas/${result.id}`);
    } catch (err) {
      setCreateError(err.message || 'Failed to create CAPA');
    } finally {
      setCreating(false);
    }
  };

  const updateCreate = (field, value) => setCreateForm(f => ({ ...f, [field]: value }));

  if (loading) return <LoadingSpinner message="Loading CAPAs..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;

  const openCount = items?.filter(c => !['completed', 'closed'].includes(c.status)).length || 0;
  const overdueCount = items?.filter(c => c.isOverdue).length || 0;
  const completedCount = items?.filter(c => c.status === 'completed' || c.status === 'closed').length || 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500 font-medium">KK-SOP-01400</p>
          <h1 className="text-3xl font-bold text-gray-900">CAPAs</h1>
          <div className="mt-2 p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-sm text-emerald-800 max-w-2xl">
            <p className="font-semibold mb-1">What is a CAPA?</p>
            <p className="mb-2">A <strong>Corrective and Preventive Action (CAPA)</strong> is a systematic process to eliminate the root cause of a non-conformance and prevent recurrence. CAPAs are initiated when:</p>
            <ul className="list-disc ml-5 mb-2 space-y-0.5">
              <li>A CCR investigation reveals a systemic or recurring root cause</li>
              <li>A deviation from SOPs or GMP requirements is identified</li>
              <li>An internal or external audit finding requires corrective action</li>
              <li>Trend analysis shows a pattern across multiple complaints or batches</li>
              <li>A change request impacts product quality or safety</li>
            </ul>
            <p className="font-semibold mb-1">How to initiate:</p>
            <p>CAPAs are generated from CCRs, Deviations, or Change Requests. Define the <strong>corrective action</strong> (fix the immediate issue), the <strong>preventive action</strong> (stop it from happening again), assign a <strong>responsible person</strong> and <strong>target date</strong>, then verify effectiveness after implementation.</p>
          </div>
        </div>
        <button
          onClick={handleCreateOpen}
          className="flex items-center gap-2 px-5 py-3 bg-navy-800 text-white rounded-lg hover:bg-navy-900 transition-colors shadow-sm font-medium"
        >
          <Plus className="w-5 h-5" />
          New CAPA
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search CAPAs by title, ID, action, or person..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-navy-500"
            />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2">
            <option value="">All Statuses</option>
            {CAPA_STATUS_OPTIONS.map(s => <option key={s} value={s}>{CAPA_STATUS_LABELS[s]}</option>)}
          </select>
          <select value={filterSource} onChange={e => setFilterSource(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2">
            <option value="">All Sources</option>
            <option value="deviation">Deviation</option>
            <option value="ccr">CCR</option>
            <option value="complaint">Complaint</option>
            <option value="audit">Audit</option>
            <option value="change_request">Change Request</option>
            <option value="other">Other</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: items?.length || 0, icon: ShieldCheck, color: 'text-gray-900', bg: 'bg-gray-50' },
          { label: 'Open', value: openCount, icon: Clock, color: 'text-blue-600', bg: 'bg-blue-50' },
          { label: 'Overdue', value: overdueCount, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Completed', value: completedCount, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
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
                  { field: 'capa_id', label: 'CAPA ID' },
                  { field: 'title', label: 'Title' },
                  { field: 'source_ref', label: 'Source' },
                  { field: 'classification', label: 'Class' },
                  { field: 'responsible_person', label: 'Responsible' },
                  { field: 'target_date', label: 'Target Date' },
                  { field: 'status', label: 'Status' },
                  { field: 'actions', label: 'Actions' },
                ].map(col => (
                  <th
                    key={col.field}
                    onClick={col.field !== 'actions' ? () => handleSort(col.field) : undefined}
                    className={`px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider ${col.field !== 'actions' ? 'cursor-pointer hover:bg-gray-100' : ''} select-none`}
                  >
                    <div className="flex items-center gap-1">
                      {col.label}
                      {col.field !== 'actions' && <SortIcon field={col.field} />}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-gray-500">No CAPAs found. Click <strong>New CAPA</strong> to create one.</td>
                </tr>
              ) : (
                filtered.map(capa => (
                  <tr
                    key={capa.id}
                    className={`hover:bg-gray-50 transition-colors cursor-pointer ${capa.isOverdue ? 'bg-red-50/50' : ''}`}
                    onClick={() => navigate(`/capas/${capa.id}`)}
                  >
                    <td className="px-4 py-3 text-sm font-medium text-navy-700">{capa.capa_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate font-medium">{capa.title || '(No title)'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500">{SOURCE_LABELS[capa.source_type] || capa.source_type || ''}</span>
                        {capa.source_ref && (
                          <span className="text-xs text-navy-600">{capa.source_ref}</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${
                        capa.classification === 'critical' ? 'bg-red-100 text-red-700 border-red-200' :
                        capa.classification === 'major' ? 'bg-orange-100 text-orange-700 border-orange-200' :
                        'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }`}>
                        {capa.classification || 'major'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      <span className="flex items-center gap-1"><Users className="w-3 h-3" /> {capa.responsible_person}</span>
                    </td>
                    <td className={`px-4 py-3 text-sm ${capa.isOverdue ? 'text-red-600 font-semibold' : 'text-gray-600'}`}>
                      {capa.target_date}
                      {capa.isOverdue && <AlertTriangle className="inline w-3 h-3 ml-1" />}
                    </td>
                    <td className="px-4 py-3">
                      <CAPAStatusBadge status={capa.status} isOverdue={capa.isOverdue} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <select
                          value={capa.status}
                          onChange={e => { e.stopPropagation(); handleStatusChange(capa.id, e.target.value); }}
                          disabled={updatingId === capa.id}
                          className="text-xs border border-gray-200 rounded px-2 py-1"
                          onClick={e => e.stopPropagation()}
                        >
                          <option value="open">Open</option>
                          <option value="investigating">Investigating</option>
                          <option value="action_defined">Actions Defined</option>
                          <option value="in_progress">In Progress</option>
                          <option value="pending_review">Pending Review</option>
                          <option value="completed">Completed</option>
                          <option value="closed">Closed</option>
                        </select>
                        {['completed', 'in_progress'].includes(capa.status) && !capa.effectiveness_result && (
                          <button
                            onClick={(e) => { e.stopPropagation(); openEffModal(capa.id); }}
                            className="text-xs px-2 py-1 bg-purple-100 text-purple-700 rounded hover:bg-purple-200"
                          >
                            Check
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Effectiveness Modal */}
      <Modal isOpen={showEffModal} onClose={() => setShowEffModal(false)} title="Record Effectiveness Check">
        <form onSubmit={handleEffectiveness} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Result *</label>
            <select required value={effForm.effectiveness_result || ''} onChange={e => setEffForm({ ...effForm, effectiveness_result: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
              <option value="">Select...</option>
              <option value="effective">Effective</option>
              <option value="not_effective">Not Effective</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={3} value={effForm.effectiveness_notes || ''} onChange={e => setEffForm({ ...effForm, effectiveness_notes: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowEffModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-navy-800 text-white rounded-lg text-sm">Record</button>
          </div>
        </form>
      </Modal>

      {/* Create CAPA Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">New CAPA</h2>
                <p className="text-sm text-gray-500 mt-1">Step {createStep} of 3 — {createStep === 1 ? 'What type of issue?' : createStep === 2 ? (CAPA_CATEGORY_CONFIG[createForm.category]?.label || 'Details') + ' — Details & Actions' : 'Assignment & Verification'}</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Step indicators */}
            <div className="px-6 pt-4">
              <div className="flex items-center gap-2">
                {[1, 2, 3].map(step => (
                  <React.Fragment key={step}>
                    <button
                      onClick={() => setCreateStep(step)}
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                        createStep === step ? 'bg-navy-800 text-white' :
                        createStep > step ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-500'
                      }`}
                    >
                      {createStep > step ? '✓' : step}
                    </button>
                    {step < 3 && <div className={`flex-1 h-0.5 ${createStep > step ? 'bg-green-400' : 'bg-gray-200'}`} />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {/* Error */}
            {createError && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{createError}</div>
            )}

            {/* Form content */}
            <div className="px-6 py-5 space-y-5 max-h-[60vh] overflow-y-auto">
              {/* Step 1: Category Selection */}
              {createStep === 1 && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium">What type of issue requires a CAPA?</p>
                    <p className="text-xs text-blue-700 mt-1">Select the category. The form will adapt with fields specific to that type.</p>
                  </div>
                  <div className="grid grid-cols-1 gap-3">
                    {Object.entries(CAPA_CATEGORY_CONFIG).map(([key, cfg]) => (
                      <button key={key} onClick={() => { updateCreate('category', key); setCreateStep(2); }}
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
                  </div>
                </div>
              )}

              {/* Step 2: Category-Specific Details + Core Fields */}
              {createStep === 2 && (
                <div className="space-y-5">
                  {CAPA_CATEGORY_CONFIG[createForm.category] && (
                    <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                      <p className="text-sm text-blue-800"><strong>{CAPA_CATEGORY_CONFIG[createForm.category].label}</strong> — {CAPA_CATEGORY_CONFIG[createForm.category].desc}</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
                    <input type="text" value={createForm.title} onChange={e => updateCreate('title', e.target.value)}
                      placeholder="Brief description of the non-conformance..."
                      className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-navy-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
                    <textarea rows={3} value={createForm.description} onChange={e => updateCreate('description', e.target.value)}
                      placeholder="What happened? Where? When? Who detected it? What is affected?"
                      className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-navy-500" />
                  </div>

                  {/* Category-specific fields */}
                  {(CAPA_CATEGORY_CONFIG[createForm.category]?.fields || []).map(field => (
                    <div key={field.key}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{field.label} {field.required && '*'}</label>
                      {field.type === 'select' ? (
                        <select value={createForm[field.key] || ''} onChange={e => updateCreate(field.key, e.target.value)}
                          className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5">
                          <option value="">Select...</option>
                          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea rows={2} value={createForm[field.key] || ''} onChange={e => updateCreate(field.key, e.target.value)}
                          placeholder={field.placeholder || ''} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-navy-500" />
                      ) : (
                        <input type="text" value={createForm[field.key] || ''} onChange={e => updateCreate(field.key, e.target.value)}
                          placeholder={field.placeholder || ''} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-navy-500" />
                      )}
                    </div>
                  ))}

                  <div className="grid grid-cols-3 gap-4 pt-2 border-t border-gray-200">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Classification</label>
                      <select value={createForm.classification} onChange={e => updateCreate('classification', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5">
                        <option value="critical">Critical</option>
                        <option value="major">Major</option>
                        <option value="minor">Minor</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Priority</label>
                      <select value={createForm.priority} onChange={e => updateCreate('priority', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5">
                        <option value="high">High</option>
                        <option value="medium">Medium</option>
                        <option value="low">Low</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Source Type</label>
                      <select value={createForm.source_type} onChange={e => { updateCreate('source_type', e.target.value); updateCreate('source_id', ''); }}
                        className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5">
                        <option value="deviation">Deviation</option>
                        <option value="ccr">CCR</option>
                        <option value="complaint">Complaint</option>
                        <option value="audit">Audit</option>
                        <option value="other">Other</option>
                      </select>
                    </div>
                  </div>

                  {/* Link to source record */}
                  {createForm.source_type === 'deviation' && allDeviations && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Link to Deviation</label>
                      <select value={createForm.source_id || ''} onChange={e => updateCreate('source_id', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5">
                        <option value="">Select a deviation...</option>
                        {allDeviations.map(d => (
                          <option key={d.id} value={d.id}>{d.report_id} — {d.title?.slice(0, 60)}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {createForm.source_type === 'ccr' && allCcrs && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Link to CCR</label>
                      <select value={createForm.source_id || ''} onChange={e => updateCreate('source_id', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5">
                        <option value="">Select a CCR...</option>
                        {allCcrs.map(c => (
                          <option key={c.id} value={c.id}>{c.ccr_number} — {c.title?.slice(0, 60)}</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {createForm.source_type === 'complaint' && allComplaints && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Link to Complaint</label>
                      <select value={createForm.source_id || ''} onChange={e => updateCreate('source_id', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5">
                        <option value="">Select a complaint...</option>
                        {allComplaints.slice(0, 50).map(c => (
                          <option key={c.id} value={c.id}>{c.complaint_number} — {c.customer_name} ({c.issue_type})</option>
                        ))}
                      </select>
                    </div>
                  )}
                  {createForm.source_type === 'audit' && (
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Audit Reference</label>
                      <input type="text" value={createForm.source_id || ''} onChange={e => updateCreate('source_id', e.target.value)}
                        placeholder="e.g. SGS Audit Apr 2026, Internal Audit #3"
                        className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-navy-500" />
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Corrective Action *</label>
                    <p className="text-xs text-gray-500 mb-1">What will you do to fix the immediate problem?</p>
                    <textarea rows={3} value={createForm.corrective_action} onChange={e => updateCreate('corrective_action', e.target.value)}
                      placeholder="1. Immediate containment\n2. Root cause correction\n3. ..."
                      className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-navy-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Preventive Action</label>
                    <p className="text-xs text-gray-500 mb-1">What will prevent recurrence?</p>
                    <textarea rows={3} value={createForm.preventive_action} onChange={e => updateCreate('preventive_action', e.target.value)}
                      placeholder="1. System/process change\n2. Training/SOP update\n3. ..."
                      className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-navy-500" />
                  </div>
                </div>
              )}

              {/* Step 3: Assignment & Verification */}
              {createStep === 3 && (
                <>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Responsible Person *</label>
                      <input type="text" value={createForm.responsible_person} onChange={e => updateCreate('responsible_person', e.target.value)}
                        placeholder="Name of person responsible..."
                        className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-navy-500 focus:border-navy-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Initiated By</label>
                      <input type="text" value={createForm.initiated_by} onChange={e => updateCreate('initiated_by', e.target.value)}
                        placeholder="Who is initiating this CAPA?"
                        className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-navy-500 focus:border-navy-500" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Target Completion Date *</label>
                    <input type="date" value={createForm.target_date} onChange={e => updateCreate('target_date', e.target.value)}
                      className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-navy-500 focus:border-navy-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Verification Method</label>
                    <textarea rows={3} value={createForm.verification_method} onChange={e => updateCreate('verification_method', e.target.value)}
                      placeholder="How will you verify the actions were effective? (e.g. re-test, audit, monitoring period, reduced complaint rate...)"
                      className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-navy-500 focus:border-navy-500" />
                  </div>

                  {/* Summary card */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Review Summary</h3>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <div className="text-gray-500">Title:</div>
                      <div className="font-medium">{createForm.title || '—'}</div>
                      <div className="text-gray-500">Source:</div>
                      <div>{SOURCE_LABELS[createForm.source_type] || createForm.source_type} {createForm.source_id ? `#${createForm.source_id}` : ''}</div>
                      <div className="text-gray-500">Classification:</div>
                      <div className="capitalize">{createForm.classification}</div>
                      <div className="text-gray-500">Priority:</div>
                      <div className="capitalize">{createForm.priority}</div>
                      <div className="text-gray-500">Responsible:</div>
                      <div>{createForm.responsible_person || '—'}</div>
                      <div className="text-gray-500">Target Date:</div>
                      <div>{createForm.target_date || '—'}</div>
                    </div>
                    {createForm.corrective_action && (
                      <div className="mt-3">
                        <p className="text-gray-500 text-sm">Corrective Action:</p>
                        <p className="text-sm mt-1 whitespace-pre-line">{createForm.corrective_action.slice(0, 200)}{createForm.corrective_action.length > 200 ? '...' : ''}</p>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button
                onClick={() => createStep > 1 ? setCreateStep(s => s - 1) : setShowCreate(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100"
              >
                {createStep === 1 ? 'Cancel' : 'Back'}
              </button>
              <div className="flex gap-3">
                {createStep < 3 ? (
                  <button
                    onClick={() => setCreateStep(s => s + 1)}
                    className="px-5 py-2 text-sm font-medium text-white bg-navy-800 rounded-lg hover:bg-navy-900"
                  >
                    Next
                  </button>
                ) : (
                  <button
                    onClick={handleCreateSubmit}
                    disabled={creating}
                    className="px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2"
                  >
                    {creating ? 'Creating...' : '✓ Create CAPA'}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
