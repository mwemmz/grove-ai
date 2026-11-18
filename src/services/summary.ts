/* Rewrites a whole note as a summary that carries the context, not just the content:
   what each idea is, how it works, why it matters, and how the ideas connect.
   Long notes are digested in parts and then joined, so nothing is dropped. The result is kept on the device. */
import { get, set } from 'idb-keyval';
import type { Note } from '../types';
import type { Section } from '../lib/noteStructure';
import { generateRouted, hasAi } from './llmService';
import { sectionSpeech } from './readAloud';

export const summaryAvailable = () => hasAi('ask');

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};
const key = (n: Note) => `grove-summary:${n.id}:${hash(n.content)}`;

export async function cachedSummary(n: Note): Promise<string | null> {
  try {
    return (await get<string>(key(n))) ?? null;
  } catch {
    return null;
  }
}

const VOICE = [
  'You are Grove, a study companion for a Zambian university student. You rewrite lecture notes as a summary that teaches.',
  'Lecture slides usually only name points. A good summary does not repeat the slide text: it explains the ideas in your own words, from general knowledge where the slides are thin, so the student understands the context. Never say "the slides say" or "according to the notes".',
  'Bring out the how and the why: what each idea is, how it works, why it matters, what causes what, and how the ideas connect. Use plain English and short sentences. Use everyday Zambian examples where they help (a shop in Lusaka, mobile money, a local supermarket or bank). Never invent a quote or a source.',
].join('\n');

const CHUNK = 9000;
function chunks(sections: Section[]): { title: string; text: string }[] {
  const out: { first: string; last: string; text: string }[] = [];
  for (const s of sections) {
    const t = sectionSpeech(s);
    if (!t.trim()) continue;
    const cur = out[out.length - 1];
    if (cur && cur.text.length + t.length < CHUNK) {
      cur.text += `\n\n## ${s.title}\n${t}`;
      cur.last = s.title;
    } else out.push({ first: s.title, last: s.title, text: `## ${s.title}\n${t}` });
  }
  return out.map((c) => ({ title: c.first === c.last ? c.first : `${c.first} to ${c.last}`, text: c.text }));
}

const LAYOUT = [
  'Write the summary in plain markdown with exactly this layout:',
  '### The big picture: 3 or 4 sentences on what this note is about and why it matters.',
  '### The ideas, in order: one "#### " heading per major idea (use the note\'s own topics, not every slide). Under each: one sentence on **what** it is, one or two on **how** it works, and one on **why** it matters or what follows from it. Add a short "*Example:*" from everyday Zambian life where it helps.',
  '### How it all connects: a short paragraph (or 3 to 5 bullets) tying the ideas together: causes, trade-offs, before and after.',
  '### Exam-ready summary: one paragraph of 5 to 8 sentences the student could write in a test.',
  '### Remember: 4 to 6 short bullets, each a single memorable point.',
].join('\n');

export async function summariseNote(note: Note, sections: Section[], onProgress?: (msg: string) => void): Promise<string> {
  const parts = chunks(sections);
  if (!parts.length) throw new Error('empty');
  let material: string;
  if (parts.length === 1) {
    material = parts[0].text;
  } else {
    const digests: string[] = [];
    for (let i = 0; i < parts.length; i++) {
      onProgress?.(`Reading part ${i + 1} of ${parts.length}…`);
      const out = await generateRouted(
        'ask',
        VOICE,
        [
          `Note: ${note.title}`,
          `Part ${i + 1} of ${parts.length} (${parts[i].title}):`,
          parts[i].text,
          '',
          'Write a digest of this part in about 250 words. For each idea: what it is, how it works, why it matters, and how it links to the ideas around it. Keep the order. Plain sentences, no headings.',
        ].join('\n'),
        900,
      );
      const t = out?.text?.trim() ?? '';
      if (t.length < 60) throw new Error('digest failed');
      digests.push(t);
    }
    material = digests.map((d, i) => `Part ${i + 1} (${parts[i].title}):\n${d}`).join('\n\n');
  }
  onProgress?.('Writing the summary…');
  const out = await generateRouted(
    'ask',
    `${VOICE}\n${LAYOUT}`,
    [`Note: ${note.title}`, parts.length > 1 ? 'Digests of each part of the note:' : 'The note:', material.slice(0, 24000), '', 'Now write the summary. About 450 to 750 words.'].join('\n'),
    2200,
  );
  const text = out?.text?.trim() ?? '';
  if (text.length < 200) throw new Error('empty');
  try {
    await set(key(note), text);
  } catch {
    /* storage full or private mode: the summary still shows this time */
  }
  return text;
}
