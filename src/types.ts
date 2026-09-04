export type ReflectionMode = 'reflection' | 'summary' | 'brainstorm' | 'action_items';

export interface JournalTurn {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: string;
  mode?: ReflectionMode;
  modelUsed?: string;
}

export interface JournalInteraction {
  id: string;
  userId: string;
  userEmail?: string | null;
  title: string;
  initialJournalText: string;
  initialMode: ReflectionMode;
  initialGeminiResponse: string;
  initialModelUsed: string;
  turns: JournalTurn[];
  mood?: string;
  primary_mood?: string;
  sentiment_score?: number;
  energy_level?: number;
  cognitive_friction?: number;
  actionable_reframe?: string;
  createdAt: number;
  updatedAt: number;
}

/**
 * Journal entry metric document persisted under /users/{userId}/entries
 */
export interface JournalEntryDocument {
  id: string;
  userId: string;
  userEmail?: string | null;
  title: string;
  text: string;
  primary_mood: string;
  mood: string;
  sentiment_score: number; // float (-1.0 to 1.0)
  energy_level: number; // integer (1 to 10)
  cognitive_friction: number; // float (0.0 to 1.0)
  actionable_reframe?: string;
  createdAt: number;
  updatedAt: number;
}

export interface AuthUser {
  uid: string;
  displayName: string | null;
  email: string | null;
  photoURL: string | null;
}

export interface WeeklyRetrospective {
  id: string;
  userId: string;
  userEmail?: string | null;
  title: string;
  startDate: number;
  endDate: number;
  entryCount: number;
  recurringThemes: string[];
  personalWins: string[];
  recommendedFocus: string[];
  narrativeSummary: string;
  dominantMood?: string;
  averageSentiment?: number;
  modelUsed?: string;
  createdAt: number;
}

/**
 * Weekly Executive Meta-Review persisted under /users/{userId}/meta_reviews
 */
export interface ExecutiveMetaReview {
  id?: string;
  userId: string;
  userEmail?: string | null;
  title: string;
  startDate: number;
  endDate: number;
  entryCount: number;
  behavioralBottlenecks: string[];
  cognitiveLoops: string[];
  productivityTriggers: string[];
  wellbeingTriggers: string[];
  sundaySynthesis: {
    summary: string;
    strategicPriorities: string[];
  };
  metricsSummary: {
    averageSentiment: number;
    averageEnergy: number;
    averageFriction: number;
    peakEnergyDay: string;
    frictionTrend: 'rising' | 'falling' | 'stable';
  };
  modelUsed?: string;
  createdAt: number;
}

export type AnalyticsTimeRange = '7d' | '30d';
