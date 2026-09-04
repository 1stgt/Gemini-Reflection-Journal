import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  X,
  CalendarRange,
  TrendingUp,
  AlertTriangle,
  RotateCcw,
  Check,
  Zap,
  Heart,
  Target,
  FileText,
  Clock,
  Trash2,
  ChevronRight,
  ShieldCheck,
  Award
} from 'lucide-react';
import { AuthUser, ExecutiveMetaReview, JournalEntryDocument } from '../types';
import {
  getUserEntriesRange,
  saveExecutiveMetaReview,
  subscribeUserMetaReviews,
  deleteExecutiveMetaReview,
} from '../lib/firestoreService';

interface ExecutiveMetaReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser;
  onNewReflectionRequest?: () => void;
}

export const ExecutiveMetaReviewModal: React.FC<ExecutiveMetaReviewModalProps> = ({
  isOpen,
  onClose,
  user,
  onNewReflectionRequest,
}) => {
  const [activeTab, setActiveTab] = useState<'generate' | 'saved'>('generate');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Generated Meta-Review State
  const [currentReview, setCurrentReview] = useState<ExecutiveMetaReview | null>(null);
  const [modelUsed, setModelUsed] = useState<string>('gemini-3.6-flash');

  // Past Saved Reviews
  const [savedReviews, setSavedReviews] = useState<ExecutiveMetaReview[]>([]);
  const [selectedSavedReview, setSelectedSavedReview] = useState<ExecutiveMetaReview | null>(null);

  // Real-time subscription to user's saved meta-reviews
  useEffect(() => {
    if (!isOpen || !user.uid) return;

    const unsubscribe = subscribeUserMetaReviews(
      user.uid,
      (reviews) => {
        setSavedReviews(reviews);
      },
      (err) => {
        console.error('[Meta-Reviews Subscription Error]:', err);
      }
    );

    return () => unsubscribe();
  }, [isOpen, user.uid]);

  // Handle generating new Executive Meta-Review
  const handleGenerateMetaReview = async () => {
    try {
      setIsGenerating(true);
      setErrorMessage(null);
      setIsSaved(false);

      // 1. Fetch past 7 days of entries from Firestore
      const entries = await getUserEntriesRange(user.uid, 7);

      if (entries.length < 2) {
        throw new Error(
          `At least 2 journal entries from the past 7 days are required. Currently found ${entries.length} entry${entries.length === 1 ? '' : 'ies'}.`
        );
      }

      // 2. Call backend proxy endpoint
      const response = await fetch('/api/gemini/executive-meta-review', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ entries }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to synthesize Executive Meta-Review.');
      }

      const reviewPayload: ExecutiveMetaReview = {
        userId: user.uid,
        userEmail: user.email,
        title: data.metaReview.title,
        startDate: Date.now() - 7 * 24 * 60 * 60 * 1000,
        endDate: Date.now(),
        entryCount: data.metaReview.entryCount || entries.length,
        behavioralBottlenecks: data.metaReview.behavioralBottlenecks || [],
        cognitiveLoops: data.metaReview.cognitiveLoops || [],
        productivityTriggers: data.metaReview.productivityTriggers || [],
        wellbeingTriggers: data.metaReview.wellbeingTriggers || [],
        sundaySynthesis: data.metaReview.sundaySynthesis,
        metricsSummary: data.metaReview.metricsSummary,
        createdAt: Date.now(),
      };

      setCurrentReview(reviewPayload);
      setModelUsed(data.modelUsed || 'gemini-3.6-flash');

      // Automatically persist to /users/{userId}/meta_reviews for durable storage
      setIsSaving(true);
      const savedId = await saveExecutiveMetaReview(user.uid, reviewPayload);
      setCurrentReview({
        ...reviewPayload,
        id: savedId,
      });
      setIsSaved(true);
    } catch (err: any) {
      console.error('[Generate Meta-Review Error]:', err);
      setErrorMessage(err.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsGenerating(false);
      setIsSaving(false);
    }
  };

  const handleDeleteSavedReview = async (id?: string) => {
    if (!id || !user.uid) return;
    try {
      await deleteExecutiveMetaReview(user.uid, id);
      if (selectedSavedReview?.id === id) {
        setSelectedSavedReview(null);
      }
      if (currentReview?.id === id) {
        setIsSaved(false);
      }
    } catch (err: any) {
      console.error('[Delete Review Error]:', err);
    }
  };

  if (!isOpen) return null;

  const displayedReview = activeTab === 'saved' && selectedSavedReview ? selectedSavedReview : currentReview;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-4xl max-h-[92vh] bg-[#111827] border border-[#1F2937] rounded-2xl shadow-2xl flex flex-col overflow-hidden text-[#F3F4F6]">
        {/* Modal Header */}
        <div className="p-4 sm:p-6 border-b border-[#1F2937] bg-[#161922] flex items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-indigo-600 to-purple-600 text-white shadow-md">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-tight">
                  Weekly Executive Meta-Review
                </h3>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-900/40 text-indigo-300 border border-indigo-500/30">
                  Gemini Performance Synthesis
                </span>
              </div>
              <p className="text-xs text-gray-400">
                Cognitive loop analysis, behavioral bottlenecks & Sunday strategic priorities
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-executive-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#1F2937] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-[#1F2937] bg-[#111827] flex items-center gap-6 text-xs sm:text-sm font-semibold">
          <button
            type="button"
            id="tab-generate-meta-review"
            onClick={() => {
              setActiveTab('generate');
              setSelectedSavedReview(null);
            }}
            className={`py-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'generate'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Sparkles className="w-4 h-4" />
            <span>Active Synthesis</span>
          </button>

          <button
            type="button"
            id="tab-saved-meta-reviews"
            onClick={() => setActiveTab('saved')}
            className={`py-3 border-b-2 flex items-center gap-2 cursor-pointer transition-colors ${
              activeTab === 'saved'
                ? 'border-indigo-500 text-indigo-400 font-bold'
                : 'border-transparent text-gray-400 hover:text-gray-200'
            }`}
          >
            <Clock className="w-4 h-4" />
            <span>Saved Meta-Reviews ({savedReviews.length})</span>
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-xl bg-rose-950/70 border border-rose-800/80 text-rose-200 flex items-start justify-between gap-3 text-xs sm:text-sm">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-semibold text-rose-300">Synthesis Requirement</p>
                  <p>{errorMessage}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleGenerateMetaReview}
                className="px-3 py-1.5 rounded-lg bg-rose-800 hover:bg-rose-700 text-white font-medium shrink-0 flex items-center gap-1.5 transition-colors cursor-pointer text-xs"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Retry</span>
              </button>
            </div>
          )}

          {/* Active Tab View */}
          {activeTab === 'generate' && (
            <>
              {/* Trigger Card (if not yet generated) */}
              {!currentReview && !isGenerating && (
                <div className="bg-[#161922] border border-[#1F2937] rounded-2xl p-6 sm:p-8 text-center space-y-4 max-w-xl mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-900/30 border border-indigo-500/30 text-indigo-400 flex items-center justify-center mx-auto shadow-inner">
                    <TrendingUp className="w-7 h-7" />
                  </div>
                  <div className="space-y-2">
                    <h4 className="text-lg font-bold text-white">
                      Synthesize Past 7 Days into Executive Clarity
                    </h4>
                    <p className="text-xs sm:text-sm text-gray-400 leading-relaxed max-w-md mx-auto">
                      Gemini aggregates your mood trajectory, energy cycles, and cognitive friction to formulate 3 high-leverage strategic priorities for the upcoming week.
                    </p>
                  </div>

                  <button
                    type="button"
                    id="btn-run-executive-synthesis"
                    onClick={handleGenerateMetaReview}
                    className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm flex items-center justify-center gap-2 shadow-lg transition-all cursor-pointer mx-auto"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Run Executive Meta-Review</span>
                  </button>

                  <div className="pt-2 flex items-center justify-center gap-2 text-[11px] text-gray-500">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    <span>User-isolated analysis under /users/{user.uid}/meta_reviews</span>
                  </div>
                </div>
              )}

              {/* Generating Skeleton Loader */}
              {isGenerating && (
                <div className="py-16 text-center space-y-4">
                  <div className="w-10 h-10 border-3 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
                  <div className="space-y-1">
                    <h4 className="text-base font-semibold text-white">
                      Synthesizing Longitudinal Executive Review...
                    </h4>
                    <p className="text-xs text-gray-400">
                      Uncovering behavioral bottlenecks, friction correlation, and strategic action items.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}

          {/* Saved Reviews Listing */}
          {activeTab === 'saved' && !selectedSavedReview && (
            <div className="space-y-3">
              {savedReviews.length === 0 ? (
                <div className="p-8 text-center bg-[#161922] border border-[#1F2937] rounded-2xl space-y-3">
                  <Clock className="w-8 h-8 text-gray-500 mx-auto" />
                  <p className="text-sm font-medium text-gray-400">No saved Executive Meta-Reviews yet.</p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('generate')}
                    className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold cursor-pointer"
                  >
                    Generate your first review
                  </button>
                </div>
              ) : (
                savedReviews.map((review) => (
                  <div
                    key={review.id}
                    className="p-4 bg-[#161922] hover:bg-[#1c212c] border border-[#1F2937] hover:border-indigo-500/40 rounded-xl flex items-center justify-between gap-4 transition-all cursor-pointer"
                    onClick={() => setSelectedSavedReview(review)}
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white truncate">
                          {review.title}
                        </h4>
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-900/40 text-indigo-300 font-medium border border-indigo-500/30">
                          {review.entryCount} entries
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 flex items-center gap-2">
                        <Clock className="w-3 h-3" />
                        <span>
                          {review.createdAt ? new Date(review.createdAt).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' }) : 'Milestone'}
                        </span>
                        {review.metricsSummary && (
                          <span className="text-indigo-400">
                            Avg Sent: {review.metricsSummary.averageSentiment > 0 ? `+${review.metricsSummary.averageSentiment}` : review.metricsSummary.averageSentiment} | Friction: {review.metricsSummary.frictionTrend}
                          </span>
                        )}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSavedReview(review.id);
                        }}
                        className="p-2 text-gray-500 hover:text-rose-400 hover:bg-[#1F2937] rounded-lg transition-colors cursor-pointer"
                        title="Delete Review"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                      <ChevronRight className="w-4 h-4 text-gray-400" />
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* Render Full Executive Meta-Review Report (for active generated or selected review) */}
          {displayedReview && !isGenerating && (
            <div className="space-y-6">
              {/* Back to list button if viewing saved review */}
              {activeTab === 'saved' && selectedSavedReview && (
                <button
                  type="button"
                  onClick={() => setSelectedSavedReview(null)}
                  className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 cursor-pointer"
                >
                  &larr; Back to saved reviews list
                </button>
              )}

              {/* Title & Status Header */}
              <div className="bg-gradient-to-r from-indigo-950/40 via-[#161922] to-purple-950/40 border border-indigo-500/30 rounded-2xl p-5 sm:p-6 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-indigo-400">
                      Executive Synthesis
                    </span>
                    <span className="text-xs text-gray-400">&bull;</span>
                    <span className="text-xs text-gray-400">{displayedReview.entryCount} Reflections Synthesized</span>
                  </div>

                  {isSaved && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                      <Check className="w-3.5 h-3.5" />
                      <span>Saved to /meta_reviews</span>
                    </span>
                  )}
                </div>

                <h3 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  {displayedReview.title}
                </h3>

                {/* Metrics Summary Strip */}
                {displayedReview.metricsSummary && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                    <div className="p-2.5 rounded-xl bg-[#111827]/80 border border-[#1F2937]">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Average Sentiment</span>
                      <span className="text-sm font-bold text-emerald-400">
                        {displayedReview.metricsSummary.averageSentiment > 0
                          ? `+${displayedReview.metricsSummary.averageSentiment}`
                          : displayedReview.metricsSummary.averageSentiment}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#111827]/80 border border-[#1F2937]">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Average Energy</span>
                      <span className="text-sm font-bold text-amber-400">
                        {displayedReview.metricsSummary.averageEnergy} / 10
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#111827]/80 border border-[#1F2937]">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Peak Energy Day</span>
                      <span className="text-sm font-bold text-indigo-300">
                        {displayedReview.metricsSummary.peakEnergyDay}
                      </span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-[#111827]/80 border border-[#1F2937]">
                      <span className="text-[10px] text-gray-400 uppercase tracking-wider block">Friction Trend</span>
                      <span className={`text-sm font-bold capitalize ${
                        displayedReview.metricsSummary.frictionTrend === 'falling' ? 'text-emerald-400' : 'text-rose-400'
                      }`}>
                        {displayedReview.metricsSummary.frictionTrend}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Sunday Strategic Priorities (Feature 3 Priority Deliverable) */}
              <div className="bg-[#161922] border border-indigo-500/40 rounded-2xl p-5 sm:p-6 space-y-4 shadow-lg">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Target className="w-5 h-5 text-indigo-400" />
                  <h4 className="text-sm font-bold uppercase tracking-wider text-white">
                    3 Strategic Priorities for Next Week
                  </h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {displayedReview.sundaySynthesis?.strategicPriorities?.map((priority, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-indigo-950/30 border border-indigo-500/30 flex flex-col justify-between space-y-3"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                          {idx + 1}
                        </div>
                        <span className="text-xs font-semibold text-indigo-300 uppercase tracking-wider">
                          Priority Vector
                        </span>
                      </div>
                      <p className="text-sm text-gray-200 font-medium leading-relaxed">
                        {priority}
                      </p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Sunday Synthesis Narrative */}
              <div className="bg-[#161922] border border-[#1F2937] rounded-2xl p-5 sm:p-6 space-y-3">
                <div className="flex items-center gap-2 text-gray-300">
                  <FileText className="w-4 h-4 text-indigo-400" />
                  <h4 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                    Sunday Meta-Synthesis Narrative
                  </h4>
                </div>
                <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap font-normal">
                  {displayedReview.sundaySynthesis?.summary}
                </div>
              </div>

              {/* Behavioral Bottlenecks & Cognitive Loops (Two Column) */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Bottlenecks */}
                <div className="bg-[#161922] border border-amber-900/40 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-amber-400">
                    <AlertTriangle className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-amber-300">
                      Behavioral Bottlenecks
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {displayedReview.behavioralBottlenecks?.map((item, idx) => (
                      <li key={idx} className="text-xs sm:text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-amber-400 font-bold">&bull;</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Cognitive Loops */}
                <div className="bg-[#161922] border border-purple-900/40 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-purple-400">
                    <RotateCcw className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300">
                      Cognitive Loops Identified
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {displayedReview.cognitiveLoops?.map((item, idx) => (
                      <li key={idx} className="text-xs sm:text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-purple-400 font-bold">&bull;</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Key Productivity & Wellbeing Triggers */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Productivity Triggers */}
                <div className="bg-[#161922] border border-emerald-900/40 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-emerald-400">
                    <Zap className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-emerald-300">
                      Key Productivity Triggers
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {displayedReview.productivityTriggers?.map((item, idx) => (
                      <li key={idx} className="text-xs sm:text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-emerald-400 font-bold">&bull;</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Wellbeing Triggers */}
                <div className="bg-[#161922] border border-rose-900/40 rounded-2xl p-5 space-y-3">
                  <div className="flex items-center gap-2 text-rose-400">
                    <Heart className="w-4 h-4" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-rose-300">
                      Key Wellbeing Anchors
                    </h4>
                  </div>
                  <ul className="space-y-2">
                    {displayedReview.wellbeingTriggers?.map((item, idx) => (
                      <li key={idx} className="text-xs sm:text-sm text-gray-300 flex items-start gap-2">
                        <span className="text-rose-400 font-bold">&bull;</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="p-4 sm:p-6 border-t border-[#1F2937] bg-[#161922] flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="text-xs text-gray-500">
            Isolated cloud persistence: <code className="text-gray-400">/users/{user.uid}/meta_reviews</code>
          </div>

          <div className="flex items-center gap-3">
            {activeTab === 'generate' && currentReview && (
              <button
                type="button"
                id="btn-re-run-meta-review"
                onClick={handleGenerateMetaReview}
                disabled={isGenerating}
                className="px-4 py-2 rounded-xl bg-[#1F2937] hover:bg-[#283548] text-gray-300 hover:text-white text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Re-Synthesize</span>
              </button>
            )}

            <button
              type="button"
              id="btn-close-modal-footer"
              onClick={onClose}
              className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Done
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
