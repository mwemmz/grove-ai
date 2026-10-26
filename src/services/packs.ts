/* Course packs delivered by Grove's server to the students they are meant for. */
import { apiDelete, apiGet, apiPut } from '../lib/api';
import { mergePack, parseNotesPack, type NotesPack } from './notesPack';
import type { Course, Note } from '../types';

export interface PackSummary {
  code: string;
  name: string;
  audience: string | null;
  notes: number;
  updatedAt: string;
  /** False when an admin sees a pack that isn't for their own student ID. */
  forMe: boolean;
}

export const getMe = () => apiGet<{ studentId: string | null; admin: boolean }>('/me');
export const listPacks = () => apiGet<PackSummary[]>('/packs');
export const publishPack = (code: string, pack: unknown) => apiPut<{ ok: true; notes: number; audience: string | null }>(`/packs/${encodeURIComponent(code)}`, pack);
export const removePack = (code: string) => apiDelete<{ ok: true }>(`/packs/${encodeURIComponent(code)}`);

async function fetchPack(code: string): Promise<NotesPack | null> {
  const raw = await apiGet<unknown>(`/packs/${encodeURIComponent(code)}`);
  return parseNotesPack(JSON.stringify({ grove: 'notes-pack', ...(raw as object), audience: { studentIdPrefix: (raw as { audience?: string }).audience } }));
}

/** Adds the notes from every pack this student may have that they don't have yet. Never throws. */
export async function syncPacks(notes: Note[], courses: Course[]): Promise<{ notes: Note[]; newCourses: Course[]; added: { code: string; count: number }[] } | null> {
  let list: PackSummary[];
  try {
    list = await listPacks();
  } catch {
    return null;
  }
  let current = notes;
  const newCourses: Course[] = [];
  const added: { code: string; count: number }[] = [];
  for (const p of list.filter((x) => x.forMe)) {
    const course = [...courses, ...newCourses].find((c) => c.code.toUpperCase() === p.code);
    const have = course ? current.filter((n) => n.courseId === course.id).length : 0;
    if (have >= p.notes) continue; // nothing missing
    try {
      const pack = await fetchPack(p.code);
      if (!pack) continue;
      const merged = mergePack(pack, current, [...courses, ...newCourses]);
      current = merged.notes;
      if (merged.newCourse) newCourses.push(merged.course);
      if (merged.added) added.push({ code: p.code, count: merged.added });
    } catch {
      /* one pack failing shouldn't stop the others */
    }
  }
  return added.length || newCourses.length ? { notes: current, newCourses, added } : null;
}
