import React from 'react';

const STATUS_STYLES = {
  active: 'bg-green-100 text-green-800 border-green-200',
  in_review: 'bg-amber-100 text-amber-800 border-amber-200',
  approved: 'bg-blue-100 text-blue-800 border-blue-200',
  draft: 'bg-gray-100 text-gray-600 border-gray-200',
  archived: 'bg-slate-100 text-slate-600 border-slate-200',
};

const COSTCO_STYLES = {
  clean: 'bg-green-100 text-green-800 border-green-200',
  needs_costco_strip: 'bg-amber-100 text-amber-800 border-amber-200',
  not_yet_built: 'bg-red-100 text-red-800 border-red-200',
};

const AUDIT_STYLES = {
  met: 'bg-green-100 text-green-800 border-green-200',
  partial: 'bg-amber-100 text-amber-800 border-amber-200',
  not_met: 'bg-red-100 text-red-800 border-red-200',
  na: 'bg-gray-100 text-gray-500 border-gray-200',
};

const LABELS = {
  active: 'Active',
  in_review: 'In Review',
  approved: 'Approved',
  draft: 'Draft',
  archived: 'Archived',
  clean: 'Clean',
  needs_costco_strip: 'Needs Costco Strip',
  not_yet_built: 'Not Yet Built',
  met: 'Met',
  partial: 'Partial',
  not_met: 'Not Met',
  na: 'N/A',
};

export default function StatusBadge({ status, type = 'status' }) {
  const styles =
    type === 'costco' ? COSTCO_STYLES :
    type === 'audit' ? AUDIT_STYLES :
    STATUS_STYLES;

  const className = styles[status] || 'bg-gray-100 text-gray-600 border-gray-200';
  const label = LABELS[status] || status?.replace(/_/g, ' ') || 'Unknown';

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${className}`}>
      {label}
    </span>
  );
}
