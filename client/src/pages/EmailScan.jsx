import React, { useState } from 'react';
import { Mail, Search, AlertCircle, ExternalLink, Info } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from '../components/LoadingSpinner';

export default function EmailScan() {
  const navigate = useNavigate();
  const [emails, setEmails] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleScan = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/email/scan', { credentials: 'include' });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setEmails(data);
    } catch (err) {
      setError(err.message || 'Failed to scan emails');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-navy-600 rounded-lg flex items-center justify-center">
            <Mail className="w-5 h-5 text-navy-200" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Scan Complaint Emails</h1>
            <p className="text-sm text-gray-400">Detect potential complaints from incoming emails</p>
          </div>
        </div>
        <button
          onClick={handleScan}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 bg-navy-600 hover:bg-navy-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Search className="w-4 h-4" />
          {loading ? 'Scanning...' : 'Scan Emails'}
        </button>
      </div>

      {/* Demo banner */}
      <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-lg p-4 flex items-start gap-3">
        <Info className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-amber-300 font-medium">Email scanning is in demo mode.</p>
          <p className="text-xs text-amber-400/70 mt-0.5">Connect Gmail API for live data. OAuth credentials need to be configured.</p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300 text-sm mb-6">
          {error}
        </div>
      )}

      {/* No results yet */}
      {!loading && !emails && !error && (
        <div className="text-center py-16">
          <Mail className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">Click "Scan Emails" to check for potential complaint emails.</p>
        </div>
      )}

      {/* Results */}
      {!loading && emails && emails.length === 0 && (
        <div className="text-center py-16">
          <Mail className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">No complaint-related emails found.</p>
        </div>
      )}

      {!loading && emails && emails.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm text-gray-400 mb-2">{emails.length} potential complaint email{emails.length !== 1 ? 's' : ''} found</p>
          {emails.map((email) => (
            <div
              key={email.id}
              className="bg-navy-800 border border-navy-700 rounded-xl p-5 hover:border-navy-500 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <AlertCircle className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    <h3 className="text-base font-semibold text-white truncate">{email.subject}</h3>
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-xs text-gray-400">From: <span className="text-gray-300">{email.from}</span></span>
                    <span className="text-xs text-gray-500">{formatDate(email.date)}</span>
                    {email.inbox && (
                      <span className="inline-block px-2 py-0.5 bg-navy-700 text-navy-200 rounded text-xs font-medium">
                        {email.inbox}
                      </span>
                    )}
                  </div>

                  <p className="text-sm text-gray-300 line-clamp-3">{email.body}</p>
                </div>

                <button
                  onClick={() => navigate(`/complaints?from_email=${encodeURIComponent(email.from)}&subject=${encodeURIComponent(email.subject)}`)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 rounded-lg text-xs font-medium transition-colors flex-shrink-0"
                >
                  <ExternalLink className="w-3 h-3" />
                  Create Complaint
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
