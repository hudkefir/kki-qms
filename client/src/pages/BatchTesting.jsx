import React, { useState, useRef } from 'react';
import {
  FlaskConical, Plus, Search, Filter, CheckCircle, XCircle, Clock,
  ChevronDown, ChevronUp, Save, X, Trash2, Printer, FileText
} from 'lucide-react';
import { useFetch, apiPost, apiPut, apiDelete } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

const STATUS_COLORS = {
  pass: 'bg-green-100 text-green-700',
  fail: 'bg-red-100 text-red-700',
  pending: 'bg-amber-100 text-amber-700',
};

const STATUS_ICONS = {
  pass: CheckCircle,
  fail: XCircle,
  pending: Clock,
};

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
    // Check if within 10% of limit (yellow warning zone)
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
  return 'text-amber-600'; // pending
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
  // Sort by defined order
  const sorted = {};
  for (const cat of CATEGORY_ORDER) {
    if (grouped[cat]) sorted[cat] = grouped[cat];
  }
  // Append any remaining
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
                      <th style={{ border: '1px solid #ccc', padding: '4px 8px', background: '#f5f5f5', fontSize: '11px' }}>Test</th>
                      <th style={{ border: '1px solid #ccc', padding: '4px 8px', background: '#f5f5f5', fontSize: '11px' }}>Target</th>
                      <th style={{ border: '1px solid #ccc', padding: '4px 8px', background: '#f5f5f5', fontSize: '11px' }}>Actual</th>
                      <th style={{ border: '1px solid #ccc', padding: '4px 8px', background: '#f5f5f5', fontSize: '11px' }}>Unit</th>
                      <th style={{ border: '1px solid #ccc', padding: '4px 8px', background: '#f5f5f5', fontSize: '11px' }}>Result</th>
                      <th style={{ border: '1px solid #ccc', padding: '4px 8px', background: '#f5f5f5', fontSize: '11px' }}>Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map(r => (
                      <tr key={r.id}>
                        <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontSize: '11px' }}>{r.test_name}</td>
                        <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontSize: '11px' }}>{r.target_value}</td>
                        <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontSize: '11px' }}>{r.actual_value || '-'}</td>
                        <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontSize: '11px' }}>{r.unit}</td>
                        <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontSize: '11px' }} className={r.pass_fail === 'fail' ? 'fail' : r.pass_fail === 'pass' ? 'pass' : 'pending'}>
                          {r.pass_fail?.toUpperCase()}
                        </td>
                        <td style={{ border: '1px solid #ccc', padding: '4px 8px', fontSize: '11px' }}>{r.notes || ''}</td>
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

// ── Main Component ──────────────────────────────────────────────────────────

export default function BatchTesting() {
  const { user } = useAuth();
  const canWrite = user?.role === 'admin' || user?.role === 'manager';

  const [statusFilter, setStatusFilter] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [expandedBatch, setExpandedBatch] = useState(null);
  const [editingResults, setEditingResults] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [coaBatch, setCoaBatch] = useState(null);
  const [coaResults, setCoaResults] = useState(null);

  const [createForm, setCreateForm] = useState({
    batch_number: '',
    product_sku: '',
    product_name: '',
    test_date: new Date().toISOString().slice(0, 10),
    tested_by: user?.display_name || user?.username || '',
    notes: '',
    test_profile: 'routine',
    lab_name: '',
    lab_report_number: '',
    sample_date: '',
    report_date: '',
  });

  const queryParams = new URLSearchParams();
  if (statusFilter) queryParams.set('status', statusFilter);
  if (searchTerm) queryParams.set('search', searchTerm);

  const { data: tests, loading, error, refetch } = useFetch(`/api/batch-tests?${queryParams.toString()}`);

  const handleCreate = async () => {
    if (!createForm.batch_number || !createForm.test_date) return;
    setSaving(true);
    try {
      await apiPost('/api/batch-tests', createForm);
      setShowCreate(false);
      setCreateForm({
        batch_number: '', product_sku: '', product_name: '',
        test_date: new Date().toISOString().slice(0, 10),
        tested_by: user?.display_name || user?.username || '', notes: '',
        test_profile: 'routine', lab_name: '', lab_report_number: '', sample_date: '', report_date: '',
      });
      refetch();
    } catch (err) {
      alert('Failed to create batch test: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleExpandToggle = async (id) => {
    if (expandedId === id) {
      setExpandedId(null);
      setExpandedBatch(null);
      setEditingResults(null);
      return;
    }
    try {
      const res = await fetch(`/api/batch-tests/${id}`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load');
      const data = await res.json();
      setExpandedId(id);
      setExpandedBatch(data);
      setEditingResults(data.results || []);
    } catch (err) {
      alert('Failed to load results: ' + err.message);
    }
  };

  const updateResultField = (resultId, field, value) => {
    setEditingResults(prev => prev.map(r => r.id === resultId ? { ...r, [field]: value } : r));
  };

  const handleSaveResults = async () => {
    if (!editingResults || !expandedId) return;
    setSaving(true);
    try {
      await apiPut(`/api/batch-tests/${expandedId}/results`, { results: editingResults });
      refetch();
    } catch (err) {
      alert('Failed to save results: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await apiDelete(`/api/batch-tests/${deleteTarget.id}`);
      setDeleteTarget(null);
      if (expandedId === deleteTarget.id) {
        setExpandedId(null);
        setExpandedBatch(null);
        setEditingResults(null);
      }
      refetch();
    } catch (err) {
      alert('Delete failed: ' + err.message);
    }
  };

  const handleOpenCoA = async (test) => {
    try {
      const res = await fetch(`/api/batch-tests/${test.id}/coa`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load CoA');
      const data = await res.json();
      setCoaBatch(data.batch);
      setCoaResults(data.results);
    } catch (err) {
      alert('Failed to generate CoA: ' + err.message);
    }
  };

  const batchTests = tests || [];

  if (loading) return <LoadingSpinner message="Loading batch tests..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
            <FlaskConical className="w-8 h-8 text-indigo-600" />
            Batch Testing / QC
          </h1>
          <p className="text-gray-600 mt-2">Production quality control — {batchTests.length} batch test{batchTests.length !== 1 ? 's' : ''}</p>
        </div>
        {canWrite && (
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 font-medium text-sm"
          >
            <Plus className="w-4 h-4" />
            New Batch Test
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="flex flex-wrap gap-4 items-center">
          <div className="flex items-center gap-2 flex-1 min-w-[200px]">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search batch number, SKU, product..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Statuses</option>
              <option value="pass">Pass</option>
              <option value="fail">Fail</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </div>

      {/* Summary chips */}
      <div className="flex flex-wrap gap-2 mb-6">
        {['pass', 'fail', 'pending'].map(s => {
          const count = batchTests.filter(t => t.status === s).length;
          const Icon = STATUS_ICONS[s];
          return (
            <button
              key={s}
              onClick={() => setStatusFilter(statusFilter === s ? '' : s)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                statusFilter === s
                  ? STATUS_COLORS[s] + ' ring-2 ring-offset-1 ring-indigo-300'
                  : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {s.charAt(0).toUpperCase() + s.slice(1)}
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold bg-white/60">{count}</span>
            </button>
          );
        })}
      </div>

      {/* Batch Tests List */}
      {batchTests.length === 0 ? (
        <div className="text-center py-16">
          <FlaskConical className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No batch tests found</p>
        </div>
      ) : (
        <div className="space-y-3">
          {batchTests.map(test => {
            const Icon = STATUS_ICONS[test.status];
            const isExpanded = expandedId === test.id;
            return (
              <div key={test.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {/* Header row */}
                <div
                  className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-gray-50/50 transition-colors"
                  onClick={() => handleExpandToggle(test.id)}
                >
                  <div className={`p-2 rounded-lg ${STATUS_COLORS[test.status]}`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">{test.batch_number}</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COLORS[test.status]}`}>
                        {test.status.toUpperCase()}
                      </span>
                      {test.test_profile && test.test_profile !== 'routine' && (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                          {PROFILE_LABELS[test.test_profile] || test.test_profile}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-sm text-gray-500">
                      {test.product_name && <span>{test.product_name}</span>}
                      {test.product_sku && <span>SKU: {test.product_sku}</span>}
                      <span>{test.test_date}</span>
                      <span>by {test.tested_by}</span>
                      {test.lab_name && <span className="text-indigo-500">Lab: {test.lab_name}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={(e) => { e.stopPropagation(); handleOpenCoA(test); }}
                      className="p-1.5 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                      title="Certificate of Analysis"
                    >
                      <FileText className="w-4 h-4" />
                    </button>
                    {canWrite && (
                      <button
                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(test); }}
                        className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                    {isExpanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
                  </div>
                </div>

                {/* Expanded results - grouped by category */}
                {isExpanded && editingResults && (
                  <div className="border-t border-gray-100 px-5 py-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Test Results</h3>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleOpenCoA(expandedBatch || test)}
                          className="flex items-center gap-1.5 px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-50"
                        >
                          <Printer className="w-4 h-4" />
                          CoA
                        </button>
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

                    {/* Lab info banner */}
                    {(expandedBatch?.lab_name || expandedBatch?.lab_report_number) && (
                      <div className="mb-4 p-3 bg-indigo-50 rounded-lg text-sm text-indigo-800 flex flex-wrap gap-4">
                        {expandedBatch.lab_name && <span><strong>Lab:</strong> {expandedBatch.lab_name}</span>}
                        {expandedBatch.lab_report_number && <span><strong>Report #:</strong> {expandedBatch.lab_report_number}</span>}
                        {expandedBatch.sample_date && <span><strong>Sampled:</strong> {expandedBatch.sample_date}</span>}
                        {expandedBatch.report_date && <span><strong>Report Date:</strong> {expandedBatch.report_date}</span>}
                      </div>
                    )}

                    {/* Grouped results */}
                    {Object.entries(groupResults(editingResults)).map(([cat, items]) => {
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
                                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Test</th>
                                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-28">Target</th>
                                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-32">Actual</th>
                                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-16">Unit</th>
                                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase w-24">Result</th>
                                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-500 uppercase">Notes</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-gray-50">
                                {items.map(r => (
                                  <tr key={r.id} className={`hover:bg-gray-50/50 ${getResultBg(r)}`}>
                                    <td className="px-3 py-2 font-medium text-gray-900">{r.test_name}</td>
                                    <td className="px-3 py-2 text-gray-500">{r.target_value}</td>
                                    <td className="px-3 py-2">
                                      {canWrite ? (
                                        <input
                                          type="text"
                                          value={r.actual_value}
                                          onChange={(e) => updateResultField(r.id, 'actual_value', e.target.value)}
                                          className="w-full border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                                          placeholder="Enter value"
                                        />
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
                                          {r.pass_fail.toUpperCase()}
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
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      );
                    })}

                    {test.notes && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Batch Notes</p>
                        <p className="text-sm text-gray-700">{test.notes}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => !saving && setShowCreate(false)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">New Batch Test</h3>
              <button onClick={() => setShowCreate(false)} className="p-1 text-gray-400 hover:text-gray-600 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="space-y-4">
              {/* Test Profile Dropdown */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Test Profile *</label>
                <select
                  value={createForm.test_profile}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, test_profile: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="routine">Routine QC (pH, temp, Brix, viscosity, organoleptic, packaging)</option>
                  <option value="cfia_micro">CFIA Microbiological (Coliform, E.coli, Salmonella, Listeria, Staph, Y&M)</option>
                  <option value="fda">FDA Panel (SPC, Coliform/E.coli, pathogens, allergens, net weight, label)</option>
                  <option value="full_panel">Full Panel (All tests combined)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Batch Number *</label>
                <input
                  type="text"
                  value={createForm.batch_number}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, batch_number: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="e.g. 003400"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product SKU</label>
                  <input
                    type="text"
                    value={createForm.product_sku}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, product_sku: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. 39506"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Product Name</label>
                  <input
                    type="text"
                    value={createForm.product_name}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, product_name: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g. CocoMng 359ml"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Test Date *</label>
                  <input
                    type="date"
                    value={createForm.test_date}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, test_date: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tested By</label>
                  <input
                    type="text"
                    value={createForm.tested_by}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, tested_by: e.target.value }))}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Lab Info Section */}
              <div className="border-t pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase mb-3">Lab Information (optional)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lab Name</label>
                    <input
                      type="text"
                      value={createForm.lab_name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, lab_name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. SGS Canada"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Lab Report #</label>
                    <input
                      type="text"
                      value={createForm.lab_report_number}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, lab_report_number: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="e.g. LAB-2026-0412"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Sample Date</label>
                    <input
                      type="date"
                      value={createForm.sample_date}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, sample_date: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Report Date</label>
                    <input
                      type="date"
                      value={createForm.report_date}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, report_date: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  value={createForm.notes}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, notes: e.target.value }))}
                  rows={2}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Optional batch notes"
                />
              </div>
              <p className="text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
                Tests for the selected profile will be auto-generated. You can fill in actual values after creation.
              </p>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowCreate(false)} disabled={saving} className="flex-1 px-4 py-2 text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-50">Cancel</button>
              <button
                onClick={handleCreate}
                disabled={saving || !createForm.batch_number || !createForm.test_date}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {saving ? 'Creating...' : 'Create Batch Test'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Batch Test">
        <div className="space-y-4">
          <p className="text-gray-700">
            Delete batch test <span className="font-semibold">"{deleteTarget?.batch_number}"</span>? This will also delete all test results.
          </p>
          <div className="flex justify-end gap-3 pt-2">
            <button onClick={() => setDeleteTarget(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50">Cancel</button>
            <button onClick={handleDelete} className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700">Delete</button>
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
