import React, { useState, useEffect, useMemo } from 'react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
} from 'recharts';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Zap,
  Activity,
  Smile,
  Award,
  Calendar,
  Sparkles,
  AlertCircle,
  PlusCircle,
  Clock,
  ShieldCheck,
} from 'lucide-react';
import { AuthUser, JournalEntryDocument } from '../types';
import { getUserEntriesRange } from '../lib/firestoreService';
import { getMoodBadgeStyle } from '../lib/moodStyles';

interface AnalyticsDashboardProps {
  user: AuthUser;
  onOpenExecutiveReview: () => void;
  onNewReflection: () => void;
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  user,
  onOpenExecutiveReview,
  onNewReflection,
}) => {
  const [rangeDays, setRangeDays] = useState<7 | 30>(7);
  const [entries, setEntries] = useState<JournalEntryDocument[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Load entries for selected range
  useEffect(() => {
    let isMounted = true;

    async function fetchEntries() {
      try {
        setLoading(true);
        setError(null);
        const data = await getUserEntriesRange(user.uid, rangeDays);
        if (isMounted) {
          setEntries(data);
        }
      } catch (err: any) {
        console.error('[Analytics Fetch Error]:', err);
        if (isMounted) {
          setError(err?.message || 'Failed to load longitudinal analytics.');
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (user?.uid) {
      fetchEntries();
    }

    return () => {
      isMounted = false;
    };
  }, [user?.uid, rangeDays]);

  // Calculate Metrics & KPI Summaries
  const kpis = useMemo(() => {
    if (!entries || entries.length === 0) {
      return {
        avgSentiment: 0,
        avgEnergy: 0,
        avgFriction: 0,
        peakEnergyDay: 'No data',
        peakEnergyScore: 0,
        frictionTrend: 'stable' as 'rising' | 'falling' | 'stable',
        frictionDeltaPct: 0,
        totalEntries: 0,
      };
    }

    let totalSent = 0;
    let totalEng = 0;
    let totalFric = 0;
    let peakScore = -1;
    let peakDay = 'Mid-week';

    entries.forEach((e) => {
      const sent = typeof e.sentiment_score === 'number' ? e.sentiment_score : 0;
      const eng = typeof e.energy_level === 'number' ? e.energy_level : 6;
      const fric = typeof e.cognitive_friction === 'number' ? e.cognitive_friction : 0.3;

      totalSent += sent;
      totalEng += eng;
      totalFric += fric;

      if (eng > peakScore) {
        peakScore = eng;
        peakDay = e.createdAt
          ? new Date(e.createdAt).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          : 'Peak';
      }
    });

    const count = entries.length;
    const avgSentiment = Math.round((totalSent / count) * 100) / 100;
    const avgEnergy = Math.round((totalEng / count) * 10) / 10;
    const avgFriction = Math.round((totalFric / count) * 100) / 100;

    // Early vs Late half for friction trend calculation
    const mid = Math.floor(count / 2);
    let earlyFric = 0;
    let lateFric = 0;
    for (let i = 0; i < mid; i++) earlyFric += entries[i].cognitive_friction || 0.3;
    for (let i = mid; i < count; i++) lateFric += entries[i].cognitive_friction || 0.3;
    const earlyAvg = mid > 0 ? earlyFric / mid : avgFriction;
    const lateAvg = (count - mid) > 0 ? lateFric / (count - mid) : avgFriction;
    const diff = lateAvg - earlyAvg;

    const frictionTrend: 'rising' | 'falling' | 'stable' =
      diff > 0.06 ? 'rising' : diff < -0.06 ? 'falling' : 'stable';
    const frictionDeltaPct = Math.abs(Math.round(diff * 100));

    return {
      avgSentiment,
      avgEnergy,
      avgFriction,
      peakEnergyDay: peakDay,
      peakEnergyScore: peakScore,
      frictionTrend,
      frictionDeltaPct,
      totalEntries: count,
    };
  }, [entries]);

  // Transform entries into chart data
  const chartData = useMemo(() => {
    return entries.map((entry, idx) => {
      const dateStr = entry.createdAt
        ? new Date(entry.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        : `Day ${idx + 1}`;
      const sentiment = typeof entry.sentiment_score === 'number'
        ? Math.round(entry.sentiment_score * 100) / 100
        : 0;
      const energy = typeof entry.energy_level === 'number' ? entry.energy_level : 6;
      const friction = typeof entry.cognitive_friction === 'number' ? entry.cognitive_friction : 0.3;

      return {
        id: entry.id,
        date: dateStr,
        title: entry.title || 'Journal Reflection',
        primary_mood: entry.primary_mood || entry.mood || 'Reflective',
        sentiment,
        energy,
        friction,
        frictionScaled: Math.round(friction * 10 * 10) / 10, // scaled 0 to 10 for correlating with energy
      };
    });
  }, [entries]);

  // Custom Recharts Tooltip
  const CustomAnalyticsTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const moodStyle = getMoodBadgeStyle(data.primary_mood);

      return (
        <div className="bg-[#111827] border border-[#1F2937] p-3.5 rounded-xl shadow-2xl text-xs space-y-2 min-w-[200px]">
          <div className="border-b border-[#1F2937] pb-1.5 flex items-center justify-between gap-2">
            <span className="font-semibold text-white">{data.date}</span>
            <span
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${moodStyle.bg} ${moodStyle.text} ${moodStyle.border}`}
            >
              <span className={`w-1 h-1 rounded-full ${moodStyle.dot}`} />
              {data.primary_mood}
            </span>
          </div>

          <p className="text-[11px] text-gray-300 font-medium truncate max-w-[220px]">
            {data.title}
          </p>

          <div className="space-y-1 pt-1 border-t border-[#1F2937]">
            <div className="flex items-center justify-between text-[#10B981]">
              <span>Sentiment Trajectory:</span>
              <span className="font-bold">{data.sentiment > 0 ? `+${data.sentiment}` : data.sentiment}</span>
            </div>
            <div className="flex items-center justify-between text-[#F59E0B]">
              <span>Energy Level:</span>
              <span className="font-bold">{data.energy} / 10</span>
            </div>
            <div className="flex items-center justify-between text-[#EC4899]">
              <span>Cognitive Friction:</span>
              <span className="font-bold">{Math.round(data.friction * 100)}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-8 bg-[#0F1115] text-[#F3F4F6]">
      {/* Top Header & Range Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-[#1F2937] pb-6">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Longitudinal Mood & Trend Analytics
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-900/30 text-indigo-400 border border-indigo-500/30">
              Temporal Engine
            </span>
          </div>
          <p className="text-xs sm:text-sm text-gray-400 mt-1">
            Tracking sentiment trajectory, cognitive friction, and energy correlation over time.
          </p>
        </div>

        {/* Range Selector */}
        <div className="flex items-center gap-2 bg-[#111827] border border-[#1F2937] p-1 rounded-xl shrink-0">
          <button
            type="button"
            id="btn-range-7d"
            onClick={() => setRangeDays(7)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              rangeDays === 7
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            7 Days
          </button>
          <button
            type="button"
            id="btn-range-30d"
            onClick={() => setRangeDays(30)}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              rangeDays === 30
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            30 Days
          </button>
        </div>
      </div>

      {/* Feature 3: Executive Meta-Review Banner */}
      <div className="bg-gradient-to-r from-indigo-950/50 via-[#161922] to-purple-950/50 border border-indigo-500/30 rounded-2xl p-5 sm:p-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-start gap-4">
          <div className="p-3 rounded-2xl bg-indigo-600/20 border border-indigo-500/40 text-indigo-400 shrink-0 shadow-inner">
            <Award className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base sm:text-lg font-bold text-white">
                Weekly Executive Meta-Review
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-900/40 text-indigo-300 border border-indigo-500/30">
                Gemini Synthesis
              </span>
            </div>
            <p className="text-xs sm:text-sm text-gray-300 max-w-2xl leading-relaxed">
              Synthesize recurring behavioral bottlenecks, cognitive loops, and productivity triggers from the past 7 days into 3 strategic priorities for next week.
            </p>
          </div>
        </div>

        <button
          type="button"
          id="btn-generate-executive-meta-review"
          onClick={onOpenExecutiveReview}
          className="w-full md:w-auto px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs sm:text-sm flex items-center justify-center gap-2 shadow-md transition-all cursor-pointer shrink-0"
        >
          <Sparkles className="w-4 h-4" />
          <span>Generate Weekly Executive Meta-Review</span>
        </button>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 flex items-center gap-3 text-sm">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Average Sentiment */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-5 space-y-2 shadow-md">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Average Sentiment</span>
            <Smile className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">
              {kpis.avgSentiment > 0 ? `+${kpis.avgSentiment}` : kpis.avgSentiment}
            </span>
            <span
              className={`text-xs font-semibold ${
                kpis.avgSentiment >= 0.25
                  ? 'text-emerald-400'
                  : kpis.avgSentiment <= -0.25
                  ? 'text-rose-400'
                  : 'text-gray-400'
              }`}
            >
              {kpis.avgSentiment >= 0.25
                ? 'Constructive'
                : kpis.avgSentiment <= -0.25
                ? 'High Strain'
                : 'Equilibrium'}
            </span>
          </div>
          <p className="text-[11px] text-gray-400">Scale from -1.0 (adverse) to +1.0 (energized)</p>
        </div>

        {/* KPI 2: Peak Energy Day */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-5 space-y-2 shadow-md">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Peak Energy Day</span>
            <Zap className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-xl font-bold text-white truncate max-w-[160px]">
              {kpis.peakEnergyDay}
            </span>
            {kpis.peakEnergyScore > 0 && (
              <span className="text-xs font-bold text-amber-400">
                {kpis.peakEnergyScore}/10
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400">Highest recorded mental vigor in period</p>
        </div>

        {/* KPI 3: Cognitive Friction Trend */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-5 space-y-2 shadow-md">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Friction Trend</span>
            {kpis.frictionTrend === 'falling' ? (
              <TrendingDown className="w-4 h-4 text-emerald-400" />
            ) : kpis.frictionTrend === 'rising' ? (
              <TrendingUp className="w-4 h-4 text-rose-400" />
            ) : (
              <Minus className="w-4 h-4 text-gray-400" />
            )}
          </div>
          <div className="flex items-baseline gap-2">
            <span
              className={`text-2xl font-bold capitalize ${
                kpis.frictionTrend === 'falling'
                  ? 'text-emerald-400'
                  : kpis.frictionTrend === 'rising'
                  ? 'text-rose-400'
                  : 'text-gray-300'
              }`}
            >
              {kpis.frictionTrend}
            </span>
            {kpis.frictionDeltaPct > 0 && (
              <span className="text-xs font-semibold text-gray-400">
                ({kpis.frictionDeltaPct}%)
              </span>
            )}
          </div>
          <p className="text-[11px] text-gray-400">
            {kpis.frictionTrend === 'falling'
              ? 'Blockers decreasing (improving baseline)'
              : kpis.frictionTrend === 'rising'
              ? 'Mental strain & blockers accumulating'
              : 'Steady cognitive resistance'}
          </p>
        </div>

        {/* KPI 4: Analyzed Volume */}
        <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-5 space-y-2 shadow-md">
          <div className="flex items-center justify-between text-gray-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Reflections In Scope</span>
            <Calendar className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{kpis.totalEntries}</span>
            <span className="text-xs text-gray-400">
              in past {rangeDays} days
            </span>
          </div>
          <p className="text-[11px] text-gray-400">
            Avg Energy: <span className="text-amber-300 font-semibold">{kpis.avgEnergy}/10</span> &bull; Friction: <span className="text-purple-300 font-semibold">{Math.round(kpis.avgFriction * 100)}%</span>
          </p>
        </div>
      </div>

      {/* Multi-Axis Trend Line Chart (Recharts) */}
      <div className="bg-[#111827] border border-[#1F2937] rounded-2xl p-4 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 border-b border-[#1F2937] pb-4">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>Multi-Axis Trajectory & Correlation</span>
            </h3>
            <p className="text-xs text-gray-400">
              Dual-scale visualization: Left Axis correlates Sentiment (-1 to +1); Right Axis correlates Energy Level (1-10) and Friction (scaled 0-10).
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs text-gray-400">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]" />
              <span>Sentiment</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]" />
              <span>Energy</span>
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#EC4899]" />
              <span>Friction</span>
            </span>
          </div>
        </div>

        {/* Chart Canvas Area */}
        {loading ? (
          <div className="h-[340px] flex items-center justify-center space-y-2">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : chartData.length === 0 ? (
          <div className="h-[320px] flex flex-col items-center justify-center text-center space-y-4 p-6 bg-[#161922]/50 rounded-xl border border-dashed border-[#1F2937]">
            <Clock className="w-10 h-10 text-gray-500" />
            <div className="space-y-1 max-w-sm">
              <h4 className="text-base font-semibold text-white">No reflections in this {rangeDays}-day window</h4>
              <p className="text-xs text-gray-400">
                Write a new reflection to begin capturing longitudinal metrics and trajectory curves.
              </p>
            </div>
            <button
              type="button"
              onClick={onNewReflection}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs flex items-center gap-1.5 shadow-md transition-colors cursor-pointer"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Write Reflection</span>
            </button>
          </div>
        ) : (
          <div className="w-full h-[360px] pt-2">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 15, right: 20, left: -10, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1F2937" vertical={false} />
                <XAxis
                  dataKey="date"
                  stroke="#6B7280"
                  tick={{ fill: '#9CA3AF', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#374151' }}
                />
                {/* Left Y-Axis: Sentiment (-1 to 1) */}
                <YAxis
                  yAxisId="sentiment"
                  domain={[-1, 1]}
                  ticks={[-1, -0.5, 0, 0.5, 1]}
                  stroke="#10B981"
                  tick={{ fill: '#10B981', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#1F2937' }}
                />
                {/* Right Y-Axis: Energy & Friction (0 to 10) */}
                <YAxis
                  yAxisId="energy"
                  orientation="right"
                  domain={[0, 10]}
                  ticks={[0, 2, 4, 6, 8, 10]}
                  stroke="#F59E0B"
                  tick={{ fill: '#F59E0B', fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: '#1F2937' }}
                />
                <Tooltip content={<CustomAnalyticsTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: '16px', fontSize: '12px' }}
                  iconType="circle"
                />
                <ReferenceLine yAxisId="sentiment" y={0} stroke="#374151" strokeDasharray="2 2" />

                {/* Trajectory Lines */}
                <Line
                  yAxisId="sentiment"
                  type="monotone"
                  dataKey="sentiment"
                  name="Sentiment Score (-1 to +1)"
                  stroke="#10B981"
                  strokeWidth={2.5}
                  activeDot={{ r: 6, fill: '#10B981', stroke: '#0F1115', strokeWidth: 2 }}
                  dot={{ r: 4, fill: '#10B981' }}
                />

                <Line
                  yAxisId="energy"
                  type="monotone"
                  dataKey="energy"
                  name="Energy Level (1 to 10)"
                  stroke="#F59E0B"
                  strokeWidth={2.5}
                  activeDot={{ r: 6, fill: '#F59E0B', stroke: '#0F1115', strokeWidth: 2 }}
                  dot={{ r: 4, fill: '#F59E0B' }}
                />

                <Line
                  yAxisId="energy"
                  type="monotone"
                  dataKey="frictionScaled"
                  name="Cognitive Friction (scaled x10)"
                  stroke="#EC4899"
                  strokeWidth={2}
                  strokeDasharray="4 4"
                  activeDot={{ r: 6, fill: '#EC4899', stroke: '#0F1115', strokeWidth: 2 }}
                  dot={{ r: 3, fill: '#EC4899' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}

        <div className="pt-2 flex items-center justify-between text-[11px] text-gray-500 border-t border-[#1F2937]">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Isolated longitudinal telemetry from /users/{user.uid}/entries</span>
          </div>
          <span>Refreshes dynamically with each saved reflection</span>
        </div>
      </div>
    </div>
  );
};
