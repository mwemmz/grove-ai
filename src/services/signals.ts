/* Anonymous class signals, sent only when the student has agreed. They tell lecturers where a course is getting stuck
   ("12 students missed the two-tier architecture questions this week"), never who. Only topics from a university notes
   pack are ever sent; a student's own notes stay private. See api/_lib/insights.ts for what the server keeps. */
import { useSyncExternalStore } from 'react';
import { apiPost } from '../lib/api';
import type { Course, Note } from '../types';

export type SignalKind = 'asked' | 'lost' | 'recall_missed' | 'check_missed' | 'check_right' | 'check_overconfident';
export type Consent = 'yes' | 'no' | null;

const KEY = 'grove_share_insights';
const subs = new Set<() => void>();
const read = (): Consent => {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'yes' || v === 'no' ? v : null;
  } catch {
    return null;
  }
};
export const getConsent = read;
export function setConsent(v: 'yes' | 'no') {
  try {
    localStorage.setItem(KEY, v);
  } catch {
    /* ignore */
  }
  subs.forEach((f) => f());
}
export const useConsent = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    read,
  );

let courses: Course[] = [];
/** App tells this module which courses exist, so a note can be turned into its course code. */
export const setSignalCourses = (c: Course[]) => {
  courses = c;
};

/** Notes that came from a university pack (their ids end in -p<n>); a student's own notes never produce signals. */
const fromPack = (n: Note) => /-p\d+$/.test(n.id);

let queue: { course: string; topic: string; note: string; kind: SignalKind }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
const sent = new Set<string>(); // one signal per topic and kind per session is plenty

function flush() {
  timer = null;
  const batch = queue.splice(0, 20);
  if (!batch.length || read() !== 'yes') return;
  void apiPost('/signals', { consent: true, signals: batch }).catch(() => {
    /* insights are best effort */
  });
  if (queue.length) timer = setTimeout(flush, 1000);
}

/** Records that the student met trouble (or success) with a section of a pack note. Does nothing without consent. */
export function signal(note: Note | undefined, section: string | undefined, kind: SignalKind) {
  if (!note || read() !== 'yes' || !fromPack(note)) return;
  const course = courses.find((c) => c.id === note.courseId)?.code?.toUpperCase();
  if (!course) return;
  const topic = section && section !== note.title ? section.replace(/\s*\(part \d+\)$/, '') : note.title;
  const k = `${course}|${note.title}|${topic}|${kind}`;
  if (sent.has(k)) return;
  sent.add(k);
  queue.push({ course, topic: topic.slice(0, 160), note: note.title.slice(0, 160), kind });
  timer ??= setTimeout(flush, 2500);
}
