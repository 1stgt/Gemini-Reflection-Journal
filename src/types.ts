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
  sentiment_score?: number;
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
