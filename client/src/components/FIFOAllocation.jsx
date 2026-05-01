import React, { useState, useMemo } from 'react';

function FIFOAllocation({ allocations = {}, shortages = {}, purchaseOrders = [], batches = [] }) {
  const [expandedPOs, setExpandedPOs] = useState({});

  const togglePO = (poId) => {
    setExpandedPOs((prev) => ({ ...prev, [poId]: !prev[poId] }));
  };

  // Sort active POs by ship_date
  const sortedPOs = useMemo(() => {
    return [...purchaseOrders]
      .filter((po) => po.status !== 'cancelled')
      .sort((a, b) => new Date(a.ship_date) - new Date(b.ship_date));
  }, [purchaseOrders]);

  // Build batch lookup
  const batchMap = useMemo(() => {
    const map = {};
    batches.forEach((b) => {
      map[b.id] = b;
    });
    return map;
  }, [batches]);

  // Summary calculations
  const summary = useMemo(() => {
    let totalAllocated = 0;
    let totalShort = 0;
    let fulfilled = 0;
    let deficit = 0;

    sortedPOs.forEach((po) => {
      const poAlloc = allocations[po.id] || {};
      const poShort = shortages[po.id] || {};

      Object.values(poAlloc).forEach((batchList) => {
        batchList.forEach((a) => {
          totalAllocated += a.qty;
        });
      });

      const hasShortage = Object.values(poShort).some((s) => s.short > 0);
      if (hasShortage) {
        deficit += 1;
        Object.values(poShort).forEach((s) => {
          totalShort += s.short;
        });
      } else {
        fulfilled += 1;
      }
    });

    return { totalAllocated, totalShort, fulfilled, deficit };
  }, [sortedPOs, allocations, shortages]);

  const hasPODeficit = (poId) => {
    const poShort = shortages[poId] || {};
    return Object.values(poShort).some((s) => s.short > 0);
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Summary Bar */}
      <div className="bg-white border rounded-lg p-4 flex flex-wrap gap-6 items-center">
        <div>
          <span className="text-sm text-gray-500">Total Allocated</span>
          <p className="text-xl font-bold text-gray-900">{summary.totalAllocated.toLocaleString()} cases</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Total Shortage</span>
          <p className={`text-xl font-bold ${summary.totalShort > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {summary.totalShort.toLocaleString()} cases
          </p>
        </div>
        <div>
          <span className="text-sm text-gray-500">Fully Fulfillable</span>
          <p className="text-xl font-bold text-green-600">{summary.fulfilled}</p>
        </div>
        <div>
          <span className="text-sm text-gray-500">With Deficits</span>
          <p className={`text-xl font-bold ${summary.deficit > 0 ? 'text-red-600' : 'text-gray-900'}`}>
            {summary.deficit}
          </p>
        </div>
      </div>

      {/* Per-PO Allocation Cards */}
      {sortedPOs.map((po) => {
        const isDeficit = hasPODeficit(po.id);
        const poAlloc = allocations[po.id] || {};
        const poShort = shortages[po.id] || {};
        const expanded = expandedPOs[po.id] || false;
        const skuList = po.skus || Object.keys({ ...poAlloc, ...poShort });

        return (
          <div
            key={po.id}
            className={`bg-white border rounded-lg overflow-hidden ${
              isDeficit ? 'border-l-4 border-l-red-500' : 'border-l-4 border-l-green-500'
            }`}
          >
            {/* PO Header */}
            <button
              onClick={() => togglePO(po.id)}
              className="w-full text-left px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center gap-3 flex-wrap">
                <span className="font-semibold text-gray-900">{po.customer || 'Unknown Customer'}</span>
                <span className="text-sm text-gray-500 font-mono">{po.po_number || `PO-${po.id}`}</span>
                <span className="text-sm text-gray-500">Ship: {formatDate(po.ship_date)}</span>
                {isDeficit ? (
                  <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-semibold uppercase">
                    Deficit
                  </span>
                ) : (
                  <span className="bg-green-100 text-green-700 px-2 py-0.5 rounded text-xs font-semibold uppercase">
                    Can Fulfill
                  </span>
                )}
              </div>
              <svg
                className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* SKU Allocations (always visible) */}
            <div className="px-4 pb-3 space-y-2">
              {skuList.map((sku) => {
                const skuAllocs = poAlloc[sku] || [];
                const skuShortage = poShort[sku];
                const totalAllocForSku = skuAllocs.reduce((sum, a) => sum + a.qty, 0);

                return (
                  <div key={sku} className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-700 min-w-[80px]">{sku}</span>
                    <div className="flex items-center gap-1 flex-wrap">
                      {skuAllocs.map((alloc, idx) => (
                        <React.Fragment key={alloc.batchId}>
                          {idx > 0 && <span className="text-gray-400 text-xs">+</span>}
                          <span className="bg-gray-100 text-gray-700 px-2 py-0.5 rounded text-xs font-mono">
                            {alloc.batchNumber || `B-${alloc.batchId}`}: {alloc.qty}
                          </span>
                        </React.Fragment>
                      ))}
                      {skuAllocs.length > 0 && (
                        <span className="text-xs text-gray-500 ml-1">= {totalAllocForSku}</span>
                      )}
                      {skuShortage && skuShortage.short > 0 && (
                        <span className="bg-red-100 text-red-700 px-2 py-0.5 rounded text-xs font-mono ml-1">
                          SHORT {skuShortage.short}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Expanded Detail */}
            {expanded && (
              <div className="border-t bg-gray-50 px-4 py-3 space-y-3">
                <h4 className="text-sm font-semibold text-gray-600">Allocation Detail</h4>
                {skuList.map((sku) => {
                  const skuAllocs = poAlloc[sku] || [];
                  const skuShortage = poShort[sku];

                  return (
                    <div key={sku} className="space-y-1">
                      <p className="text-sm font-medium text-gray-800">{sku}</p>
                      {skuAllocs.length === 0 && (
                        <p className="text-xs text-gray-400 italic">No batches allocated</p>
                      )}
                      {skuAllocs.map((alloc) => {
                        const batch = batchMap[alloc.batchId];
                        return (
                          <div key={alloc.batchId} className="flex items-center gap-3 text-xs text-gray-600 ml-3">
                            <span className="font-mono">{alloc.batchNumber || `B-${alloc.batchId}`}</span>
                            <span>{alloc.qty} cases</span>
                            {batch && (
                              <>
                                <span className="text-gray-400">|</span>
                                <span>Remaining: {batch.inventory_remaining}</span>
                                <span className="text-gray-400">|</span>
                                <span>Produced: {formatDate(batch.production_date)}</span>
                                <span className="text-gray-400">|</span>
                                <span className="capitalize">{batch.status}</span>
                              </>
                            )}
                          </div>
                        );
                      })}
                      {skuShortage && skuShortage.short > 0 && (
                        <div className="ml-3 text-xs text-red-600">
                          Need {skuShortage.need} | Have {skuShortage.have} | Short {skuShortage.short}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      {sortedPOs.length === 0 && (
        <div className="text-center text-gray-400 py-8">No purchase orders to display.</div>
      )}
    </div>
  );
}

export default FIFOAllocation;
