import React, { useState } from 'react';
import { Info, HelpCircle, X } from 'lucide-react';

/**
 * Field-level help text shown as gray subtitle under labels
 */
export function FieldHelp({ text }) {
  if (!text) return null;
  return <p className="text-[11px] text-gray-400 mt-0.5 mb-1 leading-snug">{text}</p>;
}

/**
 * Info tooltip that appears near record headers explaining what a record type is
 */
export function RecordInfoTooltip({ title, children }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative inline-block">
      <button
        onClick={() => setOpen(!open)}
        className="p-1 text-gray-400 hover:text-navy-600 hover:bg-navy-50 rounded-full transition-colors"
        title={`What is a ${title}?`}
      >
        <Info className="w-4 h-4" />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute left-0 top-8 z-50 w-80 bg-white rounded-xl shadow-lg border border-gray-200 p-4">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-navy-600" />
                <h4 className="text-sm font-semibold text-gray-900">What is a {title}?</h4>
              </div>
              <button onClick={() => setOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="text-xs text-gray-600 leading-relaxed space-y-2">
              {children}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

/**
 * GMP help text definitions for each module
 */
export const GMP_HELP = {
  complaint: {
    info: {
      title: 'Complaint',
      what: 'A Customer Complaint is a formal record of any product quality issue reported by a customer, retailer, or distributor.',
      when: 'Create one whenever you receive feedback about product defects, safety concerns, taste/texture issues, packaging problems, or labeling errors.',
      need: 'You will need: the reporter name, product details (SKU, lot number), what the issue is, and severity assessment.',
    },
    fields: {
      date_received: 'When was the complaint received? Use the date the complaint was first reported to you, not when the issue occurred.',
      source: 'Who reported this? E.g., "Purity Life", "Direct consumer", "CFIA", "Internal QA"',
      reporter: 'Name of the person who reported the issue. E.g., "Callum Nicholl", "Store Manager"',
      store_location: 'Where was the product when the issue was found? E.g., "Natures Fare W. Kelowna", "Customer home"',
      product_sku: 'Select the product SKU involved in this complaint.',
      lot_number: 'The lot/batch number printed on the product. E.g., "003321". Critical for traceability.',
      best_before: 'Best before date on the product packaging.',
      quantity_affected: 'How many units were affected? E.g., "6" if 6 bottles were leaking.',
      issue_type: 'What category of issue? E.g., Seal Failure, Mold, Fermentation/Bloating, Separation.',
      severity: 'How serious is this? Low = cosmetic only. Medium = quality concern. High = potential safety issue. Critical = immediate safety risk.',
      description: 'Describe the problem in detail. What happened, when, and where? E.g., "6 units leaking from lid seals, sizzling sound upon opening, 1 bottle exploded in store."',
      assigned_to: 'Who is responsible for investigating and resolving this complaint?',
    },
    placeholders: {
      source: 'e.g., Purity Life, Direct consumer, Internal QA',
      reporter: 'e.g., Callum Nicholl',
      store_location: 'e.g., Natures Fare W. Kelowna',
      lot_number: 'e.g., 003321',
      quantity_affected: 'e.g., 6',
      description: 'Describe: what happened, when, where, and how many units affected...',
      assigned_to: 'e.g., Hudson, Tim, Greg',
    },
  },
  ccr: {
    info: {
      title: 'CCR (Customer Complaint Response)',
      what: 'A CCR is a formal response document sent to customers/distributors about quality issues, documenting root causes and corrective actions.',
      when: 'Create one when you need to formally respond to a customer about their complaint, especially for recurring or serious issues.',
      need: 'You will need: the recipient company/contact, root cause analysis, corrective actions, and target resolution date.',
    },
    fields: {
      title: 'A clear title describing the quality issue being addressed. E.g., "Purity Life - Coconut Kefir Seal Failure Issues (Mar 2026)"',
      recipient_company: 'The company you are responding to. E.g., "Purity Life Grocery"',
      recipient_contact: 'The contact person at the recipient company. E.g., "Callum Nicholl"',
      target_resolution_date: 'When do you expect all corrective actions to be completed?',
      notes: 'Additional context or notes about this CCR.',
      status: 'Draft = still preparing. In Review = awaiting approval. Sent = delivered to customer. Closed = all actions complete.',
    },
    placeholders: {
      title: 'e.g., Purity Life - CocoMng Seal Failure Response',
      recipient_company: 'e.g., Purity Life Grocery',
      recipient_contact: 'e.g., Callum Nicholl',
      notes: 'Additional context about this response...',
    },
  },
  deviation: {
    info: {
      title: 'Deviation',
      what: 'A Deviation Report documents any departure from approved SOPs, specifications, or GMP requirements during production.',
      when: 'Create one whenever something goes wrong or different from the documented procedure — failed batch test, equipment malfunction, process error, missed CCP, contamination event.',
      need: 'You will need: what happened, when/where it was discovered, affected batches/products, immediate actions taken, and severity classification.',
    },
    fields: {
      title: 'Brief summary of the deviation. E.g., "pH out of spec on Batch KK-2026-045"',
      description: 'Detailed description of what deviated from the standard. Be specific about what should have happened vs. what actually happened.',
      category: 'What type of deviation? SOP/BPR = procedure not followed. CCP = critical control point exceeded. Product Spec = product out of specification.',
      classification: 'Minor = no product impact, paperwork error. Major = potential product quality impact. Critical = food safety risk or regulatory violation.',
      discovered_by: 'Who found this deviation? E.g., "Tim", "Lab Technician"',
      discovered_at: 'When was the deviation discovered?',
      location: 'Where in the facility? E.g., "Production line 1", "Fermentation room", "Packaging area"',
      immediate_action: 'What was done immediately? E.g., "Stopped production line, placed batch on hold, notified QA Manager"',
      root_cause: 'What caused this deviation? Use investigation methods (5 Whys, Fishbone) to determine root cause.',
      scope_assessment: 'How far-reaching is this? Are other batches/products/lines affected?',
      product_disposition: 'What happens to affected product? Release = safe to sell. Hold = pending investigation. Reject/Destroy = not safe.',
      investigation_due_date: 'When should the investigation be completed? Typically 5 business days for minor, 3 for major, immediate for critical.',
    },
    placeholders: {
      title: 'e.g., pH out of spec on Batch KK-2026-045',
      description: 'What should have happened vs. what actually happened...',
      location: 'e.g., Production line 1, Fermentation room',
      immediate_action: 'e.g., Stopped production, placed batch on hold, notified QA',
      root_cause: 'Use 5 Whys or Fishbone analysis to determine root cause...',
      scope_assessment: 'Are other batches, products, or lines affected?',
    },
  },
  change_request: {
    info: {
      title: 'Change Request',
      what: 'A Change Request documents any planned change to ingredients, processes, equipment, packaging, SOPs, or facility that could affect product quality or food safety.',
      when: 'Create one BEFORE making changes — not after. Any change to how you make, package, or handle product needs a Change Request.',
      need: 'You will need: what you want to change, why (justification), what it affects (impact analysis), risk level, and proposed date.',
    },
    fields: {
      title: 'Clear description of the proposed change. E.g., "Switch to new bottle seal liner from I.M. Packaging"',
      description: 'What exactly is being changed? Describe the current state and proposed new state.',
      category: 'Type of change: Ingredient, Process, Equipment, Packaging, Cleaning, Document, System, Facility, or CCP.',
      justification: 'Why is this change needed? Reference the problem, audit finding, or improvement. E.g., "SGS audit finding #3 — temperature monitoring SOP lacks frequency specification"',
      impact_analysis: 'What does this change affect? List affected SOPs, products, processes, training needs.',
      risk_assessment: 'Low = no food safety impact. Medium = may affect quality. High = food safety impact, needs validation.',
      proposed_effective_date: 'When should this change take effect?',
      initiator: 'Who is requesting this change?',
    },
    placeholders: {
      title: 'e.g., Switch to new bottle seal liner from I.M. Packaging',
      description: 'Describe current state → proposed new state...',
      justification: 'e.g., SGS audit finding #3, recurring seal failures, cost reduction...',
      impact_analysis: 'e.g., Affects KK-SOP-00600, packaging line setup, operator training...',
      initiator: 'e.g., Hudson, Tim',
    },
  },
  capa: {
    info: {
      title: 'CAPA (Corrective and Preventive Action)',
      what: 'A CAPA is a systematic investigation into a problem, its root cause, and the actions taken to fix it (corrective) and prevent it from recurring (preventive).',
      when: 'Create one for: recurring complaints, major/critical deviations, audit findings, failed batch tests, or any systemic quality issue.',
      need: 'You will need: problem description, root cause analysis, corrective actions with owners/dates, preventive actions, and effectiveness verification plan.',
    },
    fields: {
      title: 'Brief summary of the issue being addressed. E.g., "Recurring seal failures — Coconut Kefir 1L bottles"',
      description: 'Describe the problem in detail: what happened, when, how it was discovered, and what the impact is.',
      category: 'What type of issue? Product Quality, Process, Equipment, Supplier, Regulatory/Audit, Documentation.',
      classification: 'How serious? Critical = food safety hazard or recall. Major = quality affected, recurring. Minor = isolated, cosmetic, paperwork.',
      source_type: 'Where did this CAPA originate? E.g., Complaint, Deviation, Audit Finding, Internal observation.',
      responsible_person: 'Who owns this CAPA? They are accountable for driving it through to closure. E.g., "Hudson", "Tim"',
      containment_action: 'What was done immediately to contain the problem? E.g., "Quarantined affected batch, stopped production line, notified distributor"',
      root_cause_method: 'Which investigation method are you using? 5 Whys, Fishbone/Ishikawa, Fault Tree, Pareto, or FMEA.',
      root_cause_analysis: 'Document the root cause investigation. What caused the problem? Use your chosen method to trace back to the true root cause.',
      corrective_action: 'What actions will fix the root cause? Be specific: who, what, when. E.g., "Replace lid sealer gaskets (Tim, by May 15). Retrain operators on torque spec (Hudson, by May 20)."',
      preventive_action: 'What will prevent recurrence? E.g., "Add torque verification to BPR checklist. Schedule monthly gasket inspection. Update SOP-00600."',
      target_date: 'When should all corrective/preventive actions be completed? Set a realistic but firm deadline.',
      verification_method: 'How will you verify effectiveness? E.g., "Monitor complaint rate for 30 days post-fix", "Re-test next 3 batches", "Internal audit in 60 days"',
      effectiveness_notes: 'Record the results of effectiveness verification. Did the fix work? Include data/evidence.',
      investigation_details: 'Additional investigation notes, evidence collected, people interviewed, data reviewed.',
    },
    placeholders: {
      title: 'e.g., Recurring seal failures — Coconut Kefir 1L bottles',
      description: 'What happened, when, how was it discovered, what is the impact...',
      containment_action: 'e.g., Quarantined batch KK-2026-045, stopped line 2, notified Purity Life',
      root_cause_analysis: 'Document root cause using 5 Whys or Fishbone analysis...',
      corrective_action: 'e.g., Replace gaskets (Tim, May 15). Retrain operators (Hudson, May 20).',
      preventive_action: 'e.g., Add torque check to BPR. Schedule monthly gasket inspection.',
      verification_method: 'e.g., Monitor complaint rate for 30 days, re-test next 3 batches',
      effectiveness_notes: 'Were the actions effective? Include evidence and data...',
      investigation_details: 'Notes from investigation, evidence, interviews, data reviewed...',
      responsible_person: 'e.g., Hudson, Tim, Greg',
    },
  },
};
