/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { onAuthChange, loginWithGoogle, logoutUser } from './lib/firebase';
import { subscribeUserInteractions, deleteInteraction } from './lib/firestoreService';
import { AuthUser, JournalInteraction } from './types';
import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { JournalEditor } from './components/JournalEditor';
import { HistorySidebar } from './components/HistorySidebar';
import { WeeklyRetrospectiveModal } from './components/WeeklyRetrospectiveModal';
import { Menu, PanelLeftClose, PanelLeftOpen } from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  // Firestore Interactions State
  const [interactions, setInteractions] = useState<JournalInteraction[]>([]);
  const [activeInteractionId, setActiveInteractionId] = useState<string | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isWeeklyRetroOpen, setIsWeeklyRetroOpen] = useState(false);

  // Observe Firebase Auth State
  useEffect(() => {
    const unsubscribe = onAuthChange((firebaseUser) => {
      if (firebaseUser) {
        setUser({
          uid: firebaseUser.uid,
          displayName: firebaseUser.displayName,
          email: firebaseUser.email,
          photoURL: firebaseUser.photoURL,
        });
        setAuthError(null);
      } else {
        setUser(null);
        setInteractions([]);
        setActiveInteractionId(null);
      }
      setAuthLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Subscribe to Authenticated User's Isolated Firestore Interactions
  useEffect(() => {
    if (!user?.uid) {
      setInteractions([]);
      return;
    }

    const unsubscribe = subscribeUserInteractions(
      user.uid,
      (data) => {
        setInteractions(data);
      },
      (error) => {
        console.error('[App Firestore Subscription Error]:', error);
      }
    );

    return () => unsubscribe();
  }, [user?.uid]);

  const handleSignIn = async () => {
    try {
      setAuthError(null);
      await loginWithGoogle();
    } catch (err: any) {
      console.error('[Sign In Error]:', err);
      let message = 'Failed to sign in with Google.';
      if (err?.code === 'auth/popup-closed-by-user') {
        message = 'The sign-in popup was closed before completing.';
      } else if (err?.code === 'auth/popup-blocked') {
        message = 'The sign-in popup was blocked by your browser. Please allow popups for this site.';
      } else if (err?.message) {
        message = err.message;
      }
      setAuthError(message);
    }
  };

  const handleSignOut = async () => {
    try {
      await logoutUser();
      setActiveInteractionId(null);
    } catch (err: any) {
      console.error('[Sign Out Error]:', err);
    }
  };

  const handleNewEntryRequest = () => {
    setActiveInteractionId(null);
  };

  const handleSelectInteraction = (interaction: JournalInteraction) => {
    setActiveInteractionId(interaction.id);
  };

  const handleDeleteInteraction = async (id: string) => {
    if (!user) return;
    try {
      await deleteInteraction(user.uid, id);
      if (activeInteractionId === id) {
        setActiveInteractionId(null);
      }
    } catch (err: any) {
      console.error('[Delete Interaction Error]:', err);
      alert('Failed to delete reflection from Firestore: ' + (err?.message || 'Unknown error'));
    }
  };

  const handleInteractionSaved = (saved: JournalInteraction) => {
    setActiveInteractionId(saved.id);
  };

  // Find currently active interaction
  const activeInteraction = interactions.find((i) => i.id === activeInteractionId) || null;

  // Initial Auth Loading Screen
  if (authLoading) {
    return (
      <div className="min-h-screen bg-[#0F1115] text-[#F3F4F6] flex flex-col items-center justify-center space-y-4">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm font-medium text-gray-400">Verifying secure session...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0F1115] text-[#F3F4F6] flex flex-col font-sans selection:bg-indigo-500/30 selection:text-indigo-200">
      {/* Top Navigation */}
      <Navbar
        user={user}
        onSignOut={handleSignOut}
        onNewEntry={handleNewEntryRequest}
        onOpenWeeklyRetro={() => setIsWeeklyRetroOpen(true)}
        isEditorActive={Boolean(activeInteractionId)}
      />

      {/* Main View Area */}
      {!user ? (
        <LandingPage
          onSignIn={handleSignIn}
          isLoading={false}
          errorMessage={authError}
        />
      ) : (
        <div className="flex-1 flex overflow-hidden relative">
          {/* Mobile Sidebar Toggle Button */}
          <div className="md:hidden fixed bottom-5 left-5 z-40">
            <button
              type="button"
              id="btn-toggle-sidebar-mobile"
              onClick={() => setIsSidebarOpen(!isSidebarOpen)}
              className="p-3 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-xl flex items-center justify-center font-semibold cursor-pointer transition-colors"
              title="View History"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>

          {/* History Sidebar */}
          <HistorySidebar
            interactions={interactions}
            activeInteractionId={activeInteractionId}
            onSelectInteraction={handleSelectInteraction}
            onDeleteInteraction={handleDeleteInteraction}
            onNewReflection={handleNewEntryRequest}
            onOpenWeeklyRetro={() => setIsWeeklyRetroOpen(true)}
            isOpen={isSidebarOpen}
            onClose={() => setIsSidebarOpen(false)}
          />

          {/* Reflection Workspace */}
          <main className="flex-1 flex flex-col min-w-0 bg-[#0F1115]">
            <JournalEditor
              user={user}
              activeInteraction={activeInteraction}
              onInteractionSaved={handleInteractionSaved}
              onNewEntryRequest={handleNewEntryRequest}
              onOpenWeeklyRetro={() => setIsWeeklyRetroOpen(true)}
            />
          </main>

          {/* Feature 2: Weekly Retrospective Modal */}
          <WeeklyRetrospectiveModal
            isOpen={isWeeklyRetroOpen}
            onClose={() => setIsWeeklyRetroOpen(false)}
            user={user}
            onNewReflectionRequest={() => {
              setIsWeeklyRetroOpen(false);
              handleNewEntryRequest();
            }}
          />
        </div>
      )}
    </div>
  );
}
