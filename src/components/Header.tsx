import React from 'react';
import {
  BookOpen,
  Briefcase,
  CalendarDays,
  Compass,
  House,
  Cpu,
  Layers,
  Library,
  NotebookText,
  ScrollText,
  Sprout,
  Timer,
  Users,
  type LucideIcon,
} from 'lucide-react';
import { Note } from '../types';

export type AppTab = 'today' | 'remember' | 'notes' | 'papers' | 'library' | 'visuals' | 'study' | 'plan' | 'profile' | 'portfolio' | 'quiz' | 'blueprints' | 'tutoring';

export interface NavItem {
  id: AppTab;
  label: string;
  icon: LucideIcon;
}

/** The places a student goes every week. */
export const PRIMARY_NAV: NavItem[] = [
  { id: 'today', label: 'Today', icon: House },
  { id: 'notes', label: 'Notes', icon: NotebookText },
  { id: 'papers', label: 'Past papers', icon: ScrollText },
  { id: 'remember', label: 'Ask', icon: BookOpen },
  { id: 'study', label: 'Study', icon: Timer },
  { id: 'plan', label: 'Plan', icon: CalendarDays },
];

/** Useful, but tucked away so the sidebar stays calm. */
export const MORE_NAV: NavItem[] = [
  { id: 'quiz', label: 'Recall', icon: Layers },
  { id: 'visuals', label: 'Visuals', icon: Cpu },
  { id: 'library', label: 'Library', icon: Library },
  { id: 'profile', label: 'How I learn', icon: Sprout },
  { id: 'portfolio', label: 'Portfolio', icon: Briefcase },
  { id: 'blueprints', label: 'Blueprints', icon: Compass },
  { id: 'tutoring', label: 'Peer tutoring', icon: Users },
];

export const TAB_LABEL: Record<AppTab, string> = Object.fromEntries(
  [...PRIMARY_NAV, ...MORE_NAV].map((n) => [n.id, n.label])
) as Record<AppTab, string>;

const RADII = [14, 26, 38, 50];

/** One ring per year of study. Thicker ring = more notes. Dashed = years still ahead. */
export function GrowthRings({ notes, year, className = 'h-28 w-28' }: { notes: Note[]; year: number; className?: string }) {
  return (
    <svg viewBox="0 0 120 120" className={`${className} shrink-0`} role="img" aria-label="Growth rings, one per year of study">
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
