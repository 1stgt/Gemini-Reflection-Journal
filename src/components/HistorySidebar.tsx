import React, { useState, useMemo } from 'react';
import {
  Search,
  BookOpen,
  Calendar,
  Trash2,
  ChevronRight,
  ChevronDown,
  MessageSquare,
  Sparkles,
  Plus,
  Filter,
  Brain,
  FileText,
  Lightbulb,
  ListTodo,
  Smile,
  X,
  CalendarRange,
  TrendingUp,
  Award
} from 'lucide-react';
import { JournalInteraction, ReflectionMode } from '../types';
import { getMoodBadgeStyle, formatSentiment } from '../lib/moodStyles';

interface HistorySidebarProps {
  interactions: JournalInteraction[];
  activeInteractionId: string | null;
  onSelectInteraction: (interaction: JournalInteraction) => void;
  onDeleteInteraction: (id: string) => Promise<void>;
  onNewReflection: () => void;
  onOpenWeeklyRetro?: () => void;
  onOpenAnalytics?: () => void;
  onOpenExecutiveReview?: () => void;
  isOpen: boolean;
  onClose: () => void;
}

export const HistorySidebar: React.FC<HistorySidebarProps> = ({
  interactions,
  activeInteractionId,
  onSelectInteraction,
  onDeleteInteraction,
  onNewReflection,
  onOpenWeeklyRetro,
  onOpenAnalytics,
  onOpenExecutiveReview,
  isOpen,
  onClose,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [selectedMoodFilter, setSelectedMoodFilter] = useState<string>('all');
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Dynamically compute list of moods present in saved interactions
  const availableMoods = useMemo(() => {
    const moodCounts: Record<string, number> = {};
    for (const item of interactions) {
      if (item.mood && item.mood.trim()) {
        const m = item.mood.trim();
        // Capitalize for clean display
        const displayMood = m.charAt(0).toUpperCase() + m.slice(1);
        moodCounts[displayMood] = (moodCounts[displayMood] || 0) + 1;
      }
    }
    return Object.entries(moodCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({ name, count }));
  }, [interactions]);

  // Filtered interactions by Search, Mode, and Mood
  const filteredInteractions = useMemo(() => {
    return interactions.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        q === '' ||
        (item.title && item.title.toLowerCase().includes(q)) ||
        (item.initialJournalText && item.initialJournalText.toLowerCase().includes(q)) ||
        (item.mood && item.mood.toLowerCase().includes(q)) ||
        (item.actionable_reframe && item.actionable_reframe.toLowerCase().includes(q));

      const matchesMode =
        selectedFilter === 'all' || item.initialMode === selectedFilter;

      const matchesMood =
        selectedMoodFilter === 'all' ||
        (item.mood && item.mood.toLowerCase() === selectedMoodFilter.toLowerCase());

      return matchesSearch && matchesMode && matchesMood;
    });
  }, [interactions, searchQuery, selectedFilter, selectedMoodFilter]);

  const handleDelete = async (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to permanently delete this reflection?')) {
      try {
        setDeletingId(id);
        await onDeleteInteraction(id);
      } finally {
        setDeletingId(null);
      }
    }
  };

  const getModeIcon = (mode: ReflectionMode) => {
    switch (mode) {
      case 'summary':
        return <FileText className="w-3.5 h-3.5 text-sky-400" />;
      case 'brainstorm':
        return <Lightbulb className="w-3.5 h-3.5 text-amber-400" />;
      case 'action_items':
        return <ListTodo className="w-3.5 h-3.5 text-emerald-400" />;
      case 'reflection':
      default:
        return <Brain className="w-3.5 h-3.5 text-indigo-400" />;
    }
  };

  return (
    <aside
      className={`fixed inset-y-16 left-0 z-20 w-72 sm:w-80 bg-[#111827] border-r border-[#1F2937] text-[#F3F4F6] transform transition-transform duration-200 ease-in-out md:static md:translate-x-0 flex flex-col ${
        isOpen ? 'translate-x-0' : '-translate-x-full'
      }`}
    >
      {/* Sidebar Top: New Reflection CTA & Header */}
      <div className="p-4 border-b border-[#1F2937] space-y-3 shrink-0">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-indigo-400" />
            <h3 className="font-semibold text-sm text-[#F3F4F6]">Reflection History</h3>
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#1F2937] text-gray-400 border border-[#374151]">
              {interactions.length}
            </span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="md:hidden p-1.5 text-gray-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Primary New Reflection Button (matching Design HTML) */}
        <button
          type="button"
          id="btn-sidebar-new-entry"
          onClick={() => {
            onNewReflection();
            onClose();
          }}
          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>New Reflection</span>
        </button>

        {/* Feature 3: Longitudinal Mood & Trend Analytics Button */}
        {onOpenAnalytics && (
          <button
            type="button"
            id="btn-sidebar-analytics"
            onClick={() => {
              onOpenAnalytics();
              onClose();
            }}
            className="w-full py-2 px-3 bg-[#1F2937] hover:bg-[#283548] border border-indigo-500/30 hover:border-indigo-500/50 text-indigo-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <TrendingUp className="w-3.5 h-3.5 text-indigo-400" />
            <span>Mood & Trend Analytics</span>
          </button>
        )}

        {/* Feature 3: Executive Meta-Review Button */}
        {onOpenExecutiveReview && (
          <button
            type="button"
            id="btn-sidebar-executive-review"
            onClick={() => {
              onOpenExecutiveReview();
              onClose();
            }}
            className="w-full py-2 px-3 bg-[#1F2937] hover:bg-[#283548] border border-purple-500/30 hover:border-purple-500/50 text-purple-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <Award className="w-3.5 h-3.5 text-purple-400" />
            <span>Executive Meta-Review</span>
          </button>
        )}

        {/* Feature 2: Weekly Retrospective Button */}
        {onOpenWeeklyRetro && (
          <button
            type="button"
            id="btn-sidebar-weekly-retro"
            onClick={() => {
              onOpenWeeklyRetro();
              onClose();
            }}
            className="w-full py-2 px-3 bg-[#1F2937] hover:bg-[#283548] border border-gray-700 hover:border-gray-600 text-gray-300 hover:text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <CalendarRange className="w-3.5 h-3.5 text-gray-400" />
            <span>Weekly Retrospective</span>
          </button>
        )}

        {/* Search */}
        <div className="relative pt-1">
          <Search className="w-3.5 h-3.5 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2 mt-0.5" />
          <input
            type="text"
            id="input-search-history"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search reflections..."
            className="w-full bg-[#1F2937] border border-[#374151] rounded-lg pl-8 pr-3 py-1.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-indigo-500"
          />
        </div>

        {/* Mode Filter Pills */}
        <div className="flex items-center gap-1 overflow-x-auto pb-1 text-[11px] no-scrollbar">
          {['all', 'reflection', 'summary', 'brainstorm', 'action_items'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setSelectedFilter(f)}
              className={`px-2 py-0.5 rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                selectedFilter === f
                  ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                  : 'bg-[#1F2937] text-gray-400 hover:text-gray-200 border border-[#374151]'
              }`}
            >
              {f === 'all' ? 'All Modes' : f.replace('_', ' ')}
            </button>
          ))}
        </div>

        {/* Filter/Dropdown at top of history list for Mood */}
        <div className="pt-0.5">
          <div className="relative">
            <select
              id="select-filter-mood"
              value={selectedMoodFilter}
              onChange={(e) => setSelectedMoodFilter(e.target.value)}
              className="w-full bg-[#1F2937] border border-[#374151] rounded-lg pl-8 pr-7 py-1.5 text-xs text-gray-200 focus:outline-none focus:border-indigo-500 cursor-pointer appearance-none"
            >
              <option value="all">All Moods ({interactions.length})</option>
              {availableMoods.map((m) => (
                <option key={m.name} value={m.name}>
                  {m.name} ({m.count})
                </option>
              ))}
            </select>
            <Smile className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <ChevronDown className="w-3.5 h-3.5 text-gray-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>
      </div>

      {/* Interactions List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <p className="px-2 text-[10px] uppercase tracking-widest text-gray-500 font-bold mb-1">
          Recent Journals
        </p>

        {filteredInteractions.length === 0 ? (
          <div className="py-12 px-4 text-center space-y-2">
            <BookOpen className="w-8 h-8 text-gray-700 mx-auto" />
            <p className="text-xs font-medium text-gray-400">No reflections found</p>
            <p className="text-[10px] text-gray-500">
              {searchQuery || selectedMoodFilter !== 'all' || selectedFilter !== 'all'
                ? 'Try clearing your filters or search'
                : 'Start your first reflection with Gemini'}
            </p>
          </div>
        ) : (
          filteredInteractions.map((item) => {
            const isActive = activeInteractionId === item.id;
            const turnCount = item.turns ? item.turns.length : 1;
            const formattedDate = item.updatedAt
              ? new Date(item.updatedAt).toLocaleDateString([], { month: 'short', day: 'numeric' })
              : 'Recent';
            const moodStyle = getMoodBadgeStyle(item.mood);

            return (
              <div
                key={item.id}
                onClick={() => {
                  onSelectInteraction(item);
                  onClose();
                }}
                className={`group relative p-3 rounded-lg transition-colors cursor-pointer flex flex-col gap-1.5 ${
                  isActive
                    ? 'bg-[#1F2937] rounded-lg border-l-4 border-indigo-500 shadow-md'
                    : 'hover:bg-[#1F2937] rounded-lg text-gray-300'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {getModeIcon(item.initialMode)}
                    <h4 className="text-sm font-medium text-white truncate">
                      {item.title || 'Untitled Reflection'}
                    </h4>
                  </div>
                  <span className="text-[10px] text-gray-500 shrink-0">{formattedDate}</span>
                </div>

                <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                  {item.initialJournalText}
                </p>

                <div className="flex items-center justify-between pt-1 text-[10px] text-gray-500">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {/* Color-coded mood badge on each saved entry card */}
                    {item.mood && (
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${moodStyle.bg} ${moodStyle.text} ${moodStyle.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${moodStyle.dot}`} />
                        {item.mood}
                      </span>
                    )}

                    {typeof item.sentiment_score === 'number' && (
                      <span className="text-[10px] text-gray-400 px-1.5 py-0.5 rounded bg-[#1F2937] border border-[#374151]">
                        {item.sentiment_score > 0 ? `+${item.sentiment_score.toFixed(2)}` : item.sentiment_score.toFixed(2)}
                      </span>
                    )}

                    <span className="flex items-center gap-1 ml-0.5">
                      <MessageSquare className="w-3 h-3 text-gray-400" />
                      {turnCount} {turnCount === 1 ? 'turn' : 'turns'}
                    </span>
                  </div>

                  <button
                    type="button"
                    title="Delete Entry"
                    disabled={deletingId === item.id}
                    onClick={(e) => handleDelete(e, item.id)}
                    className="opacity-0 group-hover:opacity-100 hover:text-rose-400 p-1 rounded transition-opacity cursor-pointer disabled:opacity-50"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Sidebar Footer info */}
      <div className="mt-auto p-4 border-t border-[#1F2937] bg-[#111827] text-xs text-gray-500 flex items-center justify-between shrink-0">
        <span className="text-[11px]">Firestore Cloud Sync</span>
        <span className="w-2 h-2 rounded-full bg-emerald-400" />
      </div>
    </aside>
  );
};
