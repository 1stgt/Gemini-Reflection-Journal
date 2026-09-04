import {
  collection,
  doc,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  getDocs,
} from 'firebase/firestore';
import { db, stripUndefined } from './firebase';
import { JournalInteraction, WeeklyRetrospective, JournalEntryDocument, ExecutiveMetaReview } from '../types';

/**
 * Save or create a new user interaction document.
 * Strictly stored under /users/{userId}/interactions/{interactionId}
 * Also mirrors numeric metrics into /users/{userId}/entries/{id} for longitudinal analysis.
 */
export async function saveInteraction(
  userId: string,
  interactionData: Omit<JournalInteraction, 'id'>,
  customId?: string
): Promise<string> {
  if (!userId) {
    throw new Error('User must be authenticated to persist interactions.');
  }

  const interactionsCol = collection(db, 'users', userId, 'interactions');
  const interactionDoc = customId ? doc(interactionsCol, customId) : doc(interactionsCol);
  const interactionId = interactionDoc.id;

  const sanitized = stripUndefined({
    ...interactionData,
    id: interactionId,
    userId,
  });

  await setDoc(interactionDoc, sanitized);

  // Synchronize to /users/{userId}/entries as requested by longitudinal analytics specification
  try {
    const entriesCol = collection(db, 'users', userId, 'entries');
    const entryDoc = doc(entriesCol, interactionId);
    const entryPayload: JournalEntryDocument = stripUndefined({
      id: interactionId,
      userId,
      userEmail: interactionData.userEmail || null,
      title: interactionData.title || 'Journal Reflection',
      text: interactionData.initialJournalText || '',
      primary_mood: interactionData.primary_mood || interactionData.mood || 'Reflective',
      mood: interactionData.mood || interactionData.primary_mood || 'Reflective',
      sentiment_score: typeof interactionData.sentiment_score === 'number' ? interactionData.sentiment_score : 0.0,
      energy_level: typeof interactionData.energy_level === 'number' ? interactionData.energy_level : 6,
      cognitive_friction: typeof interactionData.cognitive_friction === 'number' ? interactionData.cognitive_friction : 0.3,
      actionable_reframe: interactionData.actionable_reframe || undefined,
      createdAt: interactionData.createdAt || Date.now(),
      updatedAt: interactionData.updatedAt || Date.now(),
    });
    await setDoc(entryDoc, entryPayload);
  } catch (syncErr) {
    console.warn('[Firestore] Note: Entry mirror failed gracefully:', syncErr);
  }

  return interactionId;
}

/**
 * Save directly to /users/{userId}/entries/{entryId}
 */
export async function saveEntry(
  userId: string,
  entryData: Omit<JournalEntryDocument, 'id'>,
  customId?: string
): Promise<string> {
  if (!userId) {
    throw new Error('User must be authenticated to persist entries.');
  }

  const entriesCol = collection(db, 'users', userId, 'entries');
  const entryDoc = customId ? doc(entriesCol, customId) : doc(entriesCol);
  const entryId = entryDoc.id;

  const sanitized = stripUndefined({
    ...entryData,
    id: entryId,
    userId,
  });

  await setDoc(entryDoc, sanitized);
  return entryId;
}

/**
 * Fetch entries over arbitrary time ranges (e.g. 7-day, 30-day).
 * Queries /users/{userId}/entries with seamless fallback to /users/{userId}/interactions
 */
export async function getUserEntriesRange(
  userId: string,
  rangeDays: number = 7
): Promise<JournalEntryDocument[]> {
  if (!userId) {
    throw new Error('User must be authenticated to query entries.');
  }

  const startTime = Date.now() - rangeDays * 24 * 60 * 60 * 1000;
  const entries: JournalEntryDocument[] = [];

  // 1. First check /users/{userId}/entries
  try {
    const entriesCol = collection(db, 'users', userId, 'entries');
    const snapshot = await getDocs(entriesCol);
    snapshot.forEach((snap) => {
      const data = snap.data() as JournalEntryDocument;
      if ((data.createdAt || 0) >= startTime) {
        entries.push({
          ...data,
          id: snap.id,
        });
      }
    });
  } catch (err) {
    console.warn('[Firestore] Query /entries warning:', err);
  }

  // 2. If no entries found in /entries, read from /interactions to support existing sessions
  if (entries.length === 0) {
    try {
      const interactionsCol = collection(db, 'users', userId, 'interactions');
      const snapshot = await getDocs(interactionsCol);
      snapshot.forEach((snap) => {
        const data = snap.data() as JournalInteraction;
        if ((data.createdAt || 0) >= startTime) {
          const sent = typeof data.sentiment_score === 'number' ? data.sentiment_score : 0.0;
          entries.push({
            id: snap.id,
            userId: data.userId,
            userEmail: data.userEmail,
            title: data.title,
            text: data.initialJournalText,
            primary_mood: data.primary_mood || data.mood || 'Reflective',
            mood: data.mood || data.primary_mood || 'Reflective',
            sentiment_score: sent,
            energy_level: typeof data.energy_level === 'number' ? data.energy_level : (sent >= 0.3 ? 8 : sent <= -0.3 ? 4 : 6),
            cognitive_friction: typeof data.cognitive_friction === 'number' ? data.cognitive_friction : (sent <= -0.3 ? 0.7 : sent >= 0.3 ? 0.2 : 0.4),
            actionable_reframe: data.actionable_reframe,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
          });
        }
      });
    } catch (err) {
      console.warn('[Firestore] Query /interactions fallback warning:', err);
    }
  }

  // Sort ascending by creation time for sequential charting
  entries.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  return entries;
}

/**
 * Update an existing interaction document with new turns or details.
 */
export async function updateInteraction(
  userId: string,
  interactionId: string,
  updates: Partial<JournalInteraction>
): Promise<void> {
  if (!userId || !interactionId) {
    throw new Error('Valid userId and interactionId required.');
  }

  const interactionDoc = doc(db, 'users', userId, 'interactions', interactionId);
  const sanitized = stripUndefined({
    ...updates,
    updatedAt: Date.now(),
  });

  await updateDoc(interactionDoc, sanitized);
}

/**
 * Delete an interaction document permanently.
 */
export async function deleteInteraction(userId: string, interactionId: string): Promise<void> {
  if (!userId || !interactionId) {
    throw new Error('Valid userId and interactionId required.');
  }

  const interactionDoc = doc(db, 'users', userId, 'interactions', interactionId);
  await deleteDoc(interactionDoc);
}

/**
 * Subscribe in real-time to the authenticated user's interactions collection.
 * Sorted client-side by updatedAt descending to prevent index-building latency.
 */
export function subscribeUserInteractions(
  userId: string,
  onData: (items: JournalInteraction[]) => void,
  onError: (error: any) => void
): () => void {
  if (!userId) {
    onData([]);
    return () => {};
  }

  const colRef = collection(db, 'users', userId, 'interactions');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: JournalInteraction[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as JournalInteraction;
        items.push({
          ...data,
          id: docSnap.id,
        });
      });

      // Sort by updatedAt desc
      items.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
      onData(items);
    },
    (err) => {
      console.error('[Firestore Subscription Error]:', err);
      onError(err);
    }
  );
}

/**
 * Retrieve user's journal entries from the last 7 days.
 * Strictly isolated to the authenticated user's subcollection.
 */
export async function getUserEntriesLast7Days(userId: string): Promise<JournalInteraction[]> {
  if (!userId) {
    throw new Error('User must be authenticated to retrieve entries.');
  }

  const colRef = collection(db, 'users', userId, 'interactions');
  const snapshot = await getDocs(colRef);
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const entries: JournalInteraction[] = [];
  snapshot.forEach((docSnap) => {
    const data = docSnap.data() as JournalInteraction;
    const createdAt = data.createdAt || 0;
    if (createdAt >= sevenDaysAgo) {
      entries.push({
        ...data,
        id: docSnap.id,
      });
    }
  });

  // Sort ascending by creation time for chronological synthesis
  entries.sort((a, b) => (a.createdAt || 0) - (b.createdAt || 0));
  return entries;
}

/**
 * Save a Weekly Retrospective Milestone.
 * Stored strictly under /users/{userId}/retrospectives/{retrospectiveId}
 */
export async function saveRetrospective(
  userId: string,
  retrospectiveData: Omit<WeeklyRetrospective, 'id'>,
  customId?: string
): Promise<string> {
  if (!userId) {
    throw new Error('User must be authenticated to persist weekly milestones.');
  }

  const retrosCol = collection(db, 'users', userId, 'retrospectives');
  const retroDoc = customId ? doc(retrosCol, customId) : doc(retrosCol);
  const retroId = retroDoc.id;

  const sanitized = stripUndefined({
    ...retrospectiveData,
    id: retroId,
    userId,
  });

  await setDoc(retroDoc, sanitized);
  return retroId;
}

/**
 * Subscribe in real-time to the authenticated user's saved weekly retrospectives.
 */
export function subscribeUserRetrospectives(
  userId: string,
  onData: (items: WeeklyRetrospective[]) => void,
  onError: (error: any) => void
): () => void {
  if (!userId) {
    onData([]);
    return () => {};
  }

  const colRef = collection(db, 'users', userId, 'retrospectives');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: WeeklyRetrospective[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as WeeklyRetrospective;
        items.push({
          ...data,
          id: docSnap.id,
        });
      });

      // Sort by createdAt descending
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onData(items);
    },
    (err) => {
      console.error('[Firestore Retrospectives Subscription Error]:', err);
      onError(err);
    }
  );
}

/**
 * Delete a saved weekly retrospective milestone.
 */
export async function deleteRetrospective(userId: string, retrospectiveId: string): Promise<void> {
  if (!userId || !retrospectiveId) {
    throw new Error('Valid userId and retrospectiveId required.');
  }

  const retroDoc = doc(db, 'users', userId, 'retrospectives', retrospectiveId);
  await deleteDoc(retroDoc);
}

/**
 * Save an Executive Meta-Review report.
 * Stored strictly under /users/{userId}/meta_reviews/{reviewId}
 */
export async function saveExecutiveMetaReview(
  userId: string,
  reviewData: Omit<ExecutiveMetaReview, 'id'>,
  customId?: string
): Promise<string> {
  if (!userId) {
    throw new Error('User must be authenticated to persist executive meta-reviews.');
  }

  const reviewsCol = collection(db, 'users', userId, 'meta_reviews');
  const reviewDoc = customId ? doc(reviewsCol, customId) : doc(reviewsCol);
  const reviewId = reviewDoc.id;

  const sanitized = stripUndefined({
    ...reviewData,
    id: reviewId,
    userId,
  });

  await setDoc(reviewDoc, sanitized);
  return reviewId;
}

/**
 * Subscribe in real-time to the authenticated user's executive meta-reviews.
 */
export function subscribeUserMetaReviews(
  userId: string,
  onData: (items: ExecutiveMetaReview[]) => void,
  onError: (error: any) => void
): () => void {
  if (!userId) {
    onData([]);
    return () => {};
  }

  const colRef = collection(db, 'users', userId, 'meta_reviews');

  return onSnapshot(
    colRef,
    (snapshot) => {
      const items: ExecutiveMetaReview[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data() as ExecutiveMetaReview;
        items.push({
          ...data,
          id: docSnap.id,
        });
      });

      // Sort by createdAt descending
      items.sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
      onData(items);
    },
    (err) => {
      console.error('[Firestore Meta-Reviews Subscription Error]:', err);
      onError(err);
    }
  );
}

/**
 * Delete an Executive Meta-Review report.
 */
export async function deleteExecutiveMetaReview(userId: string, reviewId: string): Promise<void> {
  if (!userId || !reviewId) {
    throw new Error('Valid userId and reviewId required.');
  }

  const reviewDoc = doc(db, 'users', userId, 'meta_reviews', reviewId);
  await deleteDoc(reviewDoc);
}
