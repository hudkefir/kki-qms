import { Router } from 'express';
import { GoogleGenerativeAI } from '@google/generative-ai';

const router = Router();

const SYSTEM_PROMPT = `You are Jarvis, an AI assistant for KEFIR Kultures Inc. (KKI), a food manufacturing company that produces kefir products. You help quality assurance staff write clear, professional GMP-compliant documentation for their Quality Management System (QMS).

Your suggestions should be:
- Concise and professional
- GMP/food-safety appropriate language
- Specific to kefir/dairy manufacturing when relevant
- Written in past tense for descriptions of what happened
- Actionable for root causes and corrective actions

Do NOT include headers, bullet points, or markdown formatting. Write in plain paragraph form. Keep suggestions to 2-4 sentences unless the context warrants more detail.`;

const FIELD_PROMPTS = {
  description: 'Write a clear, factual description of this quality event based on the context provided. Focus on: what happened, when, where, what product/lot was affected, and who discovered it.',
  root_cause: 'Based on the description and context, suggest a likely root cause analysis. Consider: equipment, process, personnel, materials, environment, and method factors. Be specific about the most probable cause.',
  root_cause_analysis: 'Based on the description and context, write a thorough root cause analysis. Use the investigation method if specified. Consider: equipment, process, personnel, materials, environment factors. Identify the most probable root cause and contributing factors.',
  containment_action: 'Suggest an appropriate immediate containment action for this quality event. Focus on: isolating affected product, preventing further occurrence, and protecting the consumer.',
  corrective_action: 'Suggest a corrective action to address the root cause. Focus on: what specific changes to make, who is responsible, and how to verify the fix works.',
  preventive_action: 'Suggest a preventive action to prevent recurrence. Focus on: systemic changes, training, process improvements, or monitoring enhancements.',
  investigation: 'Write investigation findings based on the context provided. Document what was examined, what evidence was found, and what conclusions were drawn.',
};

router.post('/ai/suggest', async (req, res) => {
  try {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'AI assistant not configured. GEMINI_API_KEY is required.' });
    }

    const { field, context, recordType } = req.body;
    if (!field || !context) {
      return res.status(400).json({ error: 'Missing field or context' });
    }

    const fieldPrompt = FIELD_PROMPTS[field] || `Suggest appropriate content for the "${field}" field based on the context provided.`;

    const userMessage = `Record type: ${recordType || 'quality event'}

Context:
${Object.entries(context)
  .filter(([, v]) => v && String(v).trim())
  .map(([k, v]) => `- ${k.replace(/_/g, ' ')}: ${v}`)
  .join('\n')}

Task: ${fieldPrompt}`;

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({
      model: 'gemini-2.5-flash',
      systemInstruction: SYSTEM_PROMPT,
    });

    const result = await model.generateContent({
      contents: [{ role: 'user', parts: [{ text: userMessage }] }],
      generationConfig: { maxOutputTokens: 500 },
    });

    const suggestion = result.response.text() || '';
    res.json({ suggestion });
  } catch (err) {
    console.error('AI suggest error:', err.message);
    res.status(500).json({ error: 'AI suggestion failed: ' + err.message });
  }
});

export default router;
