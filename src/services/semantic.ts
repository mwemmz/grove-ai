/* Search by meaning. A small language model (all-MiniLM-L6-v2) runs on the student's device and turns each note
   section, and each question, into a vector; sections whose meaning is close to the question are found even when
   they share no words with it ("what stores big files across machines" finds HDFS).
   It blends with the keyword search rather than replacing it, and Grove works exactly as before until it is ready. */
import { useSyncExternalStore } from 'react';
import { get, set } from 'idb-keyval';
import type { Note } from '../types';
import { parseSections, type Section } from '../lib/noteStructure';
import { searchSections, type SectionHit } from './noteSearch';

export type MeaningState = 'off' | 'idle' | 'loading' | 'ready' | 'error';

const PREF = 'grove_meaning_search';
type Conn = { saveData?: boolean; effectiveType?: string };
const conn = (): Conn | undefined => (navigator as unknown as { connection?: Conn }).connection;

/** On unless the student turned it off, or their phone asks apps to save data. */
export function meaningEnabled(): boolean {
  try {
    const v = localStorage.getItem(PREF);
    if (v) return v === 'on';
  } catch {
    /* storage blocked */
  }
  return !conn()?.saveData;
}

let state: MeaningState = 'idle';
const subs = new Set<() => void>();
const setState = (s: MeaningState) => {
  state = s;
  subs.forEach((f) => f());
};
export const useMeaningState = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => (meaningEnabled() ? state : 'off'),
  );

export function setMeaningEnabled(on: boolean) {
  try {
    localStorage.setItem(PREF, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
  if (on) void warmUp(true);
  else subs.forEach((f) => f());
}

/* ---------- the worker ---------- */

let worker: Worker | null = null;
let seq = 0;
const waiting = new Map<number, { ok: (v: Float32Array[]) => void; fail: (e: Error) => void }>();
function call(msg: { texts?: string[]; warm?: boolean }): Promise<Float32Array[]> {
  worker ??= (() => {
    const w = new Worker(new URL('../workers/embed.worker.ts', import.meta.url), { type: 'module' });
    w.onmessage = (e: MessageEvent<{ id: number; ok: boolean; vecs?: Float32Array[]; error?: string }>) => {
      const p = waiting.get(e.data.id);
      waiting.delete(e.data.id);
      if (!p) return;
      if (e.data.ok) p.ok(e.data.vecs ?? []);
      else p.fail(new Error(e.data.error));
    };
    return w;
  })();
  const id = ++seq;
  return new Promise((ok, fail) => {
    waiting.set(id, { ok, fail });
    worker!.postMessage({ id, ...msg });
  });
}

let warming: Promise<boolean> | null = null;
/** Loads the model in the background. On a slow or data-saving connection it waits unless the student asked. */
export function warmUp(force = false): Promise<boolean> {
  if (!meaningEnabled()) return Promise.resolve(false);
  if (state === 'ready') return Promise.resolve(true);
  const c = conn();
  if (!force && (c?.saveData || /(^|-)2g|3g/.test(c?.effectiveType ?? ''))) return Promise.resolve(false);
  warming ??= (async () => {
    setState('loading');
    try {
      await call({ warm: true });
      setState('ready');
      return true;
    } catch (e) {
      console.warn('Meaning search unavailable:', e);
      setState('error');
      warming = null;
      return false;
    }
  })();
  return warming;
}

/* ---------- vectors for sections, kept on the device ---------- */

const mem = new Map<string, Float32Array>();
const fnv = (s: string) => {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619);
  return (h >>> 0).toString(36);
};

interface Entry {
  note: Note;
  section: Section;
  key: string;
  text: string;
  /** The section heading alone: a question that names the topic should land on the section about it. */
  titleKey: string;
  title: string;
}
const parsed = new Map<string, { stamp: string; entries: Entry[] }>();
function entriesFor(notes: Note[]): Entry[] {
  const all: Entry[] = [];
  for (const note of notes) {
    const stamp = `${note.updatedAt}|${note.content.length}`;
    let p = parsed.get(note.id);
    if (!p || p.stamp !== stamp) {
      const entries = parseSections(note.content, note.title).map((section) => {
        const body = section.raw.replace(/^###[^\n]*\n?/, '').replace(/\s+/g, ' ').trim();
        const text = `${note.title}. ${section.title}. ${body}`.slice(0, 1400);
        return { note, section, text, key: `emb1:${fnv(text)}`, title: section.title, titleKey: `emb1:${fnv('T|' + section.title)}` };
      });
      p = { stamp, entries };
      parsed.set(note.id, p);
    }
    all.push(...p.entries);
  }
  return all;
}

let indexing: Promise<void> | null = null;
/** Works out vectors for any sections that don't have one yet: from the device cache first, the model second. */
async function ensure(all: Entry[]): Promise<void> {
  // Each section is embedded twice: its heading, and its heading with the text.
  const entries = all.flatMap((e) => [
    { key: e.key, text: e.text },
    { key: e.titleKey, text: e.title },
  ]);
  const missing = [...new Map(entries.filter((e) => !mem.has(e.key)).map((e) => [e.key, e])).values()];
  if (!missing.length) return;
  const stored = await Promise.all(missing.map((e) => get<Float32Array>(e.key).catch(() => undefined)));
  const todo: typeof missing = [];
  missing.forEach((e, i) => (stored[i] ? mem.set(e.key, stored[i]!) : todo.push(e)));
  for (let i = 0; i < todo.length; i += 8) {
    const batch = todo.slice(i, i + 8);
    const vecs = await call({ texts: batch.map((b) => b.text) });
    batch.forEach((b, j) => {
      mem.set(b.key, vecs[j]);
      void set(b.key, vecs[j]).catch(() => {});
    });
  }
}

/** Call when notes change: prepares their vectors in the background so the first question is quick. */
export function indexNotes(notes: Note[]) {
  if (state !== 'ready') return;
  const run = () => ensure(entriesFor(notes)).catch(() => {});
  indexing = (indexing ?? Promise.resolve()).then(run, run);
}

const dot = (a: Float32Array, b: Float32Array) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

/**
 * Keyword search blended with meaning. Same shape as searchSections, so everything that answers from notes uses it.
 * Falls back to keywords alone whenever the model isn't ready.
 */
export async function hybridSections(question: string, notes: Note[], n = 6): Promise<SectionHit[]> {
  const kw = searchSections(question, notes, 12);
  if (!meaningEnabled() || state !== 'ready') return kw.slice(0, n);
  try {
    const examQ = /\b(past papers?|exam|examination|marks?|question paper|mock)\b/i.test(question);
    const pool = examQ ? notes : notes.filter((x) => !/^past paper/i.test(x.title));
    const entries = entriesFor(pool);
    // First time on a big course: don't make the student wait for everything; use what's ready and finish in the background.
    const pending = entries.filter((e) => !mem.has(e.key) || !mem.has(e.titleKey)).length;
    if (pending > 0 && pending <= 40) await ensure(entries);
    else if (pending > 40) indexNotes(pool);
    const [q] = await call({ texts: [question] });

    const best = kw[0]?.score || 1;
    const byKey = new Map<string, SectionHit & { cos: number; kwn: number }>();
    const keyOf = (note: Note, s: Section) => `${note.id}#${s.id}`;
    for (const h of kw) byKey.set(keyOf(h.note, h.section), { ...h, cos: 0, kwn: h.score / best });
    for (const e of entries) {
      const v = mem.get(e.key);
      if (!v) continue;
      const tv = mem.get(e.titleKey);
      const cos = dot(q, v) + (tv ? 0.25 * Math.max(dot(q, tv), 0) : 0);
      const k = keyOf(e.note, e.section);
      const cur = byKey.get(k);
      if (cur) cur.cos = cos;
      else if (cos >= 0.4) byKey.set(k, { note: e.note, section: e.section, score: 0, cos, kwn: 0 });
    }
    const merged = [...byKey.values()]
      .map((h) => ({ note: h.note, section: h.section, score: Math.max(h.cos, 0) + h.kwn * 0.25 }))
      .sort((a, b) => b.score - a.score);
    const top = merged[0]?.score ?? 0;
    return merged.filter((h) => h.score >= top * 0.55).slice(0, n);
  } catch (e) {
    console.warn('Meaning search failed, using keywords:', e);
    return kw.slice(0, n);
  }
}
