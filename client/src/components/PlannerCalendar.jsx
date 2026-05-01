import React, { useState, useMemo } from 'react';

const SKUS = [
  { code: 'CK001-CAD', label: 'SC-CDN',  type: 'small', yld: 10.4 },
  { code: 'CK001-USA', label: 'SC-USA',  type: 'small', yld: 10.4 },
  { code: 'CK002-CAD', label: 'LC-CDN',  type: 'large', yld: 5.5 },
  { code: 'CK003-CAD', label: 'SCM-CDN', type: 'small', yld: 11 },
  { code: 'CK003-USA', label: 'SCM-USA', type: 'small', yld: 8.8 },
  { code: 'CK004-CAD', label: 'SCG-CDN', type: 'small', yld: 11 },
  { code: 'CK004-USA', label: 'SCG-USA', type: 'small', yld: 11 },
  { code: 'NONE',      label: '\u2014 none \u2014', type: 'any', yld: 0 },
];

function getSkuByCode(code) {
  return SKUS.find((s) => s.code === code) || SKUS[SKUS.length - 1];
}

function binsRemainingColor(remaining) {
  if (remaining < 0) return 'text-red-600 font-bold';
  if (remaining <= 30) return 'text-amber-600 font-semibold';
  return 'text-green-600 font-semibold';
}

function dayTotalBins(day) {
  if (!day.enabled) return 0;
  return day.pours.reduce((sum, p) => {
    if (p.sku === 'NONE') return sum;
    return sum + (p.bins || 0);
  }, 0);
}

function dayTotalCases(day) {
  if (!day.enabled) return 0;
  return day.pours.reduce((sum, p) => {
    const sku = getSkuByCode(p.sku);
    const actual = p.actualCases;
    if (actual != null && actual !== '') return sum + Number(actual);
    return sum + (p.bins || 0) * sku.yld;
  }, 0);
}

function hasMixedSizes(day) {
  const types = new Set();
  for (const p of day.pours) {
    const sku = getSkuByCode(p.sku);
    if (sku.type !== 'any') types.add(sku.type);
  }
  return types.size > 1;
}

function PourRow({ pour, weekIdx, dayIdx, pourIdx, totalPours, onPourChange, onRemovePour, coconutPerBin }) {
  const sku = getSkuByCode(pour.sku);
  const estimatedCases = (pour.bins || 0) * sku.yld;
  const hasActual = pour.actualCases != null && pour.actualCases !== '';
  const diff = hasActual ? Number(pour.actualCases) - estimatedCases : null;
  const coconutPacks = (pour.bins || 0) * coconutPerBin;
  const pourLabel = pourIdx === 0 ? '1st' : '2nd';

  return (
    <div>
      <div className="flex items-center gap-2 px-3 py-2 border-b border-gray-50 flex-wrap">
        {/* Pour label */}
        <span className="text-xs font-medium text-gray-500 w-8 shrink-0">{pourLabel}</span>

        {/* Batch pill */}
        {pour.batchNumber && (
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 shrink-0">
            {pour.batchNumber}
          </span>
        )}

        {/* SKU dropdown */}
        <select
          className="border border-gray-300 rounded px-2 py-1 text-sm bg-white focus:ring-2 focus:ring-blue-300 focus:outline-none"
          value={pour.sku}
          onChange={(e) => onPourChange(weekIdx, dayIdx, pourIdx, 'sku', e.target.value)}
        >
          {SKUS.map((s) => (
            <option key={s.code} value={s.code}>
              {s.label} ({s.code})
            </option>
          ))}
        </select>

        {/* Bins input */}
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-500">Bins:</label>
          <input
            type="number"
            min={0}
            max={50}
            className="border border-gray-300 rounded px-2 py-1 text-sm w-16 focus:ring-2 focus:ring-blue-300 focus:outline-none"
            value={pour.bins}
            onChange={(e) => onPourChange(weekIdx, dayIdx, pourIdx, 'bins', Math.max(0, Math.min(50, Number(e.target.value) || 0)))}
          />
        </div>

        {/* Estimated cases */}
        <div className="flex items-center gap-1">
          <span className="text-xs text-gray-500">Est:</span>
          <span className="text-sm font-medium text-gray-700">{estimatedCases.toFixed(1)}</span>
        </div>

        {/* Actual cases input */}
        <div className="flex items-center gap-1">
          <label className="text-xs text-gray-500">Actual:</label>
          <input
            type="number"
            min={0}
            className="border rounded px-2 py-1 text-sm w-20 focus:ring-2 focus:ring-green-300 focus:outline-none border-green-400"
            value={pour.actualCases ?? ''}
            placeholder="\u2014"
            onChange={(e) => {
              const val = e.target.value === '' ? null : Number(e.target.value);
              onPourChange(weekIdx, dayIdx, pourIdx, 'actualCases', val);
            }}
          />
        </div>

        {/* Diff */}
        {diff !== null && (
          <span className={`text-xs font-medium ${diff >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {diff >= 0 ? '+' : ''}{diff.toFixed(1)}
          </span>
        )}

        {/* Coconut */}
        {coconutPacks > 0 && (
          <span className="text-xs text-gray-400 ml-1" title="Coconut milk packs needed">
            \ud83e\udd65 {coconutPacks}
          </span>
        )}

        {/* Remove button */}
        {totalPours > 1 && (
          <button
            type="button"
            onClick={() => onRemovePour(weekIdx, dayIdx, pourIdx)}
            className="ml-auto text-red-400 hover:text-red-600 text-sm px-1"
            title="Remove pour"
          >
            \u2715
          </button>
        )}
      </div>

      {/* Fermentation links */}
      {pour.fermLinks && pour.fermLinks.length > 0 && (
        <div className="px-3 py-1 bg-gray-50 text-xs text-gray-500 flex gap-2 flex-wrap">
          <span className="font-medium">Ferm:</span>
          {pour.fermLinks.map((link, i) => (
            <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded bg-blue-50 text-blue-700">
              {link}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function DayCard({ day, weekIdx, runningBinsRemaining, onPourChange, onAddPour, onRemovePour, onToggleDay, simulatedDate, coconutPerBin }) {
  const isToday = day.dateStr === simulatedDate;
  const isFuture = day.dateStr > simulatedDate;
  const totalBins = dayTotalBins(day);
  const totalCases = dayTotalCases(day);
  const mixed = day.enabled && hasMixedSizes(day);

  const cardClasses = [
    'bg-white rounded-lg border shadow-sm mb-3',
    isToday ? 'ring-2 ring-blue-400 border-blue-300' : 'border-gray-200',
    !day.enabled ? 'opacity-40' : '',
    isFuture && day.enabled ? 'opacity-[0.35]' : '',
  ].filter(Boolean).join(' ');

  return (
    <div className={cardClasses}>
      {/* Day header */}
      <div className="bg-gray-50 border-b px-3 py-2 flex items-center gap-3 flex-wrap">
        <input
          type="checkbox"
          checked={day.enabled}
          onChange={() => onToggleDay(weekIdx, day.dayIndex)}
          className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
        />
        <span className="font-semibold text-sm text-gray-800">{day.name}</span>
        <span className="text-xs text-gray-500">{day.dateStr}</span>

        {day.enabled && (
          <>
            <span className="text-xs text-gray-600">
              {totalBins} bins
            </span>
            <span className="text-xs text-gray-600">
              {totalCases.toFixed(1)} cases
            </span>
            <span className={`text-xs ${binsRemainingColor(runningBinsRemaining)}`}>
              {runningBinsRemaining} remaining
            </span>
          </>
        )}

        {mixed && (
          <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded font-medium">
            \u26a0 Mixed jar sizes
          </span>
        )}
      </div>

      {/* Pours */}
      {day.enabled && (
        <div>
          {day.pours.map((pour, pourIdx) => (
            <PourRow
              key={pourIdx}
              pour={pour}
              weekIdx={weekIdx}
              dayIdx={day.dayIndex}
              pourIdx={pourIdx}
              totalPours={day.pours.length}
              onPourChange={onPourChange}
              onRemovePour={onRemovePour}
              coconutPerBin={coconutPerBin}
            />
          ))}

          {day.pours.length < 2 && (
            <div className="px-3 py-2">
              <button
                type="button"
                onClick={() => onAddPour(weekIdx, day.dayIndex)}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium"
              >
                + Add pour
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PlannerCalendar({
  weeks,
  onPourChange,
  onAddPour,
  onRemovePour,
  onToggleDay,
  availableBins,
  simulatedDate,
  coconutPerBin = 20,
}) {
  const [expandedWeeks, setExpandedWeeks] = useState(() => {
    const init = {};
    if (weeks && weeks.length > 0) {
      init[0] = true;
    }
    return init;
  });

  // Precompute running bins remaining for each day across all weeks
  const runningBins = useMemo(() => {
    const map = {};
    let remaining = availableBins;
    for (const week of weeks) {
      for (const day of week.days) {
        const used = dayTotalBins(day);
        remaining -= used;
        map[`${week.weekIndex}-${day.dayIndex}`] = remaining;
      }
    }
    return map;
  }, [weeks, availableBins]);

  // Week-level summaries
  const weekSummaries = useMemo(() => {
    return weeks.map((week) => {
      const totalBins = week.days.reduce((s, d) => s + dayTotalBins(d), 0);
      const totalCoconut = week.days.reduce((s, d) => {
        if (!d.enabled) return s;
        return s + d.pours.reduce((ps, p) => {
          if (p.sku === 'NONE') return ps;
          return ps + (p.bins || 0) * coconutPerBin;
        }, 0);
      }, 0);
      // Bins remaining at end of week = last day's running remaining
      const lastDay = week.days[week.days.length - 1];
      const endRemaining = lastDay
        ? runningBins[`${week.weekIndex}-${lastDay.dayIndex}`] ?? availableBins
        : availableBins;
      return { totalBins, totalCoconut, endRemaining };
    });
  }, [weeks, runningBins, availableBins, coconutPerBin]);

  function toggleWeek(weekIndex) {
    setExpandedWeeks((prev) => ({ ...prev, [weekIndex]: !prev[weekIndex] }));
  }

  return (
    <div className="space-y-4">
      {weeks.map((week, wIdx) => {
        const expanded = !!expandedWeeks[week.weekIndex];
        const summary = weekSummaries[wIdx];

        return (
          <div key={week.weekIndex} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Week header */}
            <button
              type="button"
              onClick={() => toggleWeek(week.weekIndex)}
              className="w-full bg-gray-100 hover:bg-gray-150 px-4 py-3 flex items-center justify-between text-left"
            >
              <div className="flex items-center gap-3">
                <span className="text-gray-500 text-sm">{expanded ? '\u25bc' : '\u25b6'}</span>
                <span className="font-semibold text-gray-800">{week.label}</span>
              </div>
              <div className="flex items-center gap-4 text-xs">
                <span className="text-gray-600">{summary.totalBins} bins</span>
                <span className={binsRemainingColor(summary.endRemaining)}>
                  {summary.endRemaining} remaining
                </span>
                <span className="text-gray-500">{summary.totalCoconut} coconut packs</span>
              </div>
            </button>

            {/* Week body */}
            {expanded && (
              <div className="p-3">
                {week.days.map((day) => {
                  const key = `${week.weekIndex}-${day.dayIndex}`;
                  return (
                    <DayCard
                      key={key}
                      day={day}
                      weekIdx={week.weekIndex}
                      runningBinsRemaining={runningBins[key] ?? availableBins}
                      onPourChange={onPourChange}
                      onAddPour={onAddPour}
                      onRemovePour={onRemovePour}
                      onToggleDay={onToggleDay}
                      simulatedDate={simulatedDate}
                      coconutPerBin={coconutPerBin}
                    />
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
