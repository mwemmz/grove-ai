/* Spaced repetition with FSRS: a model of each card's memory (how stable it is, how hard it is) that predicts when
   the student is about to forget it and schedules the review just before. Uses the published FSRS-6 defaults,
   which were fitted on hundreds of millions of real reviews, and asks for 90% recall at review time. */
import { createEmptyCard, fsrs, generatorParameters, Rating, State, type Card, type Grade } from 'ts-fsrs';
import type { Flashcard, Note } from '../types';

const scheduler = fsrs(generatorParameters({ request_retention: 0.9, enable_fuzz: true, enable_short_term: true }));

export type Quality = 'again' | 'hard' | 'good' | 'easy';
const GRADE: Record<Quality, Grade> = { again: Rating.Again, hard: Rating.Hard, good: Rating.Good, easy: Rating.Easy };

/** The card's FSRS state; older cards (from the previous scheduler) start fresh from their last review. */
function cardOf(f: Flashcard, now: Date): Card {
  if (f.fsrs) {
    return {
      ...f.fsrs,
      state: f.fsrs.state as State,
      due: new Date(f.fsrs.due),
      last_review: f.fsrs.last_review ? new Date(f.fsrs.last_review) : undefined,
    };
  }
  return createEmptyCard(f.lastReviewed ? new Date(f.lastReviewed) : now);
}

const DAY = 86_400_000;

/** Records one answer and returns the card with its next review worked out. */
export function review(f: Flashcard, q: Quality, now = new Date()): Flashcard {
  const { card } = scheduler.next(cardOf(f, now), now, GRADE[q]);
  const days = Math.max(0, Math.round((card.due.getTime() - now.getTime()) / DAY));
  return {
    ...f,
    fsrs: {
      due: card.due.toISOString(),
      stability: card.stability,
      difficulty: card.difficulty,
      elapsed_days: card.elapsed_days,
      scheduled_days: card.scheduled_days,
      learning_steps: card.learning_steps,
      reps: card.reps,
      lapses: card.lapses,
      state: card.state,
      last_review: card.last_review?.toISOString(),
    },
    interval: days,
    repetition: card.reps,
    dueDate: card.due.toISOString(),
    lastReviewed: now.toISOString().slice(0, 10),
    // "Mastered" means the model expects the card to be remembered for at least three weeks.
    status: card.state === State.Review && card.stability >= 21 ? 'mastered' : 'learning',
  };
}

/** What each answer button would schedule, for the labels under them ("10 min", "3 days"). */
export function previewIntervals(f: Flashcard, now = new Date()): Record<Quality, string> {
  const p = scheduler.repeat(cardOf(f, now), now);
  const label = (d: Date) => {
    const mins = Math.round((d.getTime() - now.getTime()) / 60_000);
    if (mins < 60) return `${Math.max(1, mins)} min`;
    if (mins < 60 * 24) return `${Math.round(mins / 60)} h`;
    const days = Math.round(mins / 1440);
    return days < 31 ? `${days} ${days === 1 ? 'day' : 'days'}` : `${Math.round(days / 30)} mo`;
  };
  return { again: label(p[Rating.Again].card.due), hard: label(p[Rating.Hard].card.due), good: label(p[Rating.Good].card.due), easy: label(p[Rating.Easy].card.due) };
}

/** Chance (0 to 1) the student would recall this card right now. Undefined for cards never reviewed. */
export function recallChance(f: Flashcard, now = new Date()): number | undefined {
  if (!f.fsrs || f.fsrs.reps === 0) return undefined;
  return scheduler.get_retrievability(cardOf(f, now), now, false);
}

export interface Mastery {
  note: Note;
  /** Average predicted recall across the note's reviewed cards, 0 to 1. */
  recall: number;
  reviewed: number;
  total: number;
  due: number;
}

/**
 * How well each note is known, from the memory model of its cards: the weakest first.
 * A note counts once at least one of its cards has been reviewed.
 */
export function masteryByNote(cards: Flashcard[], notes: Note[], now = new Date()): Mastery[] {
  const byNote = new Map<string, Flashcard[]>();
  for (const c of cards) byNote.set(c.noteId, [...(byNote.get(c.noteId) ?? []), c]);
  const out: Mastery[] = [];
  for (const [noteId, cs] of byNote) {
    const note = notes.find((n) => n.id === noteId);
    if (!note) continue;
    const r = cs.map((c) => recallChance(c, now)).filter((x): x is number => x !== undefined);
    if (!r.length) continue;
    out.push({
      note,
      recall: r.reduce((a, b) => a + b, 0) / r.length,
      reviewed: r.length,
      total: cs.length,
      due: cs.filter((c) => c.dueDate <= now.toISOString()).length,
    });
  }
  return out.sort((a, b) => a.recall - b.recall);
}
