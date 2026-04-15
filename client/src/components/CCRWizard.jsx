import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, ChevronLeft, Plus, X, AlertTriangle, CheckCircle, 
  Building, Mail, User, Calendar, Target, Users2, ClipboardCheck,
  FileText, Save, ArrowRight
} from 'lucide-react';
import { apiPost } from '../hooks/useApi';
import { useFetch } from '../hooks/useApi';

const STEPS = [
  { id: 'basic', title: 'Basic Info', icon: Building },
  { id: 'complaints', title: 'Link Complaints', icon: AlertTriangle },
  { id: 'root-causes', title: 'Root Causes', icon: Target },
  { id: 'corrective-actions', title: 'Corrective Actions', icon: Users2 },
  { id: 'containment', title: 'Containment', icon: ClipboardCheck },
  { id: 'verification', title: 'Verification Plan', icon: CheckCircle },
  { id: 'review', title: 'Review & Create', icon: FileText }
];

const SEVERITY_OPTIONS = [
  { value: 'low', label: 'Low (1)', color: 'bg-green-100 text-green-800' },
  { value: 'medium', label: 'Medium (2)', color: 'bg-yellow-100 text-yellow-800' },
  { value: 'high', label: 'High (3)', color: 'bg-orange-100 text-orange-800' },
  { value: 'critical', label: 'Critical (4)', color: 'bg-red-100 text-red-800' }
];

const LIKELIHOOD_OPTIONS = [
  { value: 1, label: 'Rare (1)' },
  { value: 2, label: 'Unlikely (2)' },
  { value: 3, label: 'Possible (3)' },
  { value: 4, label: 'Likely (4)' },
  { value: 5, label: 'Almost Certain (5)' }
];

const WORKSTREAM_PARTNERS = [
  'Escarpment Labs (Microbiology)',
  'Birdway CPG (Product Development)', 
  'I.M. Packaging Group (Packaging)',
  'Internal QA Team',
  'Production Team',
  'External Laboratory'
];

export default function CCRWizard({ onClose, onComplete }) {
  const navigate = useNavigate();
  const { data: complaints } = useFetch('/api/complaints');
  
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    // Basic Info
    recipient_company: '',
    recipient_contact: '',
    recipient_email: '',
    target_resolution_date: '',
    
    // Linked Complaints
    linked_complaints: [],
    
    // Root Causes
    root_causes: [],
    
    // Corrective Actions
    corrective_actions: [],
    
    // Containment
    containment_actions: [],
    
    // Verification Plan
    verification_plan: [],
    
    // Notes
    notes: ''
  });
  
  const [saving, setSaving] = useState(false);

  const updateFormData = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const addRootCause = () => {
    updateFormData('root_causes', [
      ...formData.root_causes,
      {
        id: Date.now(),
        title: '',
        description: '',
        likelihood: 3,
        severity: 'medium',
        risk_score: 6
      }
    ]);
  };

  const updateRootCause = (id, field, value) => {
    const updated = formData.root_causes.map(cause => {
      if (cause.id === id) {
        const updatedCause = { ...cause, [field]: value };
        if (field === 'likelihood' || field === 'severity') {
          const severityScore = SEVERITY_OPTIONS.find(s => s.value === updatedCause.severity)?.value === 'critical' ? 4 :
                               SEVERITY_OPTIONS.find(s => s.value === updatedCause.severity)?.value === 'high' ? 3 :
                               SEVERITY_OPTIONS.find(s => s.value === updatedCause.severity)?.value === 'medium' ? 2 : 1;
          updatedCause.risk_score = updatedCause.likelihood * severityScore;
        }
        return updatedCause;
      }
      return cause;
    });
    updateFormData('root_causes', updated);
  };

  const removeRootCause = (id) => {
    updateFormData('root_causes', formData.root_causes.filter(cause => cause.id !== id));
  };

  const addCorrectiveAction = () => {
    updateFormData('corrective_actions', [
      ...formData.corrective_actions,
      {
        id: Date.now(),
        workstream: '',
        partner: '',
        lead: '',
        objective: '',
        timeline: '',
        status: 'pending',
        verification_method: ''
      }
    ]);
  };

  const updateCorrectiveAction = (id, field, value) => {
    const updated = formData.corrective_actions.map(action => 
      action.id === id ? { ...action, [field]: value } : action
    );
    updateFormData('corrective_actions', updated);
  };

  const removeCorrectiveAction = (id) => {
    updateFormData('corrective_actions', formData.corrective_actions.filter(action => action.id !== id));
  };

  const addContainmentAction = () => {
    updateFormData('containment_actions', [
      ...formData.containment_actions,
      { id: Date.now(), action: '', completed: false }
    ]);
  };

  const addVerificationItem = () => {
    updateFormData('verification_plan', [
      ...formData.verification_plan,
      {
        id: Date.now(),
        action: '',
        criteria: '',
        target_date: '',
        responsible: '',
        status: 'pending'
      }
    ]);
  };

  const generateCCRNumber = () => {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-3);
    return `KK-CCR-${year}-${timestamp}`;
  };

  const canProceed = () => {
    switch (currentStep) {
      case 0: // Basic Info
        return formData.recipient_company && formData.recipient_contact && formData.recipient_email;
      case 1: // Complaints
        return formData.linked_complaints.length > 0;
      case 2: // Root Causes
        return formData.root_causes.length > 0 && formData.root_causes.every(rc => rc.title && rc.description);
      case 3: // Corrective Actions
        return formData.corrective_actions.length > 0 && formData.corrective_actions.every(ca => ca.objective && ca.timeline);
      case 4: // Containment
        return formData.containment_actions.length > 0;
      case 5: // Verification
        return formData.verification_plan.length > 0;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleComplete = async () => {
    setSaving(true);
    try {
      const ccrData = {
        title: `${formData.recipient_company} - Quality Issues Response`,
        date_created: new Date().toISOString().split('T')[0],
        status: 'draft',
        recipient_company: formData.recipient_company,
        recipient_contact: formData.recipient_contact,
        recipient_email: formData.recipient_email,
        target_resolution_date: formData.target_resolution_date,
        root_causes: { causes: formData.root_causes },
        preventive_measures: {
          containment: formData.containment_actions.map(ca => ca.action),
          corrective_actions: formData.corrective_actions,
          verification_plan: formData.verification_plan
        },
        notes: formData.notes,
        complaint_ids: formData.linked_complaints
      };

      const result = await apiPost('/api/ccrs', ccrData);

      onComplete?.(result);
      navigate(`/ccrs/${result.id}`);
    } catch (error) {
      console.error('Error creating CCR:', error);
      alert('Error creating CCR: ' + error.message);
    } finally {
      setSaving(false);
    }
  };

  const renderStepContent = () => {
    const step = STEPS[currentStep];

    switch (step.id) {
      case 'basic':
        return (
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Recipient Company *
              </label>
              <input
                type="text"
                value={formData.recipient_company}
                onChange={(e) => updateFormData('recipient_company', e.target.value)}
                placeholder="e.g., Purity Life Grocery"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Contact Person *
              </label>
              <input
                type="text"
                value={formData.recipient_contact}
                onChange={(e) => updateFormData('recipient_contact', e.target.value)}
                placeholder="e.g., John Smith, Quality Manager"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address *
              </label>
              <input
                type="email"
                value={formData.recipient_email}
                onChange={(e) => updateFormData('recipient_email', e.target.value)}
                placeholder="quality@company.com"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Target Resolution Date
              </label>
              <input
                type="date"
                value={formData.target_resolution_date}
                onChange={(e) => updateFormData('target_resolution_date', e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              />
            </div>
          </div>
        );

      case 'complaints':
        return (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Select the complaints this CCR will address. Choose related complaints that share common root causes.
            </p>
            
            <div className="max-h-96 overflow-y-auto space-y-2">
              {(complaints || []).map(complaint => (
                <label key={complaint.id} className="flex items-center p-3 border rounded-lg hover:bg-gray-50 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={formData.linked_complaints.includes(complaint.id)}
                    onChange={(e) => {
                      if (e.target.checked) {
                        updateFormData('linked_complaints', [...formData.linked_complaints, complaint.id]);
                      } else {
                        updateFormData('linked_complaints', formData.linked_complaints.filter(id => id !== complaint.id));
                      }
                    }}
                    className="mr-3"
                  />
                  <div className="flex-1">
                    <div className="font-medium">{complaint.complaint_number}</div>
                    <div className="text-sm text-gray-500">
                      {complaint.store_location} • {complaint.product_sku} • {complaint.date_received}
                    </div>
                    <div className="text-sm text-gray-600 mt-1">{complaint.description}</div>
                  </div>
                </label>
              ))}
            </div>
            
            <div className="text-sm text-gray-500">
              Selected: {formData.linked_complaints.length} complaint{formData.linked_complaints.length !== 1 ? 's' : ''}
            </div>
          </div>
        );

      case 'root-causes':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Identify and analyze the root causes. Risk Score = Likelihood × Severity
              </p>
              <button
                onClick={addRootCause}
                className="inline-flex items-center gap-2 px-3 py-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700"
              >
                <Plus className="w-4 h-4" />
                Add Root Cause
              </button>
            </div>

            <div className="space-y-4">
              {formData.root_causes.map((cause, index) => (
                <div key={cause.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Root Cause #{index + 1}</h4>
                    <button
                      onClick={() => removeRootCause(cause.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                      <input
                        type="text"
                        value={cause.title}
                        onChange={(e) => updateRootCause(cause.id, 'title', e.target.value)}
                        placeholder="e.g., Microbial Community Imbalance"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Description *</label>
                      <textarea
                        value={cause.description}
                        onChange={(e) => updateRootCause(cause.id, 'description', e.target.value)}
                        placeholder="Detailed analysis of the root cause..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                      />
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Likelihood</label>
                        <select
                          value={cause.likelihood}
                          onChange={(e) => updateRootCause(cause.id, 'likelihood', parseInt(e.target.value))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                        >
                          {LIKELIHOOD_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Severity</label>
                        <select
                          value={cause.severity}
                          onChange={(e) => updateRootCause(cause.id, 'severity', e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                        >
                          {SEVERITY_OPTIONS.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Risk Score</label>
                        <div className={`px-3 py-2 rounded-lg text-center font-medium ${
                          cause.risk_score >= 12 ? 'bg-red-100 text-red-800' :
                          cause.risk_score >= 8 ? 'bg-orange-100 text-orange-800' :
                          cause.risk_score >= 4 ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
                        }`}>
                          {cause.risk_score}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {formData.root_causes.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No root causes added yet. Click "Add Root Cause" to start.
              </div>
            )}
          </div>
        );

      case 'corrective-actions':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Define corrective actions to address each root cause. Include partners, timelines, and success criteria.
              </p>
              <button
                onClick={addCorrectiveAction}
                className="inline-flex items-center gap-2 px-3 py-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700"
              >
                <Plus className="w-4 h-4" />
                Add Action
              </button>
            </div>

            <div className="space-y-4">
              {formData.corrective_actions.map((action, index) => (
                <div key={action.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Corrective Action #{index + 1}</h4>
                    <button
                      onClick={() => removeCorrectiveAction(action.id)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Workstream</label>
                      <input
                        type="text"
                        value={action.workstream}
                        onChange={(e) => updateCorrectiveAction(action.id, 'workstream', e.target.value)}
                        placeholder="e.g., Microbiology Investigation"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Partner/Lead</label>
                      <select
                        value={action.partner}
                        onChange={(e) => updateCorrectiveAction(action.id, 'partner', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                      >
                        <option value="">Select Partner...</option>
                        {WORKSTREAM_PARTNERS.map(partner => (
                          <option key={partner} value={partner}>{partner}</option>
                        ))}
                      </select>
                    </div>

                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Objective *</label>
                      <textarea
                        value={action.objective}
                        onChange={(e) => updateCorrectiveAction(action.id, 'objective', e.target.value)}
                        placeholder="Clear, measurable objective for this corrective action..."
                        rows={2}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Timeline *</label>
                      <input
                        type="text"
                        value={action.timeline}
                        onChange={(e) => updateCorrectiveAction(action.id, 'timeline', e.target.value)}
                        placeholder="e.g., 30 days, By Apr 30, 2026"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={action.status}
                        onChange={(e) => updateCorrectiveAction(action.id, 'status', e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {formData.corrective_actions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No corrective actions added yet. Click "Add Action" to start.
              </div>
            )}
          </div>
        );

      case 'containment':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Immediate containment actions to prevent further occurrences while root causes are addressed.
              </p>
              <button
                onClick={addContainmentAction}
                className="inline-flex items-center gap-2 px-3 py-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700"
              >
                <Plus className="w-4 h-4" />
                Add Action
              </button>
            </div>

            <div className="space-y-3">
              {formData.containment_actions.map((action, index) => (
                <div key={action.id} className="flex items-center gap-3 p-3 border rounded-lg">
                  <input
                    type="checkbox"
                    checked={action.completed}
                    onChange={(e) => {
                      const updated = formData.containment_actions.map(ca => 
                        ca.id === action.id ? { ...ca, completed: e.target.checked } : ca
                      );
                      updateFormData('containment_actions', updated);
                    }}
                    className="rounded"
                  />
                  <input
                    type="text"
                    value={action.action}
                    onChange={(e) => {
                      const updated = formData.containment_actions.map(ca => 
                        ca.id === action.id ? { ...ca, action: e.target.value } : ca
                      );
                      updateFormData('containment_actions', updated);
                    }}
                    placeholder="e.g., Increased QC sampling every 50 cases for flavoured SKUs"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                  />
                  <button
                    onClick={() => updateFormData('containment_actions', 
                      formData.containment_actions.filter(ca => ca.id !== action.id))}
                    className="text-red-600 hover:text-red-700"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>

            {formData.containment_actions.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No containment actions added yet. Click "Add Action" to start.
              </div>
            )}
          </div>
        );

      case 'verification':
        return (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm text-gray-600">
                Define how you will verify that corrective actions are effective and the problem is resolved.
              </p>
              <button
                onClick={addVerificationItem}
                className="inline-flex items-center gap-2 px-3 py-2 bg-navy-800 text-white rounded-lg hover:bg-navy-700"
              >
                <Plus className="w-4 h-4" />
                Add Verification
              </button>
            </div>

            <div className="space-y-4">
              {formData.verification_plan.map((item, index) => (
                <div key={item.id} className="border rounded-lg p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-medium">Verification #{index + 1}</h4>
                    <button
                      onClick={() => updateFormData('verification_plan',
                        formData.verification_plan.filter(vp => vp.id !== item.id))}
                      className="text-red-600 hover:text-red-700"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Verification Action</label>
                      <input
                        type="text"
                        value={item.action}
                        onChange={(e) => {
                          const updated = formData.verification_plan.map(vp => 
                            vp.id === item.id ? { ...vp, action: e.target.value } : vp
                          );
                          updateFormData('verification_plan', updated);
                        }}
                        placeholder="e.g., Monitor QC pass rates for 30 days"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Success Criteria</label>
                      <input
                        type="text"
                        value={item.criteria}
                        onChange={(e) => {
                          const updated = formData.verification_plan.map(vp => 
                            vp.id === item.id ? { ...vp, criteria: e.target.value } : vp
                          );
                          updateFormData('verification_plan', updated);
                        }}
                        placeholder="e.g., <1% failure rate"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
                      <input
                        type="date"
                        value={item.target_date}
                        onChange={(e) => {
                          const updated = formData.verification_plan.map(vp => 
                            vp.id === item.id ? { ...vp, target_date: e.target.value } : vp
                          );
                          updateFormData('verification_plan', updated);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Responsible</label>
                      <input
                        type="text"
                        value={item.responsible}
                        onChange={(e) => {
                          const updated = formData.verification_plan.map(vp => 
                            vp.id === item.id ? { ...vp, responsible: e.target.value } : vp
                          );
                          updateFormData('verification_plan', updated);
                        }}
                        placeholder="e.g., QA Manager"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
                      <select
                        value={item.status}
                        onChange={(e) => {
                          const updated = formData.verification_plan.map(vp => 
                            vp.id === item.id ? { ...vp, status: e.target.value } : vp
                          );
                          updateFormData('verification_plan', updated);
                        }}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
                      >
                        <option value="pending">Pending</option>
                        <option value="in_progress">In Progress</option>
                        <option value="completed">Completed</option>
                      </select>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {formData.verification_plan.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No verification items added yet. Click "Add Verification" to start.
              </div>
            )}
          </div>
        );

      case 'review':
        return (
          <div className="space-y-6">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-600" />
                <h4 className="font-medium text-amber-800">Review Your CCR</h4>
              </div>
              <p className="text-sm text-amber-700 mt-1">
                Please review all information before creating the CCR. You can edit it after creation.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-medium mb-2">Basic Information</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Company:</span> {formData.recipient_company}</div>
                  <div><span className="font-medium">Contact:</span> {formData.recipient_contact}</div>
                  <div><span className="font-medium">Email:</span> {formData.recipient_email}</div>
                  <div><span className="font-medium">Target Date:</span> {formData.target_resolution_date || 'Not set'}</div>
                </div>
              </div>

              <div>
                <h4 className="font-medium mb-2">Linked Items</h4>
                <div className="space-y-2 text-sm">
                  <div><span className="font-medium">Complaints:</span> {formData.linked_complaints.length}</div>
                  <div><span className="font-medium">Root Causes:</span> {formData.root_causes.length}</div>
                  <div><span className="font-medium">Corrective Actions:</span> {formData.corrective_actions.length}</div>
                  <div><span className="font-medium">Containment Actions:</span> {formData.containment_actions.length}</div>
                  <div><span className="font-medium">Verification Items:</span> {formData.verification_plan.length}</div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Additional Notes
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => updateFormData('notes', e.target.value)}
                placeholder="Any additional context, references, or notes for this CCR..."
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-navy-500"
              />
            </div>
          </div>
        );

      default:
        return <div>Step content for {step.title}</div>;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Create New CCR</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="w-6 h-6" />
            </button>
          </div>

          {/* Progress Steps */}
          <div className="flex items-center mt-6 space-x-4">
            {STEPS.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                    isCompleted ? 'bg-green-100 text-green-600' :
                    isActive ? 'bg-navy-100 text-navy-600' : 'bg-gray-100 text-gray-400'
                  }`}>
                    {isCompleted ? <CheckCircle className="w-5 h-5" /> : <Icon className="w-4 h-4" />}
                  </div>
                  <span className={`ml-2 text-sm font-medium ${
                    isActive ? 'text-navy-600' : 'text-gray-500'
                  }`}>
                    {step.title}
                  </span>
                  {index < STEPS.length - 1 && <ChevronRight className="w-4 h-4 mx-2 text-gray-400" />}
                </div>
              );
            })}
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 200px)' }}>
          <h3 className="text-lg font-medium mb-4">{STEPS[currentStep].title}</h3>
          {renderStepContent()}
        </div>

        {/* Footer */}
        <div className="border-t border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <button
              onClick={handlePrev}
              disabled={currentStep === 0}
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                currentStep === 0
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
              Previous
            </button>

            <div className="text-sm text-gray-500">
              Step {currentStep + 1} of {STEPS.length}
            </div>

            {currentStep === STEPS.length - 1 ? (
              <button
                onClick={handleComplete}
                disabled={!canProceed() || saving}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                  canProceed() && !saving
                    ? 'bg-green-600 text-white hover:bg-green-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                {saving ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    Create CCR
                  </>
                )}
              </button>
            ) : (
              <button
                onClick={handleNext}
                disabled={!canProceed()}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg ${
                  canProceed()
                    ? 'bg-navy-600 text-white hover:bg-navy-700'
                    : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                }`}
              >
                Next
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}