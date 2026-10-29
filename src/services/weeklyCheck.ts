/* The weekly check: five quick multiple-choice questions per course, built from the university's notes, no AI needed.
   Before seeing whether they were right, students say whether they were sure. Wrong-but-sure answers are the useful
   ones: they show where a student is weaker than they think (in our pilot, 20 of 21 had a result lower than expected). */
import type { Course, Note } from '../types';
import { draftCardsFor, sectionOfFront, type DraftCard } from './cardMaker';
import { isPastPaper } from '../lib/noteOrder';

export interface CheckQuestion {
  id: string;
  q: string;
  options: string[];
  correct: number;
  note: Note;
  section?: string;
  card: DraftCard;
}

export interface CheckResult {
  week: string;
  total: number;
  right: number;
  /** Topics missed while the student said they were sure. */
  overconfident: { noteId: string; section?: string; q: string }[];
  missed: { noteId: string; section?: string; q: string }[];
}

/** Monday of this week, as YYYY-MM-DD. The same five questions all week; new ones next week. */
export function isoWeek(d = new Date()): string {
  const day = (d.getDay() + 6) % 7;
  const m = new Date(d.getFullYear(), d.getMonth(), d.getDate() - day);
  return `${m.getFullYear()}-${String(m.getMonth() + 1).padStart(2, '0')}-${String(m.getDate()).padStart(2, '0')}`;
}

const rng = (seed: string) => {
  let h = 2166136261;
  for (const c of seed) h = Math.imul(h ^ c.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
};
const shuffle = <T,>(a: T[], r: () => number) => {
  const x = [...a];
  for (let i = x.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [x[i], x[j]] = [x[j], x[i]];
  }
  return x;
};

/** Question shapes; distractors come from answers of the same shape so they look plausible. */
const shape = (front: string) => (/^Explain|^What is/.test(front) ? 'define' : /differ on/.test(front) ? 'compare' : /steps/.test(front) ? 'steps' : 'list');
const oneLine = (s: string) => s.replace(/\n+/g, '; ').replace(/^•\s*/, '').replace(/;\s*•\s*/g, '; ');

export function buildCheck(course: Course, notes: Note[], week = isoWeek()): CheckQuestion[] {
  const own = notes.filter((n) => n.courseId === course.id && !isPastPaper(n));
  const pool = own.flatMap((note) => draftCardsFor(note, 20).map((card) => ({ note, card })));
  // Definitions and comparisons make fair one-line choices; long lists don't.
  const usable = pool.filter(({ card }) => card.back.length >= 15 && card.back.length <= 220 && (shape(card.front) === 'define' || shape(card.front) === 'compare'));
  if (usable.length < 8) return [];
  const r = rng(`${course.code}|${week}`);
  // Spread the five across different notes where possible.
  const byNote = new Map<string, typeof usable>();
  for (const u of shuffle(usable, r)) byNote.set(u.note.id, [...(byNote.get(u.note.id) ?? []), u]);
  const picked: typeof usable = [];
  const lanes = shuffle([...byNote.values()], r);
  for (let round = 0; picked.length < 5 && round < 5; round++) for (const lane of lanes) if (lane[round] && picked.length < 5) picked.push(lane[round]);
  return picked.map(({ note, card }, i) => {
    const sameShape = usable.filter((u) => u.card !== card && shape(u.card.front) === shape(card.front) && u.card.back !== card.back);
    const others = shuffle(sameShape.length >= 3 ? sameShape : usable.filter((u) => u.card !== card), r).slice(0, 3).map((u) => oneLine(u.card.back));
    const options = shuffle([oneLine(card.back), ...others], r);
    return { id: `${week}-${i}`, q: card.front, options, correct: options.indexOf(oneLine(card.back)), note, section: sectionOfFront(card.front), card };
  });
}

const key = (code: string, week: string) => `grove_weekly_${code.toUpperCase()}_${week}`;
export function savedResult(code: string, week = isoWeek()): CheckResult | null {
  try {
    return JSON.parse(localStorage.getItem(key(code, week)) || 'null');
  } catch {
    return null;
  }
}
export function saveResult(code: string, res: CheckResult) {
  try {
    localStorage.setItem(key(code, res.week), JSON.stringify(res));
  } catch {
    /* fine: the check still happened */
  }
}
