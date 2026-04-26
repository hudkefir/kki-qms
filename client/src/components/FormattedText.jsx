import React from 'react';

function renderInline(text) {
  if (!text) return null;
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-gray-900">{part.slice(2, -2)}</strong>;
    }
    if (part.startsWith('`') && part.endsWith('`')) {
      return <code key={i} className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded text-xs font-mono">{part.slice(1, -1)}</code>;
    }
    return <span key={i}>{part}</span>;
  });
}

// Detect if text looks like a roles/responsibilities table
function isRolesTable(text) {
  return /Role\s+Responsibility/i.test(text) || 
         /(?:Manager|Supervisor|Owner|QA|Operator|Director)\s+(?:Ensure|Oversee|Conduct|Maintain|Review|Implement)/i.test(text);
}

// Detect if text looks like a references list
function isReferencesList(text) {
  return /(?:Safe Food|SFCA|SFCR|CFIA|FDA|HACCP|ISO|SQF|BRC|Ontario|Costco|Regulation|Act\b)/i.test(text) && text.length > 50;
}

// Parse roles table: "Role Responsibility Role1 Desc1; Role2 Desc2"
function parseRolesTable(text) {
  // Remove header
  let cleaned = text.replace(/^Role\s+Responsibility\s*/i, '').trim();
  
  // Split by known role titles
  const rolePatterns = [
    'Owner / Senior Management', 'Owner/Senior Management', 'Senior Management',
    'QA Manager', 'Quality Assurance Manager', 'QA Department',
    'Production Manager', 'Production Supervisor', 'Production Staff',
    'Management / Supervisors', 'Department Management / Supervisors', 'Supervisors',
    'All Employees', 'All Personnel', 'All KKI Personnel', 'All Staff',
    'Maintenance Staff', 'Maintenance Team', 'Maintenance',
    'Operators', 'Line Operators', 'Production Operators',
    'Sanitation Staff', 'Sanitation Team', 'Cleaning Staff',
    'Shipping / Receiving', 'Warehouse Staff', 'Logistics',
    'R&D', 'Research & Development',
    'External Auditors', 'Third Party',
  ];
  
  const roles = [];
  let remaining = cleaned;
  
  for (const role of rolePatterns) {
    const idx = remaining.indexOf(role);
    if (idx !== -1) {
      // Find where this role's description ends (next role or end)
      let endIdx = remaining.length;
      for (const nextRole of rolePatterns) {
        if (nextRole === role) continue;
        const ni = remaining.indexOf(nextRole, idx + role.length);
        if (ni !== -1 && ni < endIdx) endIdx = ni;
      }
      const desc = remaining.slice(idx + role.length, endIdx).replace(/^[;,.\s]+/, '').trim();
      if (desc) roles.push({ role, desc });
    }
  }
  
  // Fallback: try splitting by semicolons
  if (roles.length === 0) {
    const parts = cleaned.split(/[;]/).filter(p => p.trim());
    for (const part of parts) {
      const match = part.match(/^([^:–—]+?)\s*[–—:]\s*(.+)/);
      if (match) {
        roles.push({ role: match[1].trim(), desc: match[2].trim() });
      } else {
        roles.push({ role: '', desc: part.trim() });
      }
    }
  }
  
  return roles;
}

// Parse references list
function parseReferences(text) {
  // Split by common delimiters
  let items = text
    .split(/(?:(?:Safe Food|SFCA|SFCR|CFIA|FDA|HACCP|ISO|SQF|BRC|Ontario|Costco|Food and Drug))/i)
    .filter(p => p.trim().length > 3);
  
  // Better approach: split on known reference starts
  const refStarts = text.match(/(?:Safe Food for Canadians[^.]*|SFCA[^.]*|SFCR[^.]*|CFIA[^.]*|Food and Drugs? Act[^.]*|Ontario[^.]*Act[^.]*|Costco[^.]*|HACCP[^.]*|ISO \d+[^.]*|SQF[^.]*|BRC[^.]*|GMP[^.]*(?:Audit|Standard)[^.]*)/gi);
  
  if (refStarts && refStarts.length > 0) {
    return refStarts.map(r => r.trim().replace(/^[,;\s]+|[,;\s]+$/g, ''));
  }
  
  // Fallback: split by newlines or semicolons
  return text.split(/[;\n]/).map(r => r.trim()).filter(r => r.length > 5);
}

export default function FormattedText({ text, variant }) {
  if (!text) return <span className="text-gray-400 italic">No content</span>;
  
  // Auto-detect variant if not specified
  const detectedVariant = variant || (
    isRolesTable(text) ? 'roles' : 
    isReferencesList(text) ? 'references' : 
    'default'
  );
  
  // Roles table rendering
  if (detectedVariant === 'roles') {
    const roles = parseRolesTable(text);
    if (roles.length > 0) {
      return (
        <div className="overflow-x-auto">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50">
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase border border-gray-200 w-1/4">Role</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase border border-gray-200">Responsibility</th>
              </tr>
            </thead>
            <tbody>
              {roles.map((r, i) => (
                <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}>
                  <td className="px-4 py-2.5 border border-gray-200 font-medium text-gray-900 align-top">{r.role || '-'}</td>
                  <td className="px-4 py-2.5 border border-gray-200 text-gray-700 leading-relaxed">{r.desc}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    }
  }
  
  // References list rendering
  if (detectedVariant === 'references') {
    const refs = parseReferences(text);
    if (refs.length > 0) {
      return (
        <div className="space-y-1.5">
          {refs.map((ref, i) => (
            <div key={i} className="flex gap-2.5 items-start">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-indigo-50 text-indigo-600 text-[10px] font-bold flex items-center justify-center mt-0.5">{i + 1}</span>
              <span className="text-gray-700 text-sm leading-relaxed">{ref}</span>
            </div>
          ))}
        </div>
      );
    }
  }
  
  // Default: smart paragraph/list formatting
  let formatted = text;
  formatted = formatted.replace(/\((\d+)\)\s*/g, '\n• **($1)** ');
  formatted = formatted.replace(/(\d+)\.\s+(?=[A-Z])/g, '\n• **$1.** ');
  formatted = formatted.replace(/\n\s*[-–—]\s+/g, '\n• ');
  formatted = formatted.replace(/((?:Root Cause|Timeline|Evidence|Actions|Hypothesis|Status|Result|Method|Target|Note|Warning|Update|Investigation|Conclusion)[^:]*?):\s*/gi, '\n**$1:** ');
  formatted = formatted.replace(/\n\s*[-•]\s*((?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[^:\n]*(?::\s*)?)/g, '\n📅 **$1** ');
  formatted = formatted.replace(/(KK-CAPA-\d{4}-\d{3})/g, '`$1`');
  formatted = formatted.replace(/(KK-SOP-\d{5})/g, '`$1`');
  formatted = formatted.replace(/(WO-\d{6}-\d{2})/g, '`$1`');
  formatted = formatted.replace(/(CMP-\d{3})/g, '`$1`');
  
  const lines = formatted.split('\n').filter(l => l.trim());
  
  return (
    <div className="space-y-2">
      {lines.map((line, i) => {
        const trimmed = line.trim();
        if (trimmed.startsWith('• ')) {
          return (
            <div key={i} className="flex gap-2.5 pl-1">
              <span className="flex-shrink-0 text-indigo-400 mt-0.5">•</span>
              <span className="text-gray-700 leading-relaxed">{renderInline(trimmed.slice(2))}</span>
            </div>
          );
        }
        if (trimmed.startsWith('📅 ')) {
          return (
            <div key={i} className="flex gap-2 pl-1 py-0.5">
              <span className="flex-shrink-0">📅</span>
              <span className="text-gray-700 leading-relaxed">{renderInline(trimmed.slice(3))}</span>
            </div>
          );
        }
        return <p key={i} className="text-gray-700 leading-relaxed">{renderInline(trimmed)}</p>;
      })}
    </div>
  );
}
