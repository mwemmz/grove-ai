/* "Tidy into Grove format": gives an untidy upload the same shape as the headed notes (### headings, bullets,
   nested points, "Term: meaning" lines) so the reader can draw its overview, diagrams and questions from it.
   The AI only arranges what is already written: it adds no facts. Long notes go through in parts. */
import { generateRouted, hasAi } from './llmService';

export const tidyAvailable = () => hasAi('ask');

const SYSTEM = [
  'You tidy lecture notes for a study app. You only re-arrange what the notes already say. Never add facts, examples or explanations, never drop a fact, and keep the original wording wherever it is clear.',
  'Output plain text in exactly this shape, and nothing else (no preface, no code fences):',
  '### A short heading for each topic (one per slide or idea; keep the original headings where they exist)',
  '- one point per line, short',
  '  - a sub-point under it, indented by two spaces',
  '- Term: its meaning (use this form for every definition, with no asterisks)',
  '1. numbered lines for steps that happen in order',
  'Do not use bold, tables or any other markdown. Fix obvious capitals typed in shouting case. Keep numbers, names and formulas exactly.',
].join('\n');

const PART = 6500;
function parts(text: string): string[] {
  const blocks = text.split(/\n(?=#{1,4}\s)/);
  const out: string[] = [];
  for (const b of blocks) {
    const cur = out[out.length - 1];
    if (cur && cur.length + b.length < PART) out[out.length - 1] = cur + '\n' + b;
    else if (b.length <= PART) out.push(b);
    else for (let i = 0; i < b.length; i += PART) out.push(b.slice(i, i + PART));
  }
  return out;
}

/** Returns the tidied text, or the original if the AI could not do it safely. */
export async function tidyNote(title: string, text: string, onProgress?: (m: string) => void): Promise<string> {
  const chunks = parts(text);
  const done: string[] = [];
  for (let i = 0; i < chunks.length; i++) {
    onProgress?.(chunks.length > 1 ? `Tidying part ${i + 1} of ${chunks.length}…` : 'Tidying the note…');
    const out = await generateRouted('ask', SYSTEM, `Note: ${title}\n\n${chunks[i]}`, 3200).catch(() => null);
    const t = out?.text?.trim().replace(/^```[a-z]*\n?|\n?```$/g, '') ?? '';
    // A result that lost much of the text, or has no headings, is not trusted: that part stays as it was.
    const keepsIt = t.length >= chunks[i].length * 0.55 && /^#{1,4}\s/m.test(t);
    done.push(keepsIt ? t : chunks[i]);
  }
  return done.join('\n\n');
}
