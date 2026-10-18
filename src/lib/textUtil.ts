import { Note } from '../types';

const STOP = new Set(
  'the a an and or of to in on for with is are was were be been it its this that these those as at by from into than then so if but not can will just about over under how what why when where which who do does did have has had my our your their use used using like each other such very also more most some any all one two'.split(
    ' '
  )
);

export function words(text: string): string[] {
  return text.toLowerCase().match(/[a-z][a-z0-9+#-]{2,}/g) ?? [];
}

export function significantWords(text: string): string[] {
  return [...new Set(words(text).filter((w) => !STOP.has(w)))];
}

/** Short, checkable points from a note: its key takeaways, or its first plain sentences. */
export function keyPoints(note: Note, max = 6): string[] {
  const takeaways = (note.keyTakeaways ?? []).map((t) => t.trim()).filter(Boolean);
  if (takeaways.length >= 2) return takeaways.slice(0, max);
  const plain = note.content
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/^#+\s.*$/gm, ' ')
    .replace(/[*`>]/g, '')
    .replace(/\s+/g, ' ');
  const sentences = plain
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 30 && s.length < 220);
  return [...takeaways, ...sentences].slice(0, max);
}

/** Share of a point's meaningful words that appear in what the student wrote (0 to 1). */
export function coverage(point: string, written: string): number {
  const need = significantWords(point);
  if (need.length === 0) return 0;
  const have = new Set(words(written));
  const stems = [...have];
  const hit = need.filter((w) => have.has(w) || stems.some((h) => h.length > 4 && w.length > 4 && (h.startsWith(w.slice(0, 5)) || w.startsWith(h.slice(0, 5))))).length;
  return hit / need.length;
}

export function longSentences(text: string, limit = 28): string[] {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter((s) => s.split(/\s+/).length > limit);
}
