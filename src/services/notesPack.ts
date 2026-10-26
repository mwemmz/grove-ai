/* A notes pack is one JSON file carrying a course and its notes, so a whole semester of slides can be added at once.
   Format: { grove: 'notes-pack', version: 1, course: {...}, notes: [{ title, content, tags?, summary?, keyTakeaways? }] } */
import type { AcademicYear, Course } from '../types';

export interface PackNote {
  title: string;
  content: string;
  tags?: string[];
  summary?: string;
  keyTakeaways?: string[];
}

export interface NotesPack {
  /** Student ID prefix allowed to import this pack, e.g. 'BIT'. */
  audience?: string;
  course: Omit<Course, 'id'>;
  notes: PackNote[];
}

const str = (v: unknown, max = 200_000) => (typeof v === 'string' ? v.slice(0, max) : '');
const strs = (v: unknown) => (Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 20) : undefined);

/** Returns the pack, or null when the text is not a Grove notes pack. Never throws. */
export function parseNotesPack(text: string): NotesPack | null {
  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return null;
  }
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (o.grove !== 'notes-pack' || !o.course || !Array.isArray(o.notes)) return null;
  const c = o.course as Record<string, unknown>;
  const code = str(c.code, 20).trim();
  if (!code) return null;
  const year = [1, 2, 3, 4].includes(Number(c.year)) ? (Number(c.year) as AcademicYear) : 1;
  const notes = (o.notes as unknown[])
    .map((n) => {
      const r = (n ?? {}) as Record<string, unknown>;
      return { title: str(r.title, 200).trim(), content: str(r.content).trim(), tags: strs(r.tags), summary: str(r.summary, 400) || undefined, keyTakeaways: strs(r.keyTakeaways) };
    })
    .filter((n) => n.title && n.content)
    .slice(0, 200);
  if (notes.length === 0) return null;
  const aud = (o.audience ?? {}) as Record<string, unknown>;
  return {
    audience: str(aud.studentIdPrefix, 20).trim() || undefined,
    course: {
      code,
      name: str(c.name, 120) || code,
      year,
      semester: Number(c.semester) === 2 ? 2 : 1,
      color: /^#[0-9a-f]{6}$/i.test(str(c.color, 7)) ? str(c.color, 7) : '#0ea5e9',
      description: str(c.description, 400),
    },
    notes,
  };
}
