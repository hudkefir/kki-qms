import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FlaskConical, AlertTriangle, Clock, CheckCircle, XCircle,
  ChevronDown, ChevronUp, Beaker, AlertCircle, Package, Truck
} from 'lucide-react';
import { useFetch } from '../hooks/useApi';

const PROFILE_LABELS = {
  routine: 'Routine QC',
  cfia_micro: 'CFIA Micro',
  fda: 'FDA Panel',
  full_panel: 'Full Panel',
};

const PRIORITY_THRESHOLDS = {
  critical: 150,
  high: 80,
  medium: 40,
};

function getPriorityLevel(score) {
  if (score >= PRIORITY_THRESHOLDS.critical) return { label: 'Critical', color: 'text-red-700 bg-red-100', border: 'border-red-200', icon: AlertCircle };
  if (score >= PRIORITY_THRESHOLDS.high) return { label: 'High', color: 'text-amber-700 bg-amber-100', border: 'border-amber-200', icon: AlertTriangle };
  if (score >= PRIORITY_THRESHOLDS.medium) return { label: 'Medium', color: 'text-blue-700 bg-blue-100', border: 'border-blue-200', icon: Clock };
  return { label: 'Low', color: 'text-gray-600 bg-gray-100', border: 'border-gray-200', icon: CheckCircle };
}

export default function BatchTestRecommendations({ onCreateTest }) {
  const { data, loading, error, refetch } = useFetch('/api/batch-tests/recommend-next');
  const [expanded, setExpanded] = useState(true);
  const navigate = useNavigate();

  if (loading || error) return null;

  const recommendations = data?.recommendations || [];
  const pendingCompletions = data?.pending_completions || [];
  const hasItems = recommendations.length > 0 || pendingCompletions.length > 0;

  if (!hasItems) return null;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-6">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50/50 transition-colors"
      >
        <div className="flex items-center gap-3">
          <div className="bg-indigo-50 p-2 rounded-lg">
            <Beaker className="w-5 h-5 text-indigo-600" />
          </div>
          <div className="text-left">
            <h2 className="text-base font-semibold text-gray-900">Testing Recommendations</h2>
            <p className="text-xs text-gray-500">
              {recommendations.length} batch{recommendations.length !== 1 ? 'es' : ''} need testing
              {pendingCompletions.length > 0 && ` | ${pendingCompletions.length} pending completion`}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {recommendations.filter(r => r.score >= PRIORITY_THRESHOLDS.critical).length > 0 && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
              <AlertCircle className="w-3 h-3" />
              {recommendations.filter(r => r.score >= PRIORITY_THRESHOLDS.critical).length} CRITICAL
            </span>
          )}
          {expanded ? <ChevronUp className="w-5 h-5 text-gray-400" /> : <ChevronDown className="w-5 h-5 text-gray-400" />}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-5 py-4">
          {/* Pending completions banner */}
          {pendingCompletions.length > 0 && (
            <div className="mb-4">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Pending Completion</p>
              <div className="space-y-2">
                {pendingCompletions.map(p => (
                  <div
                    key={p.batch_test_id}
                    onClick={() => navigate(`/batch-testing/${p.batch_test_id}`)}
                    className="flex items-center justify-between p-3 rounded-lg bg-amber-50 border border-amber-200 cursor-pointer hover:bg-amber-100 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Clock className="w-4 h-4 text-amber-500 flex-shrink-0" />
                      <div>
                        <span className="text-sm font-medium text-gray-900">Lot {p.batch_number}</span>
                        {p.product_name && <span className="text-xs text-gray-500 ml-2">{p.product_name}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-amber-700 font-medium">
                        {p.pending_results}/{p.total_results} results pending
                      </span>
                      <span className="text-xs text-gray-400">{p.test_date}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recommendations list */}
          {recommendations.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recommended Next Tests</p>
              <div className="space-y-2">
                {recommendations.map((rec, i) => {
                  const priority = getPriorityLevel(rec.score);
                  const PriorityIcon = priority.icon;
                  return (
                    <div
                      key={rec.batch_number}
                      className={`flex items-center justify-between p-3 rounded-lg border ${priority.border} hover:shadow-sm transition-all cursor-pointer`}
                      onClick={() => {
                        if (onCreateTest) {
                          onCreateTest(rec);
                        }
                      }}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="flex items-center justify-center w-6 h-6 flex-shrink-0">
                          <span className="text-xs font-bold text-gray-400">#{i + 1}</span>
                        </div>
                        <PriorityIcon className={`w-4 h-4 flex-shrink-0 ${
                          rec.score >= PRIORITY_THRESHOLDS.critical ? 'text-red-500' :
                          rec.score >= PRIORITY_THRESHOLDS.high ? 'text-amber-500' :
                          rec.score >= PRIORITY_THRESHOLDS.medium ? 'text-blue-500' : 'text-gray-400'
                        }`} />
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-semibold text-gray-900">Lot {rec.batch_number}</span>
                            <span className={`inline-flex items-center px-1.5 py-0 rounded text-[10px] font-bold ${priority.color}`}>
                              {priority.label}
                            </span>
                            {rec.on_hold && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[10px] font-bold bg-red-100 text-red-700">
                                <Package className="w-2.5 h-2.5" /> HOLD
                              </span>
                            )}
                            {rec.last_test_status === 'fail' && (
                              <span className="inline-flex items-center gap-0.5 px-1.5 py-0 rounded text-[10px] font-bold bg-red-100 text-red-700">
                                <XCircle className="w-2.5 h-2.5" /> FAILED
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 mt-0.5 text-xs text-gray-500">
                            {rec.sku && <span>{rec.sku}</span>}
                            <span>{rec.batch_age_days}d old</span>
                            {rec.bins > 0 && <span>{rec.bins} bins</span>}
                            {rec.last_test_date ? (
                              <span>Last: {rec.last_test_date}</span>
                            ) : (
                              <span className="text-red-500 font-medium">Never tested</span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-3">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-indigo-50 text-indigo-700">
                          {PROFILE_LABELS[rec.recommended_profile] || rec.recommended_profile}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Reasons tooltip area */}
              <details className="mt-3">
                <summary className="text-xs text-gray-400 cursor-pointer hover:text-gray-600">
                  Why these batches? (scoring criteria)
                </summary>
                <div className="mt-2 p-3 bg-gray-50 rounded-lg text-xs text-gray-600 space-y-1">
                  <p><strong>Never tested:</strong> +100 pts</p>
                  <p><strong>Micro test overdue ({data?.criteria?.micro_test_interval_days || 30}+ days):</strong> +80 pts</p>
                  <p><strong>Batch on hold:</strong> +70 pts</p>
                  <p><strong>Previous test failed:</strong> +60 pts</p>
                  <p><strong>Approaching shelf life (21+ days):</strong> +50 pts</p>
                  <p><strong>Routine test overdue ({data?.criteria?.routine_test_interval_days || 7}+ days):</strong> +40 pts</p>
                  <p><strong>Only routine done, needs micro (14+ days):</strong> +30 pts</p>
                  <p><strong>High-volume SKU:</strong> +15 pts</p>
                  <p><strong>Large batch (20+ bins):</strong> +10 pts</p>
                </div>
              </details>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
