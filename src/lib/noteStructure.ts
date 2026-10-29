/* Turns a note's plain text into headed sections, grouped points and the diagrams those points call for.
   Pure functions, no AI: everything is read off the shape of the text. */

export interface Item {
  text: string;
  depth: number;
  term?: string;
  def?: string;
}

export interface Group {
  kind: 'list' | 'defs' | 'steps' | 'para' | 'example' | 'code' | 'table' | 'figure';
  label?: string;
  items: Item[];
  text?: string;
  /** For tables: the first row is the header. */
  rows?: string[][];
}

export interface Section {
  id: string;
  title: string;
  groups: Group[];
  /** The section's text as it was written, used to match animated pictures. */
  raw: string;
  /** Set when the slide was one numbered step in a run ("1. Input", "2. Splitting"). */
  step?: number;
}

export interface Node {
  text: string;
  sub?: string;
  kids?: Node[];
}

/** `covers` are the text groups the picture already shows in full, so the reader need not print them twice. */
export type Diagram = { covers: Group[] } & (
  | { k: 'pyramid'; caption: string; items: Node[] }
  | { k: 'layers'; caption: string; items: Node[] }
  | { k: 'flow'; caption: string; items: Node[] }
  | { k: 'tree'; caption: string; root: string; items: Node[] }
  | { k: 'compare'; caption: string; left: { label: string; items: string[] }; right: { label: string; items: string[] } }
);

export interface Recall {
  q: string;
  a: string[];
}

const HEAD = /^(#{1,4})\s+(.*)$/;
const BULLET = /^(\s*)([-*•–▪◦]|\d{1,2}[.)])\s+(.*)$/;
const GENERIC = /^(slide(\s*\d+)?|contd\.?|continued|\d+(\.\d+)*)$/i;

const clean = (s: string) => s.replace(/\s+/g, ' ').trim();
const tidyTitle = (s: string): string => {
  let t = clean(s);
  const strip = (re: RegExp) => { const r = t.replace(re, '').trim(); if (r.length >= 3) t = r; };
  strip(/^(unit|chapter|lesson|week)\s*:?\s*\d+(\.\d+)*\s*[.:\-–]?\s*/i); // "Unit 8.2. YARN" -> "YARN"
  strip(/^\d+(\.\d+)*\s*[.)]?\s*(?=[A-Za-z])/);                                // "3.Data Modeling" -> "Data Modeling"
  strip(/^(i{1,3}|iv|vi{0,3}|ix|x)[.)]\s+/i);                                      // "ii. Primitives" -> "Primitives"
  t = t.replace(/[\s:.\-–…]+$/, '');
  const open = (t.match(/\(/g) ?? []).length, close = (t.match(/\)/g) ?? []).length;
  return open > close ? t + ')' : t;
};
const CONTINUED = /^(contd|cont'?d|continued|continuation)\.*…?$/i;
const EXAMPLE_TITLE = /^(examples?|case study|illustration)$/i;
const NO_DIAGRAM = /objectives?|outcomes?|introduction|overview|conclusion|summary|references?|^school of|examination|instructions|^question\b|^section [a-z]\b|marking/i;
/** Slide furniture that carries no study value. */
const META = /^(unit|chapter|slide|page|lesson|week)\s*[:#.\-]?\s*\d+(\.\d+)*$/i;
const CLOSING = /^(thank\s*you.*|thanks.*|questions?(\s+(and|&)\s+(discussions?|answers?))?|q\s*&\s*a|any questions\??)[\s!.?]*$/i;
export const clip = (s: string, n: number) => (s.length > n ? s.slice(0, n - 1).replace(/\s+\S*$/, '').replace(/[\s,;:]+$/, '') + '…' : s);

/** A heading line for a block with no usable title: the first few words of its first line. */
function titleFrom(line: string): string {
  const first = clean(line).replace(/^[-*•–]\s*/, '');
  const num = /^(\d{1,2})\s*[.)]\s+(?=[A-Za-z])/.exec(first);
  const body = num ? first.slice(num[0].length) : first;
  const clause = body.split(/[.:;]\s/)[0];
  return clip(num ? `${num[1]}. ${clause}` : clause, 56);
}

/* ---------- splitting into sections ---------- */

export function parseSections(content: string, fallbackTitle = 'Overview'): Section[] {
  const lines = content.replace(/\r\n?/g, '\n').split('\n');
  const blocks: { title: string; body: string[] }[] = [];
  let cur: { title: string; body: string[] } = { title: '', body: [] };
  let fence = false;
  for (const line of lines) {
    if (line.trim().startsWith('```')) fence = !fence;
    const m = !fence && line.match(HEAD);
    if (m) {
      if (cur.title || cur.body.some((l) => l.trim())) blocks.push(cur);
      cur = { title: clean(m[2]), body: [] };
    } else cur.body.push(line);
  }
  if (cur.title || cur.body.some((l) => l.trim())) blocks.push(cur);

  const out: Section[] = [];
  blocks.forEach((b, i) => {
    let { title } = b;
    let body = b.body;
    const firstIdx = body.findIndex((l) => l.trim() && !/^!\[[^\]]*\]\(figure:/.test(l.trim()));
    // Old imports gave a long first line, or the word "Slide", as the heading. Use the real first words instead.
    if (!title || GENERIC.test(title) || !/[A-Za-z]/.test(title)) {
      if (firstIdx >= 0) {
        title = titleFrom(body[firstIdx]);
        if (clean(body[firstIdx]).length <= 56 && !/[.:]$/.test(clean(body[firstIdx]))) body = body.filter((_, j) => j !== firstIdx);
      } else title = i === 0 ? fallbackTitle : `Part ${i + 1}`;
    } else if (title.length > 70 && /[.:]$/.test(title)) {
      // A whole sentence was used as the heading: keep it as the opening line, head the section with its first words.
      body = [title, ...body];
      title = titleFrom(title);
    }
    const stepNo = /^(\d{1,2})\s*[.)]\s*(?=[A-Za-z])/.exec(title.trim());
    title = tidyTitle(title) || title;
    body = body.filter((l) => !META.test(l.trim()));
    // `raw` feeds search and the AI: a picture counts there by its caption only.
    const raw = [`### ${title}`, ...body].join('\n').replace(/!\[([^\]]*)\]\(figure:[^)\s]+\)/g, '$1');
    out.push({ id: '', title, groups: parseGroups(body), raw, ...(stepNo ? { step: Number(stepNo[1]) } : {}) });
  });

  // Tidy the result the way a person reading the slides would: drop empty and closing slides,
  // and join a slide that repeats the title of the one before it (a title slide followed by its content).
  const tidy: Section[] = [];
  for (const s of out) {
    const empty = s.groups.length === 0;
    const closing = CLOSING.test(s.title) && s.groups.reduce((n, g) => n + g.items.length, 0) < 3;
    if (closing) continue;
    const prev = tidy[tidy.length - 1];
    if (prev && (CONTINUED.test(s.title) || EXAMPLE_TITLE.test(s.title))) {
      // "Contd…" slides carry on the section before; an "Example" slide is that section's example.
      const asExample = EXAMPLE_TITLE.test(s.title);
      prev.groups.push(...s.groups.map((g): Group => (asExample && g.kind === 'para' ? { kind: 'example', label: 'Example', items: [], text: g.text } : g)));
      prev.raw += '\n' + s.raw.split('\n').slice(1).join('\n');
      continue;
    }
    if (prev && prev.title.toLowerCase() === s.title.toLowerCase()) {
      prev.groups.push(...s.groups);
      prev.raw += '\n' + s.raw.split('\n').slice(1).join('\n');
      continue;
    }
    if (empty && !(prev === undefined)) continue;
    if (empty) continue;
    tidy.push(s);
  }
  // The same heading used again further on (slides often repeat one) gets a part number so the outline is unambiguous.
  const seen = new Map<string, number>();
  // "1. Input", "2. Splitting"… is a sequence worth keeping in order: keep the number when a neighbour carries the next or previous one.
  tidy.forEach((s, i) => {
    if (s.step === undefined) return;
    const a = tidy[i - 1]?.step;
    const b = tidy[i + 1]?.step;
    if (a === s.step - 1 || b === s.step + 1) s.title = `${s.step}. ${s.title}`;
    else delete s.step;
  });
  return tidy.map((s, i) => {
    const k = s.title.toLowerCase();
    const n = (seen.get(k) ?? 0) + 1;
    seen.set(k, n);
    return { ...s, id: `s${i}`, title: n > 1 ? `${s.title} (part ${n})` : s.title };
  });
}

/* ---------- grouping a section's lines ---------- */

/** PDF text arrives hard-wrapped; a line that starts in lower case carries on the line above it. */
function unwrap(lines: string[]): string[] {
  const out: string[] = [];
  for (const l of lines) {
    const prev = out[out.length - 1];
    const t = l.trim();
    if (prev && t && !prev.trim().startsWith('|') && /^[a-z(]/.test(t) && !BULLET.test(l) && !BULLET.test(prev) && prev.trim() && !/[.:;!?]$/.test(prev.trim()) && !prev.trim().startsWith('```')) {
      out[out.length - 1] = prev.replace(/\s+$/, '') + ' ' + t;
    } else out.push(l);
  }
  return out;
}

function parseGroups(rawBody: string[]): Group[] {
  const body = unwrap(rawBody);
  const groups: Group[] = [];
  let label: string | undefined;
  let run: Item[] = [];
  let steps = false;

  const flushRun = () => {
    if (run.length === 0) return;
    const items = run;
    run = [];
    const lab = label;
    label = undefined;
    const numbered = steps;
    steps = false;
    const sentence = (t: string) => t.length > 100 || /[.!?]$/.test(t);
    // One or two sentences on their own are paragraphs; a run of lines is a list.
    if (!numbered && items.length < 3 && items.every((i) => i.depth === 0 && sentence(i.text))) {
      if (lab) groups.push({ kind: 'list', label: lab, items });
      else items.forEach((i) => groups.push({ kind: 'para', items: [], text: i.text }));
      return;
    }
    const withDefs = items.filter((i) => i.term).length;
    if (!numbered && items.length >= 2 && withDefs >= Math.ceil(items.length * 0.6)) groups.push({ kind: 'defs', label: lab, items });
    else groups.push({ kind: numbered ? 'steps' : 'list', label: lab, items });
  };

  let i = 0;
  while (i < body.length) {
    const raw = body[i];
    const t = raw.trim();
    if (!t) {
      flushRun();
      i++;
      continue;
    }
    // A picture: ![caption](figure:...) on its own line. `text` holds the reference, `label` the caption.
    const fig = /^!\[([^\]]*)\]\((figure:[^)\s]+)\)\s*$/.exec(t);
    if (fig) {
      flushRun();
      groups.push({ kind: 'figure', label: fig[1] || undefined, items: [], text: fig[2] });
      i++;
      continue;
    }
    if (t.startsWith('```')) {
      flushRun();
      const code: string[] = [];
      i++;
      while (i < body.length && !body[i].trim().startsWith('```')) code.push(body[i++]);
      i++;
      groups.push({ kind: 'code', items: [], text: code.join('\n') });
      continue;
    }
    if (t.startsWith('|') && t.endsWith('|')) {
      flushRun();
      const rows: string[][] = [];
      while (i < body.length && body[i].trim().startsWith('|')) {
        const cells = body[i].trim().replace(/^\||\|$/g, '').split('|').map((c) => c.trim());
        if (!cells.every((c) => /^:?-{2,}:?$/.test(c) || c === '---')) rows.push(cells);
        i++;
      }
      if (rows.length) groups.push({ kind: 'table', label, items: [], rows });
      label = undefined;
      continue;
    }
    const ex = t.match(/^(example|e\.g\.|for example|note|tip)\s*[:\-–]\s*(.+)$/i);
    if (ex) {
      flushRun();
      groups.push({ kind: 'example', label: ex[1].replace(/^./, (c) => c.toUpperCase()), items: [], text: ex[2] });
      i++;
      continue;
    }
    const bm = raw.match(BULLET);
    // A short line ending in a colon names the list that follows it.
    if (!bm && /^[^.!?]{2,70}:$/.test(t)) {
      flushRun();
      label = t.slice(0, -1);
      i++;
      continue;
    }
    const body0 = bm ? bm[3] : t;
    const depth = bm ? Math.min(2, Math.floor(bm[1].replace(/\t/g, '  ').length / 2)) : 0;
    if (bm && /\d/.test(bm[2])) steps = true;
    const d = body0.match(/^([^:]{2,40}):\s+(\S.*)$/);
    const stepLine = d && /^(step|stage|phase)\s*\d+$/i.test(d[1].trim());
    if (stepLine) steps = true;
    const item: Item = d && !stepLine && !/^https?$/i.test(d[1]) ? { text: body0, depth, term: d[1].trim(), def: d[2].trim() } : { text: stepLine && d ? d[2].trim() : body0, depth };
    run.push(item);
    i++;
  }
  flushRun();
  return groups;
}

/* ---------- diagrams ---------- */

const SHORT = 64;
const re = {
  pyramid: /pyramid|hierarch|dikw|ranking|priority/i,
  layers: /layer|tier|stack|architecture|levels?\b/i,
  flow: /\b(steps?|process|stages?|phases?|life ?cycle|workflow|pipeline|cycle|flow|procedure|sequence)\b|how it works/i,
  pro: /advantage|benefit|pros?\b|strength|merit|positive/i,
  con: /disadvantage|challenge|cons?\b|limitation|drawback|weakness|risk|negative/i,
};

/** Items with their indented sub-points folded under them. */
function nest(items: Item[]): Node[] {
  const out: Node[] = [];
  for (const it of items) {
    const n: Node = it.term ? { text: it.term, sub: it.def } : { text: it.text };
    const last = out[out.length - 1];
    if (it.depth > 0 && last) (last.kids ??= []).push(n);
    else out.push(n);
  }
  return out;
}

const fits = (nodes: Node[]) => nodes.every((n) => n.text.length <= SHORT);

/** Cover pages, exam questions and the like are read, not revised from a picture. */
export const readOnly = (section: Section) => NO_DIAGRAM.test(section.title);

export function diagramsFor(section: Section): Diagram[] {
  const out: Diagram[] = [];
  if (NO_DIAGRAM.test(section.title)) return out;
  const lists = section.groups.filter((g) => g.kind === 'list' || g.kind === 'defs' || g.kind === 'steps');

  const pro = lists.find((g) => g.label && re.pro.test(g.label));
  const con = lists.find((g) => g.label && re.con.test(g.label));
  if (pro && con && pro !== con) {
    out.push({
      covers: [pro, con],
      k: 'compare',
      caption: `${section.title}: for and against`,
      left: { label: pro.label!, items: pro.items.map((i) => clip(i.text, 90)) },
      right: { label: con.label!, items: con.items.map((i) => clip(i.text, 90)) },
    });
  }

  for (const g of lists) {
    if (g === pro || g === con) continue;
    const nodes = nest(g.items);
    if (nodes.length < 3 || nodes.length > 9 || !fits(nodes)) continue;
    // A list's own label says what it is; a section title only counts when it names the structure itself ("The Layers", "ETL Process").
    const titleHint = /(layers|tiers|stack|levels|process|steps|stages|phases|life ?cycle|workflow|pipeline|procedure|sequence|pyramid|hierarchy)$/i.test(section.title) ? section.title : '';
    const about = g.label ? g.label : titleHint;
    const caption = g.label && g.label.length <= 40 ? g.label : section.title;
    const whole = nodes.length <= 7;
    const covers = whole ? [g] : [];
    if (g.kind === 'steps' || re.flow.test(about)) out.push({ covers, k: 'flow', caption: `${caption}: in order`, items: nodes.slice(0, 7) });
    else if (re.pyramid.test(about)) out.push({ covers, k: 'pyramid', caption: `${caption}: top to bottom`, items: nodes.slice(0, 7) });
    else if (re.layers.test(about)) out.push({ covers, k: 'layers', caption: `${caption}: how the layers stack`, items: nodes.slice(0, 7) });
    else out.push({ covers: [g], k: 'tree', caption: `${caption}: how it breaks down`, root: g.label && g.label.length < 40 ? `${section.title} · ${g.label}` : section.title, items: nodes });
  }
  return out.slice(0, 2);
}

/** The whole note as one tree: note → sections → their first few points. */
export function noteMap(title: string, sections: Section[]): { root: string; items: Node[] } {
  const items: Node[] = [];
  for (const s of sections) {
    if (/^(learning )?objectives?|thank you|references?$/i.test(s.title)) continue;
    const g = s.groups.find((x) => x.kind === 'list' || x.kind === 'defs' || x.kind === 'steps');
    if (s.groups.length <= 1 && (g?.items.length ?? 0) <= 1) continue;
    const kids = g ? nest(g.items).filter((n) => n.text.length <= 40 && !/^unit$/i.test(n.text)).slice(0, 4).map((n) => ({ text: clip(n.text, 28) })) : [];
    items.push({ text: clip(s.title, 34), kids });
    if (items.length >= 14) break;
  }
  return { root: title, items };
}

/** Terms from "Term: meaning" lines across the note, for a quick glossary. */
export function glossary(sections: Section[], max = 16): { term: string; def: string }[] {
  const seen = new Set<string>();
  const out: { term: string; def: string }[] = [];
  for (const s of sections) {
    for (const g of s.groups) {
      if (g.kind !== 'defs') continue;
      for (const it of g.items) {
        if (!it.term || !it.def || seen.has(it.term.toLowerCase())) continue;
        seen.add(it.term.toLowerCase());
        out.push({ term: it.term, def: it.def });
        if (out.length >= max) return out;
      }
    }
  }
  return out;
}

/** "Cover it and say it" prompts, so reading becomes recall (answers stay hidden until opened). */
export function recallFor(section: Section): Recall | null {
  if (/^school of|examination|instructions|^question\b|^section [a-z]\b|marking|^thank/i.test(section.title)) return null;
  const g = section.groups.find((x) => x.kind === 'list' || x.kind === 'defs' || x.kind === 'steps');
  if (!g || g.items.length < 2) return null;
  const subject = g.label && g.label.length <= 40 ? g.label : section.title;
  const answers = g.items.slice(0, 8).map((i) => (i.term ? `${i.term}: ${clip(i.def ?? '', 100)}` : clip(i.text, 110)));
  const q =
    g.kind === 'steps' ? `Say the steps of "${subject}" in order, without looking.` :
    g.kind === 'defs' ? `Cover this up. What does each part of "${subject}" mean?` :
    `Cover this up. Name the ${g.items.length} points under "${subject}".`;
  return { q, a: answers };
}
