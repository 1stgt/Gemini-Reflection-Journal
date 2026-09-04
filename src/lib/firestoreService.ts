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
import { JournalInteraction, WeeklyRetrospective } from '../types';

/**
 * Save or create a new user interaction document.
 * Strictly stored under /users/{userId}/interactions/{interactionId}
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
  return interactionId;
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
