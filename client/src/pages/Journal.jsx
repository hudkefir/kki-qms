import React, { useState } from 'react';
import { BookOpen, Plus, Search, Edit3, Trash2, X, Save, Tag, Calendar, Clock, ChevronDown, ChevronUp } from 'lucide-react';
import { useFetch, apiPost, apiPut, apiDelete } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Journal() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '', tags: '' });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  // Debounce search
  const searchTimeout = React.useRef(null);
  const handleSearchChange = (val) => {
    setSearch(val);
    clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDebouncedSearch(val), 300);
  };

  const url = debouncedSearch
    ? `/api/journal?search=${encodeURIComponent(debouncedSearch)}`
    : '/api/journal';
  const { data: entries, loading, error, refetch } = useFetch(url, [debouncedSearch]);

  const openNewForm = () => {
    setEditingId(null);
    setFormData({ title: '', content: '', tags: '' });
    setShowForm(true);
  };

  const openEditForm = (entry) => {
    setEditingId(entry.id);
    setFormData({ title: entry.title || '', content: entry.content || '', tags: entry.tags || '' });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ title: '', content: '', tags: '' });
  };

  const handleSave = async () => {
    if (!formData.title.trim() && !formData.content.trim()) return;
    setSaving(true);
    try {
      if (editingId) {
        await apiPut(`/api/journal/${editingId}`, formData);
      } else {
        await apiPost('/api/journal', formData);
      }
      closeForm();
      refetch();
    } catch (err) {
      alert(err.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this journal entry?')) return;
    try {
      await apiDelete(`/api/journal/${id}`);
      refetch();
    } catch (err) {
      alert(err.message || 'Failed to delete');
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
    });
  };

  const formatTime = (dateStr) => {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleTimeString('en-US', {
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  };

  const parseTags = (tagStr) => {
    if (!tagStr) return [];
    return tagStr.split(',').map(t => t.trim()).filter(Boolean);
  };

  // Compute stats
  const totalEntries = entries?.length || 0;
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thisWeek = entries?.filter(e => new Date(e.created_at) >= weekAgo).length || 0;
  const allTags = new Set();
  entries?.forEach(e => parseTags(e.tags).forEach(t => allTags.add(t)));

  return (
    <div className="max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="bg-navy-50 p-2.5 rounded-lg">
            <BookOpen className="w-5 h-5 text-navy-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Journal</h1>
            <p className="text-sm text-gray-500">Notes, observations, and audit trail</p>
          </div>
        </div>
        <button
          onClick={openNewForm}
          className="flex items-center gap-2 px-4 py-2.5 bg-navy-600 hover:bg-navy-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Entry
        </button>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Total Entries</p>
          <p className="text-2xl font-bold text-navy-600 mt-1">{totalEntries}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">This Week</p>
          <p className="text-2xl font-bold text-green-600 mt-1">{thisWeek}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Tags Used</p>
          <p className="text-2xl font-bold text-purple-600 mt-1">{allTags.size}</p>
        </div>
      </div>

      {/* Search */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 mb-6">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search entries by title, content, or tags..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Inline Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className="bg-blue-50 p-2 rounded-lg">
                <Edit3 className="w-4 h-4 text-blue-600" />
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Edit Entry' : 'New Journal Entry'}
              </h2>
            </div>
            <button onClick={closeForm} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                placeholder="Entry title"
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(f => ({ ...f, content: e.target.value }))}
                placeholder="Write your journal entry..."
                rows={6}
                className="w-full px-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent resize-y"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">Tags</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData(f => ({ ...f, tags: e.target.value }))}
                  placeholder="production, observation, follow-up"
                  className="w-full pl-9 pr-3 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-navy-500 focus:border-transparent"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || (!formData.title.trim() && !formData.content.trim())}
                className="flex items-center gap-2 px-5 py-2.5 bg-navy-600 hover:bg-navy-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : editingId ? 'Update Entry' : 'Save Entry'}
              </button>
              <button
                onClick={closeForm}
                className="px-4 py-2.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading / Error */}
      {loading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      )}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Empty state */}
      {!loading && entries && entries.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12 text-center">
          <div className="bg-gray-100 w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7 text-gray-400" />
          </div>
          <h3 className="text-base font-semibold text-gray-900 mb-1">
            {debouncedSearch ? 'No matching entries' : 'No journal entries yet'}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {debouncedSearch
              ? 'Try a different search term.'
              : 'Start documenting observations, notes, and audit trails.'}
          </p>
          {!debouncedSearch && (
            <button
              onClick={openNewForm}
              className="inline-flex items-center gap-2 px-4 py-2 bg-navy-600 hover:bg-navy-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              Create First Entry
            </button>
          )}
        </div>
      )}

      {/* Entries List */}
      {!loading && entries && entries.length > 0 && (
        <div className="space-y-3">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const tags = parseTags(entry.tags);
            const isLong = entry.content && entry.content.length > 200;

            return (
              <div
                key={entry.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:shadow-md transition-shadow"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title row */}
                      <div className="flex items-center gap-2 mb-1">
                        {entry.title && (
                          <h3 className="text-base font-semibold text-gray-900 truncate">{entry.title}</h3>
                        )}
                      </div>

                      {/* Content */}
                      {entry.content && (
                        <p className={`text-sm text-gray-600 whitespace-pre-wrap ${!isExpanded && isLong ? 'line-clamp-3' : ''}`}>
                          {entry.content}
                        </p>
                      )}

                      {/* Expand toggle */}
                      {isLong && (
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                          className="flex items-center gap-1 mt-2 text-xs font-medium text-navy-600 hover:text-navy-700 transition-colors"
                        >
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                          {isExpanded ? 'Show less' : 'Read more'}
                        </button>
                      )}

                      {/* Meta row */}
                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Calendar className="w-3 h-3" />
                          {formatDate(entry.created_at)}
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-gray-400">
                          <Clock className="w-3 h-3" />
                          {formatTime(entry.created_at)}
                        </div>
                        {entry.updated_at && entry.updated_at !== entry.created_at && (
                          <span className="text-xs text-gray-400 italic">· edited {formatDate(entry.updated_at)}</span>
                        )}
                        {tags.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {tags.map((tag, i) => (
                              <span key={i} className="inline-block px-2 py-0.5 bg-purple-50 text-purple-700 border border-purple-200 rounded-full text-xs font-medium">
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => openEditForm(entry)}
                        className="p-2 text-gray-400 hover:text-navy-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Entry count */}
      {!loading && entries && entries.length > 0 && (
        <div className="mt-6 text-xs text-gray-400 text-center">
          Showing {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </div>
      )}
    </div>
  );
}
