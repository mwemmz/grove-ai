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
export const publishPack = (code: string, pack: unknown) => apiPut<{ ok: true; notes: number; audience: string | null }>(`/packs?code=${encodeURIComponent(code)}`, pack);
export const publishFigures = (code: string, figures: Record<string, string>) => apiPut<{ ok: true; figures: number }>(`/packs?code=${encodeURIComponent(code)}&figures=1`, { figures });
export const removePack = (code: string) => apiDelete<{ ok: true }>(`/packs?code=${encodeURIComponent(code)}`);

async function fetchPack(code: string): Promise<NotesPack | null> {
  const raw = await apiGet<unknown>(`/packs?code=${encodeURIComponent(code)}`);
  return parseNotesPack(JSON.stringify({ grove: 'notes-pack', ...(raw as object), audience: { studentIdPrefix: (raw as { audience?: string }).audience } }));
}

/** Adds the notes from every pack this student may have that they don't have yet. Never throws. */
export async function syncPacks(notes: Note[], courses: Course[]): Promise<{ notes: Note[]; newCourses: Course[]; added: { code: string; count: number }[]; updated: { code: string; count: number }[] } | null> {
  let list: PackSummary[];
  try {
    list = await listPacks();
  } catch {
    return null;
  }
  let current = notes;
  const newCourses: Course[] = [];
  const added: { code: string; count: number }[] = [];
  const updated: { code: string; count: number }[] = [];
  const revKey = (code: string) => `grove_pack_rev2_${code}`;
  const seenRev = (code: string) => { try { return localStorage.getItem(revKey(code)); } catch { return null; } };
  for (const p of list.filter((x) => x.forMe)) {
    const course = [...courses, ...newCourses].find((c) => c.code.toUpperCase() === p.code);
    const have = course ? current.filter((n) => n.courseId === course.id).length : 0;
    if (have >= p.notes && seenRev(p.code) === p.updatedAt) continue; // nothing missing, nothing changed
    try {
      const pack = await fetchPack(p.code);
      if (!pack) continue;
      const merged = mergePack(pack, current, [...courses, ...newCourses]);
      current = merged.notes;
      if (merged.newCourse) newCourses.push(merged.course);
      if (merged.added) added.push({ code: p.code, count: merged.added });
      if (merged.updated) updated.push({ code: p.code, count: merged.updated });
      try { localStorage.setItem(revKey(p.code), p.updatedAt); } catch { /* fine */ }
    } catch {
      /* one pack failing shouldn't stop the others */
    }
  }
  return added.length || updated.length || newCourses.length ? { notes: current, newCourses, added, updated } : null;
}
