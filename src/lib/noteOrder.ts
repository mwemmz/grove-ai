import type { Note } from '../types';

export const isPastPaper = (n: Pick<Note, 'title'>) => /^past paper/i.test(n.title);

const unitNo = (t: string) => {
  const m = /^unit\s*(\d+(?:\.\d+)?)/i.exec(t);
  return m ? Number(m[1]) : null;
};
const packIndex = (id: string) => {
  const m = /-p(\d+)$/.exec(id);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
};
const paperYear = (t: string) => {
  const m = /(20\d\d)/.exec(t);
  return m ? Number(m[1]) : 0;
};

/** The order a course is taught in: Unit 1, Unit 2, … then anything else as it was added. Past papers run oldest to newest. */
export function compareNotes(a: Note, b: Note): number {
  if (isPastPaper(a) && isPastPaper(b)) {
    return paperYear(a.title) - paperYear(b.title) || a.title.localeCompare(b.title, undefined, { numeric: true });
  }
  const ua = unitNo(a.title);
  const ub = unitNo(b.title);
  if (ua !== null && ub !== null) return ua - ub;
  if (ua !== null) return -1;
  if (ub !== null) return 1;
  return a.createdAt.localeCompare(b.createdAt) || packIndex(a.id) - packIndex(b.id) || a.title.localeCompare(b.title, undefined, { numeric: true });
}
