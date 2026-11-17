/* Lecture recordings → notes, entirely on the student's device.
   Audio is kept as 16 kHz mono blocks of 30 seconds in IndexedDB, so a long recording never sits in memory at once,
   a transcription can stop and carry on later, and nothing is lost if the page closes. */
import { del, get, set } from 'idb-keyval';
import { generateRouted, hasAi } from './llmService';

export const RATE = 16000;
const BLOCK = 30 * RATE; // samples per stored block
const SEGMENT_BLOCKS = 4; // transcribe two minutes at a time

export const MODELS = {
  quick: { id: 'Xenova/whisper-tiny.en', mb: 40, label: 'Quick', detail: 'about 40 MB, once' },
  accurate: { id: 'Xenova/whisper-base.en', mb: 80, label: 'More accurate', detail: 'about 80 MB, once' },
} as const;
export type ModelKey = keyof typeof MODELS;
export const getModelKey = (): ModelKey => {
  try {
    return localStorage.getItem('grove_asr_model') === 'accurate' ? 'accurate' : 'quick';
  } catch {
    return 'quick';
  }
};
export const setModelKey = (k: ModelKey) => {
  try {
    localStorage.setItem('grove_asr_model', k);
  } catch {
    /* private mode */
  }
};

export interface Recording {
  id: string;
  title: string;
  createdAt: string;
  source: 'mic' | 'file';
  blocks: number;
  seconds: number;
  /** Blocks already transcribed, and what was heard in each two-minute stretch. */
  done: number;
  parts: { start: number; text: string }[];
  model?: string;
  noteId?: string;
}

const META = (id: string) => `grove-rec:${id}`;
const BLK = (id: string, n: number) => `grove-rec:${id}:${n}`;
const INDEX = 'grove-recs';

export async function listRecordings(): Promise<Recording[]> {
  const ids = ((await get<string[]>(INDEX).catch(() => undefined)) ?? []) as string[];
  const all = await Promise.all(ids.map((id) => get<Recording>(META(id)).catch(() => undefined)));
  return all.filter((r): r is Recording => !!r).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
const saveMeta = async (r: Recording) => {
  await set(META(r.id), r);
  const ids = ((await get<string[]>(INDEX).catch(() => undefined)) ?? []) as string[];
  if (!ids.includes(r.id)) await set(INDEX, [...ids, r.id]);
};
export const updateRecording = (r: Recording) => saveMeta(r);

/** Removes the audio (and the recording, unless only the audio should go). */
export async function deleteRecording(id: string): Promise<void> {
  const r = await get<Recording>(META(id)).catch(() => undefined);
  for (let n = 0; n < (r?.blocks ?? 0); n++) await del(BLK(id, n)).catch(() => {});
  await del(META(id)).catch(() => {});
  const ids = ((await get<string[]>(INDEX).catch(() => undefined)) ?? []) as string[];
  await set(INDEX, ids.filter((x) => x !== id));
}

export const audioMb = (r: Recording) => Math.round((r.seconds * RATE * 2) / 1e6);
export const clock = (s: number) => {
  s = Math.max(0, Math.round(s));
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), x = s % 60;
  return h ? `${h}:${String(m).padStart(2, '0')}:${String(x).padStart(2, '0')}` : `${m}:${String(x).padStart(2, '0')}`;
};
const newId = () => `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
const toInt16 = (f: Float32Array) => {
  const out = new Int16Array(f.length);
  for (let i = 0; i < f.length; i++) out[i] = Math.max(-1, Math.min(1, f[i])) * 0x7fff;
  return out;
};

/* ---------- recording from the microphone ---------- */

const WORKLET = `class G extends AudioWorkletProcessor{process(i){const c=i[0]&&i[0][0];if(c)this.port.postMessage(c.slice(0));return true}}registerProcessor('grove-capture',G)`;

export class Recorder {
  rec: Recording;
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private buf = new Float32Array(BLOCK);
  private fill = 0;
  private pos = 0; // fractional read position for resampling
  private carry = new Float32Array(0);
  private writes: Promise<unknown> = Promise.resolve();
  private lock: { release: () => Promise<void> } | null = null;
  onLevel: (v: number) => void = () => {};
  onTick: (seconds: number) => void = () => {};

  constructor(title: string) {
    this.rec = { id: newId(), title, createdAt: new Date().toISOString(), source: 'mic', blocks: 0, seconds: 0, done: 0, parts: [] };
  }

  async start(): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { channelCount: 1, echoCancellation: false, noiseSuppression: true, autoGainControl: true },
    });
    this.ctx = new AudioContext();
    const url = URL.createObjectURL(new Blob([WORKLET], { type: 'application/javascript' }));
    await this.ctx.audioWorklet.addModule(url);
    URL.revokeObjectURL(url);
    const node = new AudioWorkletNode(this.ctx, 'grove-capture');
    const src = this.ctx.createMediaStreamSource(this.stream);
    src.connect(node);
    const ratio = this.ctx.sampleRate / RATE;
    let frames = 0;
    node.port.onmessage = (e: MessageEvent<Float32Array>) => {
      const x = e.data;
      if (++frames % 8 === 0) {
        let s = 0;
        for (let i = 0; i < x.length; i++) s += x[i] * x[i];
        this.onLevel(Math.min(1, Math.sqrt(s / x.length) * 6));
      }
      this.push(x, ratio);
    };
    await saveMeta(this.rec);
    await this.keepAwake();
  }

  /** Downsamples to 16 kHz (averaging over each step, a simple low-pass) and stores every 30 seconds. */
  private push(x: Float32Array, ratio: number) {
    const all = new Float32Array(this.carry.length + x.length);
    all.set(this.carry);
    all.set(x, this.carry.length);
    let p = this.pos;
    while (p + ratio <= all.length) {
      const a = Math.floor(p), b = Math.min(all.length, Math.floor(p + ratio));
      let s = 0;
      for (let i = a; i < b; i++) s += all[i];
      this.buf[this.fill++] = s / Math.max(1, b - a);
      if (this.fill === BLOCK) this.flush();
      p += ratio;
    }
    const keep = Math.floor(p);
    this.carry = all.slice(keep);
    this.pos = p - keep;
  }

  private flush() {
    if (!this.fill) return;
    const n = this.rec.blocks++;
    const data = toInt16(this.buf.subarray(0, this.fill));
    this.rec.seconds += this.fill / RATE;
    this.fill = 0;
    const meta = { ...this.rec };
    this.writes = this.writes.then(() => set(BLK(meta.id, n), data)).then(() => saveMeta(meta));
    this.onTick(this.rec.seconds);
  }

  /** Seconds recorded so far, including what has not been stored yet. */
  elapsed = () => this.rec.seconds + this.fill / RATE;

  pause = () => this.ctx?.suspend();
  resume = () => this.ctx?.resume();

  async stop(): Promise<Recording> {
    this.flush();
    this.stream?.getTracks().forEach((t) => t.stop());
    await this.ctx?.close().catch(() => {});
    await this.writes;
    await this.lock?.release().catch(() => {});
    return this.rec;
  }

  private async keepAwake() {
    try {
      const wl = (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock;
      this.lock = (await wl?.request('screen')) ?? null;
    } catch {
      /* not supported: the student is told to keep the screen on */
    }
  }
}

/* ---------- a recording made with another app ---------- */

export async function importAudio(file: File, title: string, onStep?: (msg: string) => void): Promise<Recording> {
  onStep?.('Opening the recording…');
  const bytes = await file.arrayBuffer();
  let mono: Float32Array;
  try {
    // Decoding straight to 16 kHz keeps memory low for long lectures.
    const ab = await new OfflineAudioContext(1, RATE, RATE).decodeAudioData(bytes.slice(0));
    mono = mix(ab);
  } catch {
    const ctx = new AudioContext();
    const ab = await ctx.decodeAudioData(bytes);
    await ctx.close().catch(() => {});
    mono = resample(mix(ab), ab.sampleRate);
  }
  const rec: Recording = { id: newId(), title, createdAt: new Date().toISOString(), source: 'file', blocks: 0, seconds: mono.length / RATE, done: 0, parts: [] };
  onStep?.('Saving it on this device…');
  for (let o = 0; o < mono.length; o += BLOCK) await set(BLK(rec.id, rec.blocks++), toInt16(mono.subarray(o, Math.min(mono.length, o + BLOCK))));
  await saveMeta(rec);
  return rec;
}
function mix(ab: AudioBuffer): Float32Array {
  if (ab.numberOfChannels === 1) return ab.getChannelData(0);
  const out = new Float32Array(ab.length);
  for (let c = 0; c < ab.numberOfChannels; c++) {
    const d = ab.getChannelData(c);
    for (let i = 0; i < d.length; i++) out[i] += d[i] / ab.numberOfChannels;
  }
  return out;
}
function resample(x: Float32Array, from: number): Float32Array {
  if (from === RATE) return x;
  const ratio = from / RATE, out = new Float32Array(Math.floor(x.length / ratio));
  for (let i = 0; i < out.length; i++) {
    const a = Math.floor(i * ratio), b = Math.min(x.length, Math.floor((i + 1) * ratio));
    let s = 0;
    for (let j = a; j < b; j++) s += x[j];
    out[i] = s / Math.max(1, b - a);
  }
  return out;
}

/* ---------- transcription ---------- */

let worker: Worker | null = null;
let workerModel = '';
const getWorker = () => (worker ??= new Worker(new URL('../workers/asr.worker.ts', import.meta.url), { type: 'module' }));

function loadModel(model: string, onDownload: (loaded: number, total: number) => void): Promise<void> {
  const w = getWorker();
  if (workerModel === model) return Promise.resolve();
  return new Promise((resolve, reject) => {
    const files = new Map<string, [number, number]>();
    const on = (e: MessageEvent) => {
      const m = e.data;
      if (m.type === 'progress' && m.file && m.total) {
        files.set(m.file, [m.loaded ?? 0, m.total]);
        let l = 0, t = 0;
        files.forEach(([a, b]) => ((l += a), (t += b)));
        onDownload(l, t);
      } else if (m.type === 'ready') {
        w.removeEventListener('message', on);
        workerModel = model;
        resolve();
      } else if (m.type === 'error') {
        w.removeEventListener('message', on);
        reject(new Error(m.message));
      }
    };
    w.addEventListener('message', on);
    w.postMessage({ type: 'load', model });
  });
}

let runId = 0;
function run(audio: Float32Array): Promise<string> {
  const w = getWorker();
  const id = ++runId;
  return new Promise((resolve, reject) => {
    const on = (e: MessageEvent) => {
      const m = e.data;
      if (m.id !== id) return;
      w.removeEventListener('message', on);
      if (m.type === 'result') resolve(m.text as string);
      else reject(new Error(m.message));
    };
    w.addEventListener('message', on);
    w.postMessage({ type: 'run', id, audio }, [audio.buffer]);
  });
}

/** Whisper's habits on quiet or noisy stretches: tags, stock phrases and one sentence said over and over. */
export function cleanText(t: string): string {
  t = t.replace(/\[[^\]]*\]|\((?:music|applause|laughter|inaudible|silence|noise)[^)]*\)/gi, ' ').replace(/\s+/g, ' ').trim();
  if (/^(thank you\.?|thanks for watching\.?|you\.?|bye\.?|\.+)$/i.test(t)) return '';
  const sentences = t.split(/(?<=[.!?])\s+/);
  const out: string[] = [];
  for (const s of sentences) {
    const k = s.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim();
    const last = out.slice(-2).map((x) => x.toLowerCase().replace(/[^a-z0-9 ]/g, '').trim());
    if (k && last.filter((x) => x === k).length >= 1 && k.split(' ').length < 12) continue; // a short sentence repeated
    out.push(s);
  }
  return out.join(' ').trim();
}

export interface TranscribeEvents {
  onDownload?: (loaded: number, total: number) => void;
  onProgress?: (done: number, total: number, rec: Recording) => void;
}

/** Transcribes what is left of a recording, two minutes at a time, saving after each stretch so it can resume. */
export async function transcribe(rec: Recording, modelKey: ModelKey, ev: TranscribeEvents, stop: { stopped: boolean }): Promise<Recording> {
  const model = MODELS[modelKey].id;
  await loadModel(model, ev.onDownload ?? (() => {}));
  let lock: { release: () => Promise<void> } | null = null;
  try {
    lock = (await (navigator as unknown as { wakeLock?: { request: (t: 'screen') => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen')) ?? null;
  } catch {
    /* ignore */
  }
  try {
    rec = { ...rec, model };
    while (rec.done < rec.blocks && !stop.stopped) {
      const n = Math.min(SEGMENT_BLOCKS, rec.blocks - rec.done);
      const parts = await Promise.all(Array.from({ length: n }, (_, i) => get<Int16Array>(BLK(rec.id, rec.done + i))));
      const len = parts.reduce((s, p) => s + (p?.length ?? 0), 0);
      const audio = new Float32Array(len);
      let o = 0, energy = 0;
      for (const p of parts) {
        if (!p) continue;
        for (let i = 0; i < p.length; i++) {
          const v = p[i] / 0x7fff;
          audio[o++] = v;
          energy += v * v;
        }
      }
      const quiet = len === 0 || Math.sqrt(energy / len) < 0.003;
      const text = quiet ? '' : cleanText(await run(audio));
      rec = { ...rec, parts: [...rec.parts, { start: (rec.done * BLOCK) / RATE, text }], done: rec.done + n };
      await saveMeta(rec);
      ev.onProgress?.(rec.done, rec.blocks, rec);
    }
    return rec;
  } finally {
    await lock?.release().catch(() => {});
  }
}

/* ---------- from transcript to note ---------- */

export const transcriptText = (r: Recording) => r.parts.map((p) => p.text).filter(Boolean).join(' ');

/** Without AI: the transcript in ten-minute parts, in readable paragraphs. */
export function plainNote(r: Recording): string {
  const parts: { from: number; to: number; text: string[] }[] = [];
  for (const p of r.parts) {
    if (!p.text) continue;
    const k = Math.floor(p.start / 600);
    const cur = parts.find((x) => x.from === k * 600) ?? (parts.push({ from: k * 600, to: Math.min(r.seconds, (k + 1) * 600), text: [] }), parts[parts.length - 1]);
    cur.text.push(p.text);
  }
  return parts
    .map((pt, i) => {
      const sentences = pt.text.join(' ').split(/(?<=[.!?])\s+/);
      const paras: string[] = [];
      for (let j = 0; j < sentences.length; j += 5) paras.push(sentences.slice(j, j + 5).join(' '));
      return `### Part ${i + 1} · ${clock(pt.from)}–${clock(pt.to)}\n${paras.join('\n\n')}`;
    })
    .join('\n\n');
}

export const canTidy = () => hasAi('ask');

/** With an AI key: the transcript becomes headed sections with points, in Grove's note format. Done in pieces for long lectures. */
export async function tidyWithAI(r: Recording, course: string, onStep: (done: number, total: number) => void): Promise<string> {
  const words = transcriptText(r).split(/\s+/);
  const size = 2200;
  const chunks: string[] = [];
  for (let i = 0; i < words.length; i += size) chunks.push(words.slice(i, i + size).join(' '));
  const system =
    'You turn a university lecture transcript into clear study notes. Use only what the lecturer said; never add facts. ' +
    'Write in this format only: each topic starts with a line "### Topic title", followed by short bullet points ("- ") or numbered steps ("1. "). ' +
    'Write definitions as "- Term: meaning". Keep examples the lecturer gave. Leave out greetings, admin and filler. ' +
    'The transcript was made by speech recognition, so fix obvious mis-heard words only where the meaning is clear.';
  const out: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    onStep(i, chunks.length);
    const res = await generateRouted('ask', system, `Course: ${course || 'unknown'}\nPart ${i + 1} of ${chunks.length} of the transcript:\n\n${chunks[i]}`, 2500);
    const text = (res?.text ?? '').trim();
    if (!/^###\s/m.test(text)) throw new Error('The AI did not return notes in the expected format');
    out.push(text.slice(text.indexOf('###')));
  }
  onStep(chunks.length, chunks.length);
  return out.join('\n\n');
}
