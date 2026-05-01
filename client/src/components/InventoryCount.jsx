import React, { useState, useMemo } from 'react';
import { CheckCircle, AlertTriangle } from 'lucide-react';
import Modal from '../components/Modal';

const SKU_LABELS = ['SC-CDN', 'SC-USA', 'LC-CDN', 'SCM-CDN', 'SCM-USA', 'SCG-CDN', 'SCG-USA'];

export default function InventoryCount({ isOpen, onClose, inventory = {}, onSubmit }) {
  const [physicalCounts, setPhysicalCounts] = useState({});
  const [notes, setNotes] = useState('');

  const handleCountChange = (sku, value) => {
    const parsed = value === '' ? '' : parseInt(value, 10);
    setPhysicalCounts((prev) => ({
      ...prev,
      [sku]: isNaN(parsed) ? '' : parsed,
    }));
  };

  const rows = useMemo(() => {
    return SKU_LABELS.map((sku) => {
      const systemCount = inventory[sku] ?? 0;
      const physical = physicalCounts[sku];
      const hasEntry = physical !== undefined && physical !== '';
      const variance = hasEntry ? physical - systemCount : null;
      return { sku, systemCount, physical, hasEntry, variance };
    });
  }, [inventory, physicalCounts]);

  const summary = useMemo(() => {
    const totalSystem = rows.reduce((sum, r) => sum + r.systemCount, 0);
    const totalPhysical = rows.reduce((sum, r) => sum + (r.hasEntry ? r.physical : 0), 0);
    const totalVariance = rows.reduce((sum, r) => sum + (r.hasEntry ? r.variance : 0), 0);
    const varianceItems = rows.filter((r) => r.hasEntry && r.variance !== 0);
    return { totalSystem, totalPhysical, totalVariance, varianceItems };
  }, [rows]);

  const hasAnyCounts = rows.some((r) => r.hasEntry);

  const handleSubmit = () => {
    onSubmit({
      date: new Date().toISOString(),
      counts: rows
        .filter((r) => r.hasEntry)
        .map((r) => ({
          sku: r.sku,
          systemCount: r.systemCount,
          physicalCount: r.physical,
          variance: r.variance,
        })),
      notes,
    });
    setPhysicalCounts({});
    setNotes('');
  };

  const handleClose = () => {
    setPhysicalCounts({});
    setNotes('');
    onClose();
  };

  const varianceBg = (variance) => {
    if (variance === null) return '';
    if (variance === 0) return 'bg-green-100 text-green-800';
    if (variance > 0) return 'bg-amber-100 text-amber-800';
    return 'bg-red-100 text-red-800';
  };

  const varianceLabel = (variance) => {
    if (variance === null) return '-';
    if (variance === 0) return '0 Match';
    return variance > 0 ? `+${variance}` : `${variance}`;
  };

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Physical Inventory Count">
      <div className="space-y-6">
        {/* Date display */}
        <p className="text-sm text-gray-500">{today}</p>

        {/* Count table */}
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-gray-600">
                <th className="py-2 pr-4">SKU</th>
                <th className="py-2 pr-4">System Count</th>
                <th className="py-2 pr-4">Physical Count</th>
                <th className="py-2 pr-4">Variance</th>
                <th className="py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.sku} className="border-b border-gray-100">
                  <td className="py-2 pr-4 font-bold text-gray-900">{row.sku}</td>
                  <td className="py-2 pr-4 font-mono text-gray-700">{row.systemCount}</td>
                  <td className="py-2 pr-4">
                    <input
                      type="number"
                      min="0"
                      value={row.physical ?? ''}
                      onChange={(e) => handleCountChange(row.sku, e.target.value)}
                      className="w-20 text-center border border-gray-300 rounded px-2 py-1 font-mono focus:outline-none focus:ring-2 focus:ring-blue-400"
                    />
                  </td>
                  <td className="py-2 pr-4">
                    <span
                      className={`inline-block rounded px-2 py-0.5 font-mono text-xs font-medium ${varianceBg(row.variance)}`}
                    >
                      {varianceLabel(row.variance)}
                    </span>
                  </td>
                  <td className="py-2">
                    {row.hasEntry &&
                      (row.variance === 0 ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                      ) : (
                        <AlertTriangle className="w-5 h-5 text-amber-500" />
                      ))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Summary section */}
        <div className="bg-gray-50 rounded-lg p-4 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total System Count</span>
            <span className="font-mono font-medium">{summary.totalSystem}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Physical Count</span>
            <span className="font-mono font-medium">{summary.totalPhysical}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Total Variance</span>
            <span
              className={`font-mono font-medium ${
                summary.totalVariance === 0
                  ? 'text-green-700'
                  : summary.totalVariance > 0
                    ? 'text-amber-700'
                    : 'text-red-700'
              }`}
            >
              {summary.totalVariance > 0 ? `+${summary.totalVariance}` : summary.totalVariance}
            </span>
          </div>
          <div className="flex justify-between text-sm pt-2 border-t border-gray-200">
            <span className="text-gray-600">Overall Status</span>
            {summary.varianceItems.length === 0 ? (
              <span className="text-green-700 font-medium">All Match</span>
            ) : (
              <span className="text-amber-700 font-medium">
                {summary.varianceItems.length} item{summary.varianceItems.length > 1 ? 's' : ''} have variance
              </span>
            )}
          </div>
        </div>

        {/* Notes textarea */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-400 resize-none"
            placeholder="Add any notes about this inventory count..."
          />
        </div>

        {/* Action buttons */}
        <div className="flex justify-end gap-3 pt-2">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!hasAnyCounts}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Submit Count
          </button>
        </div>
      </div>
    </Modal>
  );
}
