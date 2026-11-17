/* The talking tutor: turns a note section into a spoken explanation and answers the student's replies.
   Written for the ear: no bullets, tables or headings, short sentences, one check question at a time. */
import { storage } from './storage';
import { generateRouted, hasAi } from './llmService';

export const tutorAvailable = () => hasAi('ask');

export type TutorKind = 'again' | 'simpler' | 'example' | 'answer' | 'ask';
export interface Turn {
  tutor: string;
  student?: string;
}

const system = () => {
  const p = storage.getProfile();
  const who = p.studentName ? p.studentName.split(' ')[0] : 'the student';
  return [
    `You are Grove, a warm, patient human tutor talking out loud with ${who}${p.degreeName ? `, who studies ${p.degreeName}` : ''}. Everything you write will be spoken by a voice, so write exactly how a good tutor talks.`,
    'Spoken style: plain sentences, contractions, a friendly tone. No markdown, no bullet points, no numbered lists, no headings, no tables, no symbols, no links, no brackets. Say "first", "next", "for example" instead of listing.',
    'Teach, do not read. The notes are lecture slides that often only name points. Use them to know what the course expects, then explain each idea fully in your own words from general knowledge, the way you would to a friend sitting next to you.',
    'Use everyday Zambian examples where they fit (a shop in Lusaka, mobile money, a local supermarket or bank). Never invent a quote or a source.',
    'Never say "according to the slide" or "the notes say". Just teach.',
  ].join('\n');
};

const clean = (t: string) =>
  t
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/^\s{0,3}#{1,6}\s*/gm, '')
    .replace(/^\s*(?:[-*•]|\d+[.)])\s+/gm, '')
    .replace(/[*_`>|~]/g, '')
    .replace(/\s+/g, ' ')
    .trim();

/** Teaches one section, then asks one question. Returns the spoken text and the question separately. */
export async function explainSection(opts: { noteTitle: string; title: string; text: string; first: boolean; prevTitle?: string }): Promise<{ say: string; question: string }> {
  const user = [
    `Note: ${opts.noteTitle}`,
    `Section: ${opts.title}`,
    'What the notes say on this section:',
    opts.text.slice(0, 3500),
    '',
    opts.first ? 'This is the start of the lesson: open with one short friendly sentence to welcome them, then teach.' : `Link in one short phrase to the previous section (${opts.prevTitle ?? 'the last one'}), then teach.`,
    'Teach this section in about 110 to 170 words, in short, chatty spoken sentences, like a friend explaining it. Then drive it home: say "So the point is" followed by the two to four key takeaways in one flowing spoken sentence or two (for example "So the point is, first this, second that, and third this"). Then finish with exactly one line starting with "QUESTION:" that asks one short question to check they understood (one they can answer in a sentence).',
  ].join('\n');
  const out = await generateRouted('ask', system(), user, 800);
  const raw = out?.text ?? '';
  const [say, q] = raw.split(/\n?\s*QUESTION:\s*/i);
  return { say: clean(say), question: clean(q ?? '') };
}

const KIND: Record<TutorKind, string> = {
  again: 'The student asked you to explain it again. Explain the same idea a different way, with a fresh example.',
  simpler: 'The student found that hard. Explain it much more simply, in the plainest words, with one very ordinary example.',
  example: 'The student wants an example. Give one clear, real-life Zambian example and tie it back to the idea.',
  answer: 'The student has answered your question. Tell them warmly whether they have it right, fix anything wrong or missing in one or two sentences, and add one useful point.',
  ask: 'The student has asked you something. Answer it directly and clearly, keeping to this topic.',
};

/** A short spoken reply to what the student said or asked for. Ends by offering to go on. */
export async function tutorReply(opts: { kind: TutorKind; title: string; text: string; question: string; student?: string; history: Turn[] }): Promise<string> {
  const past = opts.history.slice(-4).map((t) => `Tutor: ${t.tutor}${t.student ? `\nStudent: ${t.student}` : ''}`).join('\n');
  const user = [
    `Section: ${opts.title}`,
    `What the notes say: ${opts.text.slice(0, 2500)}`,
    past ? `The conversation so far:\n${past}` : '',
    opts.question ? `Your question was: ${opts.question}` : '',
    opts.student ? `The student said: ${opts.student}` : '',
    KIND[opts.kind],
    'Keep it to about 60 to 120 words, in short spoken sentences. End by asking, in a few words, whether they want to go over anything else or move on.',
  ]
    .filter(Boolean)
    .join('\n');
  const out = await generateRouted('ask', system(), user, 500);
  return clean(out?.text ?? '');
}

/* ---------- the student's voice ---------- */

type Rec = { lang: string; interimResults: boolean; maxAlternatives: number; start(): void; stop(): void; onresult: ((e: { results: { 0: { transcript: string } }[] }) => void) | null; onerror: (() => void) | null; onend: (() => void) | null };
const Ctor = (): (new () => Rec) | null => {
  const w = window as unknown as { SpeechRecognition?: new () => Rec; webkitSpeechRecognition?: new () => Rec };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
};
export const canHear = () => typeof window !== 'undefined' && !!Ctor();

let current: Rec | null = null;
/** Listens once through the browser's speech recognition and returns what was said ('' if nothing). */
export function hearOnce(): Promise<string> {
  const C = Ctor();
  if (!C) return Promise.resolve('');
  return new Promise((resolve) => {
    const r = new C();
    current = r;
    let said = '';
    r.lang = 'en-GB';
    r.interimResults = false;
    r.maxAlternatives = 1;
    r.onresult = (e) => {
      said = Array.from(e.results).map((x) => x[0].transcript).join(' ').trim();
    };
    r.onerror = () => resolve(said);
    r.onend = () => {
      current = null;
      resolve(said);
    };
    try {
      r.start();
    } catch {
      resolve('');
    }
  });
}
export const stopHearing = () => {
  try {
    current?.stop();
  } catch {
    /* already stopped */
  }
};
