import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Edit2, Save, X, Clock, CheckCircle, XCircle, AlertTriangle,
  ArrowDown, ArrowUp, Timer
} from 'lucide-react';
import { useFetch, apiPut, apiPost } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import { EXERCISE_STATUS_STYLES, EXERCISE_TYPE_LABELS, HelpTip, HelpToggle } from './RecallCenter';

export default function TraceabilityDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: exercise, loading, error, refetch } = useFetch(`/api/traceability-exercises/${id}`);

  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({});
  const [saving, setSaving] = useState(false);
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [completeForm, setCompleteForm] = useState({});
  const [elapsed, setElapsed] = useState(0);
  const [showTips, setShowTips] = useState(true);

  // Live timer for in-progress exercises
  useEffect(() => {
    if (!exercise || exercise.status !== 'in_progress') return;
    const start = new Date(exercise.start_time).getTime();
    const tick = () => setElapsed(Math.floor((Date.now() - start) / 1000));
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [exercise]);

  if (loading) return <LoadingSpinner message="Loading Exercise..." />;
  if (error) return <div className="text-center py-16 text-red-600">{error}</div>;
  if (!exercise) return <div className="text-center py-16 text-gray-500">Exercise not found</div>;

  const startEdit = () => { setFormData({ ...exercise }); setEditing(true); };

  const handleSave = async () => {
    setSaving(true);
    try {
      await apiPut(`/api/traceability-exercises/${id}`, formData);
      setEditing(false); refetch();
    } catch (err) { alert('Error: ' + err.message); }
    finally { setSaving(false); }
  };

  const handleComplete = async (e) => {
    e.preventDefault();
    try {
      await apiPost(`/api/traceability-exercises/${id}/complete`, completeForm);
      setShowCompleteModal(false); setCompleteForm({}); refetch();
    } catch (err) { alert('Error: ' + err.message); }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + 'h ' : ''}${m}m ${s}s`;
  };

  const backwardTrace = typeof exercise.backward_trace === 'string' ? JSON.parse(exercise.backward_trace || '{}') : (exercise.backward_trace || {});
  const forwardTrace = typeof exercise.forward_trace === 'string' ? JSON.parse(exercise.forward_trace || '{}') : (exercise.forward_trace || {});

  const totalAccounted = (exercise.total_shipped || 0) + (exercise.total_onsite || 0) + (exercise.total_adjustments || 0);
  const reconPct = exercise.total_produced > 0 ? Math.round((totalAccounted / exercise.total_produced) * 10000) / 100 : null;

  return (
    <div className="max-w-5xl mx-auto">
      <button onClick={() => navigate('/recalls')} className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Recall Center
      </button>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-2xl font-bold text-gray-900">{exercise.exercise_id}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold border ${EXERCISE_STATUS_STYLES[exercise.status] || ''}`}>
                {exercise.status?.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}
              </span>
            </div>
            <p className="text-gray-700 font-medium">{EXERCISE_TYPE_LABELS[exercise.type] || exercise.type} Trace</p>
            <p className="text-sm text-gray-500 mt-1">Conducted by {exercise.conducted_by} — Target: {exercise.target_lot}</p>
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

        {/* Timer */}
        {exercise.status === 'in_progress' && (
          <div className="mt-4 pt-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-blue-100 p-2 rounded-lg">
                <Timer className="w-5 h-5 text-blue-600 animate-pulse" />
              </div>
              <div>
                <p className="text-2xl font-bold text-blue-700 tabular-nums">{formatTime(elapsed)}</p>
                <p className="text-xs text-gray-500">Exercise in progress</p>
              </div>
            </div>
            <button onClick={() => setShowCompleteModal(true)} className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700">
              Complete Exercise
            </button>
          </div>
        )}

        {exercise.elapsed_minutes != null && exercise.status !== 'in_progress' && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="flex items-center gap-3">
              <Clock className="w-4 h-4 text-gray-400" />
              <span className="text-sm text-gray-600">Completed in <strong>{exercise.elapsed_minutes} minutes</strong></span>
              {exercise.elapsed_minutes <= 120 && <span className="text-xs text-green-600 font-semibold">(within 2-hour target)</span>}
              {exercise.elapsed_minutes > 120 && <span className="text-xs text-red-600 font-semibold">(exceeded 2-hour target)</span>}
            </div>
          </div>
        )}
      </div>

      {/* Tips Toggle */}
      <div className="flex justify-end mb-2"><HelpToggle visible={showTips} setVisible={setShowTips} /></div>

      {/* Trace Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
        {/* Backward Trace */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ArrowDown className="w-4 h-4 text-blue-600" /> Backward Trace
          </h2>
          <p className="text-xs text-gray-500 mb-3">Ingredients / suppliers that went into this lot</p>
          {showTips && (
            <HelpTip className="mb-3">
              Identify ALL ingredient lots (coconut milk, kefir cultures) and packaging lots (jars, lids, foil seals, labels) used in this batch. Reference: BPR, receiving logs (KK-FRM-00500-A/C), COAs.
            </HelpTip>
          )}
          {editing ? (
            <textarea rows={6} value={typeof formData.backward_trace === 'string' ? formData.backward_trace : JSON.stringify(formData.backward_trace || {}, null, 2)}
              onChange={e => {
                try { setFormData({ ...formData, backward_trace: JSON.parse(e.target.value) }); }
                catch { setFormData({ ...formData, backward_trace: e.target.value }); }
              }}
              className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2 font-mono" placeholder='{"supplier": "lot_code", ...}' />
          ) : (
            Object.keys(backwardTrace).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(backwardTrace).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-100">
                    <span className="text-sm font-medium text-gray-700">{key}</span>
                    <span className="text-sm text-gray-600">{String(val)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">No backward trace data recorded</p>
          )}
        </div>

        {/* Forward Trace */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <ArrowUp className="w-4 h-4 text-green-600" /> Forward Trace
          </h2>
          <p className="text-xs text-gray-500 mb-3">Finished goods / customers this lot was shipped to</p>
          {showTips && (
            <HelpTip className="mb-3">
              Identify ALL customers who received this lot, quantities, dates, and shipping documents. Source: inventory system lot traceability report.
            </HelpTip>
          )}
          {editing ? (
            <textarea rows={6} value={typeof formData.forward_trace === 'string' ? formData.forward_trace : JSON.stringify(formData.forward_trace || {}, null, 2)}
              onChange={e => {
                try { setFormData({ ...formData, forward_trace: JSON.parse(e.target.value) }); }
                catch { setFormData({ ...formData, forward_trace: e.target.value }); }
              }}
              className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2 font-mono" placeholder='{"customer": "quantity", ...}' />
          ) : (
            Object.keys(forwardTrace).length > 0 ? (
              <div className="space-y-2">
                {Object.entries(forwardTrace).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between p-2 bg-green-50 rounded-lg border border-green-100">
                    <span className="text-sm font-medium text-gray-700">{key}</span>
                    <span className="text-sm text-gray-600">{String(val)}</span>
                  </div>
                ))}
              </div>
            ) : <p className="text-sm text-gray-400">No forward trace data recorded</p>
          )}
        </div>
      </div>

      {/* Reconciliation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Reconciliation</h2>
        {showTips && (
          <HelpTip className="mb-4">
            <p className="mb-1"><strong>Formula:</strong> Produced = Shipped + On-Hand + Documented Adjustments (QA samples, damages, destruction). No unexplained variance is acceptable.</p>
          </HelpTip>
        )}
        {editing ? (
          <div className="grid grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Produced</label>
              <input type="number" value={formData.total_produced || ''} onChange={e => setFormData({ ...formData, total_produced: parseInt(e.target.value) || 0 })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Shipped</label>
              <input type="number" value={formData.total_shipped || ''} onChange={e => setFormData({ ...formData, total_shipped: parseInt(e.target.value) || 0 })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total On-Site</label>
              <input type="number" value={formData.total_onsite || ''} onChange={e => setFormData({ ...formData, total_onsite: parseInt(e.target.value) || 0 })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adjustments</label>
              <input type="number" value={formData.total_adjustments || ''} onChange={e => setFormData({ ...formData, total_adjustments: parseInt(e.target.value) || 0 })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {[
              { label: 'Produced', value: exercise.total_produced ?? '--' },
              { label: 'Shipped', value: exercise.total_shipped ?? '--' },
              { label: 'On-Site', value: exercise.total_onsite ?? '--' },
              { label: 'Adjustments', value: exercise.total_adjustments ?? 0 },
              { label: 'Reconciliation', value: reconPct != null ? `${reconPct}%` : '--' },
            ].map(item => (
              <div key={item.label} className="text-center">
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">{item.label}</p>
                <p className="text-lg font-bold text-gray-900">{item.value}</p>
              </div>
            ))}
          </div>
        )}

        {reconPct != null && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div className={`h-3 rounded-full transition-all ${reconPct >= 100 ? 'bg-green-500' : reconPct >= 90 ? 'bg-amber-500' : 'bg-red-500'}`} style={{ width: `${Math.min(reconPct, 100)}%` }} />
            </div>
            <p className={`text-xs mt-1 font-semibold ${reconPct >= 100 ? 'text-green-600' : 'text-red-600'}`}>
              {reconPct >= 100 ? 'Fully reconciled' : `${(100 - reconPct).toFixed(1)}% unaccounted`}
            </p>
          </div>
        )}
      </div>

      {/* Pass/Fail Criteria */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Acceptance Criteria Checklist</h2>
        {showTips && (
          <HelpTip className="mb-4">
            Pass criteria: 100% reconciliation &bull; Completed in &le;2 hours &bull; Evidence package complete &bull; All recall team reachable within 1 hour.
          </HelpTip>
        )}
        <div className="space-y-3">
          {[
            { label: 'Trace completed within 2 hours', pass: exercise.elapsed_minutes != null && exercise.elapsed_minutes <= 120 },
            { label: '100% reconciliation achieved', pass: exercise.reconciled === 1 },
            { label: 'Recall team reachable within 1 hour', pass: exercise.team_reachable_1hr === 1 },
            { label: 'All evidence/documentation complete', pass: exercise.evidence_complete === 1 },
          ].map(item => (
            <div key={item.label} className="flex items-center gap-3">
              {item.pass ? (
                <CheckCircle className="w-5 h-5 text-green-500 flex-shrink-0" />
              ) : (
                <XCircle className="w-5 h-5 text-gray-300 flex-shrink-0" />
              )}
              <span className={`text-sm ${item.pass ? 'text-gray-900' : 'text-gray-500'}`}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Corrective Action */}
      {(exercise.gaps_identified || exercise.corrective_action) && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-amber-800 mb-3">Corrective Action</h2>
          {exercise.gaps_identified && (
            <div className="mb-3">
              <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-1">Gaps Identified</p>
              <p className="text-sm text-gray-700">{exercise.gaps_identified}</p>
            </div>
          )}
          {exercise.corrective_action && (
            <div className="mb-3">
              <p className="text-xs font-medium text-amber-700 uppercase tracking-wide mb-1">Corrective Action</p>
              <p className="text-sm text-gray-700">{exercise.corrective_action}</p>
            </div>
          )}
          {exercise.corrective_action_due && (
            <p className="text-xs text-gray-500">Due: {exercise.corrective_action_due}</p>
          )}
          {exercise.retest_date && (
            <p className="text-xs text-gray-500">Retest Date: {exercise.retest_date}</p>
          )}
        </div>
      )}

      {exercise.notes && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Notes</h2>
          <p className="text-sm text-gray-700">{exercise.notes}</p>
        </div>
      )}

      {/* Complete Exercise Modal */}
      <Modal isOpen={showCompleteModal} onClose={() => setShowCompleteModal(false)} title="Complete Traceability Exercise">
        <form onSubmit={handleComplete} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Result *</label>
            <select required value={completeForm.status || ''} onChange={e => setCompleteForm({ ...completeForm, status: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2">
              <option value="">Select...</option>
              <option value="passed">Passed</option>
              <option value="failed">Failed</option>
              <option value="corrective_action">Corrective Action Required</option>
            </select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Produced</label>
              <input type="number" value={completeForm.total_produced || ''} onChange={e => setCompleteForm({ ...completeForm, total_produced: parseInt(e.target.value) || 0 })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total Shipped</label>
              <input type="number" value={completeForm.total_shipped || ''} onChange={e => setCompleteForm({ ...completeForm, total_shipped: parseInt(e.target.value) || 0 })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Total On-Site</label>
              <input type="number" value={completeForm.total_onsite || ''} onChange={e => setCompleteForm({ ...completeForm, total_onsite: parseInt(e.target.value) || 0 })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Adjustments</label>
              <input type="number" value={completeForm.total_adjustments || ''} onChange={e => setCompleteForm({ ...completeForm, total_adjustments: parseInt(e.target.value) || 0 })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
            </div>
          </div>
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={completeForm.team_reachable_1hr || false} onChange={e => setCompleteForm({ ...completeForm, team_reachable_1hr: e.target.checked })} className="rounded border-gray-300" />
              Team reachable in 1hr
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-700">
              <input type="checkbox" checked={completeForm.evidence_complete || false} onChange={e => setCompleteForm({ ...completeForm, evidence_complete: e.target.checked })} className="rounded border-gray-300" />
              Evidence complete
            </label>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Gaps Identified</label>
            <textarea rows={2} value={completeForm.gaps_identified || ''} onChange={e => setCompleteForm({ ...completeForm, gaps_identified: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Corrective Action</label>
            <textarea rows={2} value={completeForm.corrective_action || ''} onChange={e => setCompleteForm({ ...completeForm, corrective_action: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea rows={2} value={completeForm.notes || ''} onChange={e => setCompleteForm({ ...completeForm, notes: e.target.value })} className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2" />
          </div>
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowCompleteModal(false)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm">Complete Exercise</button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
