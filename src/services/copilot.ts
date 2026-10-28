/* The Grove assistant that sits beside whatever the student is looking at (like a browser's copilot button).
   Screens tell it what is on screen; anything can open it with a question or a passage already filled in. */
import { useSyncExternalStore } from 'react';
import type { Note } from '../types';

export interface CopilotContext {
  /** Where the student is: "Today", "Study", or a note's title. */
  place: string;
  /** The note open in the reader, if any. Answers are drawn from it first. */
  note?: Note;
  /** The section of that note currently on screen. */
  section?: string;
}

interface State {
  open: boolean;
  ctx: CopilotContext;
  /** Text the student highlighted before opening the assistant. */
  selection: string | null;
  /** A question to send as soon as the panel opens. */
  ask: string | null;
}

let state: State = { open: false, ctx: { place: 'Today' }, selection: null, ask: null };
const subs = new Set<() => void>();
const set = (patch: Partial<State>) => {
  state = { ...state, ...patch };
  subs.forEach((f) => f());
};

export const copilot = {
  get: () => state,
  subscribe(f: () => void) {
    subs.add(f);
    return () => subs.delete(f);
  },
  open(opts: { selection?: string; ask?: string } = {}) {
    set({ open: true, selection: opts.selection ?? state.selection, ask: opts.ask ?? null });
  },
  close: () => set({ open: false }),
  toggle: () => set({ open: !state.open }),
  consumeAsk: () => set({ ask: null }),
  clearSelection: () => set({ selection: null }),
  /** Screens call this to say what is on screen. Keeps the note if only the section changed. */
  setContext(ctx: CopilotContext) {
    const c = state.ctx;
    if (c.place === ctx.place && c.note?.id === ctx.note?.id && c.section === ctx.section) return;
    set({ ctx });
  },
};

export const useCopilot = () => useSyncExternalStore(copilot.subscribe, copilot.get, copilot.get);
