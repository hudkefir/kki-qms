import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';

const router = Router();

const SYSTEM_PROMPT = `You are Jarvis, the AI assistant for KEFIR Kultures Inc. (KKI) Quality Management System. You help QMS users with quality assurance, food safety, and documentation tasks.

Your knowledge includes:
- GMP (Good Manufacturing Practices) for food production
- Food safety regulations (CFIA, FDA, HACCP, FSMA)
- CAPA processes (Corrective and Preventive Actions)
- Batch testing procedures and COA interpretation
- SOP writing and management
- Deviation and complaint handling
- Change control processes
- Environmental monitoring
- Supplier qualification
- Recall readiness and traceability

You can help with:
- Writing clear, professional GMP-compliant documentation
- Explaining QMS procedures and regulatory requirements
- Recommending corrective/preventive actions
- Answering questions about food safety and quality
- Guiding users through QMS workflows
- Interpreting batch test results
- Drafting investigation findings

Guidelines:
- Be concise and actionable
- Use professional, GMP-appropriate language
- Reference relevant SOPs or procedures when applicable
- If unsure, say so rather than guessing
- Format responses with markdown for readability
- Keep responses focused and practical`;

router.post('/ai/chat', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'AI assistant not configured. ANTHROPIC_API_KEY is required.' });
    }

    const { messages, context } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'Messages array is required' });
    }

    // Build context-aware system prompt
    const user = req.session.user;
    let systemPrompt = SYSTEM_PROMPT;

    // Add user context
    systemPrompt += `\n\nCurrent user: ${user.display_name || user.username} (role: ${user.role})`;

    // Add page context if provided
    if (context) {
      if (context.page) {
        systemPrompt += `\nUser is currently viewing: ${context.page}`;
      }
      if (context.recordType) {
        systemPrompt += `\nRecord type in view: ${context.recordType}`;
      }
      if (context.recordId) {
        systemPrompt += `\nRecord ID: ${context.recordId}`;
      }
    }

    // Validate and format messages for Anthropic API
    const formattedMessages = messages.map(msg => ({
      role: msg.role === 'user' ? 'user' : 'assistant',
      content: msg.content,
    }));

    const client = new Anthropic({ apiKey });
    const response = await client.messages.create({
      model: 'claude-sonnet-4-6-20250514',
      max_tokens: 2048,
      system: systemPrompt,
      messages: formattedMessages,
    });

    const reply = response.content[0]?.text || '';
    res.json({ reply });
  } catch (err) {
    console.error('AI chat error:', err.message);
    if (err.status === 429) {
      return res.status(429).json({ error: 'Rate limited. Please wait a moment and try again.' });
    }
    res.status(500).json({ error: 'AI chat failed: ' + err.message });
  }
});

export default router;
