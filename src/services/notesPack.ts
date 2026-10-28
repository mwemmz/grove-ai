/* A notes pack is one JSON file carrying a course and its notes, so a whole semester of slides can be added at once.
   Format: { grove: 'notes-pack', version: 1, course: {...}, notes: [{ title, content, tags?, summary?, keyTakeaways? }] } */
import type { AcademicYear, Course, Note } from '../types';

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

/** Adds a pack's course (if missing) and any of its notes not already there, matched by course and title. */
export function mergePack(pack: NotesPack, notes: Note[], courses: Course[]): { notes: Note[]; course: Course; newCourse: boolean; added: number; updated: number } {
  let course = courses.find((c) => c.code.toUpperCase() === pack.course.code.toUpperCase());
  const newCourse = !course;
  if (!course) course = { id: `c-${pack.course.code.toLowerCase()}-${Date.now().toString(36)}`, ...pack.course };
  const now = new Date().toISOString();
  // A pack the university has corrected replaces the older copy of the same note (same id, so flashcards stay linked).
  const byTitle = new Map(pack.notes.map((n) => [n.title, n]));
  const byLower = new Map(pack.notes.map((n) => [n.title.toLowerCase(), n]));
  const isPackNote = (n: Note) => n.courseId === course!.id && /-p\d+$/.test(n.id);
  const exact = new Set(notes.filter((n) => n.courseId === course!.id).map((n) => n.title));
  const claimed = new Set<string>();
  let updated = 0;
  const refreshed: Note[] = [];
  for (const n of notes) {
    if (n.courseId !== course!.id) { refreshed.push(n); continue; }
    let p = byTitle.get(n.title);
    // An earlier copy of the pack used a different capitalisation: keep the note (and its flashcards), take the new title.
    if (!p && isPackNote(n)) {
      const q = byLower.get(n.title.toLowerCase());
      if (q && !exact.has(q.title) && !claimed.has(q.title)) p = q;
    }
    if (!p) {
      // A pack note the university has since removed or renamed: drop it. Notes the student added themselves stay.
      if (isPackNote(n)) { updated++; continue; }
      refreshed.push(n);
      continue;
    }
    claimed.add(p.title);
    if (p.content === n.content && p.title === n.title) { refreshed.push(n); continue; }
    updated++;
    refreshed.push({ ...n, title: p.title, content: p.content, summary: p.summary || p.content.replace(/\s+/g, ' ').slice(0, 140), tags: p.tags ?? n.tags, keyTakeaways: p.keyTakeaways ?? n.keyTakeaways, updatedAt: now });
  }
  const have = new Set(refreshed.filter((n) => n.courseId === course!.id).map((n) => n.title));
  const fresh = pack.notes
    .filter((n) => !have.has(n.title))
    .map((n, i): Note => ({
      id: `note-${Date.now()}-p${i}`,
      courseId: course!.id,
      year: course!.year,
      title: n.title,
      content: n.content,
      summary: n.summary || n.content.replace(/\s+/g, ' ').slice(0, 140),
      tags: n.tags ?? [],
      keyTakeaways: n.keyTakeaways ?? [],
      createdAt: now,
      updatedAt: now,
    }));
  return { notes: [...fresh, ...refreshed], course, newCourse, added: fresh.length, updated };
}
