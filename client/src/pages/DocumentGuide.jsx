import React, { useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  HelpCircle, AlertCircle, FileCheck, AlertOctagon, ShieldCheck, GitPullRequest,
  Users, Search, Wrench, ClipboardList, ChevronRight, RotateCcw, ArrowRight,
  MessageSquareWarning, ShieldAlert, FileWarning, Repeat, Zap, Package,
  FileText, BookOpen, ExternalLink
} from 'lucide-react';

// ── Document type definitions ──────────────────────────────────────────────────

const DOC_TYPES = {
  complaint: {
    name: 'Complaint',
    icon: AlertCircle,
    color: 'border-red-500',
    accent: 'text-red-400',
    bgAccent: 'bg-red-500/10',
    route: '/complaints',
    description: 'Track customer complaints about product quality, safety, or satisfaction issues.',
    captures: [
      'Customer details, product/batch, and issue description',
      'Investigation findings and root cause',
      'Corrective actions taken and customer resolution',
    ],
    useWhen: [
      'A customer reports a quality or safety problem',
      'Product doesn\'t meet customer expectations',
      'A consumer illness or adverse reaction is reported',
    ],
    related: 'A complaint often leads to a CAPA if the issue is systemic.',
  },
  ccr: {
    name: 'CCR (Customer Change Request)',
    icon: FileCheck,
    color: 'border-blue-500',
    accent: 'text-blue-400',
    bgAccent: 'bg-blue-500/10',
    route: '/ccrs',
    description: 'Document when a customer requests changes to your product, process, or packaging.',
    captures: [
      'Customer request details and rationale',
      'Impact assessment on production and quality',
      'Approval workflow and implementation plan',
    ],
    useWhen: [
      'A customer asks you to change a recipe or formulation',
      'A retailer requires new packaging or labeling',
      'A customer requests a process modification',
    ],
    related: 'CCRs may trigger a Change Request for the actual implementation.',
  },
  deviation: {
    name: 'Deviation',
    icon: AlertOctagon,
    color: 'border-amber-500',
    accent: 'text-amber-400',
    bgAccent: 'bg-amber-500/10',
    route: '/deviations',
    description: 'Record any departure from approved SOPs, specifications, or expected outcomes.',
    captures: [
      'What deviated and from which SOP/spec',
      'Immediate corrective action taken',
      'Risk assessment and disposition of affected product',
    ],
    useWhen: [
      'A batch is out of spec (pH, temperature, weight, etc.)',
      'An SOP step was missed or done incorrectly',
      'Equipment malfunctions during production',
    ],
    related: 'A deviation often leads to a CAPA if the root cause needs deeper investigation.',
  },
  capa: {
    name: 'CAPA',
    icon: ShieldCheck,
    color: 'border-emerald-500',
    accent: 'text-emerald-400',
    bgAccent: 'bg-emerald-500/10',
    route: '/capas',
    description: 'Corrective and Preventive Actions for recurring or systemic issues requiring root cause analysis.',
    captures: [
      'Root cause analysis (5 Whys, fishbone, etc.)',
      'Corrective actions to fix the current issue',
      'Preventive actions to stop recurrence',
    ],
    useWhen: [
      'The same deviation keeps happening',
      'An audit finding requires formal corrective action',
      'A complaint reveals a systemic process gap',
    ],
    related: 'CAPAs are linked to deviations, complaints, or audit findings as their source.',
  },
  changeRequest: {
    name: 'Change Request',
    icon: GitPullRequest,
    color: 'border-purple-500',
    accent: 'text-purple-400',
    bgAccent: 'bg-purple-500/10',
    route: '/change-requests',
    description: 'Formally propose and track changes to processes, SOPs, equipment, suppliers, or packaging.',
    captures: [
      'Proposed change description and justification',
      'Risk assessment and impact analysis',
      'Approval chain and implementation timeline',
    ],
    useWhen: [
      'You want to change an SOP, recipe, or process',
      'Switching to a new supplier or ingredient',
      'Upgrading or replacing production equipment',
    ],
    related: 'Change Requests may originate from CAPAs or CCRs.',
  },
};

// ── Decision tree structure ────────────────────────────────────────────────────

const STEPS = {
  start: {
    question: 'What triggered this?',
    subtitle: 'Select the scenario that best matches your situation.',
    options: [
      { id: 'customer', label: 'Customer reported an issue', icon: Users, sublabel: 'External feedback or complaint', next: 'customer' },
      { id: 'internal', label: 'We found a problem internally', icon: Search, sublabel: 'Production or QC finding', next: 'internal' },
      { id: 'change', label: 'We want to change something', icon: Wrench, sublabel: 'Process, SOP, or supplier change', next: 'change' },
      { id: 'audit', label: 'An audit finding needs action', icon: ClipboardList, sublabel: 'GMP or third-party audit', result: 'capa', note: 'Source: Audit finding' },
      { id: 'unsure', label: 'Not sure / multiple factors', icon: HelpCircle, sublabel: 'Compare all document types', next: 'compare' },
    ],
  },
  customer: {
    question: 'What kind of customer issue?',
    subtitle: 'Tell us more about what the customer reported.',
    options: [
      { id: 'cust_change', label: 'Customer wants us to change our process/product', icon: FileCheck, sublabel: 'Formal change request from a customer or retailer', result: 'ccr' },
      { id: 'cust_unhappy', label: 'Customer is unhappy / product quality issue', icon: MessageSquareWarning, sublabel: 'Quality complaint, dissatisfaction, or defect report', result: 'complaint' },
      { id: 'cust_safety', label: 'Customer reported a safety concern', icon: ShieldAlert, sublabel: 'Illness, allergic reaction, or contamination', result: 'complaint', note: 'Critical severity -- also consider opening a CAPA' },
    ],
  },
  internal: {
    question: 'What kind of internal problem?',
    subtitle: 'Describe the nature of the issue found.',
    options: [
      { id: 'int_deviation', label: 'Something deviated from our SOP / specs', icon: FileWarning, sublabel: 'Out-of-spec batch, missed step, or process drift', result: 'deviation' },
      { id: 'int_recurring', label: 'Recurring issue that needs root cause analysis', icon: Repeat, sublabel: 'Same problem keeps coming back', result: 'capa' },
      { id: 'int_onetime', label: 'One-time incident, already corrected', icon: Zap, sublabel: 'Isolated event with immediate fix applied', result: 'deviation' },
      { id: 'int_equipment', label: 'Equipment broke or calibration failed', icon: Wrench, sublabel: 'Mechanical failure or instrument drift', result: 'deviation', note: 'Equipment category' },
    ],
  },
  change: {
    question: 'What are you changing?',
    subtitle: 'Select the type of change you want to make.',
    options: [
      { id: 'chg_process', label: 'Changing a process, SOP, or recipe', icon: FileText, sublabel: 'Modify how things are done in production', result: 'changeRequest' },
      { id: 'chg_material', label: 'Changing packaging, supplier, or equipment', icon: Package, sublabel: 'New materials, vendors, or machines', result: 'changeRequest' },
      { id: 'chg_fix', label: 'Fixing an issue found in a deviation or complaint', icon: ShieldCheck, sublabel: 'Corrective/preventive action from a prior finding', result: 'capa', note: 'Link to the source deviation or complaint' },
    ],
  },
};

// ── Component ──────────────────────────────────────────────────────────────────

export default function DocumentGuide() {
  const navigate = useNavigate();
  const [history, setHistory] = useState([{ stepId: 'start', label: 'Start' }]);
  const [resultDocType, setResultDocType] = useState(null);
  const [resultNote, setResultNote] = useState(null);
  const [showCompare, setShowCompare] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [fadeIn, setFadeIn] = useState(true);

  const currentStep = useMemo(() => {
    if (resultDocType || showCompare) return null;
    const last = history[history.length - 1];
    return STEPS[last.stepId] || null;
  }, [history, resultDocType, showCompare]);

  const totalSteps = useMemo(() => {
    if (showCompare) return history.length + 1;
    if (resultDocType) return history.length + 1;
    // Estimate: start is step 1, sub-question is step 2, result is step 3
    return currentStep && history.length === 1 && currentStep.options.some(o => o.next) ? 3 : 2;
  }, [history, resultDocType, showCompare, currentStep]);

  const progressPercent = useMemo(() => {
    if (resultDocType || showCompare) return 100;
    return Math.round((history.length / totalSteps) * 100);
  }, [history, totalSteps, resultDocType, showCompare]);

  const transition = useCallback((callback) => {
    setAnimating(true);
    setFadeIn(false);
    setTimeout(() => {
      callback();
      setFadeIn(true);
      setTimeout(() => setAnimating(false), 50);
    }, 200);
  }, []);

  const handleOptionClick = useCallback((option) => {
    transition(() => {
      if (option.next === 'compare') {
        setShowCompare(true);
        setHistory(prev => [...prev, { stepId: 'compare', label: 'Compare All' }]);
      } else if (option.result) {
        setResultDocType(option.result);
        setResultNote(option.note || null);
        setHistory(prev => [...prev, { stepId: 'result', label: DOC_TYPES[option.result].name }]);
      } else if (option.next) {
        setHistory(prev => [...prev, { stepId: option.next, label: option.label }]);
      }
    });
  }, [transition]);

  const goToStep = useCallback((index) => {
    transition(() => {
      if (index === 0) {
        setHistory([{ stepId: 'start', label: 'Start' }]);
        setResultDocType(null);
        setResultNote(null);
        setShowCompare(false);
      } else {
        const newHistory = history.slice(0, index + 1);
        setHistory(newHistory);
        const last = newHistory[newHistory.length - 1];
        if (last.stepId !== 'result' && last.stepId !== 'compare') {
          setResultDocType(null);
          setResultNote(null);
          setShowCompare(false);
        }
      }
    });
  }, [history, transition]);

  const startOver = useCallback(() => {
    transition(() => {
      setHistory([{ stepId: 'start', label: 'Start' }]);
      setResultDocType(null);
      setResultNote(null);
      setShowCompare(false);
    });
  }, [transition]);

  // ── Render helpers ─────────────────────────────────────────────────────────

  const renderBreadcrumbs = () => (
    <div className="flex items-center gap-1.5 flex-wrap text-sm mb-6">
      {history.map((crumb, i) => {
        const isLast = i === history.length - 1 && !resultDocType && !showCompare;
        const isCurrent = (resultDocType || showCompare)
          ? i === history.length - 1
          : i === history.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-gray-500 flex-shrink-0" />}
            <button
              onClick={() => !isCurrent && goToStep(i)}
              disabled={isCurrent}
              className={`px-2 py-0.5 rounded text-sm transition-colors ${
                isCurrent
                  ? 'text-white font-semibold cursor-default'
                  : 'text-gray-400 hover:text-white hover:bg-gray-700/50 cursor-pointer'
              }`}
            >
              {crumb.label}
            </button>
          </React.Fragment>
        );
      })}
    </div>
  );

  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-xs text-gray-500 font-medium">
          Step {Math.min(history.length, totalSteps)} of {totalSteps}
        </span>
        <span className="text-xs text-gray-500 font-medium">{progressPercent}%</span>
      </div>
      <div className="w-full h-1.5 bg-gray-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out"
          style={{ width: `${progressPercent}%` }}
        />
      </div>
    </div>
  );

  const renderQuestionStep = () => {
    if (!currentStep) return null;
    return (
      <div>
        <h2 className="text-2xl font-bold text-white mb-1">{currentStep.question}</h2>
        <p className="text-gray-400 mb-8">{currentStep.subtitle}</p>
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
          {currentStep.options.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                key={opt.id}
                onClick={() => handleOptionClick(opt)}
                className="group flex items-start gap-4 p-5 bg-gray-800 border border-gray-700 rounded-xl text-left
                           hover:border-blue-500/60 hover:bg-gray-800/80 transition-all duration-200
                           focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              >
                <div className="w-10 h-10 rounded-lg bg-gray-700 group-hover:bg-blue-500/20 flex items-center justify-center flex-shrink-0 transition-colors">
                  <Icon className="w-5 h-5 text-gray-300 group-hover:text-blue-400 transition-colors" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white group-hover:text-blue-100 transition-colors">{opt.label}</p>
                  <p className="text-xs text-gray-400 mt-0.5">{opt.sublabel}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-gray-600 group-hover:text-blue-400 mt-1 flex-shrink-0 transition-colors" />
              </button>
            );
          })}
        </div>
      </div>
    );
  };

  const renderResult = () => {
    const doc = DOC_TYPES[resultDocType];
    if (!doc) return null;
    const Icon = doc.icon;
    return (
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-6">
          <p className="text-sm font-medium text-gray-400 mb-2">Recommended document</p>
        </div>
        <div className={`bg-gray-800 border-2 ${doc.color} rounded-2xl p-8`}>
          <div className="flex items-center gap-4 mb-5">
            <div className={`w-14 h-14 rounded-xl ${doc.bgAccent} flex items-center justify-center`}>
              <Icon className={`w-7 h-7 ${doc.accent}`} />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">{doc.name}</h3>
              <p className="text-sm text-gray-400 mt-0.5">{doc.description}</p>
            </div>
          </div>

          {resultNote && (
            <div className="mb-5 p-3 bg-amber-500/10 border border-amber-500/30 rounded-lg">
              <p className="text-sm text-amber-300 font-medium">{resultNote}</p>
            </div>
          )}

          <div className="mb-6">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">What gets captured</p>
            <ul className="space-y-2">
              {doc.captures.map((item, i) => (
                <li key={i} className="flex items-start gap-2.5 text-sm text-gray-300">
                  <div className="w-1.5 h-1.5 rounded-full bg-gray-500 mt-1.5 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div className="mb-6 p-3 bg-gray-700/50 rounded-lg">
            <p className="text-xs text-gray-400">
              <span className="font-semibold text-gray-300">Related: </span>
              {doc.related}
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => navigate(doc.route)}
              className="flex-1 flex items-center justify-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-lg transition-colors"
            >
              Create {doc.name}
              <ExternalLink className="w-4 h-4" />
            </button>
            <button
              onClick={startOver}
              className="flex items-center gap-2 px-4 py-3 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white font-medium rounded-lg transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
              Start Over
            </button>
          </div>
        </div>
      </div>
    );
  };

  const renderCompare = () => {
    const types = Object.entries(DOC_TYPES);
    return (
      <div>
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-white mb-1">All Document Types</h2>
          <p className="text-gray-400">Compare and choose the right document for your situation.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {types.map(([key, doc]) => {
            const Icon = doc.icon;
            return (
              <div
                key={key}
                className={`bg-gray-800 border-l-4 ${doc.color} rounded-xl p-6 flex flex-col`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className={`w-10 h-10 rounded-lg ${doc.bgAccent} flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${doc.accent}`} />
                  </div>
                  <h3 className="text-base font-bold text-white">{doc.name}</h3>
                </div>
                <p className="text-sm text-gray-400 mb-4">{doc.description}</p>
                <div className="mb-5 flex-1">
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Use when...</p>
                  <ul className="space-y-1.5">
                    {doc.useWhen.map((item, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                        <div className="w-1.5 h-1.5 rounded-full bg-gray-500 mt-1.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
                <button
                  onClick={() => navigate(doc.route)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium rounded-lg transition-colors"
                >
                  Create {doc.name}
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
        <div className="flex justify-center mt-8">
          <button
            onClick={startOver}
            className="flex items-center gap-2 px-5 py-2.5 bg-gray-700 hover:bg-gray-600 text-gray-300 hover:text-white font-medium rounded-lg transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
            Start Over
          </button>
        </div>
      </div>
    );
  };

  // ── Main render ────────────────────────────────────────────────────────────

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
          <HelpCircle className="w-5 h-5 text-blue-400" />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">Document Decision Guide</h1>
          <p className="text-sm text-gray-400">Not sure which document to create? This guide will help.</p>
        </div>
      </div>

      {renderBreadcrumbs()}
      {renderProgressBar()}

      {/* Content area with transitions */}
      <div
        className={`transition-all duration-200 ease-in-out ${
          fadeIn ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
        }`}
      >
        {showCompare && renderCompare()}
        {resultDocType && !showCompare && renderResult()}
        {!resultDocType && !showCompare && currentStep && renderQuestionStep()}
      </div>
    </div>
  );
}
