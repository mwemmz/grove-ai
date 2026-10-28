import React, { useEffect, useReducer, useState } from 'react';
import { Check, Play, X } from 'lucide-react';
import { Note } from '../types';
import { AppTab, GrowthRings } from './Header';
import { studyStore } from '../services/studyStore';
import { METHOD_BY_ID } from '../data/studyMethods';
import { fmtDate } from '../lib/planner';
import type { StudyPreset } from './StudyView';
import { chip } from './ui';

export interface SourceRef {
  noteId: string;
  courseCode: string;
  year: number;
  title: string;
}

interface ProgressPanelProps {
  notes: Note[];
  year: number;
  onYearChange: (year: number) => void;
  sources: SourceRef[];
  onOpenNote: (noteId: string) => void;
  onTab: (tab: AppTab) => void;
  onStartSession: (preset: StudyPreset) => void;
  afterChoose: () => void;
  onClose: () => void;
}

const label = 'mb-2 font-mono text-xs uppercase tracking-[0.08em] text-muted';

export const ProgressPanel: React.FC<ProgressPanelProps> = ({
  notes,
  year,
  onYearChange,
  sources,
  onOpenNote,
  onTab,
  onStartSession,
  afterChoose,
  onClose,
}) => {
  const [today] = useState(() => fmtDate(new Date()));
  const [, refresh] = useReducer((n: number) => n + 1, 0);

  // Plans and sessions live in the Study and Plan tabs; redraw when they change.
  useEffect(() => {
    window.addEventListener('grove-study-changed', refresh);
    return () => window.removeEventListener('grove-study-changed', refresh);
  }, []);

  const plan = studyStore.getPlan();
  const todaysBlocks = (plan?.blocks ?? []).filter((b) => b.date === today).slice(0, 4);
  const todaysSessions = studyStore.getSessions().filter((s) => fmtDate(new Date(s.date)) === today);
  const minutes = Math.round(todaysSessions.reduce((sum, s) => sum + s.actualMinutes, 0));
  const yearsCovered = new Set(notes.map((n) => n.year)).size;
  const recentNotes = [...notes].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 3);

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <h2 className="font-display text-lg text-text">Progress</h2>
        <button
          onClick={onClose}
          aria-label="Close progress panel"
          className="flex h-10 w-10 items-center justify-center rounded-md text-muted hover:bg-raised hover:text-text"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-4 pb-6">
        <section className="flex items-center gap-4 rounded-[22px] bg-surface p-4 ring-1 ring-line" aria-label="Your growth">
          <GrowthRings notes={notes} year={year} className="h-20 w-20" />
          <div className="min-w-0 text-sm text-muted">
            <label className="flex items-center gap-2">
              <span>Now in year</span>
              <select
                value={year}
                onChange={(e) => onYearChange(Number(e.target.value))}
                className="rounded-md bg-bg px-2 py-1 text-sm text-text ring-1 ring-line focus:outline-none focus:ring-accent/70"
              >
                {[1, 2, 3, 4].map((y) => (
                  <option key={y} value={y}>{y}</option>
                ))}
              </select>
            </label>
            <p className="mt-1.5">
              {notes.length} {notes.length === 1 ? 'note' : 'notes'} across {yearsCovered} {yearsCovered === 1 ? 'year' : 'years'}
            </p>
          </div>
        </section>

        <section aria-label="Today">
          <p className={label}>Today</p>
          <p className="text-text">
            {todaysSessions.length === 0
              ? 'No study sessions yet.'
              : `${minutes} min across ${todaysSessions.length} ${todaysSessions.length === 1 ? 'session' : 'sessions'}`}
          </p>
          {todaysBlocks.length > 0 ? (
            <ul className="mt-3 divide-y divide-line">
              {todaysBlocks.map((b) => (
                <li key={b.id} className="flex items-center gap-3 py-2.5">
                  <span
                    aria-hidden
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ${
                      b.done ? 'bg-accent text-ink ring-accent' : 'ring-line'
                    }`}
                  >
                    {b.done && <Check className="h-3 w-3" />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className={`truncate text-sm ${b.done ? 'text-muted line-through' : 'text-text'}`}>{b.topicName}</p>
                    <p className="font-mono text-xs text-muted">
                      {b.start} · {METHOD_BY_ID[b.methodId]?.name ?? b.methodId}
                    </p>
                  </div>
                  {!b.done && (
                    <button
                      onClick={() => {
                        onStartSession({ methodId: b.methodId, courseId: b.courseId, topicName: b.topicName });
                        afterChoose();
                      }}
                      aria-label={`Start ${b.topicName}`}
                      className="flex h-9 w-9 items-center justify-center rounded-md text-accent hover:bg-raised"
                    >
                      <Play className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-1 text-sm text-muted">
              {plan ? 'Nothing planned for today.' : 'No timetable yet.'}{' '}
              <button
                onClick={() => {
                  onTab('plan');
                  afterChoose();
                }}
                className="text-accent underline-offset-4 hover:underline"
              >
                {plan ? 'See your plan' : 'Build one'}
              </button>
            </p>
          )}
        </section>

        {sources.length > 0 && (
          <section aria-label="Sources in this answer">
            <p className={label}>Used in this answer</p>
            <div className="flex flex-wrap gap-2">
              {sources.map((s) => (
                <button
                  key={s.noteId}
                  onClick={() => {
                    onOpenNote(s.noteId);
                    afterChoose();
                  }}
                  className={`${chip} max-w-full text-left hover:brightness-125`}
                >
                  <span className="truncate">Y{s.year} · {s.courseCode} · {s.title}</span>
                </button>
              ))}
            </div>
          </section>
        )}

        <section aria-label="Recent notes">
          <p className={label}>Recent notes</p>
          <ul className="divide-y divide-line">
            {recentNotes.map((n) => (
              <li key={n.id}>
                <button
                  onClick={() => {
                    onOpenNote(n.id);
                    afterChoose();
                  }}
                  className="block min-h-11 w-full py-2 text-left"
                >
                  <span className="block truncate text-sm text-text">{n.title}</span>
                  <span className="font-mono text-xs text-muted">Year {n.year}</span>
                </button>
              </li>
            ))}
            {recentNotes.length === 0 && <li className="py-2 text-sm text-muted">No notes yet.</li>}
          </ul>
        </section>
      </div>
    </div>
  );
};
