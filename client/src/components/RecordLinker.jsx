import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useFetch, apiPost, apiDelete } from '../hooks/useApi';
import {
  Link2, Plus, X, Search, Trash2, AlertTriangle, FileText,
  FlaskConical, MessageSquare, GitBranch, Repeat, Info, Lightbulb, ExternalLink
} from 'lucide-react';
import Modal from './Modal';

const TYPE_CONFIG = {
  capa: { label: 'CAPA', color: 'bg-indigo-100 text-indigo-700 border-indigo-200', route: '/capas' },
  deviation: { label: 'Deviation', color: 'bg-red-100 text-red-700 border-red-200', route: '/deviations' },
  complaint: { label: 'Complaint', color: 'bg-orange-100 text-orange-700 border-orange-200', route: '/complaints' },
  ccr: { label: 'CCR', color: 'bg-purple-100 text-purple-700 border-purple-200', route: '/ccrs' },
  change_request: { label: 'Change Request', color: 'bg-cyan-100 text-cyan-700 border-cyan-200', route: '/change-requests' },
  batch_test: { label: 'Batch Test', color: 'bg-green-100 text-green-700 border-green-200', route: '/batch-tests' },
  sop: { label: 'SOP', color: 'bg-blue-100 text-blue-700 border-blue-200', route: '/sops' },
};

const SUGGESTION_ICONS = {
  'alert-triangle': AlertTriangle,
  'search': Search,
  'repeat': Repeat,
  'flask-conical': FlaskConical,
  'git-branch': GitBranch,
  'file-text': FileText,
  'mail': MessageSquare,
  'message-square': MessageSquare,
};

export default function RecordLinker({ sourceType, sourceId }) {
  const navigate = useNavigate();
  const { data: links, refetch } = useFetch(`/api/links/${sourceType}/${sourceId}`);
  const { data: suggestions } = useFetch(`/api/links/suggestions/${sourceType}/${sourceId}`);

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [searchType, setSearchType] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [linkReason, setLinkReason] = useState('');
  const [linking, setLinking] = useState(false);

  const allLinks = links || [];
  const allSuggestions = suggestions || [];

  const handleSearch = async () => {
    if (!searchType) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/links/search?type=${searchType}&q=${encodeURIComponent(searchQuery)}`, { credentials: 'include' });
      const data = await res.json();
      // Filter out already-linked records
      const linkedIds = new Set(allLinks.map(l => `${l.linked_type}:${l.linked_id}`));
      // Also filter out self
      linkedIds.add(`${sourceType}:${sourceId}`);
      setSearchResults((data || []).filter(r => !linkedIds.has(`${r.type}:${r.id}`)));
    } catch {
      setSearchResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleCreateLink = async (targetType, targetId) => {
    setLinking(true);
    try {
      await apiPost('/api/links', {
        source_type: sourceType,
        source_id: parseInt(sourceId),
        target_type: targetType,
        target_id: targetId,
        link_reason: linkReason || null,
      });
      refetch();
      // Remove from search results
      setSearchResults(prev => prev.filter(r => !(r.type === targetType && r.id === targetId)));
      setLinkReason('');
    } catch (err) {
      alert('Failed to create link: ' + err.message);
    } finally {
      setLinking(false);
    }
  };

  const handleDeleteLink = async (linkId) => {
    if (!confirm('Remove this link?')) return;
    try {
      await apiDelete(`/api/links/${linkId}`);
      refetch();
    } catch (err) {
      alert('Failed to remove link: ' + err.message);
    }
  };

  const navigateToRecord = (type, id) => {
    const config = TYPE_CONFIG[type];
    if (config) navigate(`${config.route}/${id}`);
  };

  return (
    <div className="space-y-6">
      {/* Existing Links */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-gray-600" />
            <h2 className="text-lg font-semibold text-gray-900">Linked Records</h2>
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{allLinks.length}</span>
          </div>
          <button
            onClick={() => setShowLinkModal(true)}
            className="flex items-center gap-2 px-3 py-1.5 bg-navy-800 text-white rounded-lg text-sm hover:bg-navy-700"
          >
            <Plus className="w-4 h-4" /> Link Record
          </button>
        </div>

        {allLinks.length === 0 ? (
          <div className="text-center py-6">
            <Link2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-500">No records linked yet</p>
            <p className="text-xs text-gray-400 mt-1">Link related CAPAs, Deviations, Complaints, SOPs, and more</p>
          </div>
        ) : (
          <div className="space-y-2">
            {allLinks.map(link => {
              const config = TYPE_CONFIG[link.linked_type] || { label: link.linked_type, color: 'bg-gray-100 text-gray-700 border-gray-200' };
              return (
                <div key={link.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100 hover:bg-gray-100 transition-colors group">
                  <div
                    className="flex items-center gap-3 cursor-pointer flex-1 min-w-0"
                    onClick={() => navigateToRecord(link.linked_type, link.linked_id)}
                  >
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold border ${config.color}`}>
                      {config.label}
                    </span>
                    <div className="min-w-0">
                      <span className="text-sm font-medium text-navy-700 hover:underline">
                        {link.linked_record_number}
                      </span>
                      {link.linked_record_title && (
                        <span className="text-sm text-gray-500 ml-2 truncate">{link.linked_record_title}</span>
                      )}
                    </div>
                    <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-gray-500 flex-shrink-0" />
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {link.link_reason && (
                      <span className="text-[10px] text-gray-400 italic max-w-32 truncate" title={link.link_reason}>
                        {link.link_reason}
                      </span>
                    )}
                    <button
                      onClick={() => handleDeleteLink(link.id)}
                      className="p-1 text-gray-300 hover:text-red-500 transition-colors"
                      title="Remove link"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* GMP Suggestions */}
      {allSuggestions.length > 0 && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lightbulb className="w-5 h-5 text-amber-600" />
            <h3 className="text-sm font-semibold text-amber-800 uppercase tracking-wide">GMP Link Suggestions</h3>
          </div>
          <div className="space-y-3">
            {allSuggestions.map((suggestion, i) => {
              const Icon = SUGGESTION_ICONS[suggestion.icon] || Info;
              const severityColor = suggestion.severity === 'high' ? 'border-red-300 bg-red-50' :
                suggestion.severity === 'medium' ? 'border-amber-300 bg-amber-50' : 'border-gray-200 bg-white';
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${severityColor}`}>
                  <Icon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${
                    suggestion.severity === 'high' ? 'text-red-500' :
                    suggestion.severity === 'medium' ? 'text-amber-500' : 'text-gray-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-700">{suggestion.message}</p>
                    {suggestion.suggestion_type === 'link' && suggestion.target_id && (
                      <button
                        onClick={() => handleCreateLink(suggestion.target_type, suggestion.target_id)}
                        disabled={linking}
                        className="mt-2 px-3 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 disabled:opacity-50"
                      >
                        Link {suggestion.target_number || TYPE_CONFIG[suggestion.target_type]?.label}
                      </button>
                    )}
                    {(suggestion.suggestion_type === 'search' || suggestion.suggestion_type === 'create') && (
                      <button
                        onClick={() => {
                          setSearchType(suggestion.target_type);
                          setSearchQuery('');
                          setSearchResults([]);
                          setShowLinkModal(true);
                        }}
                        className="mt-2 px-3 py-1 bg-navy-100 text-navy-700 rounded text-xs font-medium hover:bg-navy-200"
                      >
                        Search {TYPE_CONFIG[suggestion.target_type]?.label || suggestion.target_type}s
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Link Modal */}
      <Modal isOpen={showLinkModal} onClose={() => { setShowLinkModal(false); setSearchResults([]); setSearchQuery(''); }} title="Link Record">
        <div className="space-y-4">
          {/* Type selector */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Record Type</label>
            <select
              value={searchType}
              onChange={e => { setSearchType(e.target.value); setSearchResults([]); setSearchQuery(''); }}
              className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2"
            >
              <option value="">Select type...</option>
              {Object.entries(TYPE_CONFIG)
                .filter(([key]) => key !== sourceType)
                .map(([key, config]) => (
                  <option key={key} value={key}>{config.label}</option>
                ))
              }
            </select>
          </div>

          {/* Search */}
          {searchType && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSearch()}
                  placeholder={`Search ${TYPE_CONFIG[searchType]?.label || searchType}s...`}
                  className="flex-1 border border-gray-300 rounded-lg text-sm px-3 py-2"
                />
                <button
                  onClick={handleSearch}
                  disabled={searching}
                  className="flex items-center gap-1.5 px-3 py-2 bg-navy-800 text-white rounded-lg text-sm hover:bg-navy-700 disabled:opacity-50"
                >
                  <Search className="w-4 h-4" />
                  {searching ? 'Searching...' : 'Search'}
                </button>
              </div>
            </div>
          )}

          {/* Results */}
          {searchResults.length > 0 && (
            <div>
              <p className="text-xs text-gray-500 mb-2">{searchResults.length} result{searchResults.length !== 1 ? 's' : ''}</p>
              <div className="max-h-60 overflow-y-auto border border-gray-200 rounded-lg divide-y">
                {searchResults.map(r => (
                  <div key={r.id} className="flex items-center justify-between px-3 py-2 hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <span className="text-sm font-medium text-gray-900">{r.record_number}</span>
                      <span className="text-sm text-gray-500 ml-2 truncate">{r.title}</span>
                      {r.status && (
                        <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{r.status}</span>
                      )}
                    </div>
                    <button
                      onClick={() => handleCreateLink(r.type, r.id)}
                      disabled={linking}
                      className="ml-2 px-2 py-1 bg-green-100 text-green-700 rounded text-xs font-medium hover:bg-green-200 disabled:opacity-50 flex-shrink-0"
                    >
                      Link
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Optional reason */}
          {searchType && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Reason for link <span className="font-normal text-gray-400">(optional)</span>
              </label>
              <input
                type="text"
                value={linkReason}
                onChange={e => setLinkReason(e.target.value)}
                placeholder="e.g., Root cause investigation, Same lot number..."
                className="w-full border border-gray-300 rounded-lg text-sm px-3 py-2"
              />
            </div>
          )}

          <div className="flex justify-end">
            <button
              onClick={() => { setShowLinkModal(false); setSearchResults([]); setSearchQuery(''); }}
              className="px-4 py-2 border border-gray-300 rounded-lg text-sm"
            >
              Close
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
