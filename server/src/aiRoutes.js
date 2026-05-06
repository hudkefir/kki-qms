import { Router } from 'express';
import Anthropic from '@anthropic-ai/sdk';
import crypto from 'crypto';
import db from './database-pg.js';

const router = Router();

// ── Jarvis Chat ─────────────────────────────────────────────────────────────
// In-memory conversation store keyed by session ID
// Each entry: { messages: [{role, content}], lastAccess: timestamp }
const chatSessions = new Map();

// Prune stale sessions every 30 minutes (keep max 2 hours)
const CHAT_SESSION_TTL = 2 * 60 * 60 * 1000;
setInterval(() => {
  const now = Date.now();
  for (const [key, session] of chatSessions) {
    if (now - session.lastAccess > CHAT_SESSION_TTL) chatSessions.delete(key);
  }
}, 30 * 60 * 1000);

const JARVIS_SYSTEM_PROMPT = `You are Jarvis, the AI assistant embedded in the Quality Management System (QMS) for KEFIR Kultures Inc. (KKI).

## About KKI
- Small-batch kefir manufacturer based in Canada
- FDA-regulated facility operating under 21 CFR Part 117 (Preventive Controls for Human Food)
- GMP-compliant production environment
- Products: kefir beverages (dairy-based fermented milk products)

## Your Role
You help operators, quality staff, and managers with:
- GMP compliance questions and best practices
- CAPA management (Corrective and Preventive Actions)
- Deviation handling and investigation guidance
- Complaint processing and root cause analysis
- Batch record reviews and documentation
- Environmental monitoring interpretation
- SOP questions and documentation drafting
- Change control processes
- Supplier qualification
- Recall readiness and traceability
- FDA 21 CFR Part 117 regulatory requirements
- HACCP and food safety plan questions

## QMS Modules Available
The user can navigate to these sections: Dashboard, Complaints, CCRs (Customer Complaint Records), Deviations, CAPAs, Change Control, Batch Testing, Daily Tasks, SOP Library, Documents, Equipment, Maintenance, Recall Center, Suppliers, Analytics, Inventory Counts, Pick Lists, Planner, Fermentation.

## Communication Style
- Be concise and action-oriented — operators are busy
- Use plain language, avoid jargon unless the user uses it first
- When suggesting documentation text, write in professional GMP style (past tense for events, present tense for procedures)
- If the user asks about a specific record (deviation, CAPA, complaint), reference the record type and offer concrete next steps
- Provide regulatory citations (e.g., "per 21 CFR 117.150") when relevant
- If you don't know something specific to KKI's internal processes, say so and offer general GMP guidance instead

## Important Rules
- Never fabricate lot numbers, batch IDs, test results, or specific KKI data
- Always recommend documenting actions in the QMS
- For critical food safety issues, always recommend immediate containment and escalation to management
- Keep responses focused — 2-5 sentences for simple questions, more for complex topics`;

router.post('/ai/chat', async (req, res) => {
  try {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'AI assistant not configured. ANTHROPIC_API_KEY is required.' });
    }

    const { messages, context, chatSessionId } = req.body;
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({ error: 'messages array is required' });
    }

    // Build session key from user session + chat session
    const userId = req.session?.user?.id || null;
    const sessionKey = chatSessionId || `${userId || 'anon'}-${crypto.randomUUID()}`;

    // Get or create conversation history
    let session = chatSessions.get(sessionKey);
    if (!session) {
      session = { messages: [], lastAccess: Date.now() };
      chatSessions.set(sessionKey, session);
    }
    session.lastAccess = Date.now();

    // Append new user message(s) to history
    const lastMsg = messages[messages.length - 1];
    session.messages.push({ role: 'user', content: lastMsg.content });

    // Persist user message to DB
    if (userId) {
      try {
        await db.run(
          'INSERT INTO chat_messages (user_id, session_id, role, content, context) VALUES (?, ?, ?, ?, ?)',
          [userId, sessionKey, 'user', lastMsg.content, JSON.stringify(context || {})]
        );
      } catch (dbErr) {
        console.error('Failed to persist user chat message:', dbErr.message);
      }
    }

    // Cap history at 50 messages to prevent token overflow
    if (session.messages.length > 50) {
      session.messages = session.messages.slice(-50);
    }

    // Build context-aware system prompt
    let systemPrompt = JARVIS_SYSTEM_PROMPT;
    if (context) {
      systemPrompt += `\n\n## Current Context\nThe user is currently on: ${context.page || 'unknown page'}`;
      if (context.recordType) systemPrompt += `\nRecord type: ${context.recordType}`;
      if (context.recordId) systemPrompt += `\nRecord ID: ${context.recordId}`;
    }
    const userName = req.session?.user?.display_name || req.session?.user?.username || 'Operator';
    systemPrompt += `\n\nThe current user is: ${userName} (role: ${req.session?.user?.role || 'unknown'})`;

    // Stream response via SSE
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Chat-Session-Id', sessionKey);
    res.flushHeaders();

    const client = new Anthropic({ apiKey });
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-6',
      max_tokens: 2048,
      system: systemPrompt,
      messages: session.messages,
    });

    let fullResponse = '';

    stream.on('text', (text) => {
      fullResponse += text;
      res.write(`data: ${JSON.stringify({ type: 'text', text })}\n\n`);
    });

    stream.on('error', (err) => {
      console.error('Jarvis chat stream error:', err.message);
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    });

    stream.on('end', () => {
      // Save assistant response to in-memory history
      if (fullResponse) {
        session.messages.push({ role: 'assistant', content: fullResponse });
      }
      // Persist assistant message to DB
      if (userId && fullResponse) {
        db.run(
          'INSERT INTO chat_messages (user_id, session_id, role, content, context) VALUES (?, ?, ?, ?, ?)',
          [userId, sessionKey, 'assistant', fullResponse, JSON.stringify(context || {})]
        ).catch(dbErr => console.error('Failed to persist assistant chat message:', dbErr.message));
      }
      res.write(`data: ${JSON.stringify({ type: 'done', chatSessionId: sessionKey })}\n\n`);
      res.end();
    });

    // Handle client disconnect
    req.on('close', () => {
      stream.abort();
    });
  } catch (err) {
    console.error('Jarvis chat error:', err.message);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Chat failed: ' + err.message });
    } else {
      res.write(`data: ${JSON.stringify({ type: 'error', error: err.message })}\n\n`);
      res.end();
    }
  }
});

// Get chat history for current user (most recent session)
router.get('/ai/chat/history', async (req, res) => {
  try {
    const userId = req.session?.user?.id;
    if (!userId) return res.json({ messages: [], chatSessionId: null });

    // Find the most recent session for this user
    const latest = await db.get(
      'SELECT session_id FROM chat_messages WHERE user_id = ? ORDER BY created_at DESC LIMIT 1',
      [userId]
    );
    if (!latest) return res.json({ messages: [], chatSessionId: null });

    // Load all messages from that session (max 100)
    const rows = await db.all(
      'SELECT role, content, created_at FROM chat_messages WHERE user_id = ? AND session_id = ? ORDER BY created_at ASC LIMIT 100',
      [userId, latest.session_id]
    );

    // Re-hydrate the in-memory session so streaming continues to work
    const sessionMessages = rows.map(r => ({ role: r.role, content: r.content }));
    chatSessions.set(latest.session_id, { messages: sessionMessages, lastAccess: Date.now() });

    res.json({
      messages: rows.map(r => ({ role: r.role, content: r.content, created_at: r.created_at })),
      chatSessionId: latest.session_id,
    });
  } catch (err) {
    console.error('Chat history error:', err.message);
    res.status(500).json({ error: 'Failed to load chat history' });
  }
});

// Clear chat history
router.delete('/ai/chat', async (req, res) => {
  const { chatSessionId } = req.body || {};
  if (chatSessionId) {
    chatSessions.delete(chatSessionId);
    // Clear from DB too
    const userId = req.session?.user?.id;
    if (userId) {
      try {
        await db.run('DELETE FROM chat_messages WHERE user_id = ? AND session_id = ?', [userId, chatSessionId]);
      } catch (dbErr) {
        console.error('Failed to clear chat history from DB:', dbErr.message);
      }
    }
  }
  res.json({ ok: true });
});

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
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return res.status(503).json({ error: 'AI assistant not configured. ANTHROPIC_API_KEY is required.' });
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

    const client = new Anthropic({ apiKey });
    const message = await client.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: userMessage }],
    });

    const suggestion = message.content[0]?.text || '';
    res.json({ suggestion });
  } catch (err) {
    console.error('AI suggest error:', err.message);
    res.status(500).json({ error: 'AI suggestion failed: ' + err.message });
  }
});

export default router;
