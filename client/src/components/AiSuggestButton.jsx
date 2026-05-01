import React, { useState } from 'react';
import { Zap } from 'lucide-react';

export default function AiSuggestButton({ field, context, recordType, onSuggestion }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSuggest = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/ai/suggest', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ field, context, recordType }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `HTTP ${res.status}`);
      }
      const { suggestion } = await res.json();
      if (suggestion) onSuggestion(suggestion);
    } catch (err) {
      setError(err.message);
      setTimeout(() => setError(null), 4000);
    } finally {
      setLoading(false);
    }
  };

  return (
    <span className="inline-flex items-center gap-1">
      <button
        type="button"
        onClick={handleSuggest}
        disabled={loading}
        className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-md bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border border-indigo-200 transition-colors disabled:opacity-50 disabled:cursor-wait"
        title="Ask Jarvis to suggest content"
      >
        <Zap className={`w-3 h-3 ${loading ? 'animate-pulse' : ''}`} />
        {loading ? 'Thinking...' : 'Jarvis'}
      </button>
      {error && <span className="text-xs text-red-500">{error}</span>}
    </span>
  );
}
