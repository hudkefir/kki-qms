import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar, Plus, Search, Filter, Package, Truck, ClipboardList, BarChart3,
  ChevronDown, ChevronUp, X, Save, Trash2, RefreshCw, AlertTriangle, Check,
  Edit2, Archive
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useFetch, apiPost, apiPut, apiDelete, apiPatch } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';

/* ── SKU reference data ─────────────────────────────────────────────── */
const SKUS = [
  { code: 'CK001-CAD', label: 'SC-CDN',  type: 'small', yld: 10.4 },
  { code: 'CK001-USA', label: 'SC-USA',  type: 'small', yld: 10.4 },
  { code: 'CK002-CAD', label: 'LC-CDN',  type: 'large', yld: 5.5 },
  { code: 'CK003-CAD', label: 'SCM-CDN', type: 'small', yld: 11 },
  { code: 'CK003-USA', label: 'SCM-USA', type: 'small', yld: 8.8 },
  { code: 'CK004-CAD', label: 'SCG-CDN', type: 'small', yld: 11 },
  { code: 'CK004-USA', label: 'SCG-USA', type: 'small', yld: 11 },
];
const SKU_LABELS = SKUS.map(s => s.label);
const skuByLabel = (label) => SKUS.find(s => s.label === label);

/* ── Date helpers ────────────────────────────────────────────────────── */
function monday(d) {
  const dt = new Date(d);
  const day = dt.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  dt.setDate(dt.getDate() + diff);
  dt.setHours(0, 0, 0, 0);
  return dt;
}
function addDays(d, n) {
  const dt = new Date(d);
  dt.setDate(dt.getDate() + n);
  return dt;
}
function fmt(d) {
  return d.toISOString().slice(0, 10);
}
function fmtShort(d) {
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}
function dayName(d) {
  return d.toLocaleDateString('en-US', { weekday: 'short' });
}

const WEEKDAYS = [0, 1, 2, 3, 4]; // Mon-Fri offsets

/* ── Tabs ────────────────────────────────────────────────────────────── */
const TABS = [
  { key: 'schedule',     label: 'Schedule',     icon: Calendar },
  { key: 'inventory',    label: 'Inventory',    icon: Package },
  { key: 'orders',       label: 'Orders',       icon: Truck },
  { key: 'fermentation', label: 'Fermentation', icon: ClipboardList },
];

/* ── Pill tab component ──────────────────────────────────────────────── */
function TabBar({ active, onChange }) {
  return (
    <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
      {TABS.map(t => {
        const Icon = t.icon;
        const isActive = active === t.key;
        return (
          <button
            key={t.key}
            onClick={() => onChange(t.key)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              isActive ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-600 hover:text-gray-900 hover:bg-gray-200'
            }`}
          >
            <Icon className="w-4 h-4" />
            {t.label}
          </button>
        );
      })}
    </div>
  );
}

/* ── Metric card ─────────────────────────────────────────────────────── */
function MetricCard({ label, value, sub, color = 'indigo' }) {
  const ring = {
    indigo: 'border-indigo-200 bg-indigo-50',
    green:  'border-green-200 bg-green-50',
    amber:  'border-amber-200 bg-amber-50',
    red:    'border-red-200 bg-red-50',
  }[color] || 'border-gray-200 bg-gray-50';
  return (
    <div className={`rounded-xl border px-4 py-3 ${ring}`}>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="text-2xl font-bold font-mono text-gray-900 mt-1">{value ?? '—'}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

/* ── Demand vs Supply Chart ─────────────────────────────────────────── */
function DemandSupplyChart({ data }) {
  const chartData = useMemo(() => {
    return Object.entries(data).map(([sku, { demand, supply, surplus }]) => ({
      sku,
      demand,
      supply,
      surplus,
    }));
  }, [data]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
      <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">Demand vs Supply by SKU</h3>
      <ResponsiveContainer width="100%" height={260}>
        <BarChart data={chartData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
          <XAxis dataKey="sku" tick={{ fontSize: 11 }} />
          <YAxis tick={{ fontSize: 11 }} />
          <Tooltip contentStyle={{ fontSize: 12 }} />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Bar dataKey="demand" fill="#f59e0b" name="Demand" radius={[3, 3, 0, 0]} />
          <Bar dataKey="supply" fill="#10b981" name="Supply" radius={[3, 3, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   PLANNER PAGE
   ══════════════════════════════════════════════════════════════════════ */
export default function Planner() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState('schedule');

  /* ── Dashboard metrics ─────────────────────────────────────────────── */
  const { data: dashboard, loading: dashLoading, refetch: refetchDash } =
    useFetch('/api/planner/dashboard');

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Production Planner</h1>
          <p className="text-sm text-gray-500 mt-1">Schedule pours, manage inventory, track orders</p>
        </div>
        <TabBar active={tab} onChange={setTab} />
      </div>

      {/* Dashboard summary row */}
      {dashboard && !dashLoading && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MetricCard label="Bins Available" value={dashboard.totalBinsAvailable} color="indigo" />
            <MetricCard label="Cases Available" value={dashboard.totalCasesAvailable} color="green" />
            <MetricCard label="Bins Planned" value={dashboard.binsPlanned} color="amber" />
            <MetricCard label="Fermentation Bins" value={dashboard.fermentationBins} color="green" />
          </div>
          {/* Demand vs Supply chart */}
          {dashboard.demandVsSupply && Object.keys(dashboard.demandVsSupply).length > 0 && (
            <DemandSupplyChart data={dashboard.demandVsSupply} />
          )}
        </>
      )}

      {/* Tab content */}
      {tab === 'schedule'     && <ScheduleTab refetchDash={refetchDash} />}
      {tab === 'inventory'    && <InventoryTab />}
      {tab === 'orders'       && <OrdersTab />}
      {tab === 'fermentation' && <FermentationTab />}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   TAB 1 — SCHEDULE
   ══════════════════════════════════════════════════════════════════════ */
function ScheduleTab({ refetchDash }) {
  const [startDate, setStartDate] = useState(() => fmt(monday(new Date())));
  const [weeks, setWeeks] = useState(2);
  const [pours, setPours] = useState([]);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');
  const saveTimer = useRef(null);

  const from = startDate;
  const to = fmt(addDays(new Date(startDate), weeks * 7 - 1));

  const { data: poursData, loading, refetch: refetchPours } =
    useFetch(`/api/planner/pours?from=${from}&to=${to}`, [from, to]);

  const { data: settings } = useFetch('/api/planner/settings');

  const maxBinsPerDay = settings?.bins_per_day ?? 6;

  useEffect(() => {
    if (poursData) {
      setPours(poursData);
    }
  }, [poursData]);

  /* Build day structure */
  const weekBlocks = useMemo(() => {
    const blocks = [];
    for (let w = 0; w < weeks; w++) {
      const weekStart = addDays(new Date(startDate), w * 7);
      const days = WEEKDAYS.map(offset => {
        const date = addDays(weekStart, offset);
        const dateStr = fmt(date);
        const dayPours = pours.filter(p => p.date === dateStr);
        // Ensure at least one empty row
        if (dayPours.length === 0) {
          dayPours.push({ id: null, date: dateStr, sku: '', bins: 0, estimated_cases: 0, actual_cases: null, batch_number: '', _key: `${dateStr}-0` });
        }
        dayPours.forEach((p, i) => { if (!p._key) p._key = `${p.date}-${p.id || i}`; });
        return { date, dateStr, pours: dayPours };
      });
      blocks.push({ weekNum: w + 1, weekStart, days });
    }
    return blocks;
  }, [pours, weeks, startDate]);

  /* Compute totals */
  const totalBins = pours.reduce((s, p) => s + (Number(p.bins) || 0), 0);
  const totalEstCases = pours.reduce((s, p) => s + (Number(p.estimated_cases) || 0), 0);

  /* Pour field change */
  const handlePourChange = useCallback((dateStr, pourKey, field, value) => {
    setPours(prev => {
      const next = prev.map(p => {
        if (p._key !== pourKey) return p;
        const updated = { ...p, [field]: value };
        if (field === 'sku' || field === 'bins') {
          const sku = skuByLabel(field === 'sku' ? value : updated.sku);
          const bins = Number(field === 'bins' ? value : updated.bins) || 0;
          updated.estimated_cases = sku ? Math.round(bins * sku.yld) : 0;
        }
        return updated;
      });
      return next;
    });
    // Debounced save
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => savePours(), 500);
  }, []);

  /* Add pour row to a day */
  const addPourRow = useCallback((dateStr) => {
    const key = `${dateStr}-new-${Date.now()}`;
    setPours(prev => [...prev, { id: null, date: dateStr, sku: '', bins: 0, estimated_cases: 0, actual_cases: null, batch_number: '', _key: key }]);
  }, []);

  /* Remove pour row */
  const removePourRow = useCallback((pourKey) => {
    setPours(prev => prev.filter(p => p._key !== pourKey));
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => savePours(), 500);
  }, []);

  /* Save pours */
  const savePours = useCallback(async () => {
    setSaving(true);
    setSaveMsg('');
    try {
      const payload = pours
        .filter(p => p.sku && Number(p.bins) > 0)
        .map(p => ({
          id: p.id || undefined,
          date: p.date,
          sku: p.sku,
          bins: Number(p.bins),
          estimated_cases: Number(p.estimated_cases) || 0,
          actual_cases: p.actual_cases !== null && p.actual_cases !== '' ? Number(p.actual_cases) : null,
          batch_number: p.batch_number || '',
        }));
      await apiPost('/api/planner/pours/bulk', { from, to, pours: payload });
      setSaveMsg('Saved');
      refetchDash?.();
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (e) {
      setSaveMsg(`Error: ${e.message}`);
    } finally {
      setSaving(false);
    }
  }, [pours, from, to, refetchDash]);

  /* This Week button */
  const goThisWeek = () => setStartDate(fmt(monday(new Date())));

  if (loading) return <LoadingSpinner message="Loading schedule..." />;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Start</label>
          <input
            type="date"
            value={startDate}
            onChange={e => setStartDate(e.target.value)}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm font-medium text-gray-700">Weeks</label>
          <select
            value={weeks}
            onChange={e => setWeeks(Number(e.target.value))}
            className="border border-gray-300 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500"
          >
            {[1, 2, 3, 4].map(n => <option key={n} value={n}>{n}</option>)}
          </select>
        </div>
        <button onClick={goThisWeek} className="px-3 py-1.5 text-sm font-medium bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
          This Week
        </button>
        <div className="ml-auto flex items-center gap-3">
          {saveMsg && (
            <span className={`text-xs font-medium ${saveMsg.startsWith('Error') ? 'text-red-600' : 'text-green-600'}`}>
              {saveMsg}
            </span>
          )}
          <button
            onClick={savePours}
            disabled={saving}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </div>

      {/* Metrics bar */}
      <div className="grid grid-cols-3 gap-3">
        <MetricCard label="Max Bins / Day" value={maxBinsPerDay} color="indigo" />
        <MetricCard label="Total Bins Planned" value={totalBins} color={totalBins > 0 ? 'green' : 'indigo'} />
        <MetricCard label="Est. Cases" value={totalEstCases} color="green" />
      </div>

      {/* Week blocks */}
      {weekBlocks.map(week => (
        <div key={week.weekNum} className="space-y-2">
          <WeekHeader week={week} />
          <div className="grid grid-cols-1 md:grid-cols-5 gap-2">
            {week.days.map(day => (
              <DayCard
                key={day.dateStr}
                day={day}
                maxBins={maxBinsPerDay}
                onChange={handlePourChange}
                onAdd={addPourRow}
                onRemove={removePourRow}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function WeekHeader({ week }) {
  const totalBins = week.days.reduce((s, d) => s + d.pours.reduce((ss, p) => ss + (Number(p.bins) || 0), 0), 0);
  return (
    <div className="flex items-center justify-between px-2">
      <h3 className="text-sm font-semibold text-gray-700">
        Week {week.weekNum} — {fmtShort(week.weekStart)}
      </h3>
      <span className="text-xs font-mono text-gray-500">{totalBins} bins</span>
    </div>
  );
}

function DayCard({ day, maxBins, onChange, onAdd, onRemove }) {
  const totalBins = day.pours.reduce((s, p) => s + (Number(p.bins) || 0), 0);
  const totalCases = day.pours.reduce((s, p) => s + (Number(p.estimated_cases) || 0), 0);
  const remaining = maxBins - totalBins;
  const isOver = remaining < 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      {/* Day header */}
      <div className={`px-3 py-2 border-b ${isOver ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-gray-800">{dayName(day.date)}</span>
          <span className="text-xs text-gray-500">{fmtShort(day.date)}</span>
        </div>
        <div className="flex items-center justify-between mt-1 text-xs text-gray-500">
          <span className="font-mono">{totalBins}b / {totalCases}cs</span>
          <span className={`font-mono font-medium ${isOver ? 'text-red-600' : 'text-gray-500'}`}>
            {remaining} rem
          </span>
        </div>
      </div>
      {/* Pour rows */}
      <div className="p-2 space-y-2">
        {day.pours.map((pour) => (
          <PourRow key={pour._key} pour={pour} dateStr={day.dateStr} onChange={onChange} onRemove={onRemove} />
        ))}
        {day.pours.length < 2 && (
          <button
            onClick={() => onAdd(day.dateStr)}
            className="w-full flex items-center justify-center gap-1 py-1 text-xs text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
          >
            <Plus className="w-3 h-3" /> Add pour
          </button>
        )}
      </div>
    </div>
  );
}

function PourRow({ pour, dateStr, onChange, onRemove }) {
  return (
    <div className="space-y-1 bg-gray-50 rounded-lg p-2">
      <div className="flex items-center gap-1">
        <select
          value={pour.sku || ''}
          onChange={e => onChange(dateStr, pour._key, 'sku', e.target.value)}
          className="flex-1 border border-gray-300 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
        >
          <option value="">SKU</option>
          {SKU_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
        </select>
        <input
          type="number"
          min="0"
          max="10"
          value={pour.bins || ''}
          onChange={e => onChange(dateStr, pour._key, 'bins', e.target.value)}
          className="w-12 border border-gray-300 rounded px-1.5 py-1 text-xs font-mono text-center focus:ring-1 focus:ring-indigo-500"
          placeholder="bins"
        />
        <button onClick={() => onRemove(pour._key)} className="p-0.5 text-gray-300 hover:text-red-500 transition-colors">
          <X className="w-3 h-3" />
        </button>
      </div>
      <div className="flex items-center gap-1 text-xs">
        <span className="text-gray-400 font-mono">est {pour.estimated_cases || 0}</span>
        <input
          type="number"
          min="0"
          value={pour.actual_cases ?? ''}
          onChange={e => onChange(dateStr, pour._key, 'actual_cases', e.target.value)}
          className="w-14 border border-gray-300 rounded px-1.5 py-0.5 text-xs font-mono focus:ring-1 focus:ring-indigo-500"
          placeholder="actual"
        />
        <input
          type="text"
          value={pour.batch_number || ''}
          onChange={e => onChange(dateStr, pour._key, 'batch_number', e.target.value)}
          className="flex-1 border border-gray-300 rounded px-1.5 py-0.5 text-xs font-mono focus:ring-1 focus:ring-indigo-500"
          placeholder="batch#"
        />
      </div>
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   TAB 2 — INVENTORY
   ══════════════════════════════════════════════════════════════════════ */
function InventoryTab() {
  const { data: inventory, loading, refetch } = useFetch('/api/planner/inventory');
  const { data: fifo, loading: fifoLoading, refetch: refetchFifo } = useFetch('/api/planner/inventory/fifo');
  const [expanded, setExpanded] = useState({});
  const [showBatchModal, setShowBatchModal] = useState(false);
  const [showCountModal, setShowCountModal] = useState(false);

  const toggleExpand = (sku) => setExpanded(prev => ({ ...prev, [sku]: !prev[sku] }));

  if (loading) return <LoadingSpinner message="Loading inventory..." />;

  const invBySku = {};
  (inventory || []).forEach(row => {
    invBySku[row.sku] = row;
  });

  const fifoBySku = {};
  (fifo || []).forEach(row => {
    if (!fifoBySku[row.sku]) fifoBySku[row.sku] = [];
    fifoBySku[row.sku].push(row);
  });

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowBatchModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Batch
        </button>
        <button
          onClick={() => setShowCountModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <ClipboardList className="w-4 h-4" /> Physical Inventory Count
        </button>
        <button onClick={() => { refetch(); refetchFifo(); }} className="ml-auto p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* SKU cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {SKUS.map(sku => {
          const inv = invBySku[sku.label] || {};
          const batches = fifoBySku[sku.label] || [];
          const isOpen = expanded[sku.label];
          const total = inv.total_cases ?? 0;
          const committed = inv.committed ?? 0;
          const net = total - committed;

          return (
            <div key={sku.code} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <button
                onClick={() => toggleExpand(sku.label)}
                className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
              >
                <div className="text-left">
                  <p className="font-semibold text-gray-900">{sku.label}</p>
                  <p className="text-xs text-gray-500">{sku.code}</p>
                </div>
                <div className="text-right flex items-center gap-2">
                  <div>
                    <p className="font-mono font-bold text-lg text-gray-900">{total}</p>
                    <p className={`text-xs font-mono ${net < 0 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}>
                      net {net}
                    </p>
                  </div>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </button>

              {/* Committed bar */}
              <div className="px-4 pb-2">
                <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                  <span>Committed: {committed}</span>
                  <span>Available: {net}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${net < 0 ? 'bg-red-500' : 'bg-green-500'}`}
                    style={{ width: `${total > 0 ? Math.min((committed / total) * 100, 100) : 0}%` }}
                  />
                </div>
              </div>

              {/* Expanded batch list */}
              {isOpen && (
                <div className="border-t border-gray-100 px-4 py-2 space-y-1 max-h-60 overflow-y-auto">
                  {batches.length === 0 && <p className="text-xs text-gray-400 italic py-2">No batches on hand</p>}
                  {batches.map((b, i) => (
                    <BatchRow key={b.id || i} batch={b} refetch={() => { refetch(); refetchFifo(); }} />
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Batch Modal */}
      <AddBatchModal open={showBatchModal} onClose={() => setShowBatchModal(false)} onSaved={() => { refetch(); refetchFifo(); }} />

      {/* Count Modal */}
      <InventoryCountModal open={showCountModal} onClose={() => setShowCountModal(false)} onSaved={() => { refetch(); refetchFifo(); }} />
    </div>
  );
}

function BatchRow({ batch, refetch }) {
  const [loading, setLoading] = useState(false);

  const handleHold = async () => {
    setLoading(true);
    try {
      await apiPatch(`/api/planner/batches/${batch.id}/hold`, {});
      refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete batch ${batch.batch_number}?`)) return;
    setLoading(true);
    try {
      await apiDelete(`/api/planner/batches/${batch.id}`);
      refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setLoading(false);
    }
  };

  const statusColor = batch.status === 'hold' ? 'bg-amber-100 text-amber-700' :
                       batch.status === 'available' ? 'bg-green-100 text-green-700' :
                       'bg-gray-100 text-gray-600';

  return (
    <div className="flex items-center justify-between py-1.5 text-xs border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2">
        <span className="font-mono font-medium text-gray-700">{batch.batch_number}</span>
        <span className="text-gray-400">{batch.pour_date}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="font-mono">{batch.remaining_cases ?? batch.initial_cases} cs</span>
        <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${statusColor}`}>
          {batch.status}
        </span>
        <button onClick={handleHold} disabled={loading} className="p-0.5 text-gray-300 hover:text-amber-500 transition-colors" title="Toggle hold">
          <AlertTriangle className="w-3 h-3" />
        </button>
        <button onClick={handleDelete} disabled={loading} className="p-0.5 text-gray-300 hover:text-red-500 transition-colors" title="Delete">
          <Trash2 className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

function AddBatchModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({ sku: SKU_LABELS[0], batch_number: '', pour_date: fmt(new Date()), cases: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.batch_number || !form.cases) { setError('Batch # and cases are required'); return; }
    setSaving(true);
    setError('');
    try {
      await apiPost('/api/planner/batches', {
        sku: form.sku,
        batch_number: form.batch_number,
        pour_date: form.pour_date,
        initial_cases: Number(form.cases),
        remaining_cases: Number(form.cases),
      });
      onSaved();
      onClose();
      setForm({ sku: SKU_LABELS[0], batch_number: '', pour_date: fmt(new Date()), cases: '' });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Add Batch">
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">SKU</label>
          <select value={form.sku} onChange={e => setForm(f => ({ ...f, sku: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
            {SKU_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Batch #</label>
          <input type="text" value={form.batch_number} onChange={e => setForm(f => ({ ...f, batch_number: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Pour Date</label>
          <input type="date" value={form.pour_date} onChange={e => setForm(f => ({ ...f, pour_date: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cases</label>
          <input type="number" min="0" value={form.cases} onChange={e => setForm(f => ({ ...f, cases: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500" />
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Add Batch'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

function InventoryCountModal({ open, onClose, onSaved }) {
  const [counts, setCounts] = useState(() => SKU_LABELS.map(l => ({ sku: l, counted: '' })));
  const [countDate, setCountDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (sku, value) => {
    setCounts(prev => prev.map(c => c.sku === sku ? { ...c, counted: value } : c));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      const payload = counts.filter(c => c.counted !== '').map(c => ({ sku: c.sku, counted: Number(c.counted) }));
      if (payload.length === 0) { setError('Enter at least one count'); setSaving(false); return; }
      await apiPost('/api/planner/inventory/counts', { counts: payload, count_date: countDate });
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Physical Inventory Count">
      <div className="space-y-3">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Count Date</label>
          <input
            type="date"
            value={countDate}
            onChange={e => setCountDate(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <p className="text-sm text-gray-500">Enter counted cases for each SKU. Leave blank to skip.</p>
        {counts.map(c => (
          <div key={c.sku} className="flex items-center gap-3">
            <span className="w-24 text-sm font-medium text-gray-700">{c.sku}</span>
            <input
              type="number"
              min="0"
              value={c.counted}
              onChange={e => handleChange(c.sku, e.target.value)}
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500"
              placeholder="—"
            />
          </div>
        ))}
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Submit Count'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   TAB 3 — ORDERS
   ══════════════════════════════════════════════════════════════════════ */
function OrdersTab() {
  const { data: orders, loading, refetch } = useFetch('/api/planner/purchase-orders');
  const { data: fifo } = useFetch('/api/planner/inventory/fifo');
  const { data: inventory } = useFetch('/api/planner/inventory');
  const [showCreate, setShowCreate] = useState(false);
  const [editPO, setEditPO] = useState(null);
  const [expanded, setExpanded] = useState({});
  const [search, setSearch] = useState('');

  const toggleExpand = (id) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const filtered = useMemo(() => {
    if (!orders) return [];
    const s = search.toLowerCase();
    return orders.filter(po =>
      !s || po.customer?.toLowerCase().includes(s) || po.po_number?.toLowerCase().includes(s)
    );
  }, [orders, search]);

  /* FIFO allocation by SKU for fulfillment check */
  const invBySku = {};
  (inventory || []).forEach(row => { invBySku[row.sku] = row; });

  const canFulfill = (po) => {
    if (po.shipped) return 'shipped';
    const lines = po.lines || [];
    for (const line of lines) {
      const inv = invBySku[line.sku];
      const avail = inv ? (inv.total_cases - (inv.committed ?? 0)) : 0;
      if (avail < (line.cases || 0)) return 'deficit';
    }
    return 'ok';
  };

  const handleShip = async (po) => {
    if (!confirm(`Mark PO ${po.po_number} as shipped?`)) return;
    try {
      await apiPatch(`/api/planner/purchase-orders/${po.id}/ship`, {});
      refetch();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleUnship = async (po) => {
    try {
      await apiPatch(`/api/planner/purchase-orders/${po.id}/unship`, {});
      refetch();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleDelete = async (po) => {
    if (!confirm(`Delete PO ${po.po_number}?`)) return;
    try {
      await apiDelete(`/api/planner/purchase-orders/${po.id}`);
      refetch();
    } catch (e) {
      alert(e.message);
    }
  };

  if (loading) return <LoadingSpinner message="Loading orders..." />;

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => { setEditPO(null); setShowCreate(true); }}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add Order
        </button>
        <div className="relative flex-1 max-w-xs">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search orders..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <button onClick={refetch} className="ml-auto p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* PO cards */}
      {filtered.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center text-gray-400">
          <Package className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p>No purchase orders found</p>
        </div>
      )}

      <div className="space-y-3">
        {filtered.map(po => {
          const status = canFulfill(po);
          const borderColor = status === 'shipped' ? 'border-gray-300 bg-gray-50' :
                              status === 'deficit' ? 'border-red-300' :
                              'border-green-300';
          const isOpen = expanded[po.id];

          return (
            <div key={po.id} className={`bg-white rounded-xl shadow-sm border-2 ${borderColor} overflow-hidden`}>
              {/* PO header */}
              <div className="px-4 py-3 flex items-start justify-between">
                <button onClick={() => toggleExpand(po.id)} className="text-left flex-1">
                  <div className="flex items-center gap-3">
                    <h4 className="font-semibold text-gray-900">{po.customer}</h4>
                    <span className="text-xs font-mono text-gray-500">PO# {po.po_number}</span>
                    {po.shipped && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full font-medium">
                        <Truck className="w-3 h-3" /> Shipped
                      </span>
                    )}
                    {status === 'deficit' && (
                      <span className="flex items-center gap-1 px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-medium">
                        <AlertTriangle className="w-3 h-3" /> Deficit
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                    <span>Ship: {po.ship_date || '—'}</span>
                    <span>Lines: {(po.lines || []).length}</span>
                    <span className="font-mono">
                      {(po.lines || []).reduce((s, l) => s + (l.cases || 0), 0)} cases total
                    </span>
                  </div>
                </button>
                <div className="flex items-center gap-1 ml-3">
                  {!po.shipped && (
                    <button onClick={() => handleShip(po)} className="p-1.5 text-gray-400 hover:text-green-600 transition-colors" title="Ship">
                      <Truck className="w-4 h-4" />
                    </button>
                  )}
                  {po.shipped && (
                    <button onClick={() => handleUnship(po)} className="p-1.5 text-gray-400 hover:text-amber-600 transition-colors" title="Unship">
                      <RefreshCw className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={() => { setEditPO(po); setShowCreate(true); }} className="p-1.5 text-gray-400 hover:text-indigo-600 transition-colors" title="Edit">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => handleDelete(po)} className="p-1.5 text-gray-400 hover:text-red-600 transition-colors" title="Delete">
                    <Trash2 className="w-4 h-4" />
                  </button>
                  {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {/* SKU line summary */}
              <div className="px-4 pb-2 flex flex-wrap gap-2">
                {(po.lines || []).map((line, i) => (
                  <span key={i} className="px-2 py-0.5 bg-gray-100 rounded text-xs font-mono text-gray-700">
                    {line.sku}: {line.cases}
                  </span>
                ))}
              </div>

              {/* Expanded: FIFO allocation */}
              {isOpen && (
                <div className="border-t border-gray-100 px-4 py-3 bg-gray-50">
                  <h5 className="text-xs font-semibold text-gray-600 uppercase mb-2">FIFO Allocation</h5>
                  {(po.lines || []).map((line, i) => {
                    const batches = (fifo || []).filter(f => f.sku === line.sku);
                    return (
                      <div key={i} className="mb-2">
                        <p className="text-xs font-medium text-gray-700">{line.sku} — {line.cases} cases needed</p>
                        <div className="ml-3 mt-1 space-y-0.5">
                          {batches.length === 0 && <p className="text-xs text-gray-400 italic">No batches available</p>}
                          {batches.slice(0, 5).map((b, j) => (
                            <p key={j} className="text-xs text-gray-500 font-mono">
                              {b.batch_number} — {b.remaining_cases} cs ({b.pour_date})
                            </p>
                          ))}
                          {batches.length > 5 && <p className="text-xs text-gray-400">+{batches.length - 5} more</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Create/Edit PO Modal */}
      <POModal
        open={showCreate}
        onClose={() => { setShowCreate(false); setEditPO(null); }}
        existingPO={editPO}
        onSaved={refetch}
      />
    </div>
  );
}

function POModal({ open, onClose, existingPO, onSaved }) {
  const blank = { customer: '', po_number: '', ship_date: '', lines: [{ sku: SKU_LABELS[0], cases: '' }] };
  const [form, setForm] = useState(blank);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (existingPO) {
      setForm({
        customer: existingPO.customer || '',
        po_number: existingPO.po_number || '',
        ship_date: existingPO.ship_date || '',
        lines: existingPO.lines?.length ? existingPO.lines.map(l => ({ sku: l.sku, cases: l.cases })) : [{ sku: SKU_LABELS[0], cases: '' }],
      });
    } else {
      setForm(blank);
    }
    setError('');
  }, [existingPO, open]);

  const addLine = () => setForm(f => ({ ...f, lines: [...f.lines, { sku: SKU_LABELS[0], cases: '' }] }));
  const removeLine = (i) => setForm(f => ({ ...f, lines: f.lines.filter((_, j) => j !== i) }));
  const updateLine = (i, field, val) => setForm(f => ({
    ...f,
    lines: f.lines.map((l, j) => j === i ? { ...l, [field]: val } : l),
  }));

  const handleSave = async () => {
    if (!form.customer || !form.po_number) { setError('Customer and PO# are required'); return; }
    const lines = form.lines.filter(l => l.sku && Number(l.cases) > 0).map(l => ({ sku: l.sku, cases: Number(l.cases) }));
    if (lines.length === 0) { setError('Add at least one SKU line'); return; }
    setSaving(true);
    setError('');
    try {
      const payload = { customer: form.customer, po_number: form.po_number, ship_date: form.ship_date || null, lines };
      if (existingPO) {
        await apiPut(`/api/planner/purchase-orders/${existingPO.id}`, payload);
      } else {
        await apiPost('/api/planner/purchase-orders', payload);
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title={existingPO ? 'Edit Purchase Order' : 'New Purchase Order'}>
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Customer</label>
            <input type="text" value={form.customer} onChange={e => setForm(f => ({ ...f, customer: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">PO #</label>
            <input type="text" value={form.po_number} onChange={e => setForm(f => ({ ...f, po_number: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ship Date</label>
          <input type="date" value={form.ship_date} onChange={e => setForm(f => ({ ...f, ship_date: e.target.value }))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
        </div>

        {/* Lines */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-sm font-medium text-gray-700">SKU Lines</label>
            <button onClick={addLine} className="text-xs text-indigo-600 hover:text-indigo-800 font-medium">+ Add Line</button>
          </div>
          <div className="space-y-2">
            {form.lines.map((line, i) => (
              <div key={i} className="flex items-center gap-2">
                <select
                  value={line.sku}
                  onChange={e => updateLine(i, 'sku', e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500"
                >
                  {SKU_LABELS.map(l => <option key={l} value={l}>{l}</option>)}
                </select>
                <input
                  type="number"
                  min="0"
                  value={line.cases}
                  onChange={e => updateLine(i, 'cases', e.target.value)}
                  placeholder="Cases"
                  className="w-24 border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500"
                />
                {form.lines.length > 1 && (
                  <button onClick={() => removeLine(i)} className="p-1 text-gray-400 hover:text-red-500">
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : existingPO ? 'Update Order' : 'Create Order'}
          </button>
        </div>
      </div>
    </Modal>
  );
}

/* ══════════════════════════════════════════════════════════════════════
   TAB 4 — FERMENTATION
   ══════════════════════════════════════════════════════════════════════ */
function FermentationTab() {
  const { data: batches, loading, refetch } = useFetch('/api/planner/fermentation');
  const [rows, setRows] = useState([]);
  const [saving, setSaving] = useState(false);
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    if (batches) setRows(batches);
  }, [batches]);

  /* Computed summary */
  const summary = useMemo(() => {
    const total = rows.reduce((s, r) => s + (Number(r.bins) || 0), 0);
    const allocated = rows.reduce((s, r) => s + (Number(r.allocated) || 0), 0);
    const fermenting = rows.filter(r => r.status === 'fermenting').length;
    const resting = rows.filter(r => r.status === 'resting').length;
    const ready = rows.filter(r => r.status === 'ready').length;
    return { total, allocated, unallocated: total - allocated, fermenting, resting, ready };
  }, [rows]);

  const handleFieldChange = (id, field, value) => {
    setRows(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
  };

  const handleSaveRow = async (row) => {
    setSaving(true);
    try {
      await apiPut(`/api/planner/fermentation/${row.id}`, {
        bins: Number(row.bins) || 0,
        flavour: row.flavour || '',
        ferment_date: row.ferment_date || null,
        strain_date: row.strain_date || null,
        ready_date: row.ready_date || null,
        status: row.status,
        allocation: row.allocation || '',
      });
      refetch();
    } catch (e) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRow = async (row) => {
    if (!confirm(`Delete GRP ${row.grp_number}?`)) return;
    try {
      await apiDelete(`/api/planner/fermentation/${row.id}`);
      refetch();
    } catch (e) {
      alert(e.message);
    }
  };

  const handleClearOld = async () => {
    if (!confirm('Clear all GRP batches with status "ready" that are older than 2 weeks?')) return;
    try {
      await apiPost('/api/planner/fermentation/clear-old', {});
      refetch();
    } catch (e) {
      alert(e.message);
    }
  };

  const statusBadge = (status) => {
    const colors = {
      fermenting: 'bg-amber-100 text-amber-700',
      resting:    'bg-red-100 text-red-700',
      ready:      'bg-green-100 text-green-700',
    };
    return colors[status] || 'bg-gray-100 text-gray-600';
  };

  if (loading) return <LoadingSpinner message="Loading fermentation..." />;

  return (
    <div className="space-y-4">
      {/* Summary metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
        <MetricCard label="Total GRP Bins" value={summary.total} color="indigo" />
        <MetricCard label="Allocated" value={summary.allocated} color="green" />
        <MetricCard label="Unallocated" value={summary.unallocated} color="amber" />
        <MetricCard label="Fermenting" value={summary.fermenting} color="amber" />
        <MetricCard label="Resting" value={summary.resting} color="red" />
        <MetricCard label="Ready" value={summary.ready} color="green" />
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowAdd(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" /> Add GRP
        </button>
        <button
          onClick={handleClearOld}
          className="flex items-center gap-1.5 px-4 py-2 bg-white border border-gray-300 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 transition-colors"
        >
          <Archive className="w-4 h-4" /> Clear Old GRP
        </button>
        <button onClick={refetch} className="ml-auto p-2 text-gray-400 hover:text-gray-600 transition-colors">
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">GRP#</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Batch#</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Bins</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Flavour</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Ferment</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Strain</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Ready</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Status</th>
                <th className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Allocation</th>
                <th className="px-3 py-2 text-center text-xs font-semibold text-gray-600 uppercase">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {rows.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-3 py-8 text-center text-gray-400">No fermentation batches</td>
                </tr>
              )}
              {rows.map(row => (
                <tr key={row.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-3 py-2 font-mono font-medium text-gray-900">{row.grp_number}</td>
                  <td className="px-3 py-2 font-mono text-gray-700">{row.batch_number}</td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="number"
                      min="0"
                      value={row.bins ?? ''}
                      onChange={e => handleFieldChange(row.id, 'bins', e.target.value)}
                      className="w-14 border border-gray-300 rounded px-2 py-1 text-xs font-mono text-center focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-3 py-2 text-gray-700 text-xs">{row.flavour}</td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="date"
                      value={row.ferment_date || ''}
                      onChange={e => handleFieldChange(row.id, 'ferment_date', e.target.value)}
                      className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="date"
                      value={row.strain_date || ''}
                      onChange={e => handleFieldChange(row.id, 'strain_date', e.target.value)}
                      className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <input
                      type="date"
                      value={row.ready_date || ''}
                      onChange={e => handleFieldChange(row.id, 'ready_date', e.target.value)}
                      className="border border-gray-300 rounded px-1.5 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <select
                      value={row.status || 'fermenting'}
                      onChange={e => handleFieldChange(row.id, 'status', e.target.value)}
                      className={`px-2 py-1 rounded-full text-xs font-medium border-0 ${statusBadge(row.status)}`}
                    >
                      <option value="fermenting">Fermenting</option>
                      <option value="resting">Resting</option>
                      <option value="ready">Ready</option>
                    </select>
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="text"
                      value={row.allocation || ''}
                      onChange={e => handleFieldChange(row.id, 'allocation', e.target.value)}
                      className="w-full border border-gray-300 rounded px-2 py-1 text-xs focus:ring-1 focus:ring-indigo-500"
                      placeholder="—"
                    />
                  </td>
                  <td className="px-3 py-2 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button
                        onClick={() => handleSaveRow(row)}
                        disabled={saving}
                        className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                        title="Save"
                      >
                        <Save className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDeleteRow(row)}
                        className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add GRP Modal */}
      <AddGRPModal open={showAdd} onClose={() => setShowAdd(false)} onSaved={refetch} />
    </div>
  );
}

function AddGRPModal({ open, onClose, onSaved }) {
  const [form, setForm] = useState({
    grp_number: '', batch_number: '', bins: '', flavour: '',
    ferment_date: fmt(new Date()), strain_date: '', ready_date: '',
    status: 'fermenting', allocation: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!form.grp_number || !form.bins) { setError('GRP# and bins are required'); return; }
    setSaving(true);
    setError('');
    try {
      await apiPost('/api/planner/fermentation', {
        grp_number: form.grp_number,
        batch_number: form.batch_number,
        bins: Number(form.bins),
        flavour: form.flavour,
        ferment_date: form.ferment_date || null,
        strain_date: form.strain_date || null,
        ready_date: form.ready_date || null,
        status: form.status,
        allocation: form.allocation,
      });
      onSaved();
      onClose();
      setForm({ grp_number: '', batch_number: '', bins: '', flavour: '', ferment_date: fmt(new Date()), strain_date: '', ready_date: '', status: 'fermenting', allocation: '' });
    } catch (e) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={open} onClose={onClose} title="Add GRP Batch">
      <div className="space-y-4">
        {error && <p className="text-sm text-red-600">{error}</p>}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">GRP #</label>
            <input type="text" value={form.grp_number} onChange={e => setForm(f => ({ ...f, grp_number: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Batch #</label>
            <input type="text" value={form.batch_number} onChange={e => setForm(f => ({ ...f, batch_number: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Bins</label>
            <input type="number" min="0" value={form.bins} onChange={e => setForm(f => ({ ...f, bins: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Flavour</label>
            <input type="text" value={form.flavour} onChange={e => setForm(f => ({ ...f, flavour: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ferment Date</label>
            <input type="date" value={form.ferment_date} onChange={e => setForm(f => ({ ...f, ferment_date: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Strain Date</label>
            <input type="date" value={form.strain_date} onChange={e => setForm(f => ({ ...f, strain_date: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ready Date</label>
            <input type="date" value={form.ready_date} onChange={e => setForm(f => ({ ...f, ready_date: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
            <select value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500">
              <option value="fermenting">Fermenting</option>
              <option value="resting">Resting</option>
              <option value="ready">Ready</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Allocation</label>
            <input type="text" value={form.allocation} onChange={e => setForm(f => ({ ...f, allocation: e.target.value }))}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500" placeholder="e.g. SC-CDN" />
          </div>
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {saving ? 'Saving...' : 'Add GRP'}
          </button>
        </div>
      </div>
    </Modal>
  );
}
