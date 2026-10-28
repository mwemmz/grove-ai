/* What the memory model says: the notes the student is closest to forgetting, weakest first. */
import { ArrowRight } from 'lucide-react';
import { masteryByNote } from '../services/memory';
import type { Flashcard, Note } from '../types';

const tone = (r: number) => (r >= 0.85 ? 'bg-accent' : r >= 0.7 ? 'bg-accent/70' : 'bg-warn');

export function MemoryStrength({
  flashcards,
  notes,
  onOpenNote,
  onReview,
  limit = 3,
  compact = false,
}: {
  flashcards: Flashcard[];
  notes: Note[];
  onOpenNote: (id: string) => void;
  onReview?: () => void;
  limit?: number;
  compact?: boolean;
}) {
  const all = masteryByNote(flashcards, notes);
  if (!all.length) return null;
  const weakest = all.filter((m) => m.recall < 0.95).slice(0, limit);
  const due = all.reduce((n, m) => n + m.due, 0);
  if (!weakest.length && !due) return null;
  const strip = (t: string) => t.replace(/^(unit|week|chapter|lecture|topic)\s*[\d.]+\s*[·:\-]\s*/i, '');

  return (
    <section aria-label="Memory strength" className={compact ? 'space-y-2' : 'glass space-y-3 rounded-[24px] p-5 ring-1 ring-line/80'}>
      <div className="flex items-end justify-between gap-3">
        <div>
          <p className={compact ? 'font-mono text-xs uppercase tracking-[0.08em] text-muted' : 'font-display text-lg text-text'}>Strengthen next</p>
          {!compact && <p className="text-sm text-muted">The notes you are closest to forgetting, from your flashcard history.</p>}
        </div>
        {onReview && due > 0 && (
          <button onClick={onReview} className="nudge inline-flex shrink-0 items-center gap-1.5 rounded-full bg-accent px-3.5 py-1.5 text-sm font-semibold text-ink">
            Review {due} <ArrowRight aria-hidden className="h-4 w-4" />
          </button>
        )}
      </div>
      {!weakest.length && <p className="text-sm text-muted">Everything you have reviewed is still fresh.</p>}
      <ul className="space-y-1.5">
        {weakest.map((m) => {
          const pct = Math.round(m.recall * 100);
          return (
            <li key={m.note.id}>
              <button onClick={() => onOpenNote(m.note.id)} className="w-full rounded-2xl px-3 py-2 text-left hover:bg-raised/60">
                <span className="flex items-baseline justify-between gap-3 text-sm">
                  <span className="min-w-0 truncate text-text">{strip(m.note.title)}</span>
                  <span className="shrink-0 font-mono text-xs text-muted">{pct}% recall</span>
                </span>
                <span aria-hidden className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-raised">
                  <span className={`fill-grow block h-full rounded-full ${tone(m.recall)}`} style={{ width: `${Math.max(pct, 4)}%` }} />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
