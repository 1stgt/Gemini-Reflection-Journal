import React, { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  CalendarRange,
  Sparkles,
  Trophy,
  Target,
  BookmarkCheck,
  X,
  Loader2,
  AlertCircle,
  Clock,
  Compass,
  Trash2,
  CheckCircle2,
  ChevronRight,
  PlusCircle,
  FileText
} from 'lucide-react';
import { AuthUser, JournalInteraction, WeeklyRetrospective } from '../types';
import {
  getUserEntriesLast7Days,
  saveRetrospective,
  subscribeUserRetrospectives,
  deleteRetrospective
} from '../lib/firestoreService';
import { getMoodBadgeStyle, formatSentiment } from '../lib/moodStyles';

interface WeeklyRetrospectiveModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser;
  onNewReflectionRequest: () => void;
}

export const WeeklyRetrospectiveModal: React.FC<WeeklyRetrospectiveModalProps> = ({
  isOpen,
  onClose,
  user,
  onNewReflectionRequest,
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'saved'>('generate');
  const [loadingEntries, setLoadingEntries] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Weekly retrospective current output
  const [currentRetro, setCurrentRetro] = useState<WeeklyRetrospective | null>(null);
  const [recentEntriesCount, setRecentEntriesCount] = useState<number | null>(null);
  
  // Saved milestones from Firestore
  const [savedMilestones, setSavedMilestones] = useState<WeeklyRetrospective[]>([]);
  const [selectedMilestone, setSelectedMilestone] = useState<WeeklyRetrospective | null>(null);

  // Subscribe to user's saved milestones
  useEffect(() => {
    if (!user?.uid || !isOpen) return;

    const unsubscribe = subscribeUserRetrospectives(
      user.uid,
      (items) => {
        setSavedMilestones(items);
      },
      (err) => {
        console.error('Error fetching milestones:', err);
      }
    );

    return () => unsubscribe();
  }, [user?.uid, isOpen]);

  // When modal opens in generate tab, trigger fresh check of past 7 days entries
  useEffect(() => {
    if (isOpen && activeTab === 'generate' && !currentRetro && !isGenerating) {
      handleCheckAndGenerate(false);
    }
  }, [isOpen]);

  const handleCheckAndGenerate = async (forceRegenerate = true) => {
    if (!user?.uid) return;

    setLoadingEntries(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const entries = await getUserEntriesLast7Days(user.uid);
      setRecentEntriesCount(entries.length);

      // Check minimum 2 entries requirement
      if (entries.length < 2) {
        setLoadingEntries(false);
        return;
      }

      // If we don't have a current generated retro or user requested regeneration
      if (!currentRetro || forceRegenerate) {
        setLoadingEntries(false);
        setIsGenerating(true);

        const response = await fetch('/api/gemini/weekly-retrospective', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ entries }),
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(data.error || 'Failed to synthesize weekly retrospective from Gemini.');
        }

        const now = Date.now();
        const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

        const synthesized: WeeklyRetrospective = {
          id: '',
          userId: user.uid,
          userEmail: user.email,
          title: data.retrospective.title,
          startDate: sevenDaysAgo,
          endDate: now,
          entryCount: entries.length,
          recurringThemes: data.retrospective.recurringThemes,
          personalWins: data.retrospective.personalWins,
          recommendedFocus: data.retrospective.recommendedFocus,
          narrativeSummary: data.retrospective.narrativeSummary,
          dominantMood: data.retrospective.dominantMood,
          averageSentiment: data.retrospective.averageSentiment,
          modelUsed: data.modelUsed,
          createdAt: now,
        };

        setCurrentRetro(synthesized);
      }
    } catch (err: any) {
      console.error('Weekly Retrospective Generation Error:', err);
      setErrorMessage(err.message || 'An unexpected error occurred while synthesizing your weekly retrospective.');
    } finally {
      setLoadingEntries(false);
      setIsGenerating(false);
    }
  };

  const handleSaveAsMilestone = async () => {
    if (!user?.uid || !currentRetro) return;

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const { id, ...retroPayload } = currentRetro;
      const newId = await saveRetrospective(user.uid, retroPayload);
      setCurrentRetro({
        ...currentRetro,
        id: newId,
      });
      setSaveSuccess(true);
    } catch (err: any) {
      console.error('Failed to save retrospective:', err);
      setErrorMessage('Failed to persist milestone to Firestore. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteSavedMilestone = async (retroId: string) => {
    if (!user?.uid || !retroId) return;
    if (!window.confirm('Delete this saved weekly milestone permanently?')) return;

    try {
      await deleteRetrospective(user.uid, retroId);
      if (selectedMilestone?.id === retroId) {
        setSelectedMilestone(null);
      }
    } catch (err: any) {
      console.error('Failed to delete milestone:', err);
      alert('Could not delete milestone: ' + err.message);
    }
  };

  if (!isOpen) return null;

  const displayRetro = selectedMilestone || currentRetro;

  return (
    <div
      id="modal-weekly-retrospective"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm overflow-y-auto"
    >
      <div className="bg-[#111318] border border-[#1F2937] rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh] my-auto">
        {/* Modal Header */}
        <div className="px-5 py-4 sm:px-6 bg-[#161922] border-b border-[#1F2937] flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400">
              <CalendarRange className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Weekly Retrospective Synthesis</span>
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  7-Day Trends
                </span>
              </h3>
              <p className="text-xs text-gray-400">
                Cognitive pattern analysis and milestone synthesis powered by Gemini 3.6 Flash
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Tab navigation */}
            <div className="hidden sm:flex items-center bg-[#0F1115] p-1 rounded-lg border border-[#1F2937] text-xs">
              <button
                id="btn-tab-generate-retro"
                onClick={() => {
                  setSelectedMilestone(null);
                  setActiveTab('generate');
                }}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  activeTab === 'generate' && !selectedMilestone
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                Weekly Synthesis
              </button>
              <button
                id="btn-tab-saved-milestones"
                onClick={() => setActiveTab('saved')}
                className={`px-3 py-1 rounded-md font-medium transition-colors flex items-center gap-1.5 ${
                  activeTab === 'saved' || selectedMilestone
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-gray-400 hover:text-white'
                }`}
              >
                <span>Saved Milestones</span>
                {savedMilestones.length > 0 && (
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-indigo-900 text-indigo-200">
                    {savedMilestones.length}
                  </span>
                )}
              </button>
            </div>

            <button
              id="btn-close-retro-modal"
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#1F2937] transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile Tab switch */}
        <div className="flex sm:hidden border-b border-[#1F2937] bg-[#161922] px-4 py-2 gap-2 text-xs">
          <button
            onClick={() => {
              setSelectedMilestone(null);
              setActiveTab('generate');
            }}
            className={`flex-1 py-1.5 rounded-lg font-medium text-center ${
              activeTab === 'generate' && !selectedMilestone
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 bg-[#0F1115]'
            }`}
          >
            Weekly Synthesis
          </button>
          <button
            onClick={() => setActiveTab('saved')}
            className={`flex-1 py-1.5 rounded-lg font-medium text-center flex items-center justify-center gap-1 ${
              activeTab === 'saved' || selectedMilestone
                ? 'bg-indigo-600 text-white'
                : 'text-gray-400 bg-[#0F1115]'
            }`}
          >
            <span>Saved Milestones</span>
            {savedMilestones.length > 0 && (
              <span className="px-1.5 rounded-full text-[10px] bg-indigo-900 text-indigo-200">
                {savedMilestones.length}
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-red-950/40 border border-red-500/40 text-red-200 text-sm flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold">Synthesis Error</p>
                <p className="text-xs text-red-300">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* VIEW: Saved Milestones List */}
          {activeTab === 'saved' && !selectedMilestone && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-gray-200 uppercase tracking-wider flex items-center gap-2">
                  <BookmarkCheck className="w-4 h-4 text-indigo-400" />
                  <span>Your Saved Weekly Milestones</span>
                </h4>
                <button
                  onClick={() => {
                    setActiveTab('generate');
                    handleCheckAndGenerate(true);
                  }}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                >
                  <PlusCircle className="w-3.5 h-3.5" />
                  <span>Synthesize New Milestone</span>
                </button>
              </div>

              {savedMilestones.length === 0 ? (
                <div className="text-center py-12 px-4 rounded-xl border border-dashed border-[#1F2937] bg-[#141720]/60 space-y-3">
                  <div className="w-12 h-12 rounded-full bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto">
                    <BookmarkCheck className="w-6 h-6" />
                  </div>
                  <h5 className="text-sm font-semibold text-gray-300">No Saved Milestones Yet</h5>
                  <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
                    When you synthesize your 7-day retrospective, click "Save as Weekly Milestone" to bookmark and track your continuous personal growth.
                  </p>
                  <button
                    onClick={() => {
                      setActiveTab('generate');
                      handleCheckAndGenerate(false);
                    }}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-xs font-semibold text-white transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Synthesize Past 7 Days</span>
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {savedMilestones.map((milestone) => (
                    <div
                      key={milestone.id}
                      className="group bg-[#161922] border border-[#1F2937] hover:border-indigo-500/40 rounded-xl p-4 transition-all duration-200 flex flex-col justify-between space-y-3 cursor-pointer"
                      onClick={() => setSelectedMilestone(milestone)}
                    >
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] text-gray-400">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3 h-3 text-indigo-400" />
                            {new Date(milestone.createdAt).toLocaleDateString(undefined, {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </span>
                          <span className="px-2 py-0.5 rounded-full bg-[#1F2937] text-gray-300 text-[10px]">
                            {milestone.entryCount} entries
                          </span>
                        </div>

                        <h5 className="text-sm font-bold text-gray-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
                          {milestone.title}
                        </h5>

                        <p className="text-xs text-gray-400 line-clamp-2 leading-relaxed">
                          {milestone.narrativeSummary}
                        </p>
                      </div>

                      <div className="pt-2 border-t border-[#1F2937] flex items-center justify-between">
                        {milestone.dominantMood ? (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-indigo-950/60 text-indigo-300 border border-indigo-500/30">
                            {milestone.dominantMood}
                          </span>
                        ) : (
                          <span />
                        )}

                        <div className="flex items-center gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSavedMilestone(milestone.id);
                            }}
                            className="p-1 text-gray-500 hover:text-red-400 rounded transition-colors"
                            title="Delete Milestone"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs text-indigo-400 font-medium flex items-center gap-0.5">
                            <span>View</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* VIEW: Insufficient Entries Warning (< 2 entries in 7 days) */}
          {activeTab === 'generate' && recentEntriesCount !== null && recentEntriesCount < 2 && !isGenerating && !loadingEntries && (
            <div
              id="notice-insufficient-entries"
              className="text-center py-10 px-4 sm:px-8 rounded-2xl border border-amber-500/30 bg-amber-950/20 max-w-xl mx-auto space-y-4"
            >
              <div className="w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
                <AlertCircle className="w-7 h-7" />
              </div>
              <div className="space-y-2">
                <h4 className="text-base sm:text-lg font-bold text-amber-200">
                  More Reflections Needed for Synthesis
                </h4>
                <p className="text-sm text-gray-300 leading-relaxed">
                  At least <span className="font-semibold text-amber-300">2 journal entries</span> in the past 7 days are required to synthesize meaningful recurring themes and cognitive patterns.
                </p>
                <div className="inline-block px-3 py-1 rounded-full bg-[#161922] border border-[#1F2937] text-xs text-gray-400">
                  Current 7-day entries: <span className="font-bold text-white">{recentEntriesCount}</span> / 2 required
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
                <button
                  id="btn-write-reflection-from-modal"
                  onClick={() => {
                    onClose();
                    onNewReflectionRequest();
                  }}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 transition-colors"
                >
                  <PlusCircle className="w-4 h-4" />
                  <span>Write a Reflection Now</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl bg-[#1F2937] hover:bg-[#374151] text-gray-300 font-medium text-xs transition-colors"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {/* VIEW: Loading or Generating State */}
          {(loadingEntries || isGenerating) && (
            <div className="text-center py-16 px-4 space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto animate-pulse">
                <Loader2 className="w-7 h-7 animate-spin text-indigo-400" />
              </div>
              <div className="space-y-1.5 max-w-md mx-auto">
                <h4 className="text-base font-bold text-white">
                  {loadingEntries ? 'Retrieving 7-Day Journal Records...' : 'Synthesizing Weekly Retrospective...'}
                </h4>
                <p className="text-xs text-gray-400 leading-relaxed">
                  Gemini 3.6 Flash is analyzing recurring themes, emotional sentiment shifts, and cognitive progress across your reflections.
                </p>
              </div>
            </div>
          )}

          {/* VIEW: Retrospective Content Display */}
          {displayRetro && !loadingEntries && !isGenerating && (
            <div className="space-y-6">
              {/* Back to list button if viewing selected milestone */}
              {selectedMilestone && (
                <button
                  onClick={() => setSelectedMilestone(null)}
                  className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-medium"
                >
                  <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                  <span>Back to Saved Milestones</span>
                </button>
              )}

              {/* Title & Metadata Header Card */}
              <div className="bg-[#161922] border border-[#1F2937] rounded-xl p-5 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2937] pb-3">
                  <div className="flex items-center gap-2 text-xs font-semibold text-gray-400">
                    <Clock className="w-3.5 h-3.5 text-indigo-400" />
                    <span>
                      Synthesized from {displayRetro.entryCount} reflections (Past 7 Days)
                    </span>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    {displayRetro.dominantMood && (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-950/60 text-indigo-300 border border-indigo-500/40">
                        Dominant Mood: {displayRetro.dominantMood}
                      </span>
                    )}
                    {typeof displayRetro.averageSentiment === 'number' && (() => {
                      const sent = formatSentiment(displayRetro.averageSentiment);
                      return (
                        <span className="px-2 py-0.5 rounded-md text-xs font-medium bg-[#1F2937] text-gray-300 border border-[#374151]">
                          Avg Sentiment: <span className={`font-semibold ${sent.colorClass}`}>{sent.formattedScore}</span> ({sent.label})
                        </span>
                      );
                    })()}
                  </div>
                </div>

                <div>
                  <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight">
                    {displayRetro.title}
                  </h2>
                </div>

                {/* Narrative Summary */}
                <div className="pt-2 text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
                  <ReactMarkdown>{displayRetro.narrativeSummary}</ReactMarkdown>
                </div>
              </div>

              {/* 3 Core Analytical Pillars */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. Key Recurring Themes */}
                <div className="bg-[#161922] border border-[#1F2937] border-t-2 border-t-blue-500 rounded-xl p-4 sm:p-5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-blue-400">
                      <Compass className="w-4 h-4" />
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        Key Recurring Themes
                      </h4>
                    </div>

                    <ul className="space-y-2.5 text-xs text-gray-300">
                      {displayRetro.recurringThemes?.map((theme, i) => (
                        <li key={i} className="flex items-start gap-2 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 shrink-0" />
                          <span>{theme}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 2. Personal Wins & Breakthroughs */}
                <div className="bg-[#161922] border border-[#1F2937] border-t-2 border-t-emerald-500 rounded-xl p-4 sm:p-5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-emerald-400">
                      <Trophy className="w-4 h-4" />
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        Personal Wins & Progress
                      </h4>
                    </div>

                    <ul className="space-y-2.5 text-xs text-gray-300">
                      {displayRetro.personalWins?.map((win, i) => (
                        <li key={i} className="flex items-start gap-2 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 mt-1.5 shrink-0" />
                          <span>{win}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* 3. Recommended Focus */}
                <div className="bg-[#161922] border border-[#1F2937] border-t-2 border-t-indigo-500 rounded-xl p-4 sm:p-5 space-y-3 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-indigo-400">
                      <Target className="w-4 h-4" />
                      <h4 className="text-xs font-bold uppercase tracking-wider">
                        Focus for Coming Week
                      </h4>
                    </div>

                    <ul className="space-y-2.5 text-xs text-gray-300">
                      {displayRetro.recommendedFocus?.map((focus, i) => (
                        <li key={i} className="flex items-start gap-2 leading-relaxed">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 mt-1.5 shrink-0" />
                          <span>{focus}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>

              {/* Action Footer */}
              <div className="pt-4 border-t border-[#1F2937] flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-xs text-gray-400">
                  {displayRetro.modelUsed && (
                    <span className="px-2 py-0.5 rounded bg-[#1F2937] text-[10px] text-gray-400 border border-[#374151]">
                      Model: {displayRetro.modelUsed}
                    </span>
                  )}
                  {saveSuccess && (
                    <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Saved to Weekly Milestones</span>
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {!selectedMilestone && !saveSuccess && (
                    <button
                      id="btn-save-weekly-milestone"
                      onClick={handleSaveAsMilestone}
                      disabled={isSaving}
                      className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-colors"
                    >
                      {isSaving ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Saving to Firestore...</span>
                        </>
                      ) : (
                        <>
                          <BookmarkCheck className="w-3.5 h-3.5" />
                          <span>Save as Weekly Milestone</span>
                        </>
                      )}
                    </button>
                  )}

                  {!selectedMilestone && (
                    <button
                      id="btn-regenerate-retro"
                      onClick={() => handleCheckAndGenerate(true)}
                      disabled={isGenerating}
                      className="px-3.5 py-2 rounded-xl bg-[#1F2937] hover:bg-[#374151] text-gray-300 text-xs font-medium transition-colors flex items-center gap-1"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Regenerate</span>
                    </button>
                  )}

                  <button
                    onClick={onClose}
                    className="px-3.5 py-2 rounded-xl bg-[#1F2937] hover:bg-[#374151] text-gray-300 text-xs font-medium transition-colors"
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
