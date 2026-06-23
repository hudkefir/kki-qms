import React, { useState, useMemo, useCallback } from 'react';
import { Link } from 'react-router-dom';
import {
  Shield,
  Clock,
  CheckCircle,
  AlertTriangle,
  XCircle,
  Minus,
  ChevronDown,
  ChevronRight,
  Printer,
  Filter,
  Target,
  TrendingUp,
  Save,
  FileText,
  MessageSquare,
} from 'lucide-react';
import { useFetch, apiPut } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';

const AUDIT_STATUSES = ['met', 'partial', 'not_met', 'na'];

function getDaysUntilAudit() {
  const audit = new Date('2026-04-23');
  const now = new Date();
  return Math.max(0, Math.ceil((audit - now) / (1000 * 60 * 60 * 24)));
}

export default function AuditPrep() {
  const [statusFilter, setStatusFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [editingItem, setEditingItem] = useState(null); // { id, notes, evidence_ref }
  const [saving, setSaving] = useState(null); // item id being saved

  const { canWrite } = useAuth();
  const { data: auditItems, loading: auditLoading, refetch: refetchAudit } = useFetch('/api/audit');
  const { data: sopsData, loading: sopsLoading } = useFetch('/api/sops');

  const loading = auditLoading || sopsLoading;
  const sops = sopsData?.sops || sopsData || [];
  const daysUntil = getDaysUntilAudit();

  // Build structured data from audit checklist items
  const auditInfo = useMemo(() => {
    const items = Array.isArray(auditItems) ? auditItems : [];
    let totalReqs = 0;
    let met = 0;
    let partial = 0;
    let notMet = 0;

    const categoryMap = {};

    items.forEach(item => {
      if (item.status === 'na') return;
      totalReqs++;

      const cat = item.category || 'Uncategorized';
      if (!categoryMap[cat]) {
        categoryMap[cat] = { name: cat, items: [], totalReqs: 0, met: 0, partial: 0, notMet: 0, sops: new Set() };
      }
      categoryMap[cat].totalReqs++;
      categoryMap[cat].items.push(item);
      if (item.sop_number) categoryMap[cat].sops.add(item.sop_number);

      if (item.status === 'met') { met++; categoryMap[cat].met++; }
      else if (item.status === 'partial') { partial++; categoryMap[cat].partial++; }
      else { notMet++; categoryMap[cat].notMet++; }
    });

    // If no audit items loaded yet, fall back to SOP-based calculation
    if (items.length === 0 && sops.length > 0) {
      sops.forEach(sop => {
        totalReqs++;
        const cat = sop.category_name || 'Uncategorized';
        if (!categoryMap[cat]) {
          categoryMap[cat] = { name: cat, items: [], totalReqs: 0, met: 0, partial: 0, notMet: 0, sops: new Set() };
        }
        categoryMap[cat].totalReqs++;
        categoryMap[cat].sops.add(sop.sop_number);
        // Readiness now derives from SOP approval status (Costco cleanup tracker retired).
        if (sop.status === 'active' || sop.status === 'approved') { met++; categoryMap[cat].met++; }
        else if (sop.status === 'in_review') { partial++; categoryMap[cat].partial++; }
        else { notMet++; categoryMap[cat].notMet++; }
      });
    }

    const readiness = totalReqs > 0 ? Math.round((met / totalReqs) * 100) : 0;
    const categories = Object.values(categoryMap)
      .map(c => ({ ...c, sops: Array.from(c.sops) }))
      .sort((a, b) => a.name.localeCompare(b.name));

    return { totalReqs, met, partial, notMet, readiness, categories };
  }, [auditItems, sops]);

  // Unique category names for filter
  const allCategories = useMemo(() => auditInfo.categories.map(c => c.name), [auditInfo]);

  // Gap analysis
  const gaps = useMemo(() => {
    const items = [];
    auditInfo.categories.forEach(cat => {
      const notMetItems = cat.items.filter(i => i.status === 'not_met');
      const partialItems = cat.items.filter(i => i.status === 'partial');
      if (notMetItems.length > 0 || partialItems.length > 0) {
        items.push({
          category: cat.name,
          notMet: notMetItems,
          partial: partialItems,
          light: notMetItems.length > 0 ? 'red' : 'amber',
        });
      }
    });
    return items.sort((a, b) => (a.light === 'red' ? 0 : 1) - (b.light === 'red' ? 0 : 1));
  }, [auditInfo]);

  // Filtering
  const filteredCategories = useMemo(() => {
    let cats = auditInfo.categories;
    if (categoryFilter) {
      cats = cats.filter(c => c.name === categoryFilter);
    }
    if (statusFilter) {
      cats = cats.map(cat => ({
        ...cat,
        items: cat.items.filter(item => {
          if (statusFilter === 'met') return item.status === 'met';
          if (statusFilter === 'partial') return item.status === 'partial';
          if (statusFilter === 'not_met') return item.status === 'not_met';
          return true;
        }),
      })).filter(cat => cat.items.length > 0);
    }
    return cats;
  }, [auditInfo.categories, statusFilter, categoryFilter]);

  const toggleCategory = (name) => {
    setExpandedCategories(prev => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name); else next.add(name);
      return next;
    });
  };

  const expandAll = () => setExpandedCategories(new Set(filteredCategories.map(c => c.name)));
  const collapseAll = () => setExpandedCategories(new Set());

  const handleStatusChange = useCallback(async (itemId, newStatus) => {
    setSaving(itemId);
    try {
      await apiPut(`/api/audit/${itemId}`, { status: newStatus });
      refetchAudit();
    } catch (err) {
      alert('Failed to update: ' + err.message);
    } finally {
      setSaving(null);
    }
  }, [refetchAudit]);

  const startEditItem = (item) => {
    setEditingItem({ id: item.id, notes: item.notes || '', evidence_ref: item.evidence_ref || '' });
  };

  const saveItemDetails = useCallback(async () => {
    if (!editingItem) return;
    setSaving(editingItem.id);
    try {
      await apiPut(`/api/audit/${editingItem.id}`, {
        notes: editingItem.notes,
        evidence_ref: editingItem.evidence_ref,
      });
      setEditingItem(null);
      refetchAudit();
    } catch (err) {
      alert('Failed to save: ' + err.message);
    } finally {
      setSaving(null);
    }
  }, [editingItem, refetchAudit]);

  if (loading) return <LoadingSpinner message="Loading audit data..." />;

  const summaryCards = [
    { label: 'Total Requirements', value: auditInfo.totalReqs, icon: Target, color: 'text-navy-600', bg: 'bg-navy-50' },
    { label: 'Met', value: auditInfo.met, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50' },
    { label: 'Partial', value: auditInfo.partial, icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50' },
    { label: 'Not Met', value: auditInfo.notMet, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50' },
  ];

  return (
    <div className="max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Audit Preparation</h1>
          <p className="text-sm text-gray-500 mt-1">Costco Introductory GMP Audit V3.0 — SGS Audit, April 23, 2026</p>
        </div>
        <div className="flex items-center gap-3">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${daysUntil <= 30 ? 'bg-red-50 text-red-700' : daysUntil <= 90 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'}`}>
            <Clock className="w-4 h-4" />
            <span className="text-sm font-semibold">{daysUntil} days remaining</span>
          </div>
          <button
            onClick={() => window.print()}
            className="no-print flex items-center gap-2 px-4 py-2 border border-gray-200 bg-white rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print Summary
          </button>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-5 mb-8">
        {summaryCards.map(card => (
          <div key={card.label} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
            <div className={`${card.bg} p-2.5 rounded-lg w-fit mb-3`}>
              <card.icon className={`w-5 h-5 ${card.color}`} />
            </div>
            <p className="text-3xl font-bold text-gray-900">{card.value}</p>
            <p className="text-sm text-gray-500 mt-1">{card.label}</p>
          </div>
        ))}
      </div>

      {/* Readiness Gauge */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-navy-50 p-2.5 rounded-lg">
            <Shield className="w-5 h-5 text-navy-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Overall Readiness</h2>
            <p className="text-sm text-gray-500">{auditInfo.categories.length} GMP categories, {auditInfo.totalReqs} requirements</p>
          </div>
        </div>
        <div className="flex items-end gap-6">
          <span className={`text-6xl font-bold ${auditInfo.readiness >= 80 ? 'text-green-600' : auditInfo.readiness >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
            {auditInfo.readiness}%
          </span>
          <div className="flex-1">
            <div className="w-full bg-gray-100 rounded-full h-5">
              <div
                className={`h-5 rounded-full transition-all duration-500 ${
                  auditInfo.readiness >= 80 ? 'bg-green-500' : auditInfo.readiness >= 50 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${auditInfo.readiness}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-400 mt-1">
              <span>0%</span>
              <span>25%</span>
              <span>50%</span>
              <span>75%</span>
              <span>100%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and Category Sections */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 mb-8">
        <div className="p-4 border-b border-gray-200 flex items-center justify-between no-print">
          <div className="flex items-center gap-3">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={e => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 bg-white"
            >
              <option value="">All Statuses</option>
              <option value="met">Met (Green)</option>
              <option value="partial">Partial (Amber)</option>
              <option value="not_met">Not Met (Red)</option>
            </select>
            <select
              value={categoryFilter}
              onChange={e => setCategoryFilter(e.target.value)}
              className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-navy-500 bg-white"
            >
              <option value="">All Categories</option>
              {allCategories.map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-2">
            <button onClick={expandAll} className="text-xs text-navy-600 hover:text-navy-800 font-medium">Expand All</button>
            <span className="text-gray-300">|</span>
            <button onClick={collapseAll} className="text-xs text-navy-600 hover:text-navy-800 font-medium">Collapse All</button>
          </div>
        </div>

        {filteredCategories.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-sm text-gray-500">No items match the current filter</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredCategories.map(cat => {
              const expanded = expandedCategories.has(cat.name);
              const catReadiness = cat.totalReqs > 0 ? Math.round((cat.met / cat.totalReqs) * 100) : 0;

              return (
                <div key={cat.name}>
                  <button
                    onClick={() => toggleCategory(cat.name)}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {expanded
                        ? <ChevronDown className="w-4 h-4 text-gray-400" />
                        : <ChevronRight className="w-4 h-4 text-gray-400" />
                      }
                      <h3 className="text-sm font-semibold text-gray-900">{cat.name}</h3>
                      <span className="text-xs text-gray-400">{cat.items.length} item{cat.items.length !== 1 ? 's' : ''}</span>
                      <div className="flex items-center gap-1.5 ml-2">
                        <span className="text-xs text-green-600 font-medium">{cat.met}</span>
                        <span className="text-xs text-gray-300">/</span>
                        <span className="text-xs text-amber-600 font-medium">{cat.partial}</span>
                        <span className="text-xs text-gray-300">/</span>
                        <span className="text-xs text-red-600 font-medium">{cat.notMet}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="w-24 bg-gray-100 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${
                            catReadiness >= 80 ? 'bg-green-500' : catReadiness >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${catReadiness}%` }}
                        />
                      </div>
                      <span className={`text-xs font-semibold min-w-[36px] text-right ${
                        catReadiness >= 80 ? 'text-green-600' : catReadiness >= 50 ? 'text-amber-600' : 'text-red-600'
                      }`}>
                        {catReadiness}%
                      </span>
                    </div>
                  </button>

                  {expanded && (
                    <div className="px-6 pb-4">
                      <table className="w-full">
                        <thead>
                          <tr className="text-xs text-gray-500 uppercase tracking-wider">
                            <th className="text-left py-2 px-2 font-semibold w-8">Status</th>
                            <th className="text-left py-2 px-2 font-semibold">Requirement</th>
                            <th className="text-left py-2 px-2 font-semibold w-28">SOP</th>
                            <th className="text-left py-2 px-2 font-semibold w-32">Assessment</th>
                            <th className="text-left py-2 px-2 font-semibold w-44">Notes / Evidence</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {cat.items.map(item => {
                            const isEditing = editingItem?.id === item.id;
                            const isSaving = saving === item.id;
                            return (
                              <tr key={item.id} className="hover:bg-gray-50 group">
                                <td className="py-2.5 px-2">
                                  <StatusDot status={item.status} />
                                </td>
                                <td className="py-2.5 px-2">
                                  <span className="text-sm text-gray-900">{item.requirement}</span>
                                </td>
                                <td className="py-2.5 px-2">
                                  {item.sop_number ? (
                                    <Link
                                      to={`/sops/${item.sop_id}`}
                                      className="text-xs font-mono text-navy-600 hover:text-navy-800 hover:underline"
                                    >
                                      {item.sop_number}
                                    </Link>
                                  ) : (
                                    <span className="text-xs text-gray-400">-</span>
                                  )}
                                </td>
                                <td className="py-2.5 px-2">
                                  <select
                                    value={item.status || 'not_met'}
                                    onChange={e => handleStatusChange(item.id, e.target.value)}
                                    disabled={!canWrite() || isSaving}
                                    className={`px-2 py-1 rounded-lg text-xs font-medium border focus:outline-none focus:ring-2 focus:ring-navy-500 ${
                                      item.status === 'met' ? 'bg-green-50 border-green-200 text-green-700' :
                                      item.status === 'partial' ? 'bg-amber-50 border-amber-200 text-amber-700' :
                                      item.status === 'not_met' ? 'bg-red-50 border-red-200 text-red-700' :
                                      'bg-gray-50 border-gray-200 text-gray-600'
                                    } ${!canWrite() ? 'opacity-60 cursor-not-allowed' : ''}`}
                                  >
                                    {AUDIT_STATUSES.map(s => (
                                      <option key={s} value={s}>
                                        {s === 'na' ? 'N/A' : s.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                                      </option>
                                    ))}
                                  </select>
                                </td>
                                <td className="py-2.5 px-2">
                                  {isEditing ? (
                                    <div className="space-y-1.5">
                                      <input
                                        type="text"
                                        placeholder="Notes..."
                                        value={editingItem.notes}
                                        onChange={e => setEditingItem(prev => ({ ...prev, notes: e.target.value }))}
                                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-navy-500"
                                      />
                                      <input
                                        type="text"
                                        placeholder="Evidence ref (e.g., Form-123, Log-456)..."
                                        value={editingItem.evidence_ref}
                                        onChange={e => setEditingItem(prev => ({ ...prev, evidence_ref: e.target.value }))}
                                        className="w-full px-2 py-1 border border-gray-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-navy-500"
                                      />
                                      <div className="flex gap-1">
                                        <button
                                          onClick={saveItemDetails}
                                          disabled={isSaving}
                                          className="flex items-center gap-1 px-2 py-0.5 bg-navy-800 text-white rounded text-xs hover:bg-navy-700 disabled:bg-navy-400"
                                        >
                                          <Save className="w-3 h-3" />
                                          {isSaving ? '...' : 'Save'}
                                        </button>
                                        <button
                                          onClick={() => setEditingItem(null)}
                                          className="px-2 py-0.5 text-xs text-gray-500 hover:text-gray-700"
                                        >
                                          Cancel
                                        </button>
                                      </div>
                                    </div>
                                  ) : (
                                    <div
                                      onClick={() => canWrite() && startEditItem(item)}
                                      className={`${canWrite() ? 'cursor-pointer hover:bg-gray-100' : ''} rounded p-1 min-h-[28px]`}
                                    >
                                      {item.notes && (
                                        <div className="flex items-center gap-1 text-xs text-gray-600">
                                          <MessageSquare className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">{item.notes}</span>
                                        </div>
                                      )}
                                      {item.evidence_ref && (
                                        <div className="flex items-center gap-1 text-xs text-blue-600">
                                          <FileText className="w-3 h-3 flex-shrink-0" />
                                          <span className="truncate">{item.evidence_ref}</span>
                                        </div>
                                      )}
                                      {!item.notes && !item.evidence_ref && canWrite() && (
                                        <span className="text-xs text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity">Click to add...</span>
                                      )}
                                      {!item.notes && !item.evidence_ref && !canWrite() && (
                                        <span className="text-xs text-gray-400">-</span>
                                      )}
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Gap Analysis */}
      {gaps.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8 print-break">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-red-50 p-2.5 rounded-lg">
              <TrendingUp className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Gap Analysis</h2>
              <p className="text-sm text-gray-500">{gaps.length} categor{gaps.length !== 1 ? 'ies' : 'y'} with outstanding items</p>
            </div>
          </div>

          <div className="space-y-3">
            {gaps.map(gap => (
              <div
                key={gap.category}
                className={`rounded-lg p-4 border ${
                  gap.light === 'red' ? 'bg-red-50 border-red-100' : 'bg-amber-50 border-amber-100'
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <TrafficLight color={gap.light} />
                  <span className="text-sm font-semibold text-gray-900">{gap.category}</span>
                  <span className="text-xs text-gray-500">
                    ({gap.notMet.length} not met, {gap.partial.length} partial)
                  </span>
                </div>
                <ul className="ml-5 space-y-1">
                  {gap.notMet.map(item => (
                    <li key={item.id} className="flex items-start gap-2 text-sm">
                      <XCircle className="w-3.5 h-3.5 text-red-500 flex-shrink-0 mt-0.5" />
                      <span className="text-red-700">{item.requirement}</span>
                    </li>
                  ))}
                  {gap.partial.map(item => (
                    <li key={item.id} className="flex items-start gap-2 text-sm">
                      <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0 mt-0.5" />
                      <span className="text-amber-700">{item.requirement}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Action Items */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 print-break">
        <div className="flex items-center gap-3 mb-4">
          <div className="bg-navy-50 p-2.5 rounded-lg">
            <Target className="w-5 h-5 text-navy-600" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Action Items</h2>
            <p className="text-sm text-gray-500">Prioritized list of actions needed for audit readiness</p>
          </div>
        </div>

        {gaps.length === 0 ? (
          <div className="text-center py-8">
            <CheckCircle className="w-10 h-10 text-green-400 mx-auto mb-2" />
            <p className="text-sm font-medium text-green-700">All requirements met!</p>
            <p className="text-xs text-gray-500 mt-1">Your QMS is audit ready</p>
          </div>
        ) : (
          <div className="space-y-2">
            {gaps.filter(g => g.light === 'red').map((gap, idx) => (
              <div key={`red-${gap.category}`} className="flex items-start gap-3 p-3 bg-red-50 rounded-lg border border-red-100">
                <span className="text-xs font-bold text-red-600 bg-red-100 px-2 py-0.5 rounded mt-0.5">P{idx + 1}</span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{gap.category}</p>
                  <p className="text-xs text-red-600 mt-0.5">
                    {gap.notMet.length} requirement{gap.notMet.length !== 1 ? 's' : ''} not met
                  </p>
                </div>
              </div>
            ))}
            {gaps.filter(g => g.light === 'amber').map((gap, idx) => (
              <div key={`amber-${gap.category}`} className="flex items-start gap-3 p-3 bg-amber-50 rounded-lg border border-amber-100">
                <span className="text-xs font-bold text-amber-600 bg-amber-100 px-2 py-0.5 rounded mt-0.5">
                  P{gaps.filter(g => g.light === 'red').length + idx + 1}
                </span>
                <div>
                  <p className="text-sm font-medium text-gray-900">{gap.category}</p>
                  <p className="text-xs text-amber-600 mt-0.5">
                    {gap.partial.length} item{gap.partial.length !== 1 ? 's' : ''} partially met
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function StatusDot({ status }) {
  const cls = status === 'met' ? 'bg-green-500' : status === 'partial' ? 'bg-amber-500' : status === 'not_met' ? 'bg-red-500' : 'bg-gray-300';
  return <div className={`w-3 h-3 rounded-full ${cls} flex-shrink-0`} />;
}

function TrafficLight({ color }) {
  const cls = color === 'green' ? 'bg-green-500' : color === 'amber' ? 'bg-amber-500' : 'bg-red-500';
  return <div className={`w-3 h-3 rounded-full ${cls} flex-shrink-0`} />;
}
