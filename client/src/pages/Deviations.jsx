import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertOctagon, Plus, Search, ChevronDown, ChevronUp, Clock, AlertTriangle, CheckCircle, FileText, X,
  Thermometer, Beaker, FlaskConical, Wrench, Truck, ShieldAlert, Bug
} from 'lucide-react';
import { useFetch, apiPost } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

const DEV_STATUS_OPTIONS = ['reported', 'under_investigation', 'capa_defined', 'closed'];
const DEV_STATUS_STYLES = {
  reported: 'bg-red-100 text-red-700 border-red-200',
  under_investigation: 'bg-amber-100 text-amber-700 border-amber-200',
  capa_defined: 'bg-blue-100 text-blue-700 border-blue-200',
  closed: 'bg-green-100 text-green-700 border-green-200',
};
const DEV_STATUS_LABELS = {
  reported: 'Reported',
  under_investigation: 'Under Investigation',
  capa_defined: 'CAPA Defined',
  closed: 'Closed',
};

const DEV_CATEGORY_LABELS = {
  process: 'Process Deviation',
  environmental: 'Environmental Control Failure',
  ccp: 'CCP / Critical Limit Deviation',
  sanitation: 'Sanitation / Cleaning Deviation',
  equipment: 'Equipment Malfunction',
  supplier_ingredient: 'Supplier / Ingredient Non-Conformance',
  product_spec: 'Product Specification Deviation',
  documentation: 'Documentation / Record Error',
  sop_bpr: 'SOP/BPR Non-Compliance',
  packaging: 'Packaging / Labelling Deviation',
  storage_transport: 'Storage / Cold Chain Deviation',
  pest: 'Pest Control Incident',
  other: 'Other',
};

const DEV_CATEGORY_ICONS = {
  process: FlaskConical,
  environmental: Thermometer,
  ccp: ShieldAlert,
  sanitation: Beaker,
  equipment: Wrench,
  supplier_ingredient: Truck,
  product_spec: FileText,
  documentation: FileText,
  sop_bpr: FileText,
  packaging: FileText,
  storage_transport: Thermometer,
  pest: Bug,
  other: AlertOctagon,
};

const DEV_CATEGORY_DESCRIPTIONS = {
  process: 'A deviation from standard production process parameters (fermentation time, temperature, pH, mixing speed, fill volume, etc.)',
  environmental: 'Environmental monitoring failure — air quality, surface swab, temperature excursion in production area, humidity out of spec.',
  ccp: 'A Critical Control Point limit was exceeded or not met. This requires immediate investigation and product disposition decision.',
  sanitation: 'Cleaning or sanitation procedure was not followed correctly, missed, or failed verification (ATP, visual, chemical concentration).',
  equipment: 'Equipment malfunction, breakdown, calibration failure, or unexpected behavior affecting product quality or safety.',
  supplier_ingredient: 'Incoming ingredient or material does not meet specifications — COA failure, visual defect, wrong item received, contamination.',
  product_spec: 'Finished product does not meet quality specifications — pH, texture, taste, appearance, CFU count, shelf life, etc.',
  documentation: 'Incorrect, incomplete, or missing documentation — batch records, logbooks, forms, signatures, dates.',
  sop_bpr: 'An SOP or Batch Production Record procedure was not followed as written.',
  packaging: 'Packaging or labelling error — wrong label, missing info, damaged packaging, seal failure, incorrect lot/date code.',
  storage_transport: 'Cold chain break, temperature excursion during storage or transport, incorrect storage conditions.',
  pest: 'Pest sighting, evidence of pest activity, or pest control system failure.',
  other: 'Deviation that does not fit the above categories.',
};

// Category-specific fields
const CATEGORY_FIELDS = {
  process: [
    { key: 'process_step', label: 'Which process step?', type: 'select', options: ['Fermentation', 'Straining', 'Flavouring', 'Filling', 'Capping', 'Labelling', 'Cooling', 'Other'], required: true },
    { key: 'parameter_name', label: 'Parameter that deviated', type: 'text', placeholder: 'e.g. Fermentation temperature, pH, fill volume...', required: true },
    { key: 'expected_value', label: 'Expected / target value', type: 'text', placeholder: 'e.g. 22-25°C, pH 4.0-4.5, 630mL ±10mL', required: true },
    { key: 'actual_value', label: 'Actual value observed', type: 'text', placeholder: 'e.g. 28°C, pH 3.6, 615mL', required: true },
    { key: 'batch_numbers', label: 'Affected batch number(s)', type: 'text', placeholder: 'e.g. B2026-041, B2026-042' },
    { key: 'duration', label: 'How long was the deviation?', type: 'text', placeholder: 'e.g. 2 hours, overnight, full batch' },
  ],
  environmental: [
    { key: 'monitoring_type', label: 'Monitoring type', type: 'select', options: ['Air Plate (settle)', 'Air Plate (active)', 'Surface Swab', 'ATP Test', 'Temperature Monitoring', 'Humidity', 'Water Testing', 'Other'], required: true },
    { key: 'sample_location', label: 'Sample location / zone', type: 'text', placeholder: 'e.g. Filling area, Zone 1, Cold room sensor #3', required: true },
    { key: 'expected_value', label: 'Acceptable limit', type: 'text', placeholder: 'e.g. <50 CFU/plate, <200 RLU, 2-4°C', required: true },
    { key: 'actual_value', label: 'Result obtained', type: 'text', placeholder: 'e.g. 120 CFU/plate, 450 RLU, 8°C', required: true },
    { key: 'test_date', label: 'Date of test / reading', type: 'date', required: true },
    { key: 'organism_identified', label: 'Organism identified (if applicable)', type: 'text', placeholder: 'e.g. Listeria spp., yeast/mold, coliform' },
  ],
  ccp: [
    { key: 'ccp_number', label: 'CCP number', type: 'select', options: ['CCP-1 (Receiving Temp)', 'CCP-2 (Fermentation pH)', 'CCP-3 (Cold Storage Temp)', 'CCP-4 (Labelling Allergens)', 'CCP-5 (Glass Jar Inspection)', 'Other'], required: true },
    { key: 'critical_limit', label: 'Critical limit', type: 'text', placeholder: 'e.g. ≤4°C, pH ≤4.6', required: true },
    { key: 'actual_value', label: 'Actual value measured', type: 'text', placeholder: 'e.g. 7°C, pH 5.1', required: true },
    { key: 'monitoring_record', label: 'Monitoring record / log reference', type: 'text', placeholder: 'e.g. Cold storage log, BPR-001 page 3' },
    { key: 'batch_numbers', label: 'Affected batch(es)', type: 'text', placeholder: 'e.g. B2026-041', required: true },
    { key: 'product_held', label: 'Product placed on hold?', type: 'select', options: ['Yes — all affected product held', 'Yes — partial hold', 'No — product already shipped', 'No — deviation does not affect safety'], required: true },
  ],
  sanitation: [
    { key: 'sanitation_area', label: 'Area / equipment', type: 'text', placeholder: 'e.g. Fermentation vessel CV-003, filling nozzle, floor drain', required: true },
    { key: 'sop_reference', label: 'SOP that was not followed', type: 'text', placeholder: 'e.g. KK-SOP-00300, KK-SOP-00301', required: true },
    { key: 'verification_method', label: 'How was the failure detected?', type: 'select', options: ['Visual inspection', 'ATP swab test', 'Surface swab culture', 'Chemical concentration test', 'Routine audit', 'Customer complaint', 'Other'], required: true },
    { key: 'expected_value', label: 'Expected result', type: 'text', placeholder: 'e.g. <200 RLU, visually clean, 200ppm sanitizer' },
    { key: 'actual_value', label: 'Actual result', type: 'text', placeholder: 'e.g. 800 RLU, visible residue, 50ppm sanitizer' },
    { key: 'recleaned', label: 'Was the area re-cleaned?', type: 'select', options: ['Yes — re-cleaned and re-verified', 'Yes — re-cleaned, not re-verified', 'No — production continued', 'No — production stopped'], required: true },
  ],
  equipment: [
    { key: 'equipment_id', label: 'Equipment ID / name', type: 'text', placeholder: 'e.g. MT-01, BRITE tank, Capping machine', required: true },
    { key: 'failure_type', label: 'Type of failure', type: 'select', options: ['Breakdown / malfunction', 'Calibration out of spec', 'Wear / damage', 'Electrical / power', 'Temperature control failure', 'Pressure / vacuum issue', 'Software / control error', 'Other'], required: true },
    { key: 'impact_on_product', label: 'Impact on product', type: 'select', options: ['Product affected — on hold', 'Product affected — released with justification', 'No product impact', 'Unknown — investigating'], required: true },
    { key: 'batch_numbers', label: 'Affected batch(es)', type: 'text', placeholder: 'e.g. B2026-041' },
    { key: 'maintenance_action', label: 'Maintenance action taken', type: 'textarea', placeholder: 'What repair / fix was done?' },
    { key: 'pm_up_to_date', label: 'Was PM schedule up to date?', type: 'select', options: ['Yes', 'No — overdue', 'N/A — new equipment'] },
  ],
  supplier_ingredient: [
    { key: 'supplier_name', label: 'Supplier name', type: 'text', placeholder: 'e.g. New World Imports, TI Foods, Beanwise', required: true },
    { key: 'material_name', label: 'Material / ingredient', type: 'text', placeholder: 'e.g. Aroy-D Coconut Milk, Monin Mango Syrup', required: true },
    { key: 'lot_number', label: 'Lot / batch number', type: 'text', placeholder: 'Supplier lot number', required: true },
    { key: 'nonconformance_type', label: 'Type of non-conformance', type: 'select', options: ['COA out of spec', 'Visual defect', 'Wrong item received', 'Damaged packaging', 'Contamination / foreign material', 'Allergen concern', 'Expired / near-expiry', 'Missing documentation', 'Other'], required: true },
    { key: 'expected_value', label: 'Specification', type: 'text', placeholder: 'What was expected?' },
    { key: 'actual_value', label: 'What was received', type: 'text', placeholder: 'What was actually found?' },
    { key: 'disposition', label: 'Material disposition', type: 'select', options: ['Rejected — returned to supplier', 'Rejected — destroyed', 'Accepted with deviation', 'On hold — pending decision', 'Used before issue detected'], required: true },
  ],
  product_spec: [
    { key: 'product_name', label: 'Product / SKU', type: 'select', options: ['630mL Original Coconut Kefir', '359mL Original Coconut Kefir', '359mL Mango Coconut Kefir', '359mL Guava Coconut Kefir', '359mL Strawberry Coconut Kefir', '359mL Wildberry Coconut Kefir', 'Other'], required: true },
    { key: 'parameter_name', label: 'Parameter out of spec', type: 'text', placeholder: 'e.g. pH, viscosity, taste, colour, CFU count', required: true },
    { key: 'expected_value', label: 'Specification range', type: 'text', placeholder: 'e.g. pH 3.8-4.3', required: true },
    { key: 'actual_value', label: 'Actual result', type: 'text', placeholder: 'e.g. pH 3.4', required: true },
    { key: 'batch_numbers', label: 'Affected batch(es)', type: 'text', placeholder: 'e.g. B2026-041', required: true },
    { key: 'test_method', label: 'Test method used', type: 'text', placeholder: 'e.g. pH meter, sensory panel, external lab COA' },
  ],
  storage_transport: [
    { key: 'location', label: 'Location of excursion', type: 'select', options: ['Walk-in cooler', 'Fridge #1', 'Fridge #2', 'Shipping vehicle', 'Customer storage', 'Warehouse', 'Other'], required: true },
    { key: 'expected_value', label: 'Required temperature range', type: 'text', placeholder: 'e.g. 0-4°C', required: true },
    { key: 'actual_value', label: 'Temperature recorded', type: 'text', placeholder: 'e.g. 8°C for 3 hours', required: true },
    { key: 'duration', label: 'Duration of excursion', type: 'text', placeholder: 'e.g. 45 minutes, 3 hours, overnight', required: true },
    { key: 'product_affected', label: 'Product affected', type: 'text', placeholder: 'e.g. 48 jars of 630mL Original, Batch B2026-041' },
    { key: 'data_source', label: 'How was it detected?', type: 'select', options: ['Temperature logger/alarm', 'Manual check', 'Customer complaint', 'Delivery driver report', 'Routine monitoring'], required: true },
  ],
  packaging: [
    { key: 'packaging_type', label: 'Type of issue', type: 'select', options: ['Wrong label applied', 'Missing information on label', 'Incorrect lot/date code', 'Seal failure', 'Damaged packaging', 'Wrong container size', 'Allergen declaration error', 'Other'], required: true },
    { key: 'product_name', label: 'Product / SKU affected', type: 'text', placeholder: 'e.g. 359mL Mango Coconut Kefir', required: true },
    { key: 'batch_numbers', label: 'Affected batch(es)', type: 'text', placeholder: 'e.g. B2026-041', required: true },
    { key: 'units_affected', label: 'Number of units affected', type: 'text', placeholder: 'e.g. 120 jars, entire batch' },
    { key: 'detected_by', label: 'How was it detected?', type: 'select', options: ['QC visual check', 'Customer complaint', 'Retail audit', 'Internal audit', 'Other'], required: true },
  ],
  pest: [
    { key: 'pest_type', label: 'Type of pest', type: 'select', options: ['Rodent', 'Insect — flying', 'Insect — crawling', 'Bird', 'Other'], required: true },
    { key: 'evidence_type', label: 'Evidence found', type: 'select', options: ['Live sighting', 'Droppings', 'Damage to product/packaging', 'Trap catch', 'Nest/harbourage', 'Other'], required: true },
    { key: 'area', label: 'Area of facility', type: 'text', placeholder: 'e.g. Production floor, dry storage, receiving dock', required: true },
    { key: 'pest_company_notified', label: 'Pest control company notified?', type: 'select', options: ['Yes — same day', 'Yes — next business day', 'No — handled internally', 'Not yet'], required: true },
    { key: 'product_at_risk', label: 'Any product at risk?', type: 'select', options: ['Yes — product quarantined', 'Yes — product destroyed', 'No — no product in area', 'Unknown'], required: true },
  ],
};

function DevStatusBadge({ status }) {
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${DEV_STATUS_STYLES[status] || DEV_STATUS_STYLES.reported}`}>
      {DEV_STATUS_LABELS[status] || status}
    </span>
  );
}

function DevClassificationBadge({ classification }) {
  const styles = { critical: 'bg-red-100 text-red-700 border-red-200', major: 'bg-amber-100 text-amber-700 border-amber-200', minor: 'bg-yellow-100 text-yellow-700 border-yellow-200' };
  return classification ? (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${styles[classification] || styles.major}`}>
      {classification?.charAt(0).toUpperCase() + classification?.slice(1)}
    </span>
  ) : null;
}

export { DevStatusBadge, DevClassificationBadge, DEV_STATUS_OPTIONS, DEV_STATUS_STYLES, DEV_STATUS_LABELS, DEV_CATEGORY_LABELS };

export default function Deviations() {
  const navigate = useNavigate();
  const { data: items, loading, error, refetch } = useFetch('/api/deviations');

  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterClassification, setFilterClassification] = useState('');
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');

  // Create wizard state
  const [showWizard, setShowWizard] = useState(false);
  const [wizardStep, setWizardStep] = useState(1); // 1=category, 2=details, 3=assessment
  const [form, setForm] = useState({ category: '', discovered_at: new Date().toISOString().slice(0, 10) });
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  const filtered = useMemo(() => {
    if (!items) return [];
    let list = [...items];
    if (search) {
      const s = search.toLowerCase();
      list = list.filter(c => c.report_id?.toLowerCase().includes(s) || c.title?.toLowerCase().includes(s) || c.discovered_by?.toLowerCase().includes(s));
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

  const handleOpenWizard = () => {
    setForm({ category: '', discovered_at: new Date().toISOString().slice(0, 10) });
    setWizardStep(1);
    setCreateError('');
    setShowWizard(true);
  };

  const handleSelectCategory = (cat) => {
    setForm({ ...form, category: cat });
    setWizardStep(2);
  };

  const handleCreate = async () => {
    if (!form.title?.trim()) { setCreateError('Title is required'); return; }
    if (!form.discovered_by?.trim()) { setCreateError('Discovered By is required'); return; }

    setSubmitting(true);
    setCreateError('');
    try {
      // Build description from category-specific fields
      const catFields = CATEGORY_FIELDS[form.category] || [];
      let extraDetails = '';
      for (const f of catFields) {
        if (form[f.key]) {
          extraDetails += `**${f.label}:** ${form[f.key]}\n`;
        }
      }
      const fullDescription = (form.description || '') + (extraDetails ? '\n\n--- Category-Specific Details ---\n' + extraDetails : '');

      const payload = {
        ...form,
        description: fullDescription,
      };
      // Remove category-specific fields from payload (they're in the description now)
      for (const f of catFields) delete payload[f.key];

      const result = await apiPost('/api/deviations', payload);
      setShowWizard(false);
      refetch();
      if (result?.id) navigate(`/deviations/${result.id}`);
    } catch (err) {
      setCreateError(err.message || 'Failed to create');
    } finally {
      setSubmitting(false);
    }
  };

  const updateForm = (key, value) => setForm(f => ({ ...f, [key]: value }));

  if (loading) return <LoadingSpinner message="Loading Deviations..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;

  const openCount = items?.filter(d => d.status !== 'closed').length || 0;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <p className="text-sm text-gray-500 font-medium">KK-SOP-01400</p>
          <h1 className="text-3xl font-bold text-gray-900">Deviations</h1>
          <div className="mt-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800 max-w-2xl">
            <p className="font-semibold mb-1">What is a Deviation?</p>
            <p className="mb-2">A <strong>deviation</strong> is any departure from approved procedures, specifications, or established standards. All deviations must be documented, investigated, and resolved — even if product is not affected.</p>
            <p className="font-semibold mb-1">When to report:</p>
            <ul className="list-disc ml-5 space-y-0.5">
              <li>Process parameter outside approved range</li>
              <li>Environmental monitoring failure or excursion</li>
              <li>CCP critical limit exceeded</li>
              <li>Equipment malfunction during production</li>
              <li>Supplier/ingredient non-conformance</li>
              <li>Any SOP not followed as written</li>
            </ul>
          </div>
        </div>
        <button onClick={handleOpenWizard} className="flex items-center gap-2 px-5 py-3 bg-navy-800 text-white rounded-lg hover:bg-navy-900 transition-colors shadow-sm font-medium">
          <Plus className="w-5 h-5" />
          Report Deviation
        </button>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input type="text" placeholder="Search deviations..." value={search} onChange={e => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-navy-500 focus:border-navy-500" />
          </div>
          <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2">
            <option value="">All Statuses</option>
            {DEV_STATUS_OPTIONS.map(s => <option key={s} value={s}>{DEV_STATUS_LABELS[s]}</option>)}
          </select>
          <select value={filterClassification} onChange={e => setFilterClassification(e.target.value)} className="border border-gray-300 rounded-lg text-sm px-3 py-2">
            <option value="">All Classifications</option>
            <option value="critical">Critical</option>
            <option value="major">Major</option>
            <option value="minor">Minor</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total', value: items?.length || 0, icon: AlertOctagon, color: 'text-gray-900', bg: 'bg-gray-50' },
          { label: 'Open', value: openCount, icon: Clock, color: 'text-amber-600', bg: 'bg-amber-50' },
          { label: 'Critical', value: items?.filter(d => d.classification === 'critical').length || 0, icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Closed', value: items?.filter(d => d.status === 'closed').length || 0, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
        ].map(card => (
          <div key={card.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className={`${card.bg} p-2 rounded-lg`}><card.icon className={`w-4 h-4 ${card.color}`} /></div>
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
                  { field: 'report_id', label: 'DEV #' },
                  { field: 'title', label: 'Title' },
                  { field: 'category', label: 'Category' },
                  { field: 'classification', label: 'Class' },
                  { field: 'status', label: 'Status' },
                  { field: 'discovered_by', label: 'Discovered By' },
                  { field: 'discovered_at', label: 'Date' },
                ].map(col => (
                  <th key={col.field} onClick={() => handleSort(col.field)}
                    className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none">
                    <div className="flex items-center gap-1">{col.label} <SortIcon field={col.field} /></div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-gray-500">No deviations found. Click <strong>Report Deviation</strong> to create one.</td></tr>
              ) : (
                filtered.map(dev => (
                  <tr key={dev.id} onClick={() => navigate(`/deviations/${dev.id}`)} className="hover:bg-gray-50 cursor-pointer transition-colors">
                    <td className="px-4 py-3 text-sm font-medium text-navy-700">{dev.report_id}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 max-w-xs truncate font-medium">{dev.title}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{DEV_CATEGORY_LABELS[dev.category] || dev.category}</td>
                    <td className="px-4 py-3"><DevClassificationBadge classification={dev.classification} /></td>
                    <td className="px-4 py-3"><DevStatusBadge status={dev.status} /></td>
                    <td className="px-4 py-3 text-sm text-gray-600">{dev.discovered_by}</td>
                    <td className="px-4 py-3 text-sm text-gray-600">{dev.discovered_at}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create Deviation Wizard */}
      {showWizard && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-start justify-center overflow-y-auto py-8">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl mx-4">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Report Deviation</h2>
                <p className="text-sm text-gray-500 mt-1">
                  {wizardStep === 1 ? 'Step 1 of 3 — What type of deviation?' :
                   wizardStep === 2 ? `Step 2 of 3 — ${DEV_CATEGORY_LABELS[form.category] || 'Details'}` :
                   'Step 3 of 3 — Assessment & Immediate Action'}
                </p>
              </div>
              <button onClick={() => setShowWizard(false)} className="p-2 hover:bg-gray-100 rounded-lg">
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>

            {/* Step indicators */}
            <div className="px-6 pt-4">
              <div className="flex items-center gap-2">
                {[1, 2, 3].map(step => (
                  <React.Fragment key={step}>
                    <button onClick={() => step < wizardStep && setWizardStep(step)}
                      className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-semibold transition-colors ${
                        wizardStep === step ? 'bg-navy-800 text-white' :
                        wizardStep > step ? 'bg-green-500 text-white cursor-pointer' : 'bg-gray-200 text-gray-500'
                      }`}>
                      {wizardStep > step ? '✓' : step}
                    </button>
                    {step < 3 && <div className={`flex-1 h-0.5 ${wizardStep > step ? 'bg-green-400' : 'bg-gray-200'}`} />}
                  </React.Fragment>
                ))}
              </div>
            </div>

            {createError && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">{createError}</div>
            )}

            <div className="px-6 py-5 max-h-[60vh] overflow-y-auto">
              {/* Step 1: Category Selection */}
              {wizardStep === 1 && (
                <div className="space-y-4">
                  <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-sm text-blue-800 font-medium">👋 What type of deviation occurred?</p>
                    <p className="text-xs text-blue-700 mt-1">Select the category that best describes what happened. The form will adapt with fields specific to that type of deviation.</p>
                  </div>

                  {/* Most Common — highlighted */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Most Common</p>
                    <div className="grid grid-cols-1 gap-3">
                      {[
                        { key: 'process', color: 'border-blue-300 bg-blue-50 hover:bg-blue-100', iconColor: 'text-blue-600', textColor: 'text-blue-800', descColor: 'text-blue-700', arrow: 'You\'ll document: which process step, expected vs actual values, affected batches, duration.' },
                        { key: 'environmental', color: 'border-teal-300 bg-teal-50 hover:bg-teal-100', iconColor: 'text-teal-600', textColor: 'text-teal-800', descColor: 'text-teal-700', arrow: 'You\'ll document: monitoring type, sample location, acceptable limit vs result, organism found.' },
                        { key: 'ccp', color: 'border-red-300 bg-red-50 hover:bg-red-100', iconColor: 'text-red-600', textColor: 'text-red-800', descColor: 'text-red-700', arrow: 'You\'ll document: which CCP, critical limit vs actual, affected batches, product hold status. ⚠️ Requires immediate investigation.' },
                        { key: 'sanitation', color: 'border-purple-300 bg-purple-50 hover:bg-purple-100', iconColor: 'text-purple-600', textColor: 'text-purple-800', descColor: 'text-purple-700', arrow: 'You\'ll document: area/equipment, SOP not followed, how failure was detected, re-cleaning status.' },
                      ].map(({ key, color, iconColor, textColor, descColor, arrow }) => {
                        const Icon = DEV_CATEGORY_ICONS[key];
                        return (
                          <button key={key} onClick={() => handleSelectCategory(key)}
                            className={`p-4 rounded-lg border-2 text-left transition-all ${color}`}>
                            <div className="flex items-start gap-3">
                              <div className="flex-shrink-0 mt-0.5"><Icon className={`w-6 h-6 ${iconColor}`} /></div>
                              <div className="flex-1">
                                <h4 className={`text-sm font-bold ${textColor}`}>{DEV_CATEGORY_LABELS[key]}</h4>
                                <p className={`text-xs ${descColor} mt-1`}>{DEV_CATEGORY_DESCRIPTIONS[key]}</p>
                                <p className="text-xs text-gray-500 mt-2 italic">→ {arrow}</p>
                              </div>
                              <div className="flex-shrink-0 self-center"><ChevronDown className="w-4 h-4 text-gray-400 -rotate-90" /></div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Other Types */}
                  <div>
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Other Types</p>
                    <div className="grid grid-cols-2 gap-3">
                      {[
                        { key: 'equipment', arrow: 'Equipment ID, failure type, product impact' },
                        { key: 'supplier_ingredient', arrow: 'Supplier, material, lot #, NC type, disposition' },
                        { key: 'product_spec', arrow: 'SKU, parameter, expected vs actual, batch' },
                        { key: 'packaging', arrow: 'Issue type, SKU, batch, units affected' },
                        { key: 'storage_transport', arrow: 'Location, temp range, excursion duration' },
                        { key: 'documentation', arrow: 'Record type, what was incorrect' },
                        { key: 'sop_bpr', arrow: 'Which SOP, what was not followed' },
                        { key: 'pest', arrow: 'Pest type, evidence, area, product risk' },
                        { key: 'other', arrow: 'General deviation details' },
                      ].map(({ key, arrow }) => {
                        const Icon = DEV_CATEGORY_ICONS[key] || AlertOctagon;
                        return (
                          <button key={key} onClick={() => handleSelectCategory(key)}
                            className="p-3 rounded-lg border-2 border-gray-200 text-left transition-all hover:border-gray-400 hover:bg-gray-50">
                            <div className="flex items-center gap-2 mb-1">
                              <Icon className="w-4 h-4 text-gray-600" />
                              <span className="text-xs font-semibold text-gray-800">{DEV_CATEGORY_LABELS[key]}</span>
                            </div>
                            <p className="text-[11px] text-gray-500">→ {arrow}</p>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              {/* Step 2: Category-Specific Details */}
              {wizardStep === 2 && (
                <div className="space-y-5">
                  <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg">
                    <p className="text-sm text-blue-800"><strong>{DEV_CATEGORY_LABELS[form.category]}</strong> — {DEV_CATEGORY_DESCRIPTIONS[form.category]}</p>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Title *</label>
                    <input type="text" value={form.title || ''} onChange={e => updateForm('title', e.target.value)}
                      placeholder="Brief summary of the deviation..."
                      className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-navy-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Description *</label>
                    <textarea rows={3} value={form.description || ''} onChange={e => updateForm('description', e.target.value)}
                      placeholder="What happened? Be specific about what was observed..."
                      className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-navy-500" />
                  </div>

                  {/* Category-specific fields */}
                  {(CATEGORY_FIELDS[form.category] || []).map(field => (
                    <div key={field.key}>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">
                        {field.label} {field.required && '*'}
                      </label>
                      {field.type === 'select' ? (
                        <select value={form[field.key] || ''} onChange={e => updateForm(field.key, e.target.value)}
                          required={field.required}
                          className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5">
                          <option value="">Select...</option>
                          {field.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                        </select>
                      ) : field.type === 'textarea' ? (
                        <textarea rows={2} value={form[field.key] || ''} onChange={e => updateForm(field.key, e.target.value)}
                          placeholder={field.placeholder || ''}
                          className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-navy-500" />
                      ) : field.type === 'date' ? (
                        <input type="date" value={form[field.key] || ''} onChange={e => updateForm(field.key, e.target.value)}
                          required={field.required}
                          className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5" />
                      ) : (
                        <input type="text" value={form[field.key] || ''} onChange={e => updateForm(field.key, e.target.value)}
                          placeholder={field.placeholder || ''}
                          required={field.required}
                          className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-navy-500" />
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Step 3: Assessment & Immediate Action */}
              {wizardStep === 3 && (
                <div className="space-y-5">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Discovered By *</label>
                      <input type="text" value={form.discovered_by || ''} onChange={e => updateForm('discovered_by', e.target.value)}
                        placeholder="Name and role"
                        className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-navy-500" />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">Date Discovered *</label>
                      <input type="date" value={form.discovered_at || ''} onChange={e => updateForm('discovered_at', e.target.value)}
                        className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5" />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Location</label>
                    <input type="text" value={form.location || ''} onChange={e => updateForm('location', e.target.value)}
                      placeholder="Where in the facility did this occur?"
                      className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-navy-500" />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Classification *</label>
                    <div className="grid grid-cols-3 gap-3">
                      {[
                        { key: 'critical', label: 'Critical', desc: 'Food safety risk, potential recall, CCP failure', color: 'border-red-300 bg-red-50 hover:border-red-500' },
                        { key: 'major', label: 'Major', desc: 'Product quality affected, SOP violated, recurring issue', color: 'border-amber-300 bg-amber-50 hover:border-amber-500' },
                        { key: 'minor', label: 'Minor', desc: 'Documentation error, cosmetic issue, one-time event', color: 'border-yellow-300 bg-yellow-50 hover:border-yellow-500' },
                      ].map(c => (
                        <button key={c.key} type="button" onClick={() => updateForm('classification', c.key)}
                          className={`p-3 rounded-lg border-2 text-left transition-all ${form.classification === c.key ? c.color + ' ring-2 ring-offset-1' : 'border-gray-200 hover:border-gray-300'}`}>
                          <p className="text-sm font-semibold">{c.label}</p>
                          <p className="text-xs text-gray-500 mt-1">{c.desc}</p>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 mb-1">Immediate Action Taken</label>
                    <textarea rows={3} value={form.immediate_action || ''} onChange={e => updateForm('immediate_action', e.target.value)}
                      placeholder="What did you do immediately? (e.g. stopped production, quarantined product, re-cleaned area, notified QA...)"
                      className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2.5 focus:ring-2 focus:ring-navy-500" />
                  </div>

                  <div className="flex items-center gap-6">
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={form.is_ccp_deviation || false} onChange={e => updateForm('is_ccp_deviation', e.target.checked)} className="rounded border-gray-300" />
                      CCP Deviation
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={form.process_stopped || false} onChange={e => updateForm('process_stopped', e.target.checked)} className="rounded border-gray-300" />
                      Process Stopped
                    </label>
                    <label className="flex items-center gap-2 text-sm text-gray-700">
                      <input type="checkbox" checked={form.product_on_hold || false} onChange={e => updateForm('product_on_hold', e.target.checked)} className="rounded border-gray-300" />
                      Product on Hold
                    </label>
                  </div>

                  {/* Summary */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h3 className="text-sm font-semibold text-gray-700 mb-3">Review Summary</h3>
                    <div className="grid grid-cols-2 gap-y-2 text-sm">
                      <div className="text-gray-500">Category:</div>
                      <div className="font-medium">{DEV_CATEGORY_LABELS[form.category]}</div>
                      <div className="text-gray-500">Title:</div>
                      <div className="font-medium">{form.title || '—'}</div>
                      <div className="text-gray-500">Classification:</div>
                      <div className="font-medium capitalize">{form.classification || '—'}</div>
                      <div className="text-gray-500">Discovered By:</div>
                      <div>{form.discovered_by || '—'}</div>
                      <div className="text-gray-500">Date:</div>
                      <div>{form.discovered_at || '—'}</div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between px-6 py-4 border-t border-gray-200 bg-gray-50 rounded-b-xl">
              <button onClick={() => wizardStep > 1 ? setWizardStep(s => s - 1) : setShowWizard(false)}
                className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-300 rounded-lg hover:bg-gray-100">
                {wizardStep === 1 ? 'Cancel' : 'Back'}
              </button>
              <div className="flex gap-3">
                {wizardStep < 3 ? (
                  <button onClick={() => setWizardStep(s => s + 1)} disabled={wizardStep === 1 && !form.category}
                    className="px-5 py-2 text-sm font-medium text-white bg-navy-800 rounded-lg hover:bg-navy-900 disabled:opacity-50">
                    Next
                  </button>
                ) : (
                  <button onClick={handleCreate} disabled={submitting}
                    className="px-5 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-50 flex items-center gap-2">
                    {submitting ? 'Submitting...' : '✓ Report Deviation'}
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
