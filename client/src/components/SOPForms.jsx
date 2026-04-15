import React, { useState, useEffect } from 'react';
import {
  Plus, Edit, Trash2, Save, X, ChevronDown, ChevronRight,
  ClipboardList, CheckCircle, Clock, Eye, FileText, List,
  ArrowLeft, Send, Shield, Thermometer, PenTool,
} from 'lucide-react';
import { useFetch, apiPost, apiPut, apiDelete } from '../hooks/useApi';
import { useAuth } from '../hooks/useAuth';

const FIELD_TYPES = [
  { value: 'text', label: 'Text' },
  { value: 'number', label: 'Number' },
  { value: 'date', label: 'Date' },
  { value: 'checkbox', label: 'Checkbox' },
  { value: 'select', label: 'Select / Dropdown' },
  { value: 'temperature', label: 'Temperature' },
  { value: 'signature', label: 'Signature' },
  { value: 'time', label: 'Time' },
];

const FORM_TYPES = [
  { value: 'logbook', label: 'Logbook' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'inspection', label: 'Inspection' },
  { value: 'record', label: 'Record' },
  { value: 'report', label: 'Report' },
];

const STATUS_COLORS = {
  draft: 'bg-gray-100 text-gray-700',
  submitted: 'bg-blue-100 text-blue-700',
  verified: 'bg-green-100 text-green-700',
  active: 'bg-green-100 text-green-700',
  archived: 'bg-gray-100 text-gray-500',
};

// ─── Sub-views ──────────────────────────────────────────────

function FormList({ forms, sopId, canWrite, onSelect, onRefetch }) {
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newForm, setNewForm] = useState({ form_number: '', title: '', form_type: 'record', description: '' });

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newForm.form_number || !newForm.title) return;
    setCreating(true);
    try {
      await apiPost(`/api/sops/${sopId}/forms`, { ...newForm, status: 'active', version: '1.0' });
      setNewForm({ form_number: '', title: '', form_type: 'record', description: '' });
      setShowCreate(false);
      onRefetch();
    } catch (err) {
      alert('Failed to create form: ' + err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (formId, title) => {
    if (!confirm(`Delete form "${title}" and all its fields and entries?`)) return;
    try {
      await apiDelete(`/api/sop-forms/${formId}`);
      onRefetch();
    } catch (err) {
      alert('Failed to delete form: ' + err.message);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">Forms & Records</h3>
        {canWrite && (
          <button onClick={() => setShowCreate(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-600 text-white text-sm font-medium rounded-lg hover:bg-navy-700">
            <Plus className="w-4 h-4" /> New Form
          </button>
        )}
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Form Number *</label>
              <input value={newForm.form_number} onChange={e => setNewForm(f => ({ ...f, form_number: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="KK-FRM-001" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Title *</label>
              <input value={newForm.title} onChange={e => setNewForm(f => ({ ...f, title: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Form title" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select value={newForm.form_type} onChange={e => setNewForm(f => ({ ...f, form_type: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                {FORM_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Description</label>
              <input value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Optional description" />
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setShowCreate(false)} className="px-3 py-1.5 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
            <button type="submit" disabled={creating} className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50">
              <Save className="w-3.5 h-3.5" /> {creating ? 'Creating...' : 'Create Form'}
            </button>
          </div>
        </form>
      )}

      {(!forms || forms.length === 0) ? (
        <div className="text-center py-12 text-gray-400">
          <ClipboardList className="w-10 h-10 mx-auto mb-2 opacity-50" />
          <p className="text-sm">No forms linked to this SOP yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {forms.map(form => (
            <div key={form.id} className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4 hover:border-navy-300 hover:shadow-sm transition-all cursor-pointer" onClick={() => onSelect(form)}>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-9 h-9 rounded-lg bg-navy-50 flex items-center justify-center flex-shrink-0">
                  <ClipboardList className="w-4.5 h-4.5 text-navy-600" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-900 text-sm truncate">{form.title}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[form.status] || STATUS_COLORS.draft}`}>{form.status}</span>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-gray-500 mt-0.5">
                    <span>{form.form_number}</span>
                    <span className="capitalize">{form.form_type}</span>
                    <span>{form.field_count || 0} fields</span>
                    <span>{form.entry_count || 0} entries</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                {canWrite && (
                  <button onClick={e => { e.stopPropagation(); handleDelete(form.id, form.title); }} className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-red-50" title="Delete form">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
                <ChevronRight className="w-4 h-4 text-gray-400" />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Form Builder ───────────────────────────────────────────

function FormBuilder({ form, onBack, onRefetch }) {
  const { canWrite } = useAuth();
  const { data: detail, refetch: refetchDetail } = useFetch(`/api/sop-forms/${form.id}`);
  const [adding, setAdding] = useState(false);
  const [newField, setNewField] = useState({ field_name: '', field_type: 'text', required: false, section_name: '', field_options: '' });
  const [editingField, setEditingField] = useState(null);

  const fields = detail?.fields || [];

  const handleAddField = async (e) => {
    e.preventDefault();
    if (!newField.field_name) return;
    try {
      const payload = {
        field_name: newField.field_name,
        field_type: newField.field_type,
        required: newField.required ? 1 : 0,
        section_name: newField.section_name,
        field_options: newField.field_type === 'select' && newField.field_options
          ? JSON.stringify(newField.field_options.split(',').map(s => s.trim()).filter(Boolean))
          : '[]',
        sort_order: fields.length + 1,
      };
      await apiPost(`/api/sop-forms/${form.id}/fields`, payload);
      setNewField({ field_name: '', field_type: 'text', required: false, section_name: '', field_options: '' });
      setAdding(false);
      refetchDetail();
      onRefetch();
    } catch (err) {
      alert('Failed to add field: ' + err.message);
    }
  };

  const handleUpdateField = async (fieldId, updates) => {
    try {
      await apiPut(`/api/sop-forms/${form.id}/fields/${fieldId}`, updates);
      setEditingField(null);
      refetchDetail();
    } catch (err) {
      alert('Failed to update field: ' + err.message);
    }
  };

  const handleDeleteField = async (fieldId) => {
    if (!confirm('Delete this field?')) return;
    try {
      await apiDelete(`/api/sop-forms/${form.id}/fields/${fieldId}`);
      refetchDetail();
      onRefetch();
    } catch (err) {
      alert('Failed to delete field: ' + err.message);
    }
  };

  // Group fields by section
  const sections = {};
  fields.forEach(f => {
    const sec = f.section_name || 'General';
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(f);
  });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">{form.title}</h3>
            <p className="text-xs text-gray-500">{form.form_number} &middot; {form.form_type} &middot; v{form.version}</p>
          </div>
        </div>
        {canWrite() && (
          <button onClick={() => setAdding(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-navy-600 text-white text-sm font-medium rounded-lg hover:bg-navy-700">
            <Plus className="w-4 h-4" /> Add Field
          </button>
        )}
      </div>

      {form.description && <p className="text-sm text-gray-600 bg-gray-50 rounded-lg p-3">{form.description}</p>}

      {adding && (
        <form onSubmit={handleAddField} className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Field Name *</label>
              <input value={newField.field_name} onChange={e => setNewField(f => ({ ...f, field_name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" required />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
              <select value={newField.field_type} onChange={e => setNewField(f => ({ ...f, field_type: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm">
                {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Section</label>
              <input value={newField.section_name} onChange={e => setNewField(f => ({ ...f, section_name: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="e.g. Header, Measurements" />
            </div>
            <div className="flex items-end gap-4">
              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={newField.required} onChange={e => setNewField(f => ({ ...f, required: e.target.checked }))} className="rounded" />
                Required
              </label>
            </div>
          </div>
          {newField.field_type === 'select' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Options (comma-separated)</label>
              <input value={newField.field_options} onChange={e => setNewField(f => ({ ...f, field_options: e.target.value }))} className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Option 1, Option 2, Option 3" />
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={() => setAdding(false)} className="px-3 py-1.5 text-sm text-gray-600">Cancel</button>
            <button type="submit" className="flex items-center gap-1 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700">
              <Save className="w-3.5 h-3.5" /> Add Field
            </button>
          </div>
        </form>
      )}

      {Object.keys(sections).length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">No fields defined yet. Add fields to build this form.</div>
      ) : (
        Object.entries(sections).map(([sectionName, sectionFields]) => (
          <div key={sectionName} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{sectionName}</span>
            </div>
            <div className="divide-y divide-gray-100">
              {sectionFields.map(field => (
                <div key={field.id} className="flex items-center justify-between px-4 py-2.5 hover:bg-gray-50">
                  {editingField === field.id ? (
                    <EditFieldInline field={field} onSave={(updates) => handleUpdateField(field.id, updates)} onCancel={() => setEditingField(null)} />
                  ) : (
                    <>
                      <div className="flex items-center gap-3">
                        <FieldTypeIcon type={field.field_type} />
                        <div>
                          <span className="text-sm font-medium text-gray-900">{field.field_name}</span>
                          {field.required ? <span className="ml-1.5 text-red-400 text-xs">*</span> : null}
                          <span className="ml-2 text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded">{field.field_type}</span>
                          {field.field_options && field.field_options !== '[]' && (
                            <span className="ml-1.5 text-[10px] text-gray-400">{(() => { try { return JSON.parse(field.field_options).join(', '); } catch { return ''; } })()}</span>
                          )}
                        </div>
                      </div>
                      {canWrite() && (
                        <div className="flex items-center gap-1">
                          <button onClick={() => setEditingField(field.id)} className="p-1 text-gray-400 hover:text-blue-600 rounded"><Edit className="w-3.5 h-3.5" /></button>
                          <button onClick={() => handleDeleteField(field.id)} className="p-1 text-gray-400 hover:text-red-500 rounded"><Trash2 className="w-3.5 h-3.5" /></button>
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  );
}

function EditFieldInline({ field, onSave, onCancel }) {
  const [name, setName] = useState(field.field_name);
  const [type, setType] = useState(field.field_type);
  const [required, setRequired] = useState(!!field.required);
  const [section, setSection] = useState(field.section_name || '');
  const [options, setOptions] = useState(() => { try { return JSON.parse(field.field_options || '[]').join(', '); } catch { return ''; } });

  return (
    <div className="flex items-center gap-2 flex-1">
      <input value={name} onChange={e => setName(e.target.value)} className="px-2 py-1 border rounded text-sm flex-1" />
      <select value={type} onChange={e => setType(e.target.value)} className="px-2 py-1 border rounded text-sm">
        {FIELD_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
      </select>
      <input value={section} onChange={e => setSection(e.target.value)} className="px-2 py-1 border rounded text-sm w-28" placeholder="Section" />
      <label className="flex items-center gap-1 text-xs"><input type="checkbox" checked={required} onChange={e => setRequired(e.target.checked)} /> Req</label>
      <button onClick={() => onSave({ field_name: name, field_type: type, required: required ? 1 : 0, section_name: section, field_options: type === 'select' ? JSON.stringify(options.split(',').map(s => s.trim()).filter(Boolean)) : field.field_options })} className="p-1 text-green-600 hover:text-green-800"><Save className="w-4 h-4" /></button>
      <button onClick={onCancel} className="p-1 text-gray-400 hover:text-gray-600"><X className="w-4 h-4" /></button>
    </div>
  );
}

function FieldTypeIcon({ type }) {
  const cls = "w-4 h-4";
  switch (type) {
    case 'temperature': return <Thermometer className={`${cls} text-orange-500`} />;
    case 'signature': return <PenTool className={`${cls} text-purple-500`} />;
    case 'checkbox': return <CheckCircle className={`${cls} text-green-500`} />;
    case 'date': case 'time': return <Clock className={`${cls} text-blue-500`} />;
    case 'number': return <span className="text-xs font-bold text-indigo-500 w-4 text-center">#</span>;
    case 'select': return <List className={`${cls} text-teal-500`} />;
    default: return <FileText className={`${cls} text-gray-400`} />;
  }
}

// ─── Fill Out Form ──────────────────────────────────────────

function FillOutForm({ form, onBack, onRefetch }) {
  const { user } = useAuth();
  const { data: detail } = useFetch(`/api/sop-forms/${form.id}`);
  const [values, setValues] = useState({});
  const [submitting, setSubmitting] = useState(false);
  const [shift, setShift] = useState('Morning');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const fields = detail?.fields || [];

  const sections = {};
  fields.forEach(f => {
    const sec = f.section_name || 'General';
    if (!sections[sec]) sections[sec] = [];
    sections[sec].push(f);
  });

  const setValue = (fieldName, val) => setValues(v => ({ ...v, [fieldName]: val }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    // Check required fields
    for (const f of fields) {
      if (f.required && !values[f.field_name] && values[f.field_name] !== 0 && values[f.field_name] !== false) {
        alert(`"${f.field_name}" is required`);
        return;
      }
    }
    setSubmitting(true);
    try {
      await apiPost(`/api/sop-forms/${form.id}/entries`, {
        entry_data: JSON.stringify(values),
        submitted_by: user?.display_name || user?.username || 'Operator',
        shift,
        date,
        status: 'submitted',
      });
      onBack();
      onRefetch();
    } catch (err) {
      alert('Failed to submit: ' + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Fill: {form.title}</h3>
          <p className="text-xs text-gray-500">{form.form_number}</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3 bg-gray-50 rounded-lg p-3">
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Date</label>
            <input type="date" value={date} onChange={e => setDate(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Shift</label>
            <select value={shift} onChange={e => setShift(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm">
              <option>Morning</option>
              <option>Afternoon</option>
              <option>Evening</option>
            </select>
          </div>
        </div>

        {Object.entries(sections).map(([sectionName, sectionFields]) => (
          <div key={sectionName} className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="bg-gray-50 px-4 py-2 border-b border-gray-200">
              <span className="text-xs font-semibold text-gray-600 uppercase tracking-wide">{sectionName}</span>
            </div>
            <div className="p-4 space-y-3">
              {sectionFields.map(field => (
                <FormFieldInput key={field.id} field={field} value={values[field.field_name]} onChange={val => setValue(field.field_name, val)} />
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onBack} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800">Cancel</button>
          <button type="submit" disabled={submitting} className="flex items-center gap-1.5 px-4 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50">
            <Send className="w-4 h-4" /> {submitting ? 'Submitting...' : 'Submit Entry'}
          </button>
        </div>
      </form>
    </div>
  );
}

function FormFieldInput({ field, value, onChange }) {
  const label = (
    <label className="block text-sm font-medium text-gray-700 mb-1">
      {field.field_name} {field.required ? <span className="text-red-400">*</span> : null}
    </label>
  );

  let options = [];
  try { options = JSON.parse(field.field_options || '[]'); } catch {}

  switch (field.field_type) {
    case 'checkbox':
      return (
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={!!value} onChange={e => onChange(e.target.checked)} className="rounded" />
          <span className="text-sm text-gray-700">{field.field_name} {field.required ? <span className="text-red-400">*</span> : null}</span>
        </label>
      );
    case 'select':
      return (
        <div>
          {label}
          <select value={value || ''} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required={!!field.required}>
            <option value="">Select...</option>
            {options.map(o => <option key={o} value={o}>{o}</option>)}
          </select>
        </div>
      );
    case 'number':
    case 'temperature':
      return (
        <div>
          {label}
          <div className="relative">
            <input type="number" step="any" value={value ?? ''} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required={!!field.required} />
            {field.field_type === 'temperature' && <span className="absolute right-3 top-2 text-gray-400 text-sm">°C</span>}
          </div>
        </div>
      );
    case 'date':
      return (
        <div>
          {label}
          <input type="date" value={value || ''} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required={!!field.required} />
        </div>
      );
    case 'time':
      return (
        <div>
          {label}
          <input type="time" value={value || ''} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required={!!field.required} />
        </div>
      );
    case 'signature':
      return (
        <div>
          {label}
          <div className="flex items-center gap-2">
            <PenTool className="w-4 h-4 text-purple-400" />
            <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm italic" placeholder="Type name as signature" required={!!field.required} />
          </div>
        </div>
      );
    default:
      return (
        <div>
          {label}
          <input type="text" value={value || ''} onChange={e => onChange(e.target.value)} className="w-full px-3 py-2 border rounded-lg text-sm" required={!!field.required} />
        </div>
      );
  }
}

// ─── Entries Table ──────────────────────────────────────────

function EntriesTable({ form, onBack, onRefetch }) {
  const { canWrite, hasRole } = useAuth();
  const { data: detail, refetch: refetchDetail } = useFetch(`/api/sop-forms/${form.id}`);
  const [viewEntry, setViewEntry] = useState(null);

  const entries = detail?.entries || [];
  const fields = detail?.fields || [];

  const handleVerify = async (entryId) => {
    try {
      await apiPut(`/api/sop-forms/${form.id}/entries/${entryId}/verify`, {});
      refetchDetail();
      onRefetch();
    } catch (err) {
      alert('Failed to verify: ' + err.message);
    }
  };

  const handleDelete = async (entryId) => {
    if (!confirm('Delete this entry?')) return;
    try {
      await apiDelete(`/api/sop-forms/${form.id}/entries/${entryId}`);
      refetchDetail();
      onRefetch();
    } catch (err) {
      alert('Failed to delete: ' + err.message);
    }
  };

  const formatDate = (d) => {
    if (!d) return '-';
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="p-1.5 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Entries: {form.title}</h3>
            <p className="text-xs text-gray-500">{entries.length} submission{entries.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">No entries submitted yet.</div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-200">
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Date</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Submitted By</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Shift</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Status</th>
                <th className="text-left px-4 py-2.5 font-medium text-gray-600 text-xs">Verified By</th>
                <th className="text-right px-4 py-2.5 font-medium text-gray-600 text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {entries.map(entry => (
                <tr key={entry.id} className="hover:bg-gray-50">
                  <td className="px-4 py-2.5 text-gray-900">{formatDate(entry.date)}</td>
                  <td className="px-4 py-2.5 text-gray-700">{entry.submitted_by || '-'}</td>
                  <td className="px-4 py-2.5 text-gray-700">{entry.shift || '-'}</td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[entry.status] || STATUS_COLORS.draft}`}>
                      {entry.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-gray-700">{entry.verified_by || '-'}</td>
                  <td className="px-4 py-2.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button onClick={() => setViewEntry(entry)} className="p-1 text-gray-400 hover:text-blue-600 rounded" title="View entry"><Eye className="w-4 h-4" /></button>
                      {entry.status !== 'verified' && (hasRole('admin') || hasRole('manager')) && (
                        <button onClick={() => handleVerify(entry.id)} className="p-1 text-gray-400 hover:text-green-600 rounded" title="Verify entry"><Shield className="w-4 h-4" /></button>
                      )}
                      {canWrite() && (
                        <button onClick={() => handleDelete(entry.id)} className="p-1 text-gray-400 hover:text-red-500 rounded" title="Delete entry"><Trash2 className="w-4 h-4" /></button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Entry detail modal */}
      {viewEntry && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4" onClick={() => setViewEntry(null)}>
          <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-3 border-b border-gray-200">
              <h4 className="font-semibold text-gray-900">Entry Details</h4>
              <button onClick={() => setViewEntry(null)} className="p-1 text-gray-400 hover:text-gray-600 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-3 gap-2 text-xs mb-4">
                <div><span className="text-gray-400">Date:</span> <span className="font-medium">{formatDate(viewEntry.date)}</span></div>
                <div><span className="text-gray-400">Shift:</span> <span className="font-medium">{viewEntry.shift}</span></div>
                <div><span className="text-gray-400">Status:</span> <span className={`px-1.5 py-0.5 rounded-full font-medium ${STATUS_COLORS[viewEntry.status]}`}>{viewEntry.status}</span></div>
              </div>
              {(() => {
                let data = {};
                try { data = JSON.parse(viewEntry.entry_data || '{}'); } catch {}
                return Object.entries(data).map(([key, val]) => (
                  <div key={key} className="flex justify-between py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-sm text-gray-600">{key}</span>
                    <span className="text-sm font-medium text-gray-900">{typeof val === 'boolean' ? (val ? 'Yes' : 'No') : String(val || '-')}</span>
                  </div>
                ));
              })()}
              <div className="pt-3 border-t text-xs text-gray-500 space-y-1">
                <div>Submitted by: {viewEntry.submitted_by || '-'}</div>
                {viewEntry.verified_by && <div>Verified by: {viewEntry.verified_by} at {formatDate(viewEntry.verified_at)}</div>}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main SOPForms Component ────────────────────────────────

export default function SOPForms({ sopId }) {
  const { canWrite, hasRole } = useAuth();
  const { data: forms, loading, refetch } = useFetch(`/api/sops/${sopId}/forms`);
  const [view, setView] = useState('list'); // list | builder | fill | entries
  const [selectedForm, setSelectedForm] = useState(null);

  const handleSelect = (form) => {
    setSelectedForm(form);
    setView('builder');
  };

  if (loading) return <div className="text-center py-8 text-gray-400 text-sm">Loading forms...</div>;

  if (view === 'builder' && selectedForm) {
    return (
      <div className="space-y-4">
        <FormBuilder form={selectedForm} onBack={() => { setView('list'); setSelectedForm(null); }} onRefetch={refetch} />
        <div className="flex gap-2 pt-2 border-t border-gray-200">
          <button onClick={() => setView('fill')} className="flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700">
            <Send className="w-4 h-4" /> Fill Out Form
          </button>
          <button onClick={() => setView('entries')} className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200">
            <List className="w-4 h-4" /> View Entries ({selectedForm.entry_count || 0})
          </button>
        </div>
      </div>
    );
  }

  if (view === 'fill' && selectedForm) {
    return <FillOutForm form={selectedForm} onBack={() => setView('builder')} onRefetch={refetch} />;
  }

  if (view === 'entries' && selectedForm) {
    return <EntriesTable form={selectedForm} onBack={() => setView('builder')} onRefetch={refetch} />;
  }

  return <FormList forms={forms || []} sopId={sopId} canWrite={canWrite()} onSelect={handleSelect} onRefetch={refetch} />;
}
