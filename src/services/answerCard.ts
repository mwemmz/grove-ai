/* An "answer card" for one section of a note: the section turned into the kind of answer a student would write in an exam
   (direct answer, key points with a Zambian example each, why it matters, exam-ready paragraph, a line to remember).
   Made on demand with the student's AI, then kept on the device so it works again offline. */
import { get, set } from 'idb-keyval';
import type { Section } from '../lib/noteStructure';
import { generateRouted, hasAi } from './llmService';
import { sectionSpeech } from './readAloud';

export const cardsAvailable = () => hasAi('ask');

const hash = (s: string) => {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
};

const SYSTEM = [
  'You are Grove, a study companion for a Zambian university student. You turn one slide of lecture notes into a complete study answer.',
  'Slides often only name points. Use them to know what the course expects, then explain each idea fully in your own words from general knowledge. Never answer with references to the slides.',
  'Write plain English in short sentences, with everyday Zambian examples (a shop in Lusaka, mobile money, a local supermarket or bank). Never invent a quote or a source.',
  'Use exactly this layout in plain markdown:',
  'First line: the direct answer in one bold sentence (a definition if the slide names a concept; the point it makes otherwise).',
  '### Key points: 3 to 5 bullets. Each starts with a bold key term, then what it means in one or two sentences, then "*Example:*" with a short real Zambian scenario.',
  '### Why it matters: 2 or 3 bullets (for business topics, why it matters for e-business or for the firm).',
  '### Exam-ready answer: 3 to 5 sentences a student could write in a test, with no bullets.',
  '**Remember:** one memorable line.',
  'About 250 to 400 words in total.',
].join('\n');

const key = (noteId: string, s: Section) => `grove-card:${noteId}:${s.id}:${hash(s.raw)}`;

export async function cachedCard(noteId: string, s: Section): Promise<string | null> {
  try {
    return (await get<string>(key(noteId, s))) ?? null;
  } catch {
    return null;
  }
}

export async function makeCard(noteId: string, noteTitle: string, s: Section): Promise<string> {
  const user = [`Note: ${noteTitle}`, `Slide: ${s.title}`, 'What the slide says:', sectionSpeech(s).slice(0, 3500), '', `Write the study answer for: "${s.title}".`].join('\n');
  const out = await generateRouted('ask', SYSTEM, user, 1300);
  const text = out?.text?.trim() ?? '';
  if (text.length < 80) throw new Error('empty');
  try {
    await set(key(noteId, s), text);
  } catch {
    /* storage full or private mode: the card still shows this time */
  }
  return text;
}
