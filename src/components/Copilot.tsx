/* Grove assistant: one tap from any screen, it knows what you are looking at.
   Reading a note, it answers from that note first; highlight a passage and it explains that passage. */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, BookOpen, Quote, RotateCcw, Sparkles, X } from 'lucide-react';
import { aiService } from '../services/aiService';
import { storage } from '../services/storage';
import { copilot, useCopilot } from '../services/copilot';
import { isPastPaper } from '../lib/noteOrder';
import type { LearningProfile, Note } from '../types';
import { MessageBody } from './ChatTutorView';
import { CheckYourself, TryFirst } from './Learning';
import { hintFor, isProblem, tryFirstOn } from '../services/learning';
import { signal } from '../services/signals';
import { Portal } from './ui';

interface Msg {
  id: string;
  role: 'you' | 'grove';
  text: string;
  cites?: { noteId: string; title: string }[];
  check?: { q: string; a: string[] };
  topicNoteId?: string;
  topicSection?: string;
}

const KEY = 'grove_copilot_v1';
const load = (): Msg[] => {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) || '[]');
  } catch {
    return [];
  }
};

/** The button that opens the assistant. Put it in any header. */
export function CopilotButton({ className = '' }: { className?: string }) {
  const { open } = useCopilot();
  return (
    <button
      onClick={() => copilot.toggle()}
      aria-label={open ? 'Close Grove assistant' : 'Open Grove assistant'}
      aria-expanded={open}
      className={`group inline-flex h-10 items-center gap-2 rounded-full px-3 text-sm font-medium ring-1 sm:px-4 ${
        open ? 'bg-accent text-ink ring-accent' : 'bg-surface/60 text-text ring-line hover:bg-raised'
      } ${className}`}
    >
      <Sparkles aria-hidden className="h-[18px] w-[18px] transition-transform duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] group-hover:rotate-12" />
      <span className="hidden sm:inline">Assistant</span>
    </button>
  );
}

export function Copilot({
  notes,
  profile,
  setProfile,
  onOpenNote,
}: {
  notes: Note[];
  profile: LearningProfile;
  setProfile: (u: (p: LearningProfile) => LearningProfile) => void;
  onOpenNote: (id: string) => void;
}) {
  const { open, ctx, selection, ask } = useCopilot();
  const [msgs, setMsgs] = useState<Msg[]>(load);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const box = useRef<HTMLTextAreaElement>(null);
  const end = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(msgs.slice(-30)));
    } catch {
      /* private mode: the conversation just isn't kept */
    }
    end.current?.scrollIntoView({ block: 'end' });
  }, [msgs, busy]);

  // Escape closes the assistant first, before it can close the note underneath.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      copilot.close();
    };
    window.addEventListener('keydown', onKey, true);
    const t = setTimeout(() => box.current?.focus({ preventScroll: true }), 220);
    return () => {
      window.removeEventListener('keydown', onKey, true);
      clearTimeout(t);
    };
  }, [open]);

  const [attempting, setAttempting] = useState<string | null>(null);
  const send = async (raw: string, task: 'ask' | 'quiz' = 'ask', direct = false) => {
    const q = raw.trim();
    if (!q || busy) return;
    if (!direct && task === 'ask' && !selection && tryFirstOn() && isProblem(q)) {
      setAttempting(q);
      setInput('');
      return;
    }
    setAttempting(null);
    const passage = selection;
    const shownQ = q.includes('\n\nMy attempt:') ? q.replace(/\n\nTell me what I got right[\s\S]*$/, '').replace('\n\nMy attempt:\n', '\n> My attempt: ') : q;
    setMsgs((m) => [...m, { id: `u${Date.now()}`, role: 'you', text: passage ? `${shownQ}\n> ${passage.slice(0, 240)}${passage.length > 240 ? '…' : ''}` : shownQ }]);
    setInput('');
    setBusy(true);
    copilot.clearSelection();
    try {
      const question = passage ? `${q}: "${passage.slice(0, 600)}"` : q;
      const lastAnswer = [...msgs].reverse().find((m) => m.role === 'grove');
      const lastQ = [...msgs].reverse().find((m) => m.role === 'you');
      const previous = lastAnswer && lastQ ? { question: lastQ.text, answer: lastAnswer.text } : undefined;
      // Reading a note: that note is the first place to look. If it has nothing on this, look everywhere.
      let payload = await aiService.askGrove(question, ctx.note ? [ctx.note] : notes, profile, { previous, task });
      if (ctx.note && payload.citedNotes.length === 0) payload = await aiService.askGrove(question, notes, profile, { previous, task });
      setProfile((p) => {
        const u = { ...p, totalQuestionsAsked: p.totalQuestionsAsked + 1 };
        storage.saveProfile(u);
        return u;
      });
      setMsgs((m) => [
        ...m,
        {
          id: `g${Date.now()}`,
          role: 'grove',
          text: payload.text,
          cites: payload.citedNotes.map((c) => ({ noteId: c.noteId, title: c.title })),
          check: payload.check,
          topicNoteId: payload.topic?.note.id,
          topicSection: payload.topic?.section,
        },
      ]);
      if (payload.topic) signal(payload.topic.note, payload.topic.section, 'asked');
    } catch {
      setMsgs((m) => [...m, { id: `g${Date.now()}`, role: 'grove', text: 'Something went wrong there. Try asking again.' }]);
    } finally {
      setBusy(false);
    }
  };

  // A question handed over by another screen (for example "Ask Grove" on highlighted text) goes straight in.
  useEffect(() => {
    if (open && ask) {
      copilot.consumeAsk();
      void send(ask);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ask]);

  const actions = useMemo((): { label: string; ask: string; task?: 'quiz' }[] => {
    if (selection) {
      return [
        { label: 'Explain this', ask: 'Explain this in simple terms' },
        { label: 'Give an example', ask: 'Give a real-world example of this' },
        { label: 'Quiz me on this', ask: 'Quiz me on this', task: 'quiz' },
      ];
    }
    if (ctx.note) {
      const t = ctx.note.title;
      const s = ctx.section && ctx.section !== 'Study aids' ? ctx.section : null;
      return [
        ...(s ? [{ label: `Explain “${s}”`, ask: `Explain ${s} in simple terms` }] : []),
        { label: 'Summarise this note', ask: `Summarise the main points of ${t}` },
        ...(s ? [{ label: `Quiz me on “${s}”`, ask: `Quiz me on ${s}`, task: 'quiz' as const }] : [{ label: 'Quiz me on this note', ask: `Quiz me on ${t}`, task: 'quiz' as const }]),
        { label: 'Key terms', ask: `What are the key terms and definitions in ${t}?` },
      ];
    }
    const own = notes.filter((n) => !isPastPaper(n));
    const latest = [...own].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
    if (!latest) return [];
    return [
      { label: `Summarise “${latest.title}”`, ask: `Summarise the main points of ${latest.title}` },
      { label: `Quiz me on “${latest.title}”`, ask: `Quiz me on ${latest.title}`, task: 'quiz' },
    ];
  }, [ctx.note, ctx.section, selection, notes]);

  return (
    <Portal>
      {/* Phones: a dimmed page behind the sheet; tapping it closes. Wide screens keep the page usable beside the panel. */}
      <div
        aria-hidden
        onClick={() => copilot.close()}
        className={`fixed inset-0 z-[60] bg-black/40 transition-opacity duration-300 sm:hidden ${open ? 'opacity-100' : 'pointer-events-none opacity-0'}`}
      />
      <aside
        aria-label="Grove assistant"
        inert={!open}
        className={`glass fixed z-[61] flex flex-col overflow-hidden bg-surface/90 ring-1 ring-line transition-[transform,opacity] duration-300 ease-[cubic-bezier(0.32,0.72,0,1)]
          inset-x-0 bottom-0 top-[8dvh] rounded-t-[28px]
          sm:inset-x-auto sm:bottom-3 sm:right-3 sm:top-3 sm:w-[420px] sm:rounded-[28px]
          ${open ? 'translate-x-0 translate-y-0 opacity-100' : 'translate-y-full opacity-0 sm:translate-x-[110%] sm:translate-y-0'}`}
      >
        <header className="flex items-center gap-3 px-4 pb-2 pt-4">
          <span aria-hidden className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-accent text-ink">
            <Sparkles className="h-[18px] w-[18px]" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-tight text-text">Grove assistant</p>
            <p className="truncate text-xs text-muted">
              {ctx.note ? <>Reading {ctx.section && ctx.section !== ctx.note.title ? `“${ctx.section}” in ` : ''}{ctx.note.title}</> : <>On {ctx.place}. Answers come from your notes.</>}
            </p>
          </div>
          {msgs.length > 0 && (
            <button onClick={() => setMsgs([])} aria-label="Start over" className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-text">
              <RotateCcw className="h-4 w-4" />
            </button>
          )}
          <button onClick={() => copilot.close()} aria-label="Close assistant" className="flex h-9 w-9 items-center justify-center rounded-full bg-raised text-muted hover:text-text">
            <X className="h-4 w-4" />
          </button>
        </header>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-4 py-3">
          {msgs.length === 0 && !busy && (
            <div className="animate-slide-up space-y-2 pt-6 text-center">
              <p className="font-display text-xl text-text">{ctx.note ? 'Stuck on something here?' : 'Ask about anything in your notes'}</p>
              <p className="mx-auto max-w-[30ch] text-sm text-muted">
                {ctx.note ? 'Ask about this note, or highlight a passage and choose Ask Grove.' : 'Grove answers from your course notes and shows where each answer came from.'}
              </p>
            </div>
          )}
          {msgs.map((m) =>
            m.role === 'you' ? (
              <div key={m.id} className="animate-slide-up flex justify-end">
                <div className="max-w-[85%] rounded-[20px] rounded-br-md bg-accent px-4 py-2.5 text-sm text-ink">
                  {m.text.split('\n> ').map((part, i) =>
                    i === 0 ? <span key={i}>{part}</span> : <span key={i} className="mt-1.5 block border-l-2 border-ink/30 pl-2 text-xs opacity-80">{part}</span>,
                  )}
                </div>
              </div>
            ) : (
              <div key={m.id} className="animate-slide-up space-y-2">
                <div className="text-[14px] [&_p]:leading-6 [&>div]:space-y-2.5 [&>div]:text-[14px] [&>div]:leading-6">
                  <MessageBody text={m.text} />
                </div>
                {m.check && (
                  <CheckYourself
                    compact
                    check={m.check}
                    onResult={(ok) => !ok && m.topicNoteId && signal(notes.find((n) => n.id === m.topicNoteId), m.topicSection, 'lost')}
                  />
                )}
                {m.cites && m.cites.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {m.cites.slice(0, 3).map((c) => (
                      <button
                        key={c.noteId}
                        onClick={() => {
                          copilot.close();
                          onOpenNote(c.noteId);
                        }}
                        className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-raised px-3 py-1 text-xs text-text ring-1 ring-line hover:ring-accent"
                      >
                        <BookOpen aria-hidden className="h-3.5 w-3.5 shrink-0 text-accent-text" />
                        <span className="truncate">{c.title}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ),
          )}
          {attempting && !busy && (
            <TryFirst
              compact
              question={attempting}
              hint={hintFor(attempting, ctx.note ? [ctx.note] : notes)}
              onAttempt={(a) => void send(`${attempting}\n\nMy attempt:\n${a}\n\nTell me what I got right, what to fix, and then show the full working.`, 'ask', true)}
              onSkip={() => void send(attempting, 'ask', true)}
            />
          )}
          {busy && (
            <div className="flex items-center gap-1.5 py-2" role="status" aria-label="Grove is answering">
              {[0, 1, 2].map((i) => (
                <span key={i} className="h-2 w-2 animate-pulse rounded-full bg-accent" style={{ animationDelay: `${i * 160}ms` }} />
              ))}
            </div>
          )}
          <div ref={end} />
        </div>

        <div className="space-y-2 px-3 pb-[max(12px,env(safe-area-inset-bottom))] pt-2">
          {selection && (
            <div className="animate-slide-up flex items-start gap-2 rounded-2xl bg-raised px-3 py-2 text-xs text-muted ring-1 ring-line">
              <Quote aria-hidden className="mt-0.5 h-3.5 w-3.5 shrink-0 text-accent-text" />
              <span className="line-clamp-2 flex-1 text-text">{selection}</span>
              <button onClick={() => copilot.clearSelection()} aria-label="Remove highlighted text" className="text-muted hover:text-text">
                <X className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          {!busy && actions.length > 0 && (
            <div className="no-scrollbar flex gap-1.5 overflow-x-auto pb-0.5">
              {actions.map((a) => (
                <button
                  key={a.label}
                  onClick={() => void send(a.ask, a.task)}
                  className="max-w-[240px] shrink-0 truncate rounded-full bg-surface px-3 py-1.5 text-xs font-medium text-text ring-1 ring-edge hover:bg-raised"
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(input);
            }}
            className="flex items-end gap-2 rounded-[22px] bg-bg/60 p-1.5 pl-4 ring-1 ring-edge transition-shadow focus-within:ring-accent-text"
          >
            <textarea
              ref={box}
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void send(input);
                }
              }}
              placeholder={selection ? 'What do you want to know about this?' : ctx.note ? 'Ask about this note' : 'Ask Grove'}
              aria-label="Ask Grove"
              className="max-h-32 min-h-10 flex-1 resize-none bg-transparent py-2 text-sm text-text shadow-none! ring-0! outline-none"
            />
            <button type="submit" disabled={!input.trim() || busy} aria-label="Send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-ink">
              <ArrowUp className="h-[18px] w-[18px]" />
            </button>
          </form>
        </div>
      </aside>
    </Portal>
  );
}

/** Highlight text inside `root` and a small "Ask Grove" pill appears above it. */
export function useAskOnSelect(root: React.RefObject<HTMLElement | null>) {
  const [pill, setPill] = useState<{ x: number; y: number; text: string } | null>(null);
  useEffect(() => {
    const el = root.current;
    if (!el) return;
    const check = () => {
      const sel = window.getSelection();
      const text = sel?.toString().trim() ?? '';
      if (!sel || sel.rangeCount === 0 || text.length < 4 || !el.contains(sel.anchorNode)) return setPill(null);
      const r = sel.getRangeAt(0).getBoundingClientRect();
      setPill({ x: Math.min(Math.max(r.left + r.width / 2, 80), window.innerWidth - 80), y: Math.max(r.top - 8, 60), text: text.slice(0, 1200) });
    };
    const onUp = () => setTimeout(check, 10);
    document.addEventListener('mouseup', onUp);
    document.addEventListener('touchend', onUp);
    const onSel = () => {
      if (!window.getSelection()?.toString().trim()) setPill(null);
    };
    const hide = () => setPill(null);
    document.addEventListener('selectionchange', onSel);
    el.addEventListener('scroll', hide, { passive: true });
    return () => {
      document.removeEventListener('mouseup', onUp);
      document.removeEventListener('touchend', onUp);
      document.removeEventListener('selectionchange', onSel);
      el.removeEventListener('scroll', hide);
    };
  }, [root]);
  const node = pill && (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={() => {
        copilot.open({ selection: pill.text });
        setPill(null);
        window.getSelection()?.removeAllRanges();
      }}
      style={{ left: pill.x, top: pill.y }}
      className="animate-fade-in fixed z-[55] inline-flex -translate-x-1/2 -translate-y-full items-center gap-1.5 rounded-full bg-accent px-3.5 py-2 text-sm font-semibold text-ink shadow-[0_10px_30px_-10px_var(--color-glow)]"
    >
      <Sparkles aria-hidden className="h-4 w-4" /> Ask Grove
    </button>
  );
  return node;
}
