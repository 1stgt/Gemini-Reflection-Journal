import React from 'react';
import { AuthUser } from '../types';
import { Sparkles, ShieldCheck, LogOut, PlusCircle, CalendarRange } from 'lucide-react';

interface NavbarProps {
  user: AuthUser | null;
  onSignOut: () => void;
  onNewEntry: () => void;
  onOpenWeeklyRetro?: () => void;
  isEditorActive: boolean;
}

export const Navbar: React.FC<NavbarProps> = ({
  user,
  onSignOut,
  onNewEntry,
  onOpenWeeklyRetro,
  isEditorActive,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#111827] border-b border-[#1F2937] text-[#F3F4F6]">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center font-bold text-lg text-white shadow-md">
            L
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-semibold tracking-tight text-[#F3F4F6]">
                Reflection Journal
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-900/30 text-indigo-400 border border-indigo-500/30">
                <Sparkles className="w-3 h-3" />
                Gemini 3.6 Flash
              </span>
            </div>
            <p className="text-[11px] text-gray-400 hidden sm:block">
              Private, user-isolated cognitive reflections
            </p>
          </div>
        </div>

        {/* User Status and Controls */}
        {user ? (
          <div className="flex items-center gap-4 sm:gap-6">
            {/* Isolation indicator */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-800/50 text-xs text-emerald-400">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span>User Data Isolated</span>
            </div>

            {onOpenWeeklyRetro && (
              <button
                type="button"
                id="btn-weekly-retro"
                onClick={onOpenWeeklyRetro}
                className="py-2 sm:py-2.5 px-3 sm:px-3.5 bg-[#1F2937] hover:bg-[#283548] text-indigo-300 hover:text-white border border-indigo-500/30 hover:border-indigo-500/60 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                title="Synthesize 7-day retrospective"
              >
                <CalendarRange className="w-4 h-4 text-indigo-400" />
                <span className="hidden md:inline">Weekly Retrospective</span>
                <span className="md:hidden">Weekly</span>
              </button>
            )}

            <button
              type="button"
              id="btn-new-reflection"
              onClick={onNewEntry}
              className="py-2 sm:py-2.5 px-3.5 sm:px-4 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-center gap-2 transition-colors cursor-pointer shadow-md"
            >
              <PlusCircle className="w-4 h-4" />
              <span>New Reflection</span>
            </button>

            {/* Profile badge */}
            <div className="flex items-center gap-3 pl-2 sm:pl-3 border-l border-[#1F2937]">
              <div className="hidden lg:flex flex-col items-end text-right">
                <span className="text-sm font-medium text-white truncate max-w-[140px]">
                  {user.displayName || 'Authenticated User'}
                </span>
                <span className="text-xs text-gray-500 truncate max-w-[140px]">
                  {user.email}
                </span>
              </div>
              {user.photoURL ? (
                <img
                  src={user.photoURL}
                  alt={user.displayName || 'User profile'}
                  referrerPolicy="no-referrer"
                  className="w-10 h-10 rounded-full border border-[#4B5563] object-cover"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-[#374151] border border-[#4B5563] flex items-center justify-center overflow-hidden italic text-gray-300 font-semibold text-sm">
                  {user.displayName
                    ? user.displayName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
                    : 'U'}
                </div>
              )}
            </div>

            <button
              type="button"
              id="btn-sign-out"
              onClick={onSignOut}
              title="Sign Out"
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-[#1F2937] transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
};
