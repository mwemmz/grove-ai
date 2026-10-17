import React from 'react';
import { 
  Sparkles, 
  BookOpen, 
  Brain, 
  GraduationCap, 
  Repeat, 
  Settings, 
  Flame,
  Layers,
  Compass,
  Users
} from 'lucide-react';
import { LearningProfile } from '../types';

export type AppTab = 'chat' | 'notes' | 'blueprints' | 'tutoring' | 'profile' | 'portfolio' | 'quiz';

interface HeaderProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
  profile: LearningProfile;
  totalNotes: number;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  profile,
  totalNotes,
  onOpenSettings,
}) => {
  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-slate-950/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-3 py-2.5 sm:px-6">
        
        {/* Logo and Tree Rings Motif */}
        <div className="flex items-center gap-3">
          <div className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500/20 via-teal-500/10 to-blue-500/20 border border-emerald-500/30 shadow-inner">
            {/* Concentric Tree Rings representing Years 1-4 */}
            <div className="absolute inset-1 rounded-full border border-emerald-500/30" />
            <div className="absolute inset-2 rounded-full border border-teal-500/40" />
            <div className="absolute inset-3 rounded-full border border-blue-500/50" />
            <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400/80 ring-pulse-slow" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-bold tracking-tight text-white">Grove</span>
              <span className="rounded-md bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-400 border border-emerald-500/20">
                Year {profile.currentYear}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 hidden sm:block">
              Study NotebookLM & Cohort Mentorship
            </p>
          </div>
        </div>

        {/* Center Navigation Tabs */}
        <nav className="flex items-center gap-1 rounded-xl bg-slate-900/90 p-1 border border-slate-800/80 shadow-lg shadow-black/20 overflow-x-auto">
          <button
            onClick={() => setActiveTab('chat')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'chat'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Sparkles className="h-3.5 w-3.5 text-emerald-300" />
            <span>Ask Grove</span>
          </button>

          <button
            onClick={() => setActiveTab('notes')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'notes'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BookOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Degree Memory</span>
            <span className="sm:hidden">Notes</span>
            <span className="rounded-full bg-slate-800 px-1.5 py-0.2 text-[10px] text-slate-300">
              {totalNotes}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('blueprints')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'blueprints'
                ? 'bg-amber-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Compass className="h-3.5 w-3.5 text-amber-300" />
            <span>A+ Blueprints</span>
          </button>

          <button
            onClick={() => setActiveTab('tutoring')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'tutoring'
                ? 'bg-teal-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Users className="h-3.5 w-3.5 text-teal-300" />
            <span>Peer Tutoring</span>
          </button>

          <button
            onClick={() => setActiveTab('profile')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'profile'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Brain className="h-3.5 w-3.5" />
            <span className="hidden md:inline">How I Learn</span>
          </button>

          <button
            onClick={() => setActiveTab('portfolio')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'portfolio'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <GraduationCap className="h-3.5 w-3.5" />
            <span className="hidden lg:inline">Portfolio & CV</span>
          </button>

          <button
            onClick={() => setActiveTab('quiz')}
            className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all ${
              activeTab === 'quiz'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Repeat className="h-3.5 w-3.5" />
            <span className="hidden xl:inline">Recall</span>
          </button>
        </nav>

        {/* Right Action Bar */}
        <div className="flex items-center gap-3">
          {/* Study Streak */}
          <div className="hidden lg:flex items-center gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-400 border border-amber-500/20">
            <Flame className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            <span>{profile.studyStreaksDays}d streak</span>
          </div>

          {/* Academic Breadcrumb */}
          <div className="hidden 2xl:flex items-center gap-1 text-xs text-slate-400">
            <Layers className="h-3.5 w-3.5 text-emerald-400" />
            <span>{profile.degreeName}</span>
          </div>

          {/* Settings Trigger */}
          <button
            onClick={onOpenSettings}
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-800 bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800 hover:border-slate-700 transition"
            title="Settings & Data Management"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>

      </div>
    </header>
  );
};
