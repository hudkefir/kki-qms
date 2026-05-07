import React, { useState, useCallback } from 'react';
import { BookOpen, Plus, Search, Edit3, Trash2, X, Save, Tag } from 'lucide-react';
import { useFetch, apiPost, apiPut, apiDelete } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';

export default function Journal() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '', tags: '' });
  const [saving, setSaving] = useState(false);

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
      hour: 'numeric', minute: '2-digit', hour12: true,
    });
  };

  const parseTags = (tagStr) => {
    if (!tagStr) return [];
    return tagStr.split(',').map(t => t.trim()).filter(Boolean);
  };

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-navy-600 rounded-lg flex items-center justify-center">
            <BookOpen className="w-5 h-5 text-navy-200" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">Journal</h1>
            <p className="text-sm text-gray-400">Personal notes, observations, and audit trail</p>
          </div>
        </div>
        <button
          onClick={openNewForm}
          className="flex items-center gap-2 px-4 py-2 bg-navy-600 hover:bg-navy-500 text-white rounded-lg text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Entry
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-6">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
        <input
          type="text"
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          placeholder="Search entries by title, content, or tags..."
          className="w-full pl-10 pr-4 py-2.5 bg-navy-800 border border-navy-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-navy-400 focus:border-transparent"
        />
      </div>

      {/* Inline Form */}
      {showForm && (
        <div className="mb-6 bg-navy-800 border border-navy-600 rounded-xl p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-white">
              {editingId ? 'Edit Entry' : 'New Journal Entry'}
            </h2>
            <button onClick={closeForm} className="p-1.5 text-gray-400 hover:text-white hover:bg-navy-700 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                placeholder="Entry title"
                className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-navy-400"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(f => ({ ...f, content: e.target.value }))}
                placeholder="Write your journal entry..."
                rows={6}
                className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-navy-400 resize-y"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">Tags (comma-separated)</label>
              <input
                type="text"
                value={formData.tags}
                onChange={(e) => setFormData(f => ({ ...f, tags: e.target.value }))}
                placeholder="e.g. production, observation, follow-up"
                className="w-full px-3 py-2 bg-navy-900 border border-navy-600 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-navy-400"
              />
            </div>
            <div className="flex items-center gap-3 pt-2">
              <button
                onClick={handleSave}
                disabled={saving || (!formData.title.trim() && !formData.content.trim())}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Save className="w-4 h-4" />
                {saving ? 'Saving...' : editingId ? 'Update' : 'Save'}
              </button>
              <button
                onClick={closeForm}
                className="px-4 py-2 text-gray-400 hover:text-white text-sm font-medium transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loading / Error */}
      {loading && (
        <div className="flex justify-center py-12">
          <LoadingSpinner />
        </div>
      )}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-4 text-red-300 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Entries List */}
      {!loading && entries && entries.length === 0 && (
        <div className="text-center py-16">
          <BookOpen className="w-12 h-12 text-gray-600 mx-auto mb-3" />
          <p className="text-gray-400 text-sm">
            {debouncedSearch ? 'No entries match your search.' : 'No journal entries yet. Click "New Entry" to get started.'}
          </p>
        </div>
      )}

      {!loading && entries && entries.length > 0 && (
        <div className="space-y-4">
          {entries.map((entry) => (
            <div
              key={entry.id}
              className="bg-navy-800 border border-navy-700 rounded-xl p-5 hover:border-navy-500 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  {entry.title && (
                    <h3 className="text-base font-semibold text-white mb-1 truncate">{entry.title}</h3>
                  )}
                  <p className="text-sm text-gray-300 whitespace-pre-wrap line-clamp-4">{entry.content}</p>

                  <div className="flex items-center gap-4 mt-3">
                    <span className="text-xs text-gray-500">{formatDate(entry.created_at)}</span>
                    {entry.updated_at && entry.updated_at !== entry.created_at && (
                      <span className="text-xs text-gray-600 italic">edited {formatDate(entry.updated_at)}</span>
                    )}
                    {parseTags(entry.tags).length > 0 && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Tag className="w-3 h-3 text-gray-500" />
                        {parseTags(entry.tags).map((tag, i) => (
                          <span key={i} className="inline-block px-2 py-0.5 bg-navy-700 text-navy-200 rounded text-xs font-medium">
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEditForm(entry)}
                    className="p-1.5 text-gray-500 hover:text-white hover:bg-navy-700 rounded-lg transition-colors"
                    title="Edit"
                  >
                    <Edit3 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(entry.id)}
                    className="p-1.5 text-gray-500 hover:text-red-400 hover:bg-navy-700 rounded-lg transition-colors"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Entry count */}
      {!loading && entries && entries.length > 0 && (
        <div className="mt-4 text-xs text-gray-500 text-center">
          {entries.length} {entries.length === 1 ? 'entry' : 'entries'}
        </div>
      )}
    </div>
  );
}
