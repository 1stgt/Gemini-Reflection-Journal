import React, { useState } from 'react';
import { Sparkles, ShieldCheck, Lock, ArrowRight, MessageSquareCode, Database, CheckCircle2, AlertCircle } from 'lucide-react';

interface LandingPageProps {
  onSignIn: () => Promise<void>;
  isLoading: boolean;
  errorMessage: string | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onSignIn,
  isLoading,
  errorMessage,
}) => {
  const [internalLoading, setInternalLoading] = useState(false);

  const handleSignInClick = async () => {
    try {
      setInternalLoading(true);
      await onSignIn();
    } finally {
      setInternalLoading(false);
    }
  };

  const isBusy = isLoading || internalLoading;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-[#0F1115] text-[#F3F4F6] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl w-full mx-auto text-center space-y-8">
        {/* Security / Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-indigo-900/30 border border-indigo-500/30 text-indigo-300 text-xs font-medium">
          <ShieldCheck className="w-4 h-4 text-indigo-400" />
          <span>Authenticated Private Sandbox &bull; Cloud Firestore Isolation</span>
        </div>

        {/* Main Headline */}
        <div className="space-y-4">
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-[#F3F4F6] font-serif leading-tight">
            Conversational Reflection <br />
            <span className="text-indigo-400">Powered by Gemini 3.6 Flash</span>
          </h1>
          <p className="max-w-2xl mx-auto text-base sm:text-lg text-gray-400 leading-relaxed">
            Record journal entries, unpack complex thoughts, and engage in multi-turn
            philosophical dialogues. All entries are encrypted and strictly isolated to your verified identity.
          </p>
        </div>

        {/* Error Notification */}
        {errorMessage && (
          <div className="max-w-md mx-auto p-4 rounded-xl bg-rose-950/60 border border-rose-800/80 text-rose-200 text-sm flex items-start gap-3 text-left">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-medium">Authentication Notice</p>
              <p className="text-xs text-rose-300">{errorMessage}</p>
            </div>
          </div>
        )}

        {/* Primary CTA: Google Sign In */}
        <div className="pt-2 flex flex-col items-center justify-center gap-4">
          <button
            type="button"
            id="btn-google-sign-in"
            disabled={isBusy}
            onClick={handleSignInClick}
            className="w-full sm:w-auto min-w-[280px] inline-flex items-center justify-center gap-3 px-6 py-3.5 rounded-xl font-semibold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 transition-all shadow-xl shadow-indigo-950/50 hover:shadow-indigo-500/20 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isBusy ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>Authenticating with Google...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Sign In with Google</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
          <p className="text-xs text-gray-500 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-gray-500" />
            Zero password storage. Federated identity verified via Firebase Auth.
          </p>
        </div>

        {/* Feature Grid / Architectural Pillars */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-10 text-left">
          {/* Card 1 */}
          <div className="p-6 rounded-2xl bg-[#111827] border border-[#1F2937] shadow-lg space-y-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-900/30 border border-indigo-500/30 flex items-center justify-center text-indigo-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-[#F3F4F6]">Multi-Turn Gemini Engine</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Converse with Gemini 3.6 Flash. Request deep philosophical reflections, executive summaries, brainstorming, or structured action items.
            </p>
          </div>

          {/* Card 2 */}
          <div className="p-6 rounded-2xl bg-[#111827] border border-[#1F2937] shadow-lg space-y-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-900/30 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Database className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-[#F3F4F6]">Strict User Isolation</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Every document is stored under <code className="text-xs bg-[#1F2937] px-1.5 py-0.5 rounded text-indigo-300">/users/{'{userId}'}/interactions</code> with strict owner-only Firestore security rules.
            </p>
          </div>

          {/* Card 3 */}
          <div className="p-6 rounded-2xl bg-[#111827] border border-[#1F2937] shadow-lg space-y-3">
            <div className="w-10 h-10 rounded-xl bg-sky-900/30 border border-sky-500/30 flex items-center justify-center text-sky-400">
              <MessageSquareCode className="w-5 h-5" />
            </div>
            <h3 className="text-base font-semibold text-[#F3F4F6]">Continuous Dialogue History</h3>
            <p className="text-sm text-gray-400 leading-relaxed">
              Pick up previous journal reflections anytime. Revisit past breakthroughs, review synthesized action steps, or continue the conversational thread.
            </p>
          </div>
        </div>

        {/* Security Directives Checklist */}
        <div className="p-5 rounded-2xl bg-[#111827]/80 border border-[#1F2937] text-xs text-gray-400 flex flex-wrap items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>OWASP-Compliant Input Sanitization</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Zero Browser API Key Exposure</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Resilient 4-Model Fallback Ladder</span>
          </div>
        </div>
      </div>
    </div>
  );
};
