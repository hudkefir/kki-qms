import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  FlaskConical, ArrowLeft, Save, Trash2, CheckCircle, XCircle, Clock,
  Printer, FileText, Paperclip, ExternalLink, Upload, FileUp, X,
  MessageSquare, Truck
} from 'lucide-react';
import { useFetch, apiPut, apiDelete, apiPatch } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

const STATUS_COLORS = {
  pass: 'bg-green-100 text-green-700',
  fail: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
  to_be_shipped: 'bg-blue-100 text-blue-700',
};

const STATUS_ICONS = {
  pass: CheckCircle,
  fail: XCircle,
  pending: Clock,
  to_be_shipped: Truck,
};


const TEST_DISPLAY = {
  'TPC': { fullName: 'Total Plate Count', method: 'MFHPB-18 / ISO 4833', description: 'Measures total aerobic bacteria in the sample. Indicates overall microbial load and sanitation effectiveness.' },
  'YM': { fullName: 'Yeast & Mold', method: 'MFHPB-22 / ISO 21527', description: 'Counts yeast and mold organisms. High counts may indicate spoilage risk or environmental contamination.' },
  'Yeast': { fullName: 'Yeast Count', method: 'MFHPB-22 / ISO 21527', description: 'Measures yeast organisms specifically. In kefir, yeasts are expected — this tracks levels within acceptable range.' },
  'Mold': { fullName: 'Mold Count', method: 'MFHPB-22 / ISO 21527', description: 'Measures mold organisms. Should be minimal in finished product — indicates environmental or packaging contamination if elevated.' },
  'E.coli': { fullName: 'Escherichia coli', method: 'MFHPB-19 / ISO 4831', description: 'Indicator of fecal contamination. Must be absent in finished food products.' },
  'S.aureus': { fullName: 'Staphylococcus aureus', method: 'MFHPB-21 / ISO 6888', description: 'Pathogenic bacteria that can produce heat-stable toxins. Must be absent — indicates poor hygiene if detected.' },
  'Salmonella': { fullName: 'Salmonella spp.', method: 'MFHPB-20 / ISO 6579-1', description: 'Dangerous foodborne pathogen causing salmonellosis. Must be absent per CFIA and FDA requirements.' },
  'Listeria': { fullName: 'Listeria monocytogenes', method: 'MFHPB-30 / ISO 11290-1', description: 'Life-threatening pathogen especially for pregnant women and immunocompromised. Zero tolerance in ready-to-eat foods.' },
  'Coliforms': { fullName: 'Total Coliforms', method: 'MFHPB-35', description: 'Indicator organisms for sanitation quality. Elevated counts suggest process hygiene issues.' },
  'Enterobacteriaceae': { fullName: 'Enterobacteriaceae', method: 'MFLP-43 / ISO 21528', description: 'Broad indicator family including E. coli and Salmonella. Presence may indicate post-processing contamination.' },
  'Total Probiotic Count': { fullName: 'Total Probiotic Count', method: 'MFHPB-33 (adapted) / ISO 15214', description: 'Counts live probiotic bacteria (CFU). Key quality metric — must meet label claim at time of manufacture.' },
  'Probiotic Count': { fullName: 'Total Probiotic Count', method: 'MFHPB-33 (adapted) / ISO 15214', description: 'Counts live probiotic bacteria (CFU). Key quality metric — must meet label claim at time of manufacture.' },
};

function getTestDisplay(testName) {
  return TEST_DISPLAY[testName] || { fullName: testName, method: '', description: '' };
}

// Tooltip component
function TestTooltip({ testName, children }) {
  const info = getTestDisplay(testName);
  const [show, setShow] = useState(false);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const ref = useRef(null);
  const timer = useRef(null);

  const handleEnter = () => {
    timer.current = setTimeout(() => {
      if (ref.current) {
        const rect = ref.current.getBoundingClientRect();
        setPos({ x: Math.min(rect.left, window.innerWidth - 290), y: rect.bottom + 6 });
      }
      setShow(true);
    }, 300);
  };
  const handleLeave = () => { clearTimeout(timer.current); setShow(false); };

  return (
    <span ref={ref} className="inline-block cursor-help border-b border-dotted border-gray-300"
      onMouseEnter={handleEnter} onMouseLeave={handleLeave}>
      {children}
      {show && info.description && (
        <div style={{ position: 'fixed', zIndex: 99999, left: pos.x, top: pos.y, width: 280, padding: 12, background: '#111827', color: 'white', fontSize: 12, borderRadius: 8, boxShadow: '0 10px 25px rgba(0,0,0,0.3)', pointerEvents: 'none', lineHeight: 1.5 }}>
          <div style={{ fontWeight: 700, marginBottom: 4 }}>{info.fullName}</div>
          {info.method && <div style={{ color: '#9ca3af', marginBottom: 4 }}>Method: {info.method}</div>}
          <div style={{ color: '#d1d5db' }}>{info.description}</div>
        </div>
      )}
    </span>
  );
}

const PROFILE_LABELS = {
  routine: 'Routine QC',
  cfia_micro: 'CFIA Microbiological',
  fda: 'FDA Panel',
  full_panel: 'Full Panel (All)',
};

const CATEGORY_LABELS = {
  routine: 'Routine QC',
  cfia: 'CFIA Microbiological',
  fda: 'FDA',
  micro: 'Microbiological',
  chemical: 'Chemical',
  physical: 'Physical',
  label: 'Label / Packaging',
};

const CATEGORY_ORDER = ['routine', 'chemical', 'physical', 'micro', 'cfia', 'fda', 'label'];

function getResultColor(r) {
  if (r.pass_fail === 'fail') return 'text-red-600';
  if (r.pass_fail === 'pass') {
    const actual = parseFloat(r.actual_value);
    if (!isNaN(actual)) {
      const min = parseFloat(r.target_min);
      const max = parseFloat(r.target_max);
      if (!isNaN(max) && max > 0) {
        const range = max - (isNaN(min) ? 0 : min);
        const margin = range > 0 ? range * 0.1 : max * 0.1;
        if (!isNaN(min) && actual <= min + margin) return 'text-amber-600';
        if (actual >= max - margin) return 'text-amber-600';
      }
    }
    return 'text-green-600';
  }
  if (r.pass_fail === 'na') return 'text-gray-400';
  return 'text-amber-600';
}

function getResultBg(r) {
  if (r.pass_fail === 'fail') return 'bg-red-50';
  if (r.pass_fail === 'pass') {
    const actual = parseFloat(r.actual_value);
    if (!isNaN(actual)) {
      const min = parseFloat(r.target_min);
      const max = parseFloat(r.target_max);
      if (!isNaN(max) && max > 0) {
        const range = max - (isNaN(min) ? 0 : min);
        const margin = range > 0 ? range * 0.1 : max * 0.1;
        if (!isNaN(min) && actual <= min + margin) return 'bg-amber-50';
        if (actual >= max - margin) return 'bg-amber-50';
      }
    }
    return 'bg-green-50';
  }
  return '';
}

function getCategoryStatus(items) {
  const hasFail = items.some(r => r.pass_fail === 'fail');
  if (hasFail) return 'fail';
  const allDone = items.every(r => r.pass_fail !== 'pending');
  return allDone ? 'pass' : 'pending';
}

function groupResults(results) {
  const grouped = {};
  for (const r of results) {
    const cat = r.test_category || 'routine';
    if (!grouped[cat]) grouped[cat] = [];
    grouped[cat].push(r);
  }
  const sorted = {};
  for (const cat of CATEGORY_ORDER) {
    if (grouped[cat]) sorted[cat] = grouped[cat];
  }
  for (const cat of Object.keys(grouped)) {
    if (!sorted[cat]) sorted[cat] = grouped[cat];
  }
  return sorted;
}

// ── Certificate of Analysis (Printable) ─────────────────────────────────────

function CertificateOfAnalysis({ batch, results, onClose }) {
  const printRef = useRef();
  const grouped = groupResults(results);

  const handlePrint = () => {
    const content = printRef.current;
    const win = window.open('', '_blank');
    win.document.write(`<!DOCTYPE html><html><head><title>CoA - ${batch.batch_number}</title>
    <style>
      body { font-family: Arial, sans-serif; font-size: 12px; color: #111; margin: 24px; }
      h1 { font-size: 20px; margin-bottom: 4px; }
      h2 { font-size: 14px; color: #444; margin: 16px 0 6px; border-bottom: 1px solid #ddd; padding-bottom: 3px; }
      table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
      th, td { border: 1px solid #ccc; padding: 4px 8px; text-align: left; font-size: 11px; }
      th { background: #f5f5f5; font-weight: 600; }
      .pass { color: #16a34a; font-weight: 600; }
      .fail { color: #dc2626; font-weight: 600; }
      .pending { color: #d97706; font-weight: 600; }
      .warn { color: #d97706; font-weight: 600; }
      .info-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 4px 24px; margin-bottom: 16px; }
      .info-grid dt { font-weight: 600; color: #555; }
      .info-grid dd { margin: 0; }
      .sig-line { margin-top: 48px; display: flex; gap: 48px; }
      .sig-block { flex: 1; }
      .sig-block .line { border-top: 1px solid #333; margin-top: 36px; padding-top: 4px; font-size: 11px; color: #555; }
      .overall { font-size: 16px; font-weight: 700; padding: 8px 16px; border-radius: 4px; display: inline-block; margin: 8px 0; }
      .overall.pass { background: #dcfce7; }
      .overall.fail { background: #fee2e2; }
      .overall.pending { background: #fef3c7; }
      .cat-badge { display: inline-block; padding: 2px 8px; border-radius: 3px; font-size: 10px; font-weight: 600; margin-left: 8px; }
      .cat-badge.pass { background: #dcfce7; color: #16a34a; }
      .cat-badge.fail { background: #fee2e2; color: #dc2626; }
      .cat-badge.pending { background: #fef3c7; color: #d97706; }
      @media print { body { margin: 12px; } }
    </style></head><body>`);
    win.document.write(content.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="sticky top-0 bg-white border-b px-6 py-3 flex items-center justify-between z-10">
          <h3 className="font-semibold text-lg flex items-center gap-2"><FileText className="w-5 h-5" /> Certificate of Analysis</h3>
          <div className="flex items-center gap-2">
            <button onClick={handlePrint} className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              <Printer className="w-4 h-4" /> Print / PDF
            </button>
            <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded"><X className="w-5 h-5" /></button>
          </div>
        </div>
        <div ref={printRef} className="p-6">
          <h1 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '4px' }}>Certificate of Analysis</h1>
          <p style={{ fontSize: '12px', color: '#666', marginBottom: '16px' }}>KKI Quality Management System</p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '4px 24px', marginBottom: '16px', fontSize: '12px' }}>
            <dt style={{ fontWeight: 600, color: '#555' }}>Batch Number:</dt><dd>{batch.batch_number}</dd>
            <dt style={{ fontWeight: 600, color: '#555' }}>Product:</dt><dd>{batch.product_name || '-'} {batch.product_sku ? `(SKU: ${batch.product_sku})` : ''}</dd>
            <dt style={{ fontWeight: 600, color: '#555' }}>Test Profile:</dt><dd>{PROFILE_LABELS[batch.test_profile] || batch.test_profile || 'Routine'}</dd>
            <dt style={{ fontWeight: 600, color: '#555' }}>Test Date:</dt><dd>{batch.test_date}</dd>
            <dt style={{ fontWeight: 600, color: '#555' }}>Tested By:</dt><dd>{batch.tested_by}</dd>
            {batch.lab_name && <><dt style={{ fontWeight: 600, color: '#555' }}>Laboratory:</dt><dd>{batch.lab_name}</dd></>}
            {batch.lab_report_number && <><dt style={{ fontWeight: 600, color: '#555' }}>Lab Report #:</dt><dd>{batch.lab_report_number}</dd></>}
            {batch.sample_date && <><dt style={{ fontWeight: 600, color: '#555' }}>Sample Date:</dt><dd>{batch.sample_date}</dd></>}
            {batch.report_date && <><dt style={{ fontWeight: 600, color: '#555' }}>Report Date:</dt><dd>{batch.report_date}</dd></>}
          </div>

          <div className={`overall ${batch.status}`} style={{ fontSize: '16px', fontWeight: 700, padding: '8px 16px', borderRadius: '4px', display: 'inline-block', marginBottom: '12px' }}>
            Overall Status: {batch.status?.toUpperCase()}
          </div>

          {Object.entries(grouped).map(([cat, items]) => {
            const catStatus = getCategoryStatus(items);
            return (
              <div key={cat}>
                <h2 style={{ fontSize: '14px', color: '#444', margin: '16px 0 6px', borderBottom: '1px solid #ddd', paddingBottom: '3px' }}>
                  {CATEGORY_LABELS[cat] || cat}
                  <span className={`cat-badge ${catStatus}`} style={{ display: 'inline-block', padding: '2px 8px', borderRadius: '3px', fontSize: '10px', fontWeight: 600, marginLeft: '8px' }}>
                    {catStatus.toUpperCase()}
                  </span>
                </h2>
                <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '12px' }}>
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #ccc', padding: '4px 8px', background: '#f5f5f5', fontSize: '11px' }}>Test</th><th style={{ border: '1px solid #ccc', padding: '4px 8px', background: '#f5f5f5', fontSize: '11px' }}>Method</th>
                      <th style={{ border: '1px solid #ccc', padding: '4px 8px', background: '#f5f5f5', fontSize: '11px' }}>Target</th>
                      <th style={{ border: '1px solid #ccc', padding: '4px 8px', background: '#f5f5f5', fontSize: '11px' }}>Actual</th>
                      <th style={{ border: '1px solid #ccc', padding: '4px 8px', background: '#f5f5f5', fontSize: '11px' }}>Unit</th>
                      <th style={{ border: '1px solid #ccc', padding: '4px 8px', background: '#f5f5f5', fontSize: '11px' }}>Result</th>
                      <th style={{ border: '1px solid #ccc', padding: '4px 8px', background: '#f5f5f5', fontSize: '11px' }}>Notes</th>
                      <th style={{ border: '1px solid #ccc', padding: '4px 8px', background: '#f5f5f5', fontSize: '11px' }}>Comments</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(r => (
                      <tr key={r.id}>
                        <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontSize: '11px' }}>{<TestTooltip testName={r.test_name}>{getTestDisplay(r.test_name).fullName}</TestTooltip>}</td>
                        <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontSize: '11px', color: '#666' }}>{getTestDisplay(r.test_name).method}</td>
                        <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontSize: '11px' }}>{r.target_value}</td>
                        <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontSize: '11px' }}>{r.actual_value || '-'}</td>
                        <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontSize: '11px' }}>{r.unit}</td>
                        <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontSize: '11px' }} className={r.pass_fail === 'fail' ? 'fail' : r.pass_fail === 'pass' ? 'pass' : 'pending'}>
                          {r.pass_fail?.toUpperCase()}
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontSize: '11px' }}>{r.notes || ''}</td>
                        <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontSize: '11px' }}>{r.comments || ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          })}

          {batch.notes && (
            <div style={{ marginTop: '12px', padding: '8px', background: '#f9fafb', borderRadius: '4px', fontSize: '12px' }}>
              <strong>Notes:</strong> {batch.notes}
            </div>
          )}
          {batch.comments && (
            <div style={{ marginTop: '8px', padding: '8px', background: '#f9fafb', borderRadius: '4px', fontSize: '12px' }}>
              <strong>Comments:</strong> {batch.comments}
            </div>
          )}

          <div style={{ marginTop: '48px', display: 'flex', gap: '48px' }}>
            <div style={{ flex: 1 }}>
              <div style={{ borderTop: '1px solid #333', marginTop: '36px', paddingTop: '4px', fontSize: '11px', color: '#555' }}>
                QA Manager Signature / Date
              </div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ borderTop: '1px solid #333', marginTop: '36px', paddingTop: '4px', fontSize: '11px', color: '#555' }}>
                Reviewed By / Date
              </div>
            </div>
          </div>

          <p style={{ marginTop: '24px', fontSize: '10px', color: '#999', textAlign: 'center' }}>
            Generated {new Date().toISOString().slice(0, 16).replace('T', ' ')} — KKI QMS
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Main Detail Component ───────────────────────────────────────────────────

export default function BatchTestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const canWrite = user?.role === 'admin' || user?.role === 'manager';

  const { data: batch, loading, error, refetch } = useFetch(`/api/batch-tests/${id}`);

  const [editingResults, setEditingResults] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteResultTarget, setDeleteResultTarget] = useState(null);
  const [coaBatch, setCoaBatch] = useState(null);
  const [coaResults, setCoaResults] = useState(null);

  // Batch notes/comments editing
  const [editingNotes, setEditingNotes] = useState(false);
  const [batchNotes, setBatchNotes] = useState('');
  const [batchComments, setBatchComments] = useState('');

  // COA upload state
  const [coaUploading, setCoaUploading] = useState(false);
  const [coaFileName, setCoaFileName] = useState(null);
  const [coaFilePath, setCoaFilePath] = useState(null);
  const [autofilledIds, setAutofilledIds] = useState(new Set());
  const [coaParseMessage, setCoaParseMessage] = useState(null);
  const [statusUpdating, setStatusUpdating] = useState(false);
  const coaFileRef = useRef();

  // Initialize editing state when data loads
  React.useEffect(() => {
    if (batch) {
      if (!editingResults) {
        setEditingResults(batch.results || []);
      }
      setBatchNotes(batch.notes || '');
      setBatchComments(batch.comments || '');
    }
  }, [batch]);

  const updateResultField = (resultId, field, value) => {
    setEditingResults(prev => prev.map(r => r.id === resultId ? { ...r, [field]: value } : r));
  };

  const handleSaveResults = async () => {
    if (!editingResults) return;
    setSaving(true);
    try {
      await apiPut(`/api/batch-tests/${id}/results`, { results: editingResults });
      setAutofilledIds(new Set());
      refetch();
    } catch (err) {
      alert('Failed to save results: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleSaveNotes = async () => {
    setSaving(true);
    try {
      await apiPut(`/api/batch-tests/${id}`, {
        notes: batchNotes,
        comments: batchComments,
      });
      setEditingNotes(false);
      refetch();
    } catch (err) {
      alert('Failed to save notes: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteResult = async () => {
    if (!deleteResultTarget) return;
    try {
      await apiDelete(`/api/batch-tests/${id}/results/${deleteResultTarget.id}`);
      setDeleteResultTarget(null);
      setEditingResults(prev => prev.filter(r => r.id !== deleteResultTarget.id));
      refetch();
    } catch (err) {
      alert('Failed to delete result: ' + err.message);
    }
  };

  const handleOpenCoA = async () => {
    try {
      const res = await fetch(`/api/batch-tests/${id}/coa`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load CoA');
      const data = await res.json();
      setCoaBatch(data.batch);
      setCoaResults(data.results);
    } catch (err) {
      alert('Failed to generate CoA: ' + err.message);
    }
  };

  const handleDeleteAttachment = async (index) => {
    if (!confirm('Delete this document? This cannot be undone.')) return;
    try {
      await apiDelete(`/api/batch-tests/${id}/attachments/${index}`);
      refetch();
    } catch (err) {
      alert('Failed to delete: ' + (err.message || err));
    }
  };

  // ── COA Upload & Parse ──────────────────────────────────────────────────────
  const handleCoaParse = async () => {
    const file = coaFileRef.current?.files?.[0];
    if (!file) {
      alert('Please select a COA PDF file first.');
      return;
    }
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      alert('Only PDF files are supported.');
      return;
    }

    setCoaUploading(true);
    setCoaParseMessage(null);
    try {
      const formData = new FormData();
      formData.append('coa', file);

      const res = await fetch(`/api/batch-tests/${id}/parse-coa`, {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Upload failed');
      }
      const data = await res.json();

      const newAutofilled = new Set();
      if (data.matched && data.matched.length > 0) {
        setEditingResults(prev => prev.map(r => {
          const match = data.matched.find(m => m.result_id === r.id);
          if (match) {
            newAutofilled.add(r.id);
            return { ...r, actual_value: match.parsed_value };
          }
          return r;
        }));
      }
      setAutofilledIds(newAutofilled);

      if (data.attachment) {
        setCoaFileName(data.attachment.name);
        setCoaFilePath(data.attachment.path);
      }

      const matchCount = data.matched?.length || 0;
      const totalParsed = data.totalParsed || 0;
      setCoaParseMessage(
        matchCount > 0
          ? `Parsed ${totalParsed} result(s) from COA, auto-filled ${matchCount} matching field(s). Review and save.`
          : `Parsed ${totalParsed} result(s) but no matches found for current test rows.`
      );

      if (coaFileRef.current) coaFileRef.current.value = '';
      refetch();
    } catch (err) {
      alert('COA parse failed: ' + err.message);
    } finally {
      setCoaUploading(false);
    }
  };

  // Admin status override
  const handleStatusOverride = async (newStatus) => {
    if (!confirm(`Override batch status to "${newStatus.replace(/_/g, " ").toUpperCase()}"?`)) return;
    setStatusUpdating(true);
    try {
      await apiPatch(`/api/batch-tests/${id}/status`, { status: newStatus });
      refetch();
    } catch (err) {
      alert("Status override failed: " + err.message);
    } finally {
      setStatusUpdating(false);
    }
  };

    if (loading) return <LoadingSpinner message="Loading batch test..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;
  if (!batch) return <div className="text-center py-16 text-gray-500">Batch test not found</div>;

  const StatusIcon = STATUS_ICONS[batch.status];
  let attachments = [];
  try { attachments = typeof batch.attachments === 'string' ? JSON.parse(batch.attachments) : (batch.attachments || []); } catch(e) {}

  const results = editingResults || batch.results || [];
  const grouped = groupResults(results);

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back button + header */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/batch-testing')}
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Batch Testing
        </button>

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={`p-3 rounded-xl ${STATUS_COLORS[batch.status]}`}>
              <FlaskConical className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
                {batch.batch_number}
                <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${STATUS_COLORS[batch.status]}`}>
                  {StatusIcon && <StatusIcon className="w-3.5 h-3.5" />}
                  {batch.status?.toUpperCase()}
                </span>
                {user?.role === "admin" && (
                  <select
                    value={batch.status}
                    onChange={(e) => handleStatusOverride(e.target.value)}
                    disabled={statusUpdating}
                    className="ml-2 border border-gray-200 rounded-lg px-2 py-1 text-xs font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 cursor-pointer"
                    title="Admin: Override batch status"
                  >
                    <option value="pending">Pending</option>
                    <option value="pass">Pass</option>
                    <option value="fail">Fail</option>
                    <option value="to_be_shipped">To Be Shipped</option>
                  </select>
                )}
                {batch.test_profile && batch.test_profile !== 'routine' && (
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                    {PROFILE_LABELS[batch.test_profile] || batch.test_profile}
                  </span>
                )}
              </h1>
              <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                {batch.product_name && <span>{batch.product_name}</span>}
                {batch.product_sku && <span>SKU: {batch.product_sku}</span>}
                <span>{batch.test_date}</span>
                <span>by {batch.tested_by}</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleOpenCoA}
              className="flex items-center gap-1.5 px-3 py-2 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
            >
              <Printer className="w-4 h-4" />
              Certificate of Analysis
            </button>
          </div>
        </div>
      </div>

      {/* Lab info banner */}
      {(batch.lab_name || batch.lab_report_number) && (
        <div className="mb-6 p-4 bg-indigo-50 rounded-xl text-sm text-indigo-800 flex flex-wrap gap-6">
          {batch.lab_name && <span><strong>Laboratory:</strong> {batch.lab_name}</span>}
          {batch.lab_report_number && <span><strong>Report #:</strong> {batch.lab_report_number}</span>}
          {batch.sample_date && <span><strong>Sample Date:</strong> {batch.sample_date}</span>}
          {batch.report_date && <span><strong>Report Date:</strong> {batch.report_date}</span>}
        </div>
      )}

      {/* Overall Notes & Comments */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-indigo-500" />
            Batch Notes & Comments
          </h2>
          {canWrite && !editingNotes && (
            <button
              onClick={() => setEditingNotes(true)}
              className="text-sm text-indigo-600 hover:text-indigo-800 font-medium"
            >
              Edit
            </button>
          )}
        </div>

        {editingNotes && canWrite ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Notes</label>
              <textarea
                value={batchNotes}
                onChange={(e) => setBatchNotes(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Internal batch notes (visible on CoA)..."
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Comments</label>
              <textarea
                value={batchComments}
                onChange={(e) => setBatchComments(e.target.value)}
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                placeholder="Additional comments or observations..."
              />
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={handleSaveNotes}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Notes'}
              </button>
              <button
                onClick={() => {
                  setEditingNotes(false);
                  setBatchNotes(batch.notes || '');
                  setBatchComments(batch.comments || '');
                }}
                className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Notes</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 min-h-[60px]">
                {batch.notes || <span className="text-gray-400 italic">No notes</span>}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-gray-500 mb-1">Comments</p>
              <p className="text-sm text-gray-700 whitespace-pre-wrap bg-gray-50 rounded-lg p-3 min-h-[60px]">
                {batch.comments || <span className="text-gray-400 italic">No comments</span>}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* COA Upload & Autofill Section */}
      {canWrite && (
        <div className="bg-white rounded-xl shadow-sm border border-sky-200 p-5 mb-6">
          <div className="flex items-center gap-3 flex-wrap">
            <FileUp className="w-5 h-5 text-sky-600 flex-shrink-0" />
            <span className="text-sm font-semibold text-sky-800">COA Upload & Auto-fill</span>
            <input
              ref={coaFileRef}
              type="file"
              accept=".pdf"
              className="text-sm text-gray-600 file:mr-2 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-medium file:bg-sky-100 file:text-sky-700 hover:file:bg-sky-200"
            />
            <button
              onClick={handleCoaParse}
              disabled={coaUploading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 text-white rounded-lg text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
            >
              <Upload className="w-3.5 h-3.5" />
              {coaUploading ? 'Parsing...' : 'Upload & Read COA'}
            </button>
          </div>
          {coaFileName && (
            <div className="mt-2 flex items-center gap-2 text-sm text-sky-700">
              <Paperclip className="w-3.5 h-3.5" />
              <span>Uploaded:</span>
              {coaFilePath ? (
                <a href={coaFilePath} target="_blank" rel="noopener noreferrer" className="underline font-medium hover:text-sky-900">
                  {coaFileName}
                </a>
              ) : (
                <span className="font-medium">{coaFileName}</span>
              )}
            </div>
          )}
          {coaParseMessage && (
            <div className={`mt-2 text-sm ${autofilledIds.size > 0 ? 'text-green-700' : 'text-amber-700'}`}>
              {coaParseMessage}
            </div>
          )}
        </div>
      )}

      {/* Attached Documents */}
      {attachments.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2 mb-3">
            <Paperclip className="w-4 h-4 text-gray-500" />
            Attached Documents ({attachments.length})
          </h2>
          <div className="space-y-2">
            {attachments.map((att, i) => (
              <div key={i} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border border-gray-100">
                <FileText className="w-4 h-4 text-sky-600 flex-shrink-0" />
                <a href={att.path} target="_blank" rel="noopener noreferrer"
                   className="flex-1 text-sm text-sky-700 hover:text-sky-900 font-medium flex items-center gap-1.5">
                  {att.name}
                  <ExternalLink className="w-3 h-3 opacity-50" />
                </a>
                <span className="text-xs text-gray-400">{att.uploaded_at ? new Date(att.uploaded_at).toLocaleDateString() : ''}</span>
                {canWrite && (
                  <button
                    onClick={() => handleDeleteAttachment(i)}
                    className="p-1 text-gray-400 hover:text-red-600 rounded"
                    title="Delete document"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Test Results */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Test Results</h2>
          <div className="flex items-center gap-2">
            {canWrite && (
              <button
                onClick={handleSaveResults}
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : 'Save Results'}
              </button>
            )}
          </div>
        </div>

        {Object.entries(grouped).map(([cat, items]) => {
          const catStatus = getCategoryStatus(items);
          const CatIcon = STATUS_ICONS[catStatus];
          return (
            <div key={cat} className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <CatIcon className={`w-4 h-4 ${catStatus === 'pass' ? 'text-green-500' : catStatus === 'fail' ? 'text-red-500' : 'text-amber-500'}`} />
                <span className="text-sm font-semibold text-gray-700">{CATEGORY_LABELS[cat] || cat}</span>
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold ${STATUS_COLORS[catStatus]}`}>
                  {catStatus.toUpperCase()}
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-100 bg-gray-50/50">
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Test</th><th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Method</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-28">Target</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-32">Actual</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-16">Unit</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-24">Result</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Notes</th>
                      <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-40">Comments</th>
                      {canWrite && <th className="text-center px-2 py-2 text-xs font-semibold text-gray-500 uppercase w-10"></th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {items.map(r => {
                      const isAutofilled = autofilledIds.has(r.id);
                      return (
                        <tr key={r.id} className={`hover:bg-gray-50/50 ${getResultBg(r)}`}>
                          <td className="px-3 py-2 font-medium text-gray-900">{<TestTooltip testName={r.test_name}>{getTestDisplay(r.test_name).fullName}</TestTooltip>}</td>
                          <td className="px-3 py-2 text-xs text-gray-400">{getTestDisplay(r.test_name).method}</td>
                          <td className="px-3 py-2 text-gray-500">
                            {user?.role === 'admin' && canWrite ? (
                              <input type="text" value={r.target_value || ''}
                                onChange={(e) => updateResultField(r.id, 'target_value', e.target.value)}
                                className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Target" />
                            ) : (
                              <span>{r.target_value || '-'}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {canWrite ? (
                              <div className="relative">
                                <input
                                  type="text"
                                  value={r.actual_value}
                                  onChange={(e) => updateResultField(r.id, 'actual_value', e.target.value)}
                                  className={`w-full border rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500 ${
                                    isAutofilled ? 'border-sky-400 bg-sky-50' : 'border-gray-200'
                                  }`}
                                  placeholder="Enter value"
                                />
                                {isAutofilled && (
                                  <span className="absolute -top-2 -right-1 inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-sky-500 text-white leading-none">
                                    COA
                                  </span>
                                )}
                              </div>
                            ) : (
                              <span>{r.actual_value || '-'}</span>
                            )}
                          </td>
                          <td className="px-3 py-2 text-gray-400">{r.unit}</td>
                          <td className="px-3 py-2">
                            {canWrite ? (
                              <select
                                value={r.pass_fail}
                                onChange={(e) => updateResultField(r.id, 'pass_fail', e.target.value)}
                                className={`border border-gray-200 rounded px-2 py-1 text-sm font-medium ${getResultColor(r)}`}
                              >
                                <option value="pending">Pending</option>
                                <option value="pass">Pass</option>
                                <option value="fail">Fail</option>
                                <option value="na">N/A</option>
                              </select>
                            ) : (
                              <span className={`font-medium ${getResultColor(r)}`}>
                                {r.pass_fail?.toUpperCase()}
                              </span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {canWrite ? (
                              <input
                                type="text"
                                value={r.notes}
                                onChange={(e) => updateResultField(r.id, 'notes', e.target.value)}
                                className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Notes"
                              />
                            ) : (
                              <span className="text-gray-500">{r.notes || '-'}</span>
                            )}
                          </td>
                          <td className="px-3 py-2">
                            {canWrite ? (
                              <input
                                type="text"
                                value={r.comments || ''}
                                onChange={(e) => updateResultField(r.id, 'comments', e.target.value)}
                                className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                placeholder="Comment"
                              />
                            ) : (
                              <span className="text-gray-500">{r.comments || '-'}</span>
                            )}
                          </td>
                          {canWrite && (
                            <td className="px-2 py-2 text-center">
                              <button
                                onClick={() => setDeleteResultTarget(r)}
                                className="p-1 text-gray-300 hover:text-red-500 rounded transition-colors"
                                title="Delete this test result"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          );
        })}

        {results.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No test results</p>
          </div>
        )}
      </div>

      {/* Delete Result Confirmation Modal */}
      <Modal isOpen={!!deleteResultTarget} onClose={() => setDeleteResultTarget(null)} title="Delete Test Result">
        <div className="space-y-4">
          <p className="text-gray-700">
            Delete test result <span className="font-semibold">"{deleteResultTarget?.test_name}"</span>? This cannot be undone.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setDeleteResultTarget(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={handleDeleteResult} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Delete</button>
          </div>
        </div>
      </Modal>

      {/* Certificate of Analysis Modal */}
      {coaBatch && coaResults && (
        <CertificateOfAnalysis
          batch={coaBatch}
          results={coaResults}
          onClose={() => { setCoaBatch(null); setCoaResults(null); }}
        />
      )}
    </div>
  );
}
