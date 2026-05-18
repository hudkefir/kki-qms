import React, { useState, useMemo } from 'react';
import { BookOpen, Plus, Search, Edit3, Trash2, X, Save, Tag, Clock, ChevronDown, ChevronUp, Filter, Calendar, FileText } from 'lucide-react';
import { useFetch, apiPost, apiPut, apiDelete } from '../hooks/useApi';
import LoadingSpinner from '../components/LoadingSpinner';

function timeAgo(dateStr) {
  if (!dateStr) return '';
  const now = new Date();
  const d = new Date(dateStr);
  const diff = Math.floor((now - d) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

function formatFull(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-US', {
    weekday: 'short', month: 'short', day: 'numeric', year: 'numeric',
    hour: 'numeric', minute: '2-digit', hour12: true,
  });
}

function parseTags(tagStr) {
  if (!tagStr) return [];
  return tagStr.split(',').map(t => t.trim()).filter(Boolean);
}

const TAG_COLORS = [
  'bg-blue-50 text-blue-700 border-blue-200',
  'bg-emerald-50 text-emerald-700 border-emerald-200',
  'bg-purple-50 text-purple-700 border-purple-200',
  'bg-amber-50 text-amber-700 border-amber-200',
  'bg-rose-50 text-rose-700 border-rose-200',
  'bg-cyan-50 text-cyan-700 border-cyan-200',
  'bg-indigo-50 text-indigo-700 border-indigo-200',
  'bg-orange-50 text-orange-700 border-orange-200',
];

function tagColor(tag) {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = tag.charCodeAt(i) + ((hash << 5) - hash);
  return TAG_COLORS[Math.abs(hash) % TAG_COLORS.length];
}

export default function Journal() {
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ title: '', content: '', tags: '' });
  const [saving, setSaving] = useState(false);
  const [expandedId, setExpandedId] = useState(null);
  const [filterTag, setFilterTag] = useState(null);

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

  // Derived stats
  const allTags = useMemo(() => {
    if (!entries) return [];
    const counts = {};
    entries.forEach(e => parseTags(e.tags).forEach(t => { counts[t] = (counts[t] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]);
  }, [entries]);

  const filteredEntries = useMemo(() => {
    if (!entries) return [];
    if (!filterTag) return entries;
    return entries.filter(e => parseTags(e.tags).includes(filterTag));
  }, [entries, filterTag]);

  const todayCount = useMemo(() => {
    if (!entries) return 0;
    const today = new Date().toDateString();
    return entries.filter(e => new Date(e.created_at).toDateString() === today).length;
  }, [entries]);

  const thisWeekCount = useMemo(() => {
    if (!entries) return 0;
    const weekAgo = Date.now() - 7 * 86400000;
    return entries.filter(e => new Date(e.created_at).getTime() > weekAgo).length;
  }, [entries]);

  const openNewForm = () => {
    setEditingId(null);
    setFormData({ title: '', content: '', tags: '' });
    setShowForm(true);
  };

  const openEditForm = (entry) => {
    setEditingId(entry.id);
    setFormData({ title: entry.title || '', content: entry.content || '', tags: entry.tags || '' });
    setShowForm(true);
    setExpandedId(entry.id);
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

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-indigo-50 rounded-xl">
            <BookOpen className="w-6 h-6 text-indigo-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Journal</h1>
            <p className="text-sm text-gray-500">Notes, observations, and audit trail</p>
          </div>
        </div>
        <button
          onClick={openNewForm}
          className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          New Entry
        </button>
      </div>

      {/* Stats */}
      {!loading && entries && entries.length > 0 && (
        <div className="grid grid-cols-3 gap-4">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-indigo-50 p-2 rounded-lg">
                <FileText className="w-4 h-4 text-indigo-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{entries.length}</p>
                <p className="text-xs text-gray-500">Total Entries</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 p-2 rounded-lg">
                <Calendar className="w-4 h-4 text-emerald-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{todayCount}</p>
                <p className="text-xs text-gray-500">Today</p>
              </div>
            </div>
          </div>
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div className="flex items-center gap-3">
              <div className="bg-purple-50 p-2 rounded-lg">
                <Clock className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{thisWeekCount}</p>
                <p className="text-xs text-gray-500">This Week</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Search + Tag Filters */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search entries..."
            className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-colors"
          />
        </div>
        {allTags.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            <Filter className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
            {filterTag && (
              <button
                onClick={() => setFilterTag(null)}
                className="px-2 py-1 text-xs font-medium text-gray-500 hover:text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
              >
                Clear
              </button>
            )}
            {allTags.slice(0, 8).map(([tag, count]) => (
              <button
                key={tag}
                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-medium border transition-colors ${
                  filterTag === tag
                    ? 'bg-indigo-100 text-indigo-800 border-indigo-300 shadow-sm'
                    : tagColor(tag) + ' hover:opacity-80'
                }`}
              >
                {tag}
                <span className="text-[10px] opacity-60">{count}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* New/Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-md border border-indigo-200 p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-indigo-50 rounded-lg">
                {editingId ? <Edit3 className="w-4 h-4 text-indigo-600" /> : <Plus className="w-4 h-4 text-indigo-600" />}
              </div>
              <h2 className="text-lg font-semibold text-gray-900">
                {editingId ? 'Edit Entry' : 'New Entry'}
              </h2>
            </div>
            <button onClick={closeForm} className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Title</label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData(f => ({ ...f, title: e.target.value }))}
                placeholder="What's this about?"
                autoFocus
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Content</label>
              <textarea
                value={formData.content}
                onChange={(e) => setFormData(f => ({ ...f, content: e.target.value }))}
                placeholder="Write your notes..."
                rows={8}
                className="w-full px-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-colors resize-y leading-relaxed"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">Tags</label>
              <div className="relative">
                <Tag className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData(f => ({ ...f, tags: e.target.value }))}
                  placeholder="production, observation, follow-up"
                  className="w-full pl-9 pr-3.5 py-2.5 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent focus:bg-white transition-colors"
                />
              </div>
            </div>
            <div className="flex items-center gap-3 pt-1">
              <button
                onClick={handleSave}
                disabled={saving || (!formData.title.trim() && !formData.content.trim())}
                className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-sm font-semibold transition-colors shadow-sm"
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

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-16">
          <LoadingSpinner />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!loading && filteredEntries && filteredEntries.length === 0 && (
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 py-16 text-center">
          <div className="bg-gray-100 w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <BookOpen className="w-7 h-7 text-gray-400" />
          </div>
          {debouncedSearch || filterTag ? (
            <>
              <p className="text-gray-600 font-medium mb-1">No matching entries</p>
              <p className="text-sm text-gray-400">Try a different search or clear your filters.</p>
            </>
          ) : (
            <>
              <p className="text-gray-600 font-medium mb-1">No journal entries yet</p>
              <p className="text-sm text-gray-400 mb-4">Start documenting observations, decisions, and notes.</p>
              <button
                onClick={openNewForm}
                className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
              >
                <Plus className="w-4 h-4" />
                Write your first entry
              </button>
            </>
          )}
        </div>
      )}

      {/* Entries List */}
      {!loading && filteredEntries && filteredEntries.length > 0 && (
        <div className="space-y-3">
          {filteredEntries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const tags = parseTags(entry.tags);
            const isLong = entry.content && entry.content.length > 200;

            return (
              <div
                key={entry.id}
                className="bg-white rounded-xl shadow-sm border border-gray-200 hover:border-gray-300 hover:shadow transition-all group"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Title */}
                      {entry.title ? (
                        <h3 className="text-base font-semibold text-gray-900 truncate mb-1">{entry.title}</h3>
                      ) : (
                        <h3 className="text-base font-medium text-gray-400 italic truncate mb-1">Untitled</h3>
                      )}

                      {/* Content */}
                      {entry.content && (
                        <div className="relative">
                          <p className={`text-sm text-gray-600 whitespace-pre-wrap leading-relaxed ${
                            !isExpanded && isLong ? 'line-clamp-3' : ''
                          }`}>
                            {entry.content}
                          </p>
                          {isLong && (
                            <button
                              onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                              className="inline-flex items-center gap-1 mt-1.5 text-xs font-medium text-indigo-600 hover:text-indigo-800 transition-colors"
                            >
                              {isExpanded ? (
                                <><ChevronUp className="w-3 h-3" /> Show less</>
                              ) : (
                                <><ChevronDown className="w-3 h-3" /> Read more</>
                              )}
                            </button>
                          )}
                        </div>
                      )}

                      {/* Meta row */}
                      <div className="flex items-center gap-3 mt-3 flex-wrap">
                        <div className="flex items-center gap-1.5 text-xs text-gray-400" title={formatFull(entry.created_at)}>
                          <Clock className="w-3 h-3" />
                          {timeAgo(entry.created_at)}
                        </div>
                        {entry.updated_at && entry.updated_at !== entry.created_at && (
                          <span className="text-xs text-gray-400 italic" title={formatFull(entry.updated_at)}>
                            edited {timeAgo(entry.updated_at)}
                          </span>
                        )}
                        {tags.length > 0 && (
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {tags.map((tag, i) => (
                              <button
                                key={i}
                                onClick={() => setFilterTag(filterTag === tag ? null : tag)}
                                className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium border transition-colors hover:opacity-80 cursor-pointer ${tagColor(tag)}`}
                              >
                                {tag}
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions — visible on hover */}
                    <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => openEditForm(entry)}
                        className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                        title="Edit"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
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

      {/* Footer count */}
      {!loading && filteredEntries && filteredEntries.length > 0 && (
        <p className="text-center text-xs text-gray-400 pb-4">
          {filterTag
            ? `${filteredEntries.length} of ${entries.length} entries tagged "${filterTag}"`
            : `${entries.length} ${entries.length === 1 ? 'entry' : 'entries'}`
          }
        </p>
      )}
    </div>
  );
}
