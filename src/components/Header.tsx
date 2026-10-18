import React from 'react';
import { Settings } from 'lucide-react';
import { Note } from '../types';

export type AppTab = 'remember' | 'study' | 'plan' | 'profile' | 'portfolio' | 'quiz' | 'blueprints' | 'tutoring';

const TABS: { id: AppTab; label: string }[] = [
  { id: 'remember', label: 'Remember' },
  { id: 'study', label: 'Study' },
  { id: 'plan', label: 'Plan' },
  { id: 'profile', label: 'How I learn' },
  { id: 'portfolio', label: 'Portfolio' },
  { id: 'quiz', label: 'Recall' },
  { id: 'blueprints', label: 'Blueprints' },
  { id: 'tutoring', label: 'Peer tutoring' },
];

const RADII = [14, 26, 38, 50];

/** One ring per year of study. Thicker ring = more notes. Dashed = years still ahead. */
function GrowthRings({ notes, year }: { notes: Note[]; year: number }) {
  return (
    <svg viewBox="0 0 120 120" className="h-28 w-28 shrink-0" role="img" aria-label="Growth rings, one per year of study">
      {[4, 3, 2, 1].map((y) => {
        const count = notes.filter((n) => n.year === y).length;
        const future = y > year;
        return (
          <circle
            key={y}
            cx={60}
            cy={60}
            r={RADII[y - 1]}
            fill="none"
            stroke={future ? 'var(--color-line)' : 'var(--color-accent)'}
            strokeWidth={future ? 1.5 : 2 + Math.min(7, count * 1.1)}
            strokeOpacity={future ? 1 : 0.3 + 0.14 * y}
            strokeDasharray={future ? '2 4' : undefined}
          />
        );
      })}
      <circle cx={60} cy={60} r={4} fill="var(--color-warn)" />
    </svg>
  );
}

interface HeaderProps {
  notes: Note[];
  year: number;
  onYearChange: (year: number) => void;
  onOpenSettings: () => void;
}

export const Header: React.FC<HeaderProps> = ({ notes, year, onYearChange, onOpenSettings }) => {
  const yearsCovered = new Set(notes.map((n) => n.year)).size;
  return (
    <header className="flex flex-wrap items-center justify-between gap-x-5 gap-y-4">
      <div className="min-w-0 flex-1 basis-64">
        <div className="flex items-start justify-between gap-3">
          <h1 className="font-display text-[34px] leading-tight tracking-tight text-text">Grove</h1>
          <button
            onClick={onOpenSettings}
            aria-label="Settings"
            className="flex h-10 w-10 items-center justify-center rounded-md text-muted ring-1 ring-line hover:bg-raised hover:text-text sm:hidden"
          >
            <Settings className="h-4 w-4" />
          </button>
        </div>
        <p className="mt-1 max-w-[34ch] text-muted">
          A study companion you start in first year and keep until graduation. It remembers, and it learns how you learn.
        </p>
      </div>

      <div className="flex items-center gap-3.5">
        <GrowthRings notes={notes} year={year} />
        <div className="grid gap-1.5 text-[13px] text-muted">
          <label className="flex items-center gap-2">
            <span>Now in year</span>
            <select
              value={year}
              onChange={(e) => onYearChange(Number(e.target.value))}
              className="rounded-md bg-surface px-2 py-1.5 text-sm text-text ring-1 ring-line focus:outline-none focus:ring-accent/70"
            >
              {[1, 2, 3, 4].map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </label>
          <p>
            {notes.length} {notes.length === 1 ? 'note' : 'notes'} across {yearsCovered} {yearsCovered === 1 ? 'year' : 'years'}
          </p>
          <button
            onClick={onOpenSettings}
            className="hidden w-fit text-left text-muted underline-offset-4 hover:text-text hover:underline sm:block"
          >
            Settings
          </button>
        </div>
      </div>
    </header>
  );
};

export const Tabs: React.FC<{ active: AppTab; onChange: (tab: AppTab) => void }> = ({ active, onChange }) => (
  <nav
    role="tablist"
    aria-label="Sections"
    className="no-scrollbar mb-5 mt-6 flex gap-1 overflow-x-auto border-b border-line"
  >
    {TABS.map((t) => (
      <button
        key={t.id}
        role="tab"
        aria-selected={active === t.id}
        onClick={() => onChange(t.id)}
        className={`-mb-px min-h-11 whitespace-nowrap border-b-2 px-3.5 font-medium transition-colors ${
          active === t.id ? 'border-accent text-text' : 'border-transparent text-muted hover:text-text'
        }`}
      >
        {t.label}
      </button>
    ))}
  </nav>
);
