import React, { useState, useRef, useEffect, useCallback } from 'react';
import { MessageCircle, X, Send, Trash2, Bot, User } from 'lucide-react';
import { useLocation, useParams } from 'react-router-dom';
import { API_BASE_URL } from '../config';

export default function ChatSidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [chatSessionId, setChatSessionId] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const location = useLocation();
  const params = useParams();

  // Load chat history on mount
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE_URL}/api/ai/chat/history`, { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          if (data.messages?.length) {
            setMessages(data.messages.map(m => ({ role: m.role, content: m.content })));
            setChatSessionId(data.chatSessionId);
          }
        }
      } catch {
        // silently ignore history load failures
      }
    })();
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Focus input when sidebar opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Build context from current page
  const getContext = useCallback(() => {
    const path = location.pathname;
    const segments = path.split('/').filter(Boolean);
    const context = { page: path };

    if (segments.length >= 2) {
      context.recordType = segments[0];
      context.recordId = segments[1];
    } else if (segments.length === 1) {
      context.recordType = segments[0];
    }

    // Scrape current form data (captures unsaved edits)
    const formData = {};
    document.querySelectorAll('input[name], textarea[name], select[name]').forEach(el => {
      const name = el.name;
      if (el.type === 'checkbox') {
        formData[name] = el.checked;
      } else if (el.type === 'radio') {
        if (el.checked) formData[name] = el.value;
      } else if (el.value) {
        formData[name] = el.value;
      }
    });
    document.querySelectorAll('[data-field]').forEach(el => {
      const name = el.getAttribute('data-field');
      const val = el.textContent || el.innerText || el.value || '';
      if (val.trim()) formData[name] = val.trim();
    });

    if (Object.keys(formData).length > 0) {
      context.formData = formData;
    }

    return context;
  }, [location.pathname]);

  const sendMessage = async (e) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || isLoading) return;

    const userMessage = { role: 'user', content: text };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Add a placeholder for the assistant response
    const assistantIdx = messages.length + 1;
    setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

    try {
      const allMessages = [...messages, userMessage];
      const response = await fetch(`${API_BASE_URL}/api/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: allMessages,
          context: getContext(),
          chatSessionId,
        }),
      });

      if (!response.ok) {
        const err = await response.json().catch(() => ({}));
        throw new Error(err.error || `HTTP ${response.status}`);
      }

      // Handle SSE streaming response
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const jsonStr = line.slice(6);
          try {
            const event = JSON.parse(jsonStr);
            if (event.type === 'text') {
              fullText += event.text;
              setMessages(prev => {
                const updated = [...prev];
                updated[updated.length - 1] = { role: 'assistant', content: fullText };
                return updated;
              });
            } else if (event.type === 'done') {
              if (event.chatSessionId) {
                setChatSessionId(event.chatSessionId);
              }
            } else if (event.type === 'error') {
              throw new Error(event.error);
            }
          } catch (parseErr) {
            // Skip malformed JSON chunks
          }
        }
      }

      // Get session ID from response header as fallback
      const headerSessionId = response.headers.get('X-Chat-Session-Id');
      if (headerSessionId && !chatSessionId) {
        setChatSessionId(headerSessionId);
      }
    } catch (err) {
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: `Error: ${err.message}. Please try again.`,
          isError: true,
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = async () => {
    if (chatSessionId) {
      try {
        await fetch(`${API_BASE_URL}/api/ai/chat`, {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ chatSessionId }),
        });
      } catch {
        // ignore cleanup errors
      }
    }
    setMessages([]);
    setChatSessionId(null);
  };

  return (
    <>
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-200 ${
          isOpen
            ? 'bg-navy-700 hover:bg-navy-800 text-white'
            : 'bg-navy-600 hover:bg-navy-700 text-white'
        }`}
        title={isOpen ? 'Close Jarvis' : 'Ask Jarvis'}
      >
        {isOpen ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
      </button>

      {/* Chat Panel */}
      <div
        className={`fixed bottom-24 right-6 z-50 w-96 max-h-[70vh] bg-white rounded-xl shadow-2xl border border-gray-200 flex flex-col transition-all duration-200 origin-bottom-right ${
          isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0 pointer-events-none'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 bg-navy-700 text-white rounded-t-xl">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-navy-200" />
            <span className="font-semibold text-sm">Jarvis</span>
            <span className="text-[10px] text-navy-300 bg-navy-600 px-1.5 py-0.5 rounded">AI Assistant</span>
          </div>
          <button
            onClick={clearChat}
            className="p-1 hover:bg-navy-600 rounded transition-colors"
            title="Clear conversation"
          >
            <Trash2 className="w-4 h-4 text-navy-300 hover:text-white" />
          </button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3 min-h-[200px] max-h-[50vh]">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-8">
              <Bot className="w-8 h-8 mx-auto mb-2 text-navy-300" />
              <p className="font-medium text-gray-500">Ask Jarvis anything</p>
              <p className="text-xs mt-1">GMP compliance, CAPAs, deviations, SOPs...</p>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {msg.role === 'assistant' && (
                <div className="w-6 h-6 rounded-full bg-navy-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Bot className="w-3.5 h-3.5 text-navy-600" />
                </div>
              )}
              <div
                className={`max-w-[80%] rounded-lg px-3 py-2 text-sm whitespace-pre-wrap ${
                  msg.role === 'user'
                    ? 'bg-navy-600 text-white'
                    : msg.isError
                    ? 'bg-red-50 text-red-700 border border-red-200'
                    : 'bg-gray-100 text-gray-800'
                }`}
              >
                {msg.content || (isLoading && i === messages.length - 1 ? (
                  <span className="inline-flex items-center gap-1 text-gray-400">
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </span>
                ) : '')}
              </div>
              {msg.role === 'user' && (
                <div className="w-6 h-6 rounded-full bg-navy-600 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <User className="w-3.5 h-3.5 text-white" />
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <form onSubmit={sendMessage} className="px-3 py-3 border-t border-gray-200">
          <div className="flex items-center gap-2">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask Jarvis..."
              disabled={isLoading}
              className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-navy-500 disabled:opacity-50 disabled:bg-gray-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="p-2 bg-navy-600 text-white rounded-lg hover:bg-navy-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </form>
      </div>
    </>
  );
}
