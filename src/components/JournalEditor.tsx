import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import {
  Sparkles,
  Send,
  Save,
  RotateCcw,
  Check,
  AlertCircle,
  Brain,
  ListTodo,
  FileText,
  Lightbulb,
  Smile,
  ShieldCheck,
  Clock,
  ChevronDown,
  CalendarRange,
  Zap,
  Activity
} from 'lucide-react';
import { AuthUser, JournalInteraction, JournalTurn, ReflectionMode } from '../types';
import { saveInteraction, updateInteraction } from '../lib/firestoreService';
import { getMoodBadgeStyle, formatSentiment } from '../lib/moodStyles';

interface JournalEditorProps {
  user: AuthUser;
  activeInteraction: JournalInteraction | null;
  onInteractionSaved: (interaction: JournalInteraction) => void;
  onNewEntryRequest: () => void;
  onOpenWeeklyRetro?: () => void;
}

const MODES: Array<{ id: ReflectionMode; label: string; icon: React.ComponentType<{ className?: string }>; desc: string }> = [
  { id: 'reflection', label: 'Deep Reflection', icon: Brain, desc: 'Philosophical insight & probing questions' },
  { id: 'summary', label: 'Executive Summary', icon: FileText, desc: 'Core context, themes & bottlenecks' },
  { id: 'brainstorm', label: 'Brainstorm Ideas', icon: Lightbulb, desc: 'Creative angles & fresh possibilities' },
  { id: 'action_items', label: 'Action Items', icon: ListTodo, desc: 'Concrete, prioritized micro-actions' },
];

const MOODS = ['Calm', 'Inspired', 'Focused', 'Pensive', 'Overwhelmed', 'Grateful'];

const PROMPT_STARTERS = [
  'What is occupying the most mental bandwidth for me today?',
  'A tough challenge or decision I am currently deliberating...',
  'Something that brought unexpected gratitude or clarity this week...',
  'A recurring pattern or emotion I have noticed recently...',
];

export const JournalEditor: React.FC<JournalEditorProps> = ({
  user,
  activeInteraction,
  onInteractionSaved,
  onNewEntryRequest,
  onOpenWeeklyRetro,
}) => {
  // Input fields
  const [title, setTitle] = useState('');
  const [journalText, setJournalText] = useState('');
  const [mode, setMode] = useState<ReflectionMode>('reflection');
  const [selectedMood, setSelectedMood] = useState<string>('Reflective');
  
  // Follow-up conversation state
  const [followUpPrompt, setFollowUpPrompt] = useState('');
  
  // Status states
  const [isGenerating, setIsGenerating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'error' | 'unsaved'>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [activeModel, setActiveModel] = useState<string>('gemini-3.6-flash');

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Sync state when activeInteraction changes
  useEffect(() => {
    if (activeInteraction) {
      setTitle(activeInteraction.title || '');
      setJournalText(activeInteraction.initialJournalText || '');
      setMode(activeInteraction.initialMode || 'reflection');
      setSelectedMood(activeInteraction.mood || 'Reflective');
      setActiveModel(activeInteraction.initialModelUsed || 'gemini-3.6-flash');
      setSaveStatus('saved');
      setErrorMessage(null);
    } else {
      // Clean slate for new reflection
      setTitle('');
      setJournalText('');
      setMode('reflection');
      setSelectedMood('Reflective');
      setActiveModel('gemini-3.6-flash');
      setSaveStatus('unsaved');
      setErrorMessage(null);
    }
  }, [activeInteraction]);

  // Scroll to bottom when conversation turns change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeInteraction?.turns]);

  // Handle Initial Reflection Generation
  const handleGenerateInitialReflection = async () => {
    if (!journalText.trim()) {
      setErrorMessage('Please write down your thoughts or reflections first.');
      return;
    }

    setIsGenerating(true);
    setErrorMessage(null);

    const generatedTitle = title.trim() || journalText.trim().slice(0, 48) + (journalText.length > 48 ? '...' : '');

    try {
      // 1. Call secure server-side Gemini API
      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journalText: journalText.trim(),
          mode,
          previousTurns: [],
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to synthesize reflection from Gemini.');
      }

      const modelOutput = data.reflection || data.text || '';
      const detectedMood = data.mood || selectedMood || 'Reflective';
      const sentimentScore = typeof data.sentiment_score === 'number' ? data.sentiment_score : 0.0;
      const energyLevel = typeof data.energy_level === 'number' ? data.energy_level : 6;
      const cognitiveFriction = typeof data.cognitive_friction === 'number' ? data.cognitive_friction : 0.3;
      const primaryMood = data.primary_mood || detectedMood;
      const actionableReframe = data.actionable_reframe || '';
      const modelUsed = data.modelUsed || 'gemini-3.6-flash';
      setActiveModel(modelUsed);

      // Build initial turns
      const initialTurns: JournalTurn[] = [
        {
          id: `turn-user-${Date.now()}`,
          role: 'user',
          content: journalText.trim(),
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
        {
          id: `turn-model-${Date.now() + 1}`,
          role: 'model',
          content: modelOutput,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed,
        },
      ];

      // 2. Guaranteed Transaction Verification: Persist to Firestore
      setSaveStatus('saving');
      setIsSaving(true);

      const now = Date.now();
      const payload: Omit<JournalInteraction, 'id'> = {
        userId: user.uid,
        userEmail: user.email,
        title: generatedTitle,
        initialJournalText: journalText.trim(),
        initialMode: mode,
        initialGeminiResponse: modelOutput,
        initialModelUsed: modelUsed,
        mood: detectedMood,
        primary_mood: primaryMood,
        sentiment_score: sentimentScore,
        energy_level: energyLevel,
        cognitive_friction: cognitiveFriction,
        actionable_reframe: actionableReframe,
        turns: initialTurns,
        createdAt: now,
        updatedAt: now,
      };

      const interactionId = await saveInteraction(user.uid, payload);

      const savedInteraction: JournalInteraction = {
        id: interactionId,
        ...payload,
      };

      setSaveStatus('saved');
      onInteractionSaved(savedInteraction);
    } catch (err: any) {
      console.error('Error during reflection generation or save:', err);
      setErrorMessage(err.message || 'An error occurred. Your text was preserved. Please click Retry.');
      setSaveStatus('error');
    } finally {
      setIsGenerating(false);
      setIsSaving(false);
    }
  };

  // Handle Follow-up Message
  const handleSendFollowUp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!followUpPrompt.trim() || !activeInteraction) return;

    const userMessage = followUpPrompt.trim();
    setFollowUpPrompt('');
    setIsGenerating(true);
    setErrorMessage(null);

    // Append user turn locally
    const updatedTurns: JournalTurn[] = [
      ...(activeInteraction.turns || []),
      {
        id: `turn-user-${Date.now()}`,
        role: 'user',
        content: userMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      },
    ];

    try {
      // 1. Call secure server-side Gemini API with conversation history
      const response = await fetch('/api/gemini/reflect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          journalText: activeInteraction.initialJournalText,
          mode: activeInteraction.initialMode,
          previousTurns: updatedTurns.slice(0, -1),
          userFollowUp: userMessage,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.error || 'Failed to generate response from Gemini.');
      }

      const modelOutput = data.reflection || data.text || '';
      const modelUsed = data.modelUsed || 'gemini-3.6-flash';
      setActiveModel(modelUsed);

      const finalTurns: JournalTurn[] = [
        ...updatedTurns,
        {
          id: `turn-model-${Date.now() + 1}`,
          role: 'model',
          content: modelOutput,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          modelUsed,
        },
      ];

      // 2. Persist updated turns to Firestore
      setSaveStatus('saving');
      setIsSaving(true);

      const updates: Partial<JournalInteraction> = {
        turns: finalTurns,
      };
      if (data.mood) updates.mood = data.mood;
      if (typeof data.sentiment_score === 'number') updates.sentiment_score = data.sentiment_score;
      if (data.actionable_reframe) updates.actionable_reframe = data.actionable_reframe;

      await updateInteraction(user.uid, activeInteraction.id, updates);

      const updatedInteraction: JournalInteraction = {
        ...activeInteraction,
        ...updates,
        turns: finalTurns,
        updatedAt: Date.now(),
      };

      setSaveStatus('saved');
      onInteractionSaved(updatedInteraction);
    } catch (err: any) {
      console.error('Error during follow-up dialogue:', err);
      // Restore the user message to the input field so work is not lost
      setFollowUpPrompt(userMessage);
      setErrorMessage(err.message || 'Follow-up reply failed. Your prompt was preserved. Please click Retry.');
      setSaveStatus('error');
    } finally {
      setIsGenerating(false);
      setIsSaving(false);
    }
  };

  const hasGeneratedTurns = Boolean(activeInteraction && activeInteraction.turns && activeInteraction.turns.length > 0);

  return (
    <div className="flex-1 flex flex-col h-full overflow-hidden bg-[#0F1115] text-[#F3F4F6]">
      {/* Top Header / Bar */}
      <div className="border-b border-[#1F2937] bg-[#111827]/80 backdrop-blur-md px-4 sm:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0">
        <div className="flex items-center gap-2">
          {hasGeneratedTurns ? (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
              <h2 className="text-sm sm:text-base font-semibold text-white truncate max-w-[280px] sm:max-w-md">
                {activeInteraction?.title || 'Active Reflection'}
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-900/40 text-indigo-300 border border-indigo-500/30 uppercase tracking-wider">
                {activeInteraction?.initialMode.replace('_', ' ')}
              </span>
            </div>
          ) : (
            <h2 className="text-sm sm:text-base font-semibold text-white">
              New Journal Reflection
            </h2>
          )}
        </div>

        {/* Sync & Isolation Status Indicator */}
        <div className="flex items-center gap-3 text-xs">
          <div className="flex items-center gap-1.5 text-gray-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">Path:</span>
            <code className="text-[11px] text-gray-300 bg-[#1F2937] px-1.5 py-0.5 rounded border border-[#374151]">
              /users/{user.uid.slice(0, 6)}...
            </code>
          </div>

          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-green-900/20 border border-green-800/40">
            {saveStatus === 'saving' || isSaving ? (
              <>
                <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
                <span className="text-indigo-400 font-medium">Saving...</span>
              </>
            ) : saveStatus === 'saved' ? (
              <>
                <Check className="w-3 h-3 text-green-400" />
                <span className="text-green-400 font-bold text-[10px] tracking-wider uppercase">Firestore Synced</span>
              </>
            ) : saveStatus === 'error' ? (
              <>
                <AlertCircle className="w-3 h-3 text-rose-400" />
                <span className="text-rose-400 font-bold text-[10px] tracking-wider uppercase">Sync Warning</span>
              </>
            ) : (
              <span className="text-gray-400 font-medium text-[10px] uppercase">Draft</span>
            )}
          </div>
        </div>
      </div>

      {/* Error Banner with Retry Guarantee */}
      {errorMessage && (
        <div className="bg-rose-950/80 border-b border-rose-800/80 px-4 sm:px-6 py-2.5 flex items-center justify-between text-xs sm:text-sm text-rose-200">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            id="btn-retry-operation"
            onClick={hasGeneratedTurns ? () => handleSendFollowUp() : handleGenerateInitialReflection}
            className="px-2.5 py-1 rounded bg-rose-800 hover:bg-rose-700 text-rose-100 font-medium transition-colors cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Retry</span>
          </button>
        </div>
      )}

      {/* Main Body */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-8 py-6 space-y-6">
        {/* If New Entry (or prior to first turn generation) */}
        {!hasGeneratedTurns ? (
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Feature 2: Weekly Retrospective Shortcut Banner */}
            {onOpenWeeklyRetro && (
              <div className="bg-gradient-to-r from-indigo-950/40 via-[#161922] to-indigo-950/40 border border-indigo-500/20 rounded-xl p-3.5 sm:p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 shrink-0">
                    <CalendarRange className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-xs sm:text-sm font-semibold text-gray-200 flex items-center gap-1.5">
                      <span>Weekly Retrospective Synthesis</span>
                      <span className="text-[10px] px-2 py-0.2 rounded-full bg-indigo-500/20 text-indigo-300 font-medium border border-indigo-500/30">
                        7-Day Analysis
                      </span>
                    </h4>
                    <p className="text-[11px] text-gray-400">
                      Synthesize recurring themes, personal breakthroughs, and actionable goals from the past 7 days.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  id="btn-trigger-weekly-retro-banner"
                  onClick={onOpenWeeklyRetro}
                  className="w-full sm:w-auto px-3.5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors shadow-sm cursor-pointer shrink-0"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Generate Weekly Retrospective</span>
                </button>
              </div>
            )}

            {/* Title & Mood */}
            <div className="space-y-3">
              <input
                type="text"
                id="input-reflection-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Give this reflection a title (optional)..."
                className="w-full bg-[#111827] border border-[#1F2937] rounded-xl px-4 py-3 text-[#F3F4F6] placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-base sm:text-lg font-medium shadow-inner"
              />

              {/* Mood selector */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs text-gray-400 flex items-center gap-1 mr-1">
                  <Smile className="w-3.5 h-3.5 text-gray-400" />
                  Current Mood:
                </span>
                {MOODS.map((mood) => (
                  <button
                    key={mood}
                    type="button"
                    onClick={() => setSelectedMood(mood)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
                      selectedMood === mood
                        ? 'bg-indigo-600 text-white font-semibold shadow-sm'
                        : 'bg-[#1F2937] border border-[#374151] text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    {mood}
                  </button>
                ))}
              </div>
            </div>

            {/* Mode selection cards */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-gray-400 uppercase tracking-wider">
                Choose Gemini Objective:
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {MODES.map((m) => {
                  const Icon = m.icon;
                  const isSelected = mode === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      id={`mode-${m.id}`}
                      onClick={() => setMode(m.id)}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                        isSelected
                          ? 'bg-indigo-900/20 border-indigo-500/50 text-white ring-1 ring-indigo-500/30'
                          : 'bg-[#111827] border-[#1F2937] text-gray-400 hover:border-[#374151] hover:text-gray-200'
                      }`}
                    >
                      <div
                        className={`p-2 rounded-lg shrink-0 ${
                          isSelected ? 'bg-indigo-600 text-white' : 'bg-[#1F2937] text-gray-400'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="space-y-0.5">
                        <div className="text-sm font-semibold text-white">{m.label}</div>
                        <div className="text-xs text-gray-400 leading-snug">{m.desc}</div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Journal Input Area */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="textarea-journal-body" className="text-xs font-semibold text-gray-400 uppercase tracking-wider">
                  Write Your Thoughts, Dilemmas, or Experiences:
                </label>
                <span className="text-[11px] text-gray-500">
                  {journalText.length} / 15,000 chars
                </span>
              </div>

              <textarea
                id="textarea-journal-body"
                rows={9}
                value={journalText}
                onChange={(e) => setJournalText(e.target.value)}
                placeholder="What is on your mind? Freely unload your thoughts, decisions you are wrestling with, feelings you want to untangle, or goals you want to reflect upon..."
                className="w-full bg-[#111827] border border-[#1F2937] rounded-xl p-4 text-[#F3F4F6] placeholder-gray-500 focus:outline-none focus:border-indigo-500 text-sm sm:text-base leading-relaxed resize-none font-sans shadow-inner"
              />
            </div>

            {/* Prompt Starters */}
            <div className="space-y-1.5">
              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                Need inspiration?
              </div>
              <div className="flex flex-wrap gap-2">
                {PROMPT_STARTERS.map((prompt, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setJournalText((prev) => (prev ? `${prev}\n\n${prompt} ` : `${prompt} `))}
                    className="text-xs text-gray-400 hover:text-indigo-300 bg-[#1F2937] hover:bg-[#374151] border border-[#374151] px-3 py-1.5 rounded-lg transition-colors cursor-pointer text-left"
                  >
                    &ldquo;{prompt}&rdquo;
                  </button>
                ))}
              </div>
            </div>

            {/* Action Bar */}
            <div className="pt-2 flex items-center justify-end gap-3">
              <button
                type="button"
                id="btn-generate-reflection"
                disabled={isGenerating || !journalText.trim()}
                onClick={handleGenerateInitialReflection}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-6 py-3 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-all shadow-lg shadow-indigo-950/50 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {isGenerating ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Synthesizing via Gemini 3.6 Flash...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>Reflect with Gemini</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Multi-Turn Dialogue View */
          <div className="max-w-3xl mx-auto space-y-6">
            {/* Original Journal Context Card & Cognitive Analytics */}
            <div className="bg-[#111827] border border-[#1F2937] border-l-4 border-indigo-500 rounded-xl p-4 sm:p-5 space-y-4 shadow-md">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#1F2937] pb-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-400 uppercase tracking-widest">
                    <FileText className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Original Reflection</span>
                  </div>

                  {/* Color-coded mood badge */}
                  {activeInteraction?.mood && (() => {
                    const moodStyle = getMoodBadgeStyle(activeInteraction.mood);
                    return (
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${moodStyle.bg} ${moodStyle.text} ${moodStyle.border}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${moodStyle.dot}`} />
                        {activeInteraction.mood}
                      </span>
                    );
                  })()}

                  {/* Sentiment Score Indicator */}
                  {typeof activeInteraction?.sentiment_score === 'number' && (() => {
                    const sent = formatSentiment(activeInteraction.sentiment_score);
                    return (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-[#1F2937] text-gray-300 border border-[#374151]">
                        <span className="text-gray-400">Sentiment:</span>
                        <span className={`font-semibold ${sent.colorClass}`}>{sent.formattedScore}</span>
                        <span className="text-gray-400">({sent.label})</span>
                      </span>
                    );
                  })()}

                  {/* Longitudinal Energy Level */}
                  {typeof activeInteraction?.energy_level === 'number' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-amber-950/30 text-amber-300 border border-amber-800/40">
                      <Zap className="w-3 h-3 text-amber-400" />
                      <span className="text-gray-400">Energy:</span>
                      <span className="font-semibold text-amber-300">{activeInteraction.energy_level}/10</span>
                    </span>
                  )}

                  {/* Longitudinal Cognitive Friction */}
                  {typeof activeInteraction?.cognitive_friction === 'number' && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium bg-purple-950/30 text-purple-300 border border-purple-800/40">
                      <Activity className="w-3 h-3 text-purple-400" />
                      <span className="text-gray-400">Friction:</span>
                      <span className="font-semibold text-purple-300">
                        {Math.round(activeInteraction.cognitive_friction * 100)}%
                      </span>
                    </span>
                  )}
                </div>

                <span className="text-[11px] text-gray-500 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {activeInteraction?.createdAt ? new Date(activeInteraction.createdAt).toLocaleDateString() : ''}
                </span>
              </div>

              <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed italic pl-1">
                {activeInteraction?.initialJournalText}
              </p>

              {/* Actionable Cognitive Reframe Card */}
              {activeInteraction?.actionable_reframe && (
                <div className="p-3.5 rounded-xl bg-indigo-950/40 border border-indigo-500/40 flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-indigo-900/60 text-indigo-300 shrink-0 mt-0.5">
                    <Sparkles className="w-4 h-4 text-indigo-400" />
                  </div>
                  <div className="space-y-1">
                    <h5 className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider">
                      Actionable Cognitive Reframe
                    </h5>
                    <p className="text-sm text-gray-200 leading-relaxed font-normal">
                      {activeInteraction.actionable_reframe}
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Conversation Turns Stream */}
            <div className="space-y-6">
              {activeInteraction?.turns?.map((turn) => {
                const isModel = turn.role === 'model';
                return (
                  <div
                    key={turn.id}
                    className={`flex flex-col ${isModel ? 'items-start' : 'items-end'} space-y-1.5`}
                  >
                    {/* Role Header */}
                    <div className="flex items-center gap-2 text-xs text-gray-400 px-1">
                      {isModel ? (
                        <>
                          <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-[10px]">
                            G
                          </div>
                          <span className="font-semibold text-indigo-300">Gemini</span>
                          {turn.modelUsed && (
                            <span className="text-[10px] text-gray-400 bg-[#1F2937] px-1.5 py-0.5 rounded border border-[#374151]">
                              {turn.modelUsed}
                            </span>
                          )}
                        </>
                      ) : (
                        <span className="font-semibold text-gray-300">You</span>
                      )}
                      <span className="text-[10px] text-gray-500">{turn.timestamp}</span>
                    </div>

                    {/* Speech Bubble: User bubble is #374151 rounded-tr-none; Gemini is indigo-900/20 rounded-tl-none */}
                    <div
                      className={`max-w-[90%] sm:max-w-[85%] text-sm leading-relaxed ${
                        isModel
                          ? 'bg-indigo-900/20 border border-indigo-500/30 p-5 rounded-2xl rounded-tl-none shadow-lg text-[#F3F4F6]'
                          : 'bg-[#374151] p-4 sm:p-5 rounded-2xl rounded-tr-none text-gray-100 shadow-md font-normal'
                      }`}
                    >
                      {isModel ? (
                        <div className="space-y-3 prose prose-invert prose-sm max-w-none text-[#F3F4F6]">
                          <ReactMarkdown>{turn.content}</ReactMarkdown>
                        </div>
                      ) : (
                        <p className="whitespace-pre-wrap">{turn.content}</p>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Generating loading indicator bubble */}
              {isGenerating && (
                <div className="flex flex-col items-start space-y-1.5">
                  <div className="flex items-center gap-2 text-xs text-gray-400 px-1">
                    <div className="w-5 h-5 bg-indigo-500 rounded-full flex items-center justify-center text-white font-bold text-[10px]">
                      G
                    </div>
                    <span className="font-semibold text-indigo-300">Gemini thinking...</span>
                  </div>
                  <div className="rounded-2xl rounded-tl-none p-4 bg-indigo-900/20 border border-indigo-500/30 text-gray-300 text-sm flex items-center gap-3">
                    <div className="flex gap-1">
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                      <span className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                    </div>
                    <span className="text-xs text-gray-400">
                      Formulating response via model ladder ({activeModel})...
                    </span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        )}
      </div>

      {/* Bottom Follow-Up Chat Input Bar (matching Design HTML) */}
      {hasGeneratedTurns && (
        <div className="p-4 sm:p-6 bg-[#111827] border-t border-[#1F2937] shrink-0">
          <form
            onSubmit={handleSendFollowUp}
            className="max-w-4xl mx-auto flex gap-3 bg-[#1F2937] p-2 rounded-2xl border border-[#374151] shadow-2xl items-center"
          >
            <input
              type="text"
              id="input-follow-up-turn"
              value={followUpPrompt}
              disabled={isGenerating}
              onChange={(e) => setFollowUpPrompt(e.target.value)}
              placeholder="Ask a follow-up, explore a point deeper, or request next steps..."
              className="flex-1 bg-transparent border-none focus:outline-none text-sm px-4 text-white placeholder-gray-500 disabled:opacity-50"
            />
            <button
              type="submit"
              id="btn-send-follow-up"
              disabled={isGenerating || !followUpPrompt.trim()}
              className="w-10 h-10 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl flex items-center justify-center transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed shrink-0 shadow-md"
              title="Send Reply"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}
    </div>
  );
};
