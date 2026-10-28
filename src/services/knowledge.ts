/* The university library: material the institution owns (past final-year projects, course outlines,
   policies) that Grove answers from before it falls back to anything else.
   The library holds only what the student or their university adds. It stays in this browser. */
import type { SourceRef } from '../types';

export type SourceKind = 'project' | 'course' | 'policy';

export interface ProjectFields {
  problem: string;
  method: string;
  tools: string;
  findings: string;
  limitations: string;
  future: string;
}

export interface Source {
  id: string;
  kind: SourceKind;
  title: string;
  /** One line shown under the title, e.g. "BSc Information Technology · 2023". */
  meta: string;
  text: string;
  tags: string[];
  demo: boolean;
  fields?: ProjectFields;
  addedAt?: string;
}

export interface Hit {
  source: Source;
  score: number;
  passage: string;
}

export const KIND_LABEL: Record<SourceKind, string> = {
  project: 'Final-year project',
  course: 'Course',
  policy: 'Policy',
};

const KEY = 'grove_sources_v1';

function readAdded(): Source[] {
  try {
    const raw = localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

function writeAdded(list: Source[]) {
  try {
    localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage can be full or unavailable */
  }
}

export const getAddedSources = (): Source[] => readAdded();
export const getSources = (): Source[] => readAdded();

export function addSource(input: { title: string; kind: SourceKind; meta?: string; text: string; tags?: string[] }): Source {
  const s: Source = {
    id: `src-${Date.now().toString(36)}`,
    kind: input.kind,
    title: input.title.trim(),
    meta: input.meta?.trim() || 'Added in this browser',
    text: input.text.trim(),
    tags: (input.tags ?? []).map((t) => t.trim().toLowerCase()).filter(Boolean),
    demo: false,
    addedAt: new Date().toISOString(),
  };
  writeAdded([s, ...readAdded()]);
  return s;
}

export function removeSource(id: string) {
  writeAdded(readAdded().filter((s) => s.id !== id));
}

/* ---------- search ---------- */

const STOP = new Set(
  ('the a an and or of to in on for with is are was were be been it its this that these those as at by from into than then so if but not can will just ' +
    'about over under how what why when where which who whom do does did have has had my our your their me i we you they them use used using like each other such very ' +
    'should would could any some more most much many get got make made want need needs help please tell show give know find idea ideas topic topics ' +
    'first learn learned learning explain compare describe difference between work works anyone someone done does write').split(' ')
);

/** Words that appear in almost every record here, so they say nothing about relevance. */
const COMMON = new Set(['project', 'projects', 'final', 'year', 'student', 'students', 'university', 'grove', 'study', 'system', 'systems']);

const stem = (w: string) => (w.length > 5 ? w.replace(/(ing|ed|es|s)$/, '') : w.length > 3 ? w.replace(/s$/, '') : w);

export function tokens(text: string): string[] {
  return (text.toLowerCase().match(/[a-z0-9]+/g) ?? [])
    .filter((w) => (w.length > 2 || w === 'ai') && !STOP.has(w))
    .map(stem);
}

/** Words students use for things the library words differently. */
const SYNONYM: Record<string, string> = {
  chatgpt: 'ai', gpt: 'ai', llm: 'ai', copilot: 'ai', gemini: 'ai', claude: 'ai',
  cheat: 'plagiarism', cheating: 'plagiarism', copied: 'plagiarism',
  thesis: 'dissertation', capstone: 'project',
};

const queryTokens = (q: string) => {
  const words = (q.toLowerCase().match(/[a-z0-9]+/g) ?? []).map((w) => SYNONYM[w] ?? w);
  return [...new Set(tokens(words.join(' ')).filter((t) => !COMMON.has(t)))];
};

function bestPassage(text: string, qt: string[]): string {
  const sentences = text.split(/(?<=[.!?])\s+|\n+/).map((s) => s.trim()).filter(Boolean);
  if (sentences.length === 0) return '';
  let best = 0;
  let bestScore = -1;
  sentences.forEach((s, i) => {
    const st = new Set(tokens(s));
    const sc = qt.reduce((n, t) => n + (st.has(t) ? 1 : 0), 0);
    if (sc > bestScore) {
      bestScore = sc;
      best = i;
    }
  });
  const out = [sentences[best], sentences[best + 1]].filter(Boolean).join(' ');
  return out.length > 320 ? out.slice(0, 317).trimEnd() + '…' : out;
}

export function searchSources(query: string, opts: { n?: number; kinds?: SourceKind[]; min?: number } = {}): Hit[] {
  const qt = queryTokens(query);
  if (qt.length === 0) return [];
  const pool = getSources().filter((s) => !opts.kinds || opts.kinds.includes(s.kind));
  const all = getSources();

  const docs = all.map((s) => ({
    s,
    title: new Set(tokens(s.title)),
    tags: new Set(s.tags.flatMap((t) => tokens(t))),
    body: tokens(s.text),
  }));
  const df = new Map<string, number>();
  for (const d of docs) {
    const seen = new Set([...d.title, ...d.tags, ...d.body]);
    for (const t of seen) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const idf = (t: string) => Math.log(1 + docs.length / (1 + (df.get(t) ?? 0)));

  const poolIds = new Set(pool.map((p) => p.id));
  const hits: Hit[] = [];
  for (const d of docs) {
    if (!poolIds.has(d.s.id)) continue;
    let score = 0;
    let matched = 0;
    for (const t of qt) {
      const tf = d.body.filter((b) => b === t).length;
      const inTitle = d.title.has(t);
      const inTags = d.tags.has(t);
      if (!tf && !inTitle && !inTags) continue;
      matched++;
      score += idf(t) * ((inTitle ? 6 : 0) + (inTags ? 4 : 0) + Math.min(tf, 3));
    }
    // long questions must match on at least two ideas, so one stray word can't pull in a record
    if (matched < (qt.length >= 4 ? 2 : 1)) continue;
    // reward covering more of the question, not repeating one word
    score *= 0.6 + 0.4 * (matched / qt.length);
    if (score >= (opts.min ?? 3)) hits.push({ source: d.s, score, passage: bestPassage(d.s.text, qt) });
  }
  hits.sort((a, b) => b.score - a.score);
  // Drop weak stragglers: anything far below the best match of its own kind is probably a coincidence.
  const bestOf = (isProject: boolean) => hits.find((h) => (h.source.kind === 'project') === isProject)?.score ?? 0;
  const bestProject = bestOf(true);
  const bestRule = bestOf(false);
  return hits
    .filter((h) => h.score >= (h.source.kind === 'project' ? bestProject : bestRule) * 0.25)
    .slice(0, opts.n ?? 4);
}

/** Questions about the university itself must come from the library, never from general knowledge. */
export const INSTITUTIONAL_RE =
  /\b(deadlines?|due dates?|submission|supervisors?|proposals?|dissertations?|defen[cs]e|viva|plagiari\w*|ai policy|ethics clearance|timetables?|exam dates?|registration|fees?|word limit|referencing style|allocat\w*)\b/i;

export const toRef = (h: Hit): SourceRef => ({
  id: h.source.id,
  kind: h.source.kind,
  title: h.source.title,
  meta: h.source.meta,
  demo: h.source.demo,
  quote: h.passage,
});
