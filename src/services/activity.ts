/* Tells the university's admins what a student is doing in Grove, so they can help when something goes wrong.
   Only short labels are sent: which screen, which note title, an upload, an error. Never questions, answers or note text. */
import { apiPost } from '../lib/api';

type Kind = 'tab' | 'note' | 'upload' | 'error' | 'ask' | 'lecture' | 'listen';
let queue: { kind: Kind; detail: string }[] = [];
let timer: ReturnType<typeof setTimeout> | null = null;
let on = false;

async function flush() {
  timer = null;
  if (!queue.length || !on || (typeof navigator !== 'undefined' && !navigator.onLine)) return;
  const events = queue.splice(0, 20);
  try {
    await apiPost('/activity', { events });
  } catch {
    /* best effort: never bother the student */
  }
  if (queue.length) timer = setTimeout(() => void flush(), 3000);
}

export function track(kind: Kind, detail = '') {
  if (!on) return;
  const last = queue[queue.length - 1];
  if (last && last.kind === kind && last.detail === detail) return;
  queue.push({ kind, detail: detail.slice(0, 160) });
  if (queue.length > 40) queue = queue.slice(-40);
  timer ??= setTimeout(() => void flush(), 8000);
}

/** Starts reporting once the student is signed in. */
export function startTracking() {
  if (on || typeof window === 'undefined') return;
  on = true;
  window.addEventListener('error', (e) => track('error', e.message || 'Error'));
  window.addEventListener('unhandledrejection', (e) => track('error', String((e.reason as Error | undefined)?.message ?? e.reason ?? 'Error')));
  document.addEventListener('visibilitychange', () => document.visibilityState === 'hidden' && void flush());
}
