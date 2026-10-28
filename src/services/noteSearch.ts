import type { Note } from '../types';
import { parseSections, clip, type Section, type Group, type Item } from '../lib/noteStructure';
import { tokens } from './knowledge';

/**
 * Finding and answering from the student's own notes with no AI at all.
 * Notes are split into the same sections the reader shows, so a question lands on "Data Fabric vs Data Mesh",
 * not on "Unit 7" as a whole, and the answer can be built from a table, a list or a set of steps as the question asks.
 */

export interface SectionHit {
  note: Note;
  section: Section;
  score: number;
}

interface Entry {
  note: Note;
  section: Section;
  title: Set<string>;
  head: Set<string>;
  body: Map<string, number>;
  len: number;
}

interface Index {
  key: string;
  entries: Entry[];
  df: Map<string, number>;
  avg: number;
  /** "ETL" -> tokens of "Extract Transform Load", learned from the notes themselves. */
  abbr: Map<string, string[]>;
  /** and the other way round, so asking in full words still finds a section that only says "ETL". */
  full: { tokens: string[]; abbr: string }[];
}

let cache: Index | null = null;

/** Short forms students use that a note may spell out (or the reverse). */
const SHORT_FORMS: Record<string, string> = {
  db: 'database', dbs: 'database', rdbms: 'relational database', dw: 'data warehouse', dwh: 'data warehouse',
  nosql: 'not only sql', ml: 'machine learning', bi: 'business intelligence', os: 'operating system',
  bigdata: 'big data', hdfs: 'hadoop distributed file system',
};

const words = (s: string) => s.toLowerCase().match(/[a-z0-9]+/g) ?? [];

function learnAbbreviations(notes: Note[]): Pick<Index, 'abbr' | 'full'> {
  const abbr = new Map<string, string[]>();
  const full: Index['full'] = [];
  const add = (short: string, long: string) => {
    const s = short.toLowerCase().replace(/s$/, '');
    const t = tokens(long);
    if (s.length < 2 || t.length < 2 || abbr.has(s)) return;
    abbr.set(s, t);
    full.push({ tokens: t, abbr: s });
  };
  for (const n of notes) {
    for (const m of n.content.matchAll(/([A-Z][A-Za-z]+(?:[ -][A-Za-z]+){1,5})\s*\(\s*([A-Z][A-Za-z]{1,7})\s*\)/g)) add(m[2], m[1]);
    for (const m of n.content.matchAll(/\b([A-Z]{2,8})\s*\(\s*([A-Za-z][A-Za-z ,-]{6,60})\)/g)) add(m[1], m[2]);
  }
  return { abbr, full };
}

function build(notes: Note[]): Index {
  const key = notes.map((n) => `${n.id}:${n.updatedAt}:${n.content.length}`).join('|');
  if (cache && cache.key === key) return cache;
  const entries: Entry[] = [];
  const df = new Map<string, number>();
  for (const note of notes) {
    for (const section of parseSections(note.content, note.title)) {
      const headWords = section.groups.flatMap((g) => [g.label ?? '', ...g.items.map((i) => i.term ?? ''), ...(g.rows ? [g.rows[0]?.join(' ') ?? ''] : [])]);
      const bodyTokens = tokens(section.raw.replace(/^###[^\n]*\n?/, ''));
      const body = new Map<string, number>();
      for (const t of bodyTokens) body.set(t, (body.get(t) ?? 0) + 1);
      const e: Entry = { note, section, title: new Set(tokens(section.title)), head: new Set(tokens(headWords.join(' '))), body, len: bodyTokens.length || 1 };
      entries.push(e);
      for (const t of new Set([...e.title, ...e.head, ...body.keys()])) df.set(t, (df.get(t) ?? 0) + 1);
    }
  }
  const avg = entries.reduce((n, e) => n + e.len, 0) / Math.max(entries.length, 1);
  cache = { key, entries, df, avg, ...learnAbbreviations(notes) };
  return cache;
}

/** The question as weighted search terms: its own words, plus the short or long form of anything it abbreviates. */
function queryTerms(question: string, ix: Index): Map<string, number> {
  const out = new Map<string, number>();
  const put = (t: string, w: number) => out.set(t, Math.max(out.get(t) ?? 0, w));
  const raw = words(question);
  for (const t of tokens(question)) put(t, 1);
  for (const w of raw) {
    const short = w.replace(/s$/, '');
    const long = ix.abbr.get(short);
    if (long) long.forEach((t) => put(t, 0.6));
    const sf = SHORT_FORMS[w];
    if (sf) tokens(sf).forEach((t) => put(t, 0.8));
  }
  const qt = new Set(tokens(question));
  for (const f of ix.full) if (f.tokens.every((t) => qt.has(t))) put(tokens(f.abbr)[0] ?? f.abbr, 0.9);
  return out;
}

export function searchSections(question: string, notes: Note[], n = 5): SectionHit[] {
  // Past papers are for practising, not for answering from; they only count when the question is about an exam.
  const examQ = /\b(past papers?|exam|examination|marks?|question paper|mock)\b/i.test(question);
  const pool = examQ ? notes : notes.filter((n) => !/^past paper/i.test(n.title));
  const ix = build(pool);
  const q = queryTerms(question, ix);
  const asked = new Set(tokens(question));
  if (q.size === 0 || ix.entries.length === 0) return [];
  const N = ix.entries.length;
  const idf = (t: string) => Math.log(1 + (N - (ix.df.get(t) ?? 0) + 0.5) / ((ix.df.get(t) ?? 0) + 0.5));
  const k = 1.2;
  const b = 0.75;
  const weightSum = [...q.values()].reduce((a, c) => a + c, 0);
  const hits: SectionHit[] = [];
  for (const e of ix.entries) {
    let score = 0;
    let matched = 0;
    let matchedAsked = 0;
    let titleHits = 0;
    for (const [t, w] of q) {
      const tf = e.body.get(t) ?? 0;
      const inTitle = e.title.has(t);
      const inHead = e.head.has(t);
      if (!tf && !inTitle && !inHead) continue;
      matched += w;
      if (asked.has(t)) matchedAsked++;
      if (inTitle) titleHits++;
      const bm = tf ? (tf * (k + 1)) / (tf + k * (1 - b + (b * e.len) / ix.avg)) : 0;
      score += w * idf(t) * (bm + (inTitle ? 3 : 0) + (inHead ? 1.5 : 0));
    }
    if (!matched) continue;
    // Two or more real words in the question must mean at least two of them are found, so one shared word ("Zambia") cannot make an answer.
    if (matchedAsked < Math.min(2, asked.size)) continue;
    const coverage = matched / weightSum;
    if (q.size >= 3 && coverage < 0.34) continue; // a stray word should not pull a section in
    score *= 0.5 + 0.5 * coverage;
    if (titleHits && titleHits >= e.title.size && titleHits >= Math.min(q.size, 2)) score *= 1.3; // the section is named by the question
    hits.push({ note: e.note, section: e.section, score });
  }
  hits.sort((a, b2) => b2.score - a.score);
  const best = hits[0]?.score ?? 0;
  return hits.filter((h) => h.score >= best * 0.4).slice(0, n);
}

/** Best section per note, for ranking whole notes. */
export function searchNotes(question: string, notes: Note[]): { note: Note; score: number; section: Section }[] {
  const seen = new Map<string, { note: Note; score: number; section: Section }>();
  for (const h of searchSections(question, notes, 24)) {
    const cur = seen.get(h.note.id);
    if (!cur) seen.set(h.note.id, { note: h.note, score: h.score, section: h.section });
    else cur.score += h.score * 0.15;
  }
  return [...seen.values()].sort((a, b) => b.score - a.score);
}

/** What the AI is given: the few sections that matter, not the first page of each long note. */
export function groundingFor(hits: SectionHit[], max = 6): Note[] {
  return hits.slice(0, max).map((h) => ({ ...h.note, title: `${h.note.title} › ${h.section.title}`, content: h.section.raw.replace(/^###[^\n]*\n?/, '').trim() }));
}

/* ---------- answers shaped like the question ---------- */

export type Intent = 'compare' | 'steps' | 'list' | 'example' | 'define' | 'general';

export function intentOf(q: string): Intent {
  const s = q.toLowerCase();
  if (/\b(differences?|differ|compare|comparison|versus|vs\.?|distinguish|contrast)\b/.test(s)) return 'compare';
  if (/\b(steps?|stages?|phases?|procedure|life ?cycle|workflow|sequence|in order)\b/.test(s) || /\bprocess\b/.test(s) || /\bhow (does|do|is|are|did)\b.*\b(work|works|happen|happens|done|carried out)\b/.test(s)) return 'steps';
  if (/\b(types?|kinds?|features?|characteristics|components?|advantages|disadvantages|benefits|layers|tiers|categories|elements|list|name the|properties)\b/.test(s)) return 'list';
  if (/\bexamples?\b|\bfor instance\b|\bgive me an?\b/.test(s)) return 'example';
  if (/^\s*(what|who)\s+(is|are|was|were)\b|\bdefine\b|\bmeaning of\b|\bwhat does .* mean\b|\bexplain\b/.test(s)) return 'define';
  return 'general';
}

const line = (it: Item) => (it.term && it.def ? `**${it.term}** — ${clip(it.def, 300)}` : clip(it.text, 320));
const topLevel = (g: Group) => {
  const top = g.items.filter((i) => i.depth === 0);
  return top.length >= 2 ? top : g.items;
};
const bullets = (g: Group, cap: number) => topLevel(g).slice(0, cap).map((i) => `- ${line(i)}`).join('\n');
const para = (s: Section) => s.groups.find((g) => g.kind === 'para')?.text;
const firstOf = (s: Section, ...kinds: Group['kind'][]) => s.groups.find((g) => kinds.includes(g.kind));
const examplesIn = (s: Section) => s.groups.filter((g) => g.kind === 'example').map((g) => g.text ?? '').filter(Boolean);
/** The line in a section that answers the question best, so a long slide leads with the part that was asked about. */
function focusLine(s: Section, q: Set<string>): string | undefined {
  const need = Math.min(2, q.size);
  let best: { text: string; score: number } | undefined;
  const consider = (text: string, shown: string) => {
    const score = new Set(tokens(text).filter((t) => q.has(t))).size;
    if (score >= need && (!best || score > best.score)) best = { text: shown, score };
  };
  for (const g of s.groups) {
    if (g.kind === 'para' && g.text) consider(g.text, clip(g.text, 320));
    for (const it of g.items) consider(`${it.term ?? ''} ${it.def ?? it.text}`, line(it));
  }
  return best?.text;
}
const overlap = (text: string, q: Set<string>) => tokens(text).filter((t) => q.has(t)).length;

function tableAnswer(g: Group, title: string): string {
  const [head, ...rest] = g.rows ?? [];
  if (!head) return '';
  const rows = rest.map((r) => {
    const cells = r.slice(1).map((c, i) => (head[i + 1] ? `${head[i + 1]}: ${c}` : c)).filter((c) => c.trim());
    return `- **${r[0]}** — ${cells.join(' · ')}`;
  });
  return `### ${title}\n${rows.join('\n')}`;
}

export interface LocalAnswer {
  text: string;
  used: SectionHit[];
  intent: Intent;
}

export function answerFromNotes(question: string, notes: Note[], opts: { concise?: boolean; hits?: SectionHit[] } = {}): LocalAnswer | null {
  const hits = opts.hits ?? searchSections(question, notes, 5);
  if (!hits.length) return null;
  const intent = intentOf(question);
  const cap = opts.concise ? 4 : 8;
  const qset = new Set(tokens(question));
  const top = hits[0];
  const sections = hits.slice(0, 3);
  const done = (text: string, used: SectionHit[]): LocalAnswer => ({
    text: `${text.replace(/^(### )\d+\.\s+/gm, '$1')}\n\n${used.slice(0, 3).map((u) => `From **${u.note.title}** › ${u.section.title.replace(/^\d+\.\s+/, '')}.`).join('\n')}`,
    used,
    intent,
  });

  // A section written out as a short answer rather than a pasted slide.
  const render = (hit: SectionHit): LocalAnswer => {
  const s = hit.section;
  const parts: string[] = [`### ${s.title}`];
  const titleToks = new Set(tokens(s.title));
  const focus = [...qset].every((t) => titleToks.has(t)) ? undefined : focusLine(s, qset);
  if (focus) parts.push(`> ${focus}`);
  const paras = s.groups.filter((x) => x.kind === 'para' && x.text).map((x) => clip(x.text!, 320)).slice(0, opts.concise ? 1 : 3);
  const p = paras[0];
  if (paras.length) parts.push(paras.join('\n\n'));
  const stepsG = firstOf(s, 'steps');
  const g = firstOf(s, 'list', 'defs') ?? (stepsG && stepsG.items.every((i) => i.text.length <= 100) ? stepsG : undefined);
  if (g && !focus) parts.push(g.kind === 'steps' ? topLevel(g).slice(0, cap).map((i, n) => `${n + 1}. ${line(i)}`).join('\n') : bullets(g, cap));
  const tbl = firstOf(s, 'table');
  if (tbl && !g && !p) parts.push(tableAnswer(tbl, s.title).replace(/^###[^\n]*\n/, ''));
  const ex = examplesIn(s)[0];
  if (ex && !opts.concise) parts.push(`**Example** — ${clip(ex, 240)}`);
  const related = hits.filter((x) => x !== hit).slice(0, 2).filter((h) => h.section !== s && h.section.title.toLowerCase() !== s.title.toLowerCase() && h.score >= hit.score * 0.6);
  if (related.length && !opts.concise) parts.push(`Related: ${related.map((r) => `**${r.section.title}**`).join(', ')}.`);
  if (parts.length === 1) parts.push(clip(s.raw.replace(/^###[^\n]*\n?/, '').replace(/\s+/g, ' ').trim(), 400));
  return done(parts.join('\n\n'), [hit, ...related]);
  };

  if (intent === 'compare') {
    let best: { h: SectionHit; g: Group; s: number } | null = null;
    for (const h of sections) for (const g of h.section.groups) {
      if (g.kind !== 'table' || !g.rows) continue;
      const s = overlap(`${h.section.title} ${g.rows[0].join(' ')}`, qset) * 3 + overlap(g.rows.flat().join(' '), qset);
      if (!best || s > best.s) best = { h, g, s };
    }
    if (best && best.s > 0) return done(tableAnswer(best.g, best.h.section.title), [best.h]);
    // One slide already sets the two against each other ("OLAP vs OLTP"): that is the answer.
    if (/\bvs\.?\b|versus|difference/i.test(top.section.title)) return render(top);
    // No table: set the two sides next to each other, each from its own section.
    const sides = question.replace(/\?+$/, '').split(/\b(?:and|vs\.?|versus|or|from|between|with)\b/i).map((x) => x.trim()).filter((x) => tokens(x).length > 0);
    const picked: SectionHit[] = [];
    const lines: string[] = [];
    for (const side of sides.slice(-2)) {
      const h = searchSections(side, notes, 1)[0];
      if (!h || picked.some((p) => p.section === h.section)) continue;
      picked.push(h);
      const g = firstOf(h.section, 'defs', 'list');
      lines.push(`### ${h.section.title}\n${para(h.section) ? clip(para(h.section)!, 300) : ''}${g ? `\n\n${bullets(g, 4)}` : ''}`.trim());
    }
    if (picked.length >= 2) return done(lines.join('\n\n'), picked);
  }

  if (intent === 'steps') {
    // A run of numbered slides ("1. Input", "2. Splitting"…) after the slide the question names is the process.
    for (const h of sections) {
      const all = parseSections(h.note.content, h.note.title);
      const at = all.findIndex((x) => x.id === h.section.id);
      const run: Section[] = [];
      for (let i = at + 1; i < all.length && all[i].step === run.length + 1; i++) run.push(all[i]);
      if (run.length >= 2) {
        const items = run.map((r) => `${r.title.replace(/^\d+\.\s*/, '')} — ${clip(para(r) ?? r.groups.find((g) => g.items.length)?.items[0]?.text ?? '', 200)}`);
        return done(`### ${h.section.title}\n${items.map((t, n) => `${n + 1}. ${t}`).join('\n')}`, [h]);
      }
    }
    for (const h of sections) {
      const g = h.section.groups.find((x) => x.kind === 'steps') ?? h.section.groups.find((x) => x.kind === 'list' && /steps?|stages?|phases?|process|order|cycle/i.test(`${x.label ?? ''} ${h.section.title}`));
      if (g && g.items.length >= 2) {
        const items = topLevel(g).slice(0, 12).map((i, n) => `${n + 1}. ${line(i)}`).join('\n');
        return done(`### ${g.label ?? h.section.title}\n${items}`, [h]);
      }
    }
  }

  if (intent === 'list') {
    let best: { h: SectionHit; g: Group; s: number } | null = null;
    for (const h of sections) for (const g of h.section.groups) {
      if (!(g.kind === 'list' || g.kind === 'defs') || g.items.length < 2) continue;
      const s = overlap(`${g.label ?? ''} ${h.section.title}`, qset) * 3 + (h === top ? 1 : 0);
      if (!best || s > best.s) best = { h, g, s };
    }
    if (best) return done(`### ${best.g.label ?? best.h.section.title}\n${bullets(best.g, cap + 4)}`, [best.h]);
  }

  if (intent === 'example') {
    const found = sections.flatMap((h) => examplesIn(h.section).map((e) => ({ h, e })));
    if (found.length) {
      const shown = found.slice(0, opts.concise ? 2 : 4);
      return done(shown.map((f) => `**${f.h.section.title}** — ${clip(f.e, 260)}`).join('\n\n'), [...new Set(shown.map((f) => f.h))]);
    }
  }

  if (intent === 'define') {
    const named = sections.find((h) => qset.size > 0 && [...qset].every((t) => tokens(h.section.title).includes(t)));
    if (named) return render(named);
    for (const h of sections) for (const g of h.section.groups) {
      if (g.kind !== 'defs') continue;
      const it = g.items.find((i) => i.term && i.def && tokens(i.term).length && tokens(i.term).every((t) => qset.has(t)));
      if (it) {
        const ex = examplesIn(h.section)[0];
        return done(`**${it.term}** — ${it.def}${ex ? `\n\n**Example** — ${clip(ex, 240)}` : ''}`, [h]);
      }
    }
  }

  return render(top);
}
