import type { Flashcard, Note } from '../types';
import { parseSections, clip, readOnly, type Group, type Section } from '../lib/noteStructure';

/**
 * Flashcards from the student's own notes, with no AI: definitions, comparison tables, lists and steps
 * are already structured in the notes, so a good question is mostly a matter of asking for them back.
 */

export interface DraftCard {
  front: string;
  back: string;
}

const SKIP = /objectives?|outcomes?|introduction|overview|summary|references?|agenda|contents|example|exercise|question|practical|\blab\b|instructions|candidates/i;
/** Items that read as a clean phrase, not a sentence, a code line or a lettered fragment. */
const tidyItem = (t: string) => t.length <= 110 && !/[?;@]$|[?;@]/.test(t) && !/^[a-z]\.\s/i.test(t) && !/^\w+\s*\(.*\)\s*;?$/.test(t);
const plain = (t: string) => t.replace(/^\d+\.\s+/, '').replace(/\s*\([^)]*\)\s*$/, '').trim();
const itemText = (i: { term?: string; def?: string; text: string }) => (i.term && i.def ? `${i.term}: ${i.def}` : i.text);

function fromSection(s: Section): DraftCard[] {
  if (readOnly(s) || SKIP.test(s.title)) return [];
  const out: DraftCard[] = [];
  const title = plain(s.title);
  let hasDefs = false;
  for (const g of s.groups) {
    if (g.kind === 'defs') {
      hasDefs = true;
      for (const it of g.items.slice(0, 6)) if (it.term && it.def) out.push({ front: `Explain “${it.term}” (${title}).`, back: clip(it.def, 260) });
    } else if (g.kind === 'table' && g.rows && g.rows.length >= 3) {
      const [head, ...rows] = g.rows;
      if (head.length >= 3) {
        for (const r of rows.slice(0, 4)) {
          const cells = r.slice(1).map((c, i) => `${head[i + 1] ?? ''}: ${c}`.trim());
          out.push({ front: `${title}: how do ${head[1]} and ${head[2]} differ on “${r[0]}”?`, back: cells.join('\n') });
        }
      } else {
        for (const r of rows.slice(0, 5)) if (r[0] && r[1]) out.push({ front: `Explain “${r[0]}” (${title}).`, back: clip(r[1], 260) });
      }
    } else if (g.kind === 'steps' && g.items.length >= 3 && g.items.slice(0, 10).every((i) => tidyItem(itemText(i)))) {
      out.push({ front: `Put the steps of “${g.label ?? title}” in order.`, back: g.items.slice(0, 10).map((i, n) => `${n + 1}. ${clip(itemText(i), 140)}`).join('\n') });
    } else if (g.kind === 'list' && g.items.length >= 3 && g.items.length <= 9) {
      const top = g.items.filter((i) => i.depth === 0);
      const items = top.length >= 3 ? top : g.items;
      if (items.every((i) => tidyItem(itemText(i)) || (i.term && i.term.length <= 60))) {
        out.push({ front: `${title}: name the ${items.length} ${g.label ? g.label.toLowerCase() : 'points'}.`, back: items.map((i) => `• ${clip(itemText(i), 140)}`).join('\n') });
      }
    }
  }
  if (!hasDefs) {
    const p = s.groups.find((g): g is Group => g.kind === 'para' && !!g.text && g.text.length <= 320);
    if (p?.text && /\b(is|are|refers to|means|stands for)\b/i.test(p.text.slice(0, 120))) out.push({ front: `What is ${title}?`, back: p.text });
  }
  return out;
}

/** Up to `cap` cards for a note, spread across its sections rather than all from the first few. */
export function draftCardsFor(note: Note, cap = 12): DraftCard[] {
  const all = parseSections(note.content, note.title).flatMap(fromSection);
  const seen = new Set<string>();
  const unique = all.filter((c) => (seen.has(c.front) ? false : (seen.add(c.front), true)));
  if (unique.length <= cap) return unique;
  return Array.from({ length: cap }, (_, i) => unique[Math.floor((i * unique.length) / cap)]);
}

export function makeCardsFromNotes(notes: Note[], existing: Flashcard[], cap = 12): { cards: Flashcard[]; noteCount: number } {
  const have = new Set(existing.map((c) => c.front));
  const today = new Date().toISOString().split('T')[0];
  const cards: Flashcard[] = [];
  const touched = new Set<string>();
  for (const note of notes) {
    if (/^past paper/i.test(note.title)) continue;
    // A note that already has made cards is left alone, so tapping again never doubles the deck.
    if (existing.some((c) => c.id.startsWith(`auto-${note.id}-`))) continue;
    draftCardsFor(note, cap).forEach((d, i) => {
      if (have.has(d.front)) return;
      have.add(d.front);
      touched.add(note.id);
      cards.push({
        id: `auto-${note.id}-${i}`,
        noteId: note.id,
        courseCode: note.courseId.replace(/^c-/, '').split('-')[0].toUpperCase(),
        year: note.year,
        front: d.front,
        back: d.back,
        interval: 1,
        repetition: 0,
        easeFactor: 2.5,
        dueDate: today,
        status: 'new',
      });
    });
  }
  return { cards, noteCount: touched.size };
}

/** Which part of a note a card tests, read back from its question ("Explain “X” (Section).", "Section: name the 4 points."). */
export function sectionOfFront(front: string): string | undefined {
  return /\(([^()]+)\)\.?$/.exec(front)?.[1] ?? /^([^:“”]{3,80}):/.exec(front)?.[1] ?? /“([^”]+)”/.exec(front)?.[1];
}
