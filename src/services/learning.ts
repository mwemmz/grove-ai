/* Helpers for "have a go first": which questions are problems to attempt, and a hint from the notes. */
import type { Note } from '../types';
import { searchSections } from './noteSearch';
import { clip } from '../lib/noteStructure';

const TRY_KEY = 'grove_try_first';
export const tryFirstOn = () => {
  try {
    return localStorage.getItem(TRY_KEY) !== 'off';
  } catch {
    return true;
  }
};
export const setTryFirst = (on: boolean) => {
  try {
    localStorage.setItem(TRY_KEY, on ? 'on' : 'off');
  } catch {
    /* ignore */
  }
};

/** Questions that ask the student to produce something: a calculation, working, code, a proof. */
export function isProblem(q: string): boolean {
  if (/my attempt:/i.test(q)) return false;
  return (
    /\b(calculate|compute|solve|work out|derive|determine|evaluate|prove|show that|find the (value|total|amount|equilibrium|answer)|how (much|many)|what is the (value|total|equilibrium)|write (a|an|the|me)? ?(program|code|function|query|sql|class|method|script|algorithm)|implement|debug|fix (my|this) code)\b/i.test(q) ||
    /\d\s*[-+*/^=×÷]\s*\d/.test(q)
  );
}


/** Where in the notes to look, and the first line there, without giving the whole answer away. */
export function hintFor(question: string, notes: Note[]): string | null {
  const hit = searchSections(question, notes, 1)[0];
  if (!hit) return null;
  const g = hit.section.groups.find((x) => x.kind !== 'figure');
  const first = g?.text ?? (g?.items[0] ? (g.items[0].term ? g.items[0].term : g.items[0].text) : '');
  const where = `Look at “${hit.section.title}” in ${hit.note.title}.`;
  return first ? `${where} It starts: “${clip(first, 120)}”` : where;
}
