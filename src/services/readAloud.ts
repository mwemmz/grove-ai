/* Read a note aloud, section by section.
   Two voices: the phone's own (instant, no download, works offline) and a natural one (Kokoro, about 90 MB once,
   runs on the device). The student picks in Settings; the phone's voice is the default to save data. */
import { useSyncExternalStore } from 'react';
import type { Section } from '../lib/noteStructure';
import { explainSection, tutorAvailable, tutorReply, type Turn, type TutorKind } from './tutor';

export type VoiceMode = 'device' | 'natural';
export const NATURAL_VOICES = [
  { id: 'af_heart', label: 'Heart (American, female)' },
  { id: 'af_bella', label: 'Bella (American, female)' },
  { id: 'am_michael', label: 'Michael (American, male)' },
  { id: 'bf_emma', label: 'Emma (British, female)' },
  { id: 'bm_george', label: 'George (British, male)' },
] as const;

const ls = {
  get: (k: string, d: string) => {
    try {
      return localStorage.getItem(k) ?? d;
    } catch {
      return d;
    }
  },
  set: (k: string, v: string) => {
    try {
      localStorage.setItem(k, v);
    } catch {
      /* private mode */
    }
  },
};
export const voiceSettings = () => ({
  mode: (ls.get('grove_voice_mode', 'device') === 'natural' ? 'natural' : 'device') as VoiceMode,
  voice: ls.get('grove_voice', 'af_heart'),
  rate: Number(ls.get('grove_voice_rate', '1')) || 1,
  naturalReady: ls.get('grove_voice_ready', '') === '1',
});
export function setVoiceSettings(p: Partial<{ mode: VoiceMode; voice: string; rate: number }>) {
  if (p.mode) ls.set('grove_voice_mode', p.mode);
  if (p.voice) ls.set('grove_voice', p.voice);
  if (p.rate) ls.set('grove_voice_rate', String(p.rate));
  emit();
}

/* ---------- what to say for a section ---------- */

export function sectionSpeech(s: Section): string {
  const out: string[] = [s.title.replace(/[·|]/g, ',') + '.'];
  for (const g of s.groups) {
    if (g.kind === 'figure' || g.kind === 'code') continue;
    if (g.label) out.push(g.label + '.');
    if (g.kind === 'table' && g.rows?.length) {
      const [head, ...rows] = g.rows;
      for (const r of rows) out.push(r.map((c, i) => (i === 0 ? c : `${head[i] ? head[i] + ': ' : ''}${c}`)).filter(Boolean).join('. ') + '.');
      continue;
    }
    if (g.text) out.push(g.text);
    g.items.forEach((it, i) => out.push((g.kind === 'steps' ? `${i + 1}. ` : '') + (it.term && it.def ? `${it.term}: ${it.def}` : it.text)));
  }
  return out
    .map((t) => t.replace(/!\[[^\]]*\]\([^)]*\)/g, '').replace(/[*_`#>|]/g, '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
    .map((t) => (/[.!?:]$/.test(t) ? t : t + '.'))
    .join(' ');
}

/** Short pieces: browsers cut off long utterances, and the natural voice starts sooner on short text. */
export function sentences(text: string): string[] {
  const out: string[] = [];
  for (const s of text.split(/(?<=[.!?])\s+/)) {
    if (s.length <= 220) {
      if (s.trim()) out.push(s.trim());
      continue;
    }
    let cur = '';
    for (const part of s.split(/(?<=[,;:])\s+/)) {
      if ((cur + ' ' + part).length > 220 && cur) {
        out.push(cur.trim());
        cur = part;
      } else cur = cur ? `${cur} ${part}` : part;
    }
    if (cur.trim()) out.push(cur.trim());
  }
  return out;
}

/* ---------- state ---------- */

export interface ListenState {
  active: boolean;
  playing: boolean;
  noteTitle: string;
  section: number;
  total: number;
  sectionTitle: string;
  /** Shown while the natural voice downloads or prepares. */
  status: string | null;
  usingFallback: boolean;
  /** Tutor mode: Grove explains each section like a person, then checks in. */
  tutor: boolean;
  /** The tutor has finished talking and is waiting for the student. */
  waiting: boolean;
  /** The check question the tutor asked, if any. */
  question: string | null;
  /** Waiting for the tutor's AI reply. */
  busy: boolean;
  /** The line being spoken, shown as a caption. */
  caption: string;
}
let state: ListenState = { active: false, playing: false, noteTitle: '', section: 0, total: 0, sectionTitle: '', status: null, usingFallback: false, tutor: false, waiting: false, question: null, busy: false, caption: '' };
const subs = new Set<() => void>();
function emit(p: Partial<ListenState> = {}) {
  state = { ...state, ...p };
  subs.forEach((f) => f());
}
export const useListen = () =>
  useSyncExternalStore(
    (f) => {
      subs.add(f);
      return () => subs.delete(f);
    },
    () => state,
  );

type Item = { title: string; parts: string[]; text: string; ready: boolean; question?: string; wait?: boolean };
let items: Item[] = [];
let history: Turn[] = [];
let lastNote: { title: string; sections: Section[] } | null = null;
const prepMap = new Map<number, Promise<void>>();
let part = 0;
let gen = 0;

/* ---------- the phone's own voice ---------- */

let utter: SpeechSynthesisUtterance | null = null;
function pickVoice(): SpeechSynthesisVoice | undefined {
  const all = speechSynthesis.getVoices().filter((v) => /^en/i.test(v.lang));
  return all.find((v) => v.localService && /en[-_]GB/i.test(v.lang)) ?? all.find((v) => v.localService) ?? all[0];
}
function speakDevice(text: string, rate: number): Promise<void> {
  return new Promise((resolve) => {
    utter = new SpeechSynthesisUtterance(text);
    const v = pickVoice();
    if (v) utter.voice = v;
    utter.lang = v?.lang ?? 'en-GB';
    utter.rate = rate;
    utter.onend = () => resolve();
    utter.onerror = () => resolve();
    speechSynthesis.speak(utter);
  });
}

/* ---------- the natural voice ---------- */

let worker: Worker | null = null;
let audioCtx: AudioContext | null = null;
let source: AudioBufferSourceNode | null = null;
const pending = new Map<string, Promise<AudioBuffer>>();
let reqId = 0;
const getWorker = () => (worker ??= new Worker(new URL('../workers/tts.worker.ts', import.meta.url), { type: 'module' }));

/** Downloads and starts the natural voice; reports progress. Used by Settings and on first use. */
export function prepareNatural(onProgress?: (loaded: number, total: number) => void): Promise<void> {
  const w = getWorker();
  return new Promise((resolve, reject) => {
    const files = new Map<string, [number, number]>();
    const on = (e: MessageEvent) => {
      const m = e.data;
      if (m.type === 'progress' && m.file && m.total) {
        files.set(m.file, [m.loaded ?? 0, m.total]);
        let l = 0, t = 0;
        files.forEach(([a, b]) => ((l += a), (t += b)));
        onProgress?.(l, t);
      } else if (m.type === 'ready') {
        w.removeEventListener('message', on);
        ls.set('grove_voice_ready', '1');
        emit();
        resolve();
      } else if (m.type === 'error' && m.id === undefined) {
        w.removeEventListener('message', on);
        reject(new Error(m.message));
      }
    };
    w.addEventListener('message', on);
    w.postMessage({ type: 'load' });
  });
}

function synth(text: string, voice: string, speed: number): Promise<AudioBuffer> {
  const key = `${voice}|${speed}|${text}`;
  const have = pending.get(key);
  if (have) return have;
  const w = getWorker();
  const id = ++reqId;
  const p = new Promise<AudioBuffer>((resolve, reject) => {
    const on = (e: MessageEvent) => {
      const m = e.data;
      if (m.id !== id) return;
      w.removeEventListener('message', on);
      if (m.type === 'audio') {
        audioCtx ??= new AudioContext();
        const buf = audioCtx.createBuffer(1, m.data.length, m.rate);
        buf.copyToChannel(m.data, 0);
        resolve(buf);
      } else reject(new Error(m.message));
    };
    w.addEventListener('message', on);
    w.postMessage({ type: 'speak', id, text, voice, speed });
  });
  pending.set(key, p);
  if (pending.size > 12) pending.delete(pending.keys().next().value as string);
  return p;
}
function play(buf: AudioBuffer): Promise<void> {
  audioCtx ??= new AudioContext();
  void audioCtx.resume();
  return new Promise((resolve) => {
    source = audioCtx!.createBufferSource();
    source.buffer = buf;
    source.connect(audioCtx!.destination);
    source.onended = () => resolve();
    source.start();
  });
}

/* ---------- playing ---------- */

const nextText = (sec: number, p: number): string | null => {
  if (p + 1 < (items[sec]?.parts.length ?? 0)) return items[sec].parts[p + 1];
  return items[sec + 1]?.parts[0] ?? null;
};

/** Asks the AI to teach one section. If it can't, the section is simply read. */
function prepTutor(sec: number): Promise<void> {
  const it = items[sec];
  if (!it) return Promise.resolve();
  let p = prepMap.get(sec);
  if (!p) {
    p = (async () => {
      try {
        const r = await explainSection({ noteTitle: state.noteTitle, title: it.title, text: it.text, first: sec === 0, prevTitle: items[sec - 1]?.title });
        if (r.say.length > 40) {
          it.parts = sentences(r.say + (r.question ? ' ' + r.question : ''));
          it.question = r.question || undefined;
          it.ready = true;
          return;
        }
      } catch {
        /* fall through to plain reading */
      }
      it.parts = sentences(it.text);
      it.ready = true;
    })();
    prepMap.set(sec, p);
  }
  return p;
}

async function loop(my: number) {
  const st = voiceSettings();
  let natural = st.mode === 'natural' && !state.usingFallback;
  while (my === gen && state.playing) {
    const sec = state.section;
    if (state.tutor && items[sec] && !items[sec].ready) {
      emit({ status: 'Your tutor is getting ready…' });
      await prepTutor(sec);
      if (my !== gen) return;
      emit({ status: null });
    }
    if (state.tutor) void prepTutor(sec + 1);
    const parts = items[sec]?.parts ?? [];
    if (part >= parts.length) {
      if (state.tutor && (items[sec].question || items[sec].wait)) {
        // The tutor has said its piece: now it is the student's turn.
        emit({ waiting: true, playing: false, question: items[sec].question ?? null });
        return;
      }
      if (sec + 1 >= items.length) {
        stop();
        return;
      }
      part = 0;
      emit({ section: sec + 1, sectionTitle: items[sec + 1].title });
      setMedia();
      continue;
    }
    const text = parts[part];
    emit({ caption: text });
    if (natural) {
      try {
        if (!st.naturalReady && !voiceSettings().naturalReady) {
          emit({ status: 'Getting the natural voice ready (about 90 MB, once)…' });
          await prepareNatural((l, t) => emit({ status: `Downloading the natural voice: ${Math.round(l / 1e6)} of ${Math.round(t / 1e6)} MB…` }));
        }
        const bufP = synth(text, st.voice, st.rate);
        const after = nextText(sec, part);
        if (after) void synth(after, st.voice, st.rate).catch(() => {});
        if (!state.status) emit({ status: null });
        const buf = await bufP;
        if (my !== gen) return;
        emit({ status: null });
        await play(buf);
      } catch {
        // Offline before the model was saved, or the device couldn't run it: carry on with the phone's own voice.
        natural = false;
        emit({ usingFallback: true, status: null });
        continue;
      }
    } else {
      await speakDevice(text, st.rate);
    }
    if (my !== gen) return;
    part++;
  }
}

function setMedia() {
  const ms = (navigator as Navigator & { mediaSession?: MediaSession }).mediaSession;
  if (!ms || typeof MediaMetadata === 'undefined') return;
  ms.metadata = new MediaMetadata({ title: state.sectionTitle, artist: state.noteTitle, album: 'Grove' });
  ms.setActionHandler('play', () => toggle());
  ms.setActionHandler('pause', () => toggle());
  ms.setActionHandler('nexttrack', () => skip(1));
  ms.setActionHandler('previoustrack', () => skip(-1));
}

function halt() {
  gen++;
  try {
    speechSynthesis.cancel();
  } catch {
    /* no speech support */
  }
  if (source) {
    source.onended = null;
    try {
      source.stop();
    } catch {
      /* already stopped */
    }
    source = null;
  }
}

export function startListening(noteTitle: string, sections: Section[], from = 0, tutor = false) {
  halt();
  const teach = tutor && tutorAvailable();
  lastNote = { title: noteTitle, sections };
  history = [];
  prepMap.clear();
  items = sections
    .map((s) => {
      const text = sectionSpeech(s);
      return { title: s.title, text, parts: teach ? [] : sentences(text), ready: !teach };
    })
    .filter((x) => x.text.length > 0);
  if (!items.length) return;
  const sec = Math.max(0, Math.min(from, items.length - 1));
  part = 0;
  emit({ active: true, playing: true, noteTitle, section: sec, total: items.length, sectionTitle: items[sec].title, status: null, usingFallback: false, tutor: teach, waiting: false, question: null, busy: false, caption: '' });
  setMedia();
  void loop(gen);
}
export function toggle() {
  if (!state.active || state.waiting || state.busy) return;
  if (state.playing) {
    halt();
    emit({ playing: false, status: null });
  } else {
    emit({ playing: true });
    void loop(gen);
  }
}
export function skip(d: 1 | -1) {
  if (!state.active) return;
  const sec = Math.max(0, Math.min(items.length - 1, state.section + d));
  halt();
  part = 0;
  if (items[state.section]) items[state.section].wait = false;
  emit({ section: sec, sectionTitle: items[sec].title, playing: true, waiting: false, busy: false, status: null });
  setMedia();
  void loop(gen);
}
export function stop() {
  halt();
  emit({ active: false, playing: false, status: null, waiting: false, busy: false, tutor: false, question: null });
}
export function setRate(rate: number) {
  setVoiceSettings({ rate });
  if (state.playing) {
    halt();
    emit({ playing: true });
    void loop(gen);
  }
}
export const canSpeak = () => typeof window !== 'undefined' && ('speechSynthesis' in window || voiceSettings().mode === 'natural');

/* ---------- tutor mode: the student's turn ---------- */

/** The student answered, asked, or wants it explained again, simpler, or with an example. */
export async function tutorSay(kind: TutorKind, student?: string) {
  if (!state.tutor) return;
  halt();
  const my = gen;
  const sec = state.section;
  const it = items[sec];
  emit({ waiting: false, busy: true, playing: false, status: 'Thinking…', caption: '' });
  let reply = '';
  try {
    reply = await tutorReply({ kind, title: it.title, text: it.text, question: it.question ?? '', student, history });
  } catch {
    reply = '';
  }
  if (my !== gen) return;
  if (!reply) {
    emit({ busy: false, waiting: true, status: "Couldn't reach the tutor just now. Try again, or tap Next." });
    return;
  }
  history.push({ tutor: reply, student });
  it.parts = sentences(reply);
  it.question = undefined;
  it.wait = true;
  part = 0;
  emit({ busy: false, playing: true, waiting: false, question: null, status: null });
  void loop(gen);
}

/** Move on to the next section. */
export function tutorNext() {
  if (!state.active) return;
  const sec = state.section;
  if (items[sec]) {
    items[sec].wait = false;
    items[sec].question = undefined;
  }
  if (sec + 1 >= items.length) return stop();
  halt();
  part = 0;
  emit({ section: sec + 1, sectionTitle: items[sec + 1].title, playing: true, waiting: false, question: null, status: null });
  setMedia();
  void loop(gen);
}

/** Flip between the tutor and plain reading, staying on the same section. */
export function switchMode() {
  if (!lastNote) return;
  startListening(lastNote.title, lastNote.sections, state.section, !state.tutor);
}
