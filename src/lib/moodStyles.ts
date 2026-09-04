/**
 * Visual styling and helper utilities for Mood and Sentiment Analytics
 */

export interface MoodStyle {
  bg: string;
  text: string;
  border: string;
  dot: string;
}

export function getMoodBadgeStyle(mood?: string): MoodStyle {
  const m = (mood || 'Neutral').toLowerCase().trim();

  if (
    m.includes('grateful') ||
    m.includes('gratitude') ||
    m.includes('happy') ||
    m.includes('joy') ||
    m.includes('optimist') ||
    m.includes('blessed')
  ) {
    return {
      bg: 'bg-emerald-950/80',
      text: 'text-emerald-300',
      border: 'border-emerald-700/70',
      dot: 'bg-emerald-400',
    };
  }

  if (
    m.includes('overwhelm') ||
    m.includes('anxious') ||
    m.includes('stress') ||
    m.includes('fear') ||
    m.includes('burnout') ||
    m.includes('frustrat') ||
    m.includes('exhaust') ||
    m.includes('worried')
  ) {
    return {
      bg: 'bg-rose-950/80',
      text: 'text-rose-300',
      border: 'border-rose-700/70',
      dot: 'bg-rose-400',
    };
  }

  if (
    m.includes('motivat') ||
    m.includes('inspir') ||
    m.includes('focus') ||
    m.includes('energ') ||
    m.includes('ambiti') ||
    m.includes('confid') ||
    m.includes('empower')
  ) {
    return {
      bg: 'bg-amber-950/80',
      text: 'text-amber-300',
      border: 'border-amber-700/70',
      dot: 'bg-amber-400',
    };
  }

  if (
    m.includes('reflect') ||
    m.includes('pensiv') ||
    m.includes('thoughtful') ||
    m.includes('contemplat') ||
    m.includes('curious') ||
    m.includes('insight') ||
    m.includes('deep')
  ) {
    return {
      bg: 'bg-indigo-950/80',
      text: 'text-indigo-300',
      border: 'border-indigo-700/70',
      dot: 'bg-indigo-400',
    };
  }

  if (
    m.includes('calm') ||
    m.includes('peace') ||
    m.includes('content') ||
    m.includes('seren') ||
    m.includes('relax') ||
    m.includes('grounded')
  ) {
    return {
      bg: 'bg-teal-950/80',
      text: 'text-teal-300',
      border: 'border-teal-700/70',
      dot: 'bg-teal-400',
    };
  }

  // Default Neutral / Balanced
  return {
    bg: 'bg-sky-950/80',
    text: 'text-sky-300',
    border: 'border-sky-700/70',
    dot: 'bg-sky-400',
  };
}

export function formatSentiment(score?: number): {
  label: string;
  colorClass: string;
  formattedScore: string;
} {
  if (typeof score !== 'number' || isNaN(score)) {
    return { label: 'Neutral', colorClass: 'text-sky-400', formattedScore: '0.00' };
  }
  const formattedScore = (score > 0 ? `+${score.toFixed(2)}` : score.toFixed(2));
  if (score >= 0.25) {
    return { label: 'Positive', colorClass: 'text-emerald-400', formattedScore };
  }
  if (score <= -0.25) {
    return { label: 'Challenging', colorClass: 'text-rose-400', formattedScore };
  }
  return { label: 'Balanced', colorClass: 'text-sky-400', formattedScore };
}
