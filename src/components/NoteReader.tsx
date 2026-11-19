/* Full-screen note reader: headed sections, an outline to jump around, diagrams drawn from the note's own structure,
   animated pictures beside the matching idea, and recall prompts. */
import { createPortal } from 'react-dom';
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Headphones, PanelLeftClose, PanelLeftOpen, Minus, Plus, Maximize2 } from 'lucide-react';
import { ListenBar } from './ListenBar';
import { startListening, stop as stopListening, useListen } from '../services/readAloud';
import { tutorAvailable } from '../services/tutor';
import { track } from '../services/activity';
import { lazyWithReload } from '../lib/lazyReload';
import type { Note } from '../types';
import { placePictures } from '../data/pictureMatch';
import type { TopicId } from '../data/visualTopics';
import { diagramsFor, glossary, noteMap, parseSections, recallFor, type Group, type Section } from '../lib/noteStructure';
import { NoteDiagram, NoteMap } from './NoteDiagrams';
import { Inline } from './ui';
import { MessageBody } from './ChatTutorView';
import { cachedCard, cardsAvailable, makeCard } from '../services/answerCard';
import { cachedSummary, summariseNote, summaryAvailable } from '../services/summary';
import { Sparkles, ScrollText, Trash2, MoreHorizontal, Focus as FocusIcon } from 'lucide-react';
import { FlocusHud, FlocusSheet, useFlocus } from './Flocus';
import { Figure } from './Figure';
import { CopilotButton, useAskOnSelect } from './Copilot';
import { copilot } from '../services/copilot';

const VisualCard = lazyWithReload(() => import('./VisualCard'));

function GroupView({ g }: { g: Group }) {
  const label = g.label && <h4 className="mb-1.5 font-mono text-[11px] uppercase tracking-[0.08em] text-accent">{g.label}</h4>;
  if (g.kind === 'figure') return <Figure refId={g.text ?? ''} caption={g.label} />;
  if (g.kind === 'para') return <p className="whitespace-pre-wrap"><Inline text={g.text ?? ''} /></p>;
  if (g.kind === 'code')
    return <pre className="overflow-x-auto rounded-lg bg-bg p-4 font-mono text-[13px] leading-6"><code>{g.text}</code></pre>;
  if (g.kind === 'example')
    return (
      <div className="rounded-r-lg border-l-[3px] border-warn bg-bg px-4 py-3 text-[15px] leading-7">
        <span className="mr-2 font-mono text-[11px] uppercase tracking-[0.08em] text-warn">{g.label}</span>
        <Inline text={g.text ?? ''} />
      </div>
    );
  if (g.kind === 'table' && g.rows) {
    const [head, ...rest] = g.rows;
    return (
      <div>
        {label}
        <div className="overflow-x-auto rounded-lg ring-1 ring-line">
          <table className="w-full min-w-[28rem] border-collapse text-left text-sm leading-6">
            <thead className="bg-raised">
              <tr>{head.map((h, i) => <th key={i} scope="col" className="px-3 py-2 font-semibold text-text">{h}</th>)}</tr>
            </thead>
            <tbody className="divide-y divide-line">
              {rest.map((r, i) => (
                <tr key={i} className="align-top">
                  {r.map((c, j) => (j === 0 ? <th key={j} scope="row" className="px-3 py-2 font-medium text-text">{c}</th> : <td key={j} className="px-3 py-2 text-muted"><Inline text={c} /></td>))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }
  if (g.kind === 'defs')
    return (
      <div>
        {label}
        <dl className="grid gap-2 sm:grid-cols-2">
          {g.items.map((it, i) => (
            <div key={i} className="rounded-lg bg-bg px-3 py-2.5 ring-1 ring-line">
              <dt className="text-sm font-semibold text-text">{it.term ?? it.text}</dt>
              {it.def && <dd className="mt-0.5 text-sm leading-6 text-muted"><Inline text={it.def} /></dd>}
            </div>
          ))}
        </dl>
      </div>
    );
  if (g.kind === 'steps')
    return (
      <div>
        {label}
        <ol className="space-y-2">
          {g.items.map((it, i) => (
            <li key={i} className="flex gap-3">
              <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-ink">{i + 1}</span>
              <span className="leading-7"><Inline text={it.text} /></span>
            </li>
          ))}
        </ol>
      </div>
    );
  return (
    <div>
      {label}
      <ul className="space-y-1.5">
        {g.items.map((it, i) => (
          <li key={i} className="flex gap-2.5 leading-7" style={{ paddingLeft: it.depth * 20 }}>
            <span aria-hidden className={`mt-[0.7em] h-1.5 w-1.5 shrink-0 rounded-full ${it.depth ? 'bg-muted' : 'bg-accent'}`} />
            <span><Inline text={it.term && it.def ? `**${it.term}:** ${it.def}` : it.text} /></span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Recall({ section }: { section: Section }) {
  const r = useMemo(() => recallFor(section), [section]);
  if (!r) return null;
  return (
    <details className="group max-w-2xl rounded-lg ring-1 ring-line">
      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 text-sm text-text marker:hidden [&::-webkit-details-marker]:hidden">
        <span aria-hidden className="font-mono text-accent transition-transform group-open:rotate-90">▸</span>
        <span><span className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">Test yourself · </span>{r.q}</span>
      </summary>
      <ul className="space-y-1 border-t border-line px-4 py-3 text-sm leading-6 text-muted">
        {r.a.map((t, i) => <li key={i}>{t}</li>)}
      </ul>
    </details>
  );
}

/** The section as an exam-style answer, made on demand and kept on the device. */
function AnswerCard({ noteId, noteTitle, s }: { noteId: string; noteTitle: string; s: Section }) {
  const [text, setText] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  useEffect(() => {
    let live = true;
    void cachedCard(noteId, s).then((c) => live && c && setText(c));
    return () => {
      live = false;
    };
  }, [noteId, s]);
  if (!text && !cardsAvailable()) return null;
  const go = async () => {
    if (text) return setOpen((o) => !o);
    setBusy(true);
    setErr('');
    try {
      setText(await makeCard(noteId, noteTitle, s));
      setOpen(true);
    } catch {
      setErr("Couldn't make the answer just now. Check your connection and try again.");
    }
    setBusy(false);
  };
  return (
    <div className="max-w-3xl">
      <button onClick={() => void go()} disabled={busy} aria-expanded={open} className="inline-flex min-h-10 items-center gap-2 rounded-full bg-raised px-4 text-sm text-text ring-1 ring-line hover:ring-accent-text disabled:opacity-60">
        <Sparkles aria-hidden className="h-4 w-4 text-accent" />
        {busy ? 'Writing the answer…' : text ? (open ? 'Hide the full answer' : 'Show the full answer') : 'Explain this fully'}
      </button>
      {err && <p className="mt-2 text-sm text-warn">{err}</p>}
      {open && text && (
        <div className="mt-3 rounded-2xl bg-surface p-4 ring-1 ring-line">
          <MessageBody text={text} />
        </div>
      )}
    </div>
  );
}

const lsGet = (k: string, d: string) => {
  try {
    return localStorage.getItem(k) ?? d;
  } catch {
    return d;
  }
};
const lsSet = (k: string, v: string) => {
  try {
    localStorage.setItem(k, v);
  } catch {
    /* private mode */
  }
};

export function NoteReader({
  note,
  courseName,
  onClose,
  onOpenVisual,
  prev,
  next,
  onGo,
  onSaveSummary,
  onDelete,
}: {
  note: Note;
  /** Keeps a summary as a note of its own in the same course. */
  onSaveSummary?: (title: string, content: string) => void;
  /** Lets the student delete the note (asks them to confirm first). */
  onDelete?: () => void;
  courseName?: string;
  onClose: () => void;
  onOpenVisual?: (id: TopicId) => void;
  /** The notes before and after this one in the course, so a student can carry on without going back. */
  prev?: Note;
  next?: Note;
  onGo?: (note: Note) => void;
}) {
  const sections = useMemo(() => parseSections(note.content, note.title), [note.content, note.title]);
  const spots = useMemo(() => placePictures(sections.map((s) => s.raw)), [sections]);
  const map = useMemo(() => noteMap(note.title, sections), [note.title, sections]);
  const terms = useMemo(() => glossary(sections), [sections]);
  const aids = useMemo(() => {
    const questions = sections.map((sec) => ({ sec, r: recallFor(sec) })).filter((x) => x.r).slice(0, 10);
    const takeaways = note.keyTakeaways?.length ? note.keyTakeaways : terms.slice(0, 6).map((t) => `${t.term}: ${t.def.length > 100 ? t.def.slice(0, 99) + '…' : t.def}`);
    return { questions, takeaways };
  }, [sections, terms, note.keyTakeaways]);
  const nav = useMemo(() => [...sections.map((s) => ({ id: s.id, title: s.title })), { id: 'aids', title: 'Study aids' }], [sections]);
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(sections[0]?.id ?? '');
  const bar = useRef<HTMLDivElement>(null);
  // The progress bar is moved directly: re-rendering the whole note on every scroll event is what made scrolling stutter.
  const setProgress = (p: number) => {
    if (bar.current) bar.current.style.transform = `scaleX(${p})`;
  };
  const askPill = useAskOnSelect(scroller);
  const listen = useListen();
  // Flocus: full-screen reading with an optional timer. "More" holds the rarely used controls so the top bar stays calm.
  const focus = useFlocus();
  const [flSheet, setFlSheet] = useState(false);
  const [menu, setMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menu) return;
    const away = (e: MouseEvent) => { if (!menuRef.current?.contains(e.target as Node)) setMenu(false); };
    document.addEventListener('mousedown', away);
    return () => document.removeEventListener('mousedown', away);
  }, [menu]);
  // Leaving the note stops the reading.
  useEffect(() => () => stopListening(), []);
  useEffect(() => {
    stopListening();
  }, [note.id]);
  // Follow the reading: keep the section being read in view.
  useEffect(() => {
    if (!listen.active) return;
    const s = sections[listen.section];
    if (s) document.getElementById(`sec-${s.id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [listen.active, listen.section]);
  useEffect(() => {
    scroller.current?.scrollTo({ top: 0 });
    setActive(sections[0]?.id ?? '');
    setProgress(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note.id]);

  // Tell the assistant what is on screen: this note, and the section being read.
  useEffect(() => {
    const before = copilot.get().ctx;
    return () => copilot.setContext(before);
  }, []);
  useEffect(() => {
    const sec = nav.find((s) => `sec-${s.id}` === active)?.title;
    copilot.setContext({ place: note.title, note, section: sec });
  }, [note, active, nav]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (flSheet) setFlSheet(false);
      else if (menu) setMenu(false);
      else if (focus.on) focus.leave(true);
      else onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose, flSheet, menu, focus.on]);

  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const onScroll = () => requestAnimationFrame(() => setProgress(root.scrollHeight - root.clientHeight > 0 ? root.scrollTop / (root.scrollHeight - root.clientHeight) : 0));
    root.addEventListener('scroll', onScroll, { passive: true });
    const io = new IntersectionObserver(
      (entries) => {
        const hit = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)[0];
        if (hit) setActive(hit.target.id);
      },
      { root, rootMargin: '-10% 0px -70% 0px' },
    );
    nav.forEach((s) => {
      const el = document.getElementById(`sec-${s.id}`);
      if (el) io.observe(el);
    });
    return () => {
      root.removeEventListener('scroll', onScroll);
      io.disconnect();
    };
  }, [nav]);

  const [sum, setSum] = useState<{ open: boolean; text: string | null; busy: boolean; msg: string; err: string; saved: boolean }>({ open: false, text: null, busy: false, msg: '', err: '', saved: false });
  useEffect(() => {
    setSum({ open: false, text: null, busy: false, msg: '', err: '', saved: false });
    let live = true;
    void cachedSummary(note).then((t) => live && t && setSum((x) => ({ ...x, text: t })));
    return () => {
      live = false;
    };
  }, [note.id, note.content]);
  const runSummary = async (again = false) => {
    if (sum.busy) return;
    if (sum.text && !again) return setSum((x) => ({ ...x, open: true }));
    setSum((x) => ({ ...x, open: true, busy: true, err: '', msg: 'Reading the note…', saved: false, text: again ? null : x.text }));
    try {
      track('ask', 'Summarised a note');
      const t = await summariseNote(note, sections, (msg) => setSum((x) => ({ ...x, msg })));
      setSum((x) => ({ ...x, text: t, busy: false }));
    } catch {
      setSum((x) => ({ ...x, busy: false, err: "Couldn't write the summary just now. Check your connection and try again." }));
    }
  };

  // Reading comfort: the outline can fold away and the text can be enlarged, up to the width of the screen.
  const [side, setSide] = useState(() => lsGet('grove_reader_side', '1') !== '0');
  const [zoom, setZoom] = useState(() => Math.min(2.4, Math.max(0.9, Number(lsGet('grove_reader_zoom', '1')) || 1)));
  const setZ = (z: number) => {
    const v = Math.round(Math.min(2.4, Math.max(0.9, z)) * 100) / 100;
    setZoom(v);
    lsSet('grove_reader_zoom', String(v));
  };
  const toggleSide = () => {
    setSide((v) => {
      lsSet('grove_reader_side', v ? '0' : '1');
      return !v;
    });
  };
  // "Fit" enlarges the page to the width of the screen. Zoomed past the screen, the page scrolls sideways instead of shifting.
  const fit = () => {
    const w = scroller.current?.clientWidth ?? 0;
    if (w) setZ(Math.min(2, Math.max(1, (w - 64) / 768)));
  };

  const jump = (id: string) => {
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive(`sec-${id}`);
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={note.title} className="view-enter fixed inset-0 z-50 isolate flex flex-col bg-bg">
      <div aria-hidden className="ambient" style={{ zIndex: -1 }} />
      {askPill}
      {focus.on && <FlocusHud f={focus} />}
      {flSheet && <FlocusSheet onClose={() => setFlSheet(false)} onStart={(m) => { setFlSheet(false); focus.enter(m); }} />}
      {!focus.on && (
      <header className="glass-strong relative flex items-center gap-2 border-b border-line/70 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:gap-3 sm:px-5">
        <button onClick={onClose} className="flex min-h-10 items-center gap-1.5 rounded-md px-2 text-sm text-muted hover:bg-raised hover:text-text">
          <ArrowLeft className="h-4 w-4" /> Notes
        </button>
        <button onClick={toggleSide} aria-label={side ? 'Hide the outline' : 'Show the outline'} aria-pressed={!side} title={side ? 'Hide outline' : 'Show outline'} className="hidden h-10 w-10 place-items-center rounded-md text-muted hover:bg-raised hover:text-text lg:grid">
          {side ? <PanelLeftClose className="h-5 w-5" /> : <PanelLeftOpen className="h-5 w-5" />}
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-base text-text sm:text-lg">{note.title}</h2>
          <p className="truncate font-mono text-[11px] text-muted">
            Year {note.year} · {courseName || 'Course'} · {sections.length} sections
          </p>
        </div>
        <button
          onClick={() => {
            const at = Math.max(0, sections.findIndex((s) => `sec-${s.id}` === active));
            track('listen', note.title);
            startListening(note.title, sections, at, tutorAvailable());
          }}
          aria-label="Listen to this note"
          className="flex h-10 items-center gap-2 rounded-full bg-surface/60 px-3 text-sm text-muted ring-1 ring-line hover:text-text sm:px-4"
        >
          <Headphones aria-hidden className="h-4 w-4" /> <span className="hidden sm:inline">Listen</span>
        </button>
        <button onClick={() => setFlSheet(true)} aria-label="Flocus: full-screen focus with a timer" className="flex h-10 items-center gap-2 rounded-full bg-surface/60 px-3 text-sm text-muted ring-1 ring-line hover:text-text sm:px-4">
          <FocusIcon aria-hidden className="h-4 w-4" /> <span className="hidden sm:inline">Flocus</span>
        </button>
        <div className="relative" ref={menuRef}>
          <button onClick={() => setMenu((v) => !v)} aria-label="More" aria-expanded={menu} aria-haspopup="menu" className="grid h-10 w-10 place-items-center rounded-full bg-surface/60 text-muted ring-1 ring-line hover:text-text">
            <MoreHorizontal aria-hidden className="h-4 w-4" />
          </button>
          {menu && (
            <div role="menu" className="absolute right-0 top-12 z-40 w-72 rounded-2xl bg-surface p-2 shadow-xl ring-1 ring-line">
              {(sum.text || summaryAvailable()) && (
                <button role="menuitem" onClick={() => { setMenu(false); void runSummary(); }} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-text hover:bg-raised">
                  <ScrollText aria-hidden className="h-4 w-4 text-muted" /> Summarise this note
                </button>
              )}
              <div className="flex min-h-11 items-center gap-2 rounded-xl px-3 text-sm text-text" role="group" aria-label="Text size">
                <span className="flex-1 whitespace-nowrap">Text size</span>
                <button onClick={() => setZ(zoom - 0.15)} aria-label="Smaller text" className="grid h-8 w-8 place-items-center rounded-full bg-raised text-muted hover:text-text"><Minus className="h-4 w-4" /></button>
                <span className="w-10 text-center font-mono text-xs text-muted">{Math.round(zoom * 100)}%</span>
                <button onClick={() => setZ(zoom + 0.15)} aria-label="Larger text" className="grid h-8 w-8 place-items-center rounded-full bg-raised text-muted hover:text-text"><Plus className="h-4 w-4" /></button>
                <button onClick={fit} aria-label="Fit text to the screen" title="Fit to screen" className="grid h-8 w-8 place-items-center rounded-full bg-raised text-muted hover:text-text"><Maximize2 className="h-4 w-4" /></button>
              </div>
              {onDelete && (
                <button role="menuitem" onClick={() => { setMenu(false); onDelete(); }} className="flex min-h-11 w-full items-center gap-3 rounded-xl px-3 text-left text-sm text-text hover:bg-raised">
                  <Trash2 aria-hidden className="h-4 w-4 text-muted" /> Delete this note
                </button>
              )}
            </div>
          )}
        </div>
        <CopilotButton />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-line">
          <div ref={bar} className="h-full origin-left bg-accent will-change-transform" style={{ transform: 'scaleX(0)' }} />
        </div>
      </header>
      )}

      {/* Phones: the outline is a row of chips. */}
      <nav aria-label="Sections" className={`gap-1.5 overflow-x-auto border-b border-line px-3 py-2 lg:hidden ${focus.on ? 'hidden' : 'flex'}`}>
        {nav.map((s) => (
          <button
            key={s.id}
            onClick={() => jump(s.id)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-xs ${active === `sec-${s.id}` ? 'bg-accent text-ink' : 'bg-raised text-muted'}`}
          >
            {s.title.length > 26 ? s.title.slice(0, 25) + '…' : s.title}
          </button>
        ))}
      </nav>

      <div className="relative flex min-h-0 flex-1">
        <ListenBar />
        {sum.open && (
          <div className="absolute inset-0 z-30 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-6" onClick={() => !sum.busy && setSum((x) => ({ ...x, open: false }))}>
            <div role="dialog" aria-label="Note summary" onClick={(e) => e.stopPropagation()} className="flex max-h-[92%] w-full max-w-2xl flex-col rounded-t-2xl bg-surface ring-1 ring-line sm:rounded-2xl">
              <div className="flex items-center justify-between gap-3 border-b border-line px-5 py-3">
                <div>
                  <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-muted">Summary</p>
                  <p className="text-sm text-text">{note.title}</p>
                </div>
                <button onClick={() => setSum((x) => ({ ...x, open: false }))} className="rounded-full bg-raised px-3 py-1.5 text-xs text-muted hover:text-text">Close</button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
                {sum.busy && <p className="text-sm text-muted" aria-live="polite">{sum.msg || 'Working…'}</p>}
                {sum.err && <p className="text-sm text-text">{sum.err}</p>}
                {sum.text && !sum.busy && <MessageBody text={sum.text} />}
              </div>
              {!sum.busy && (
                <div className="flex flex-wrap gap-2 border-t border-line px-5 py-3">
                  {sum.text && onSaveSummary && (
                    <button
                      disabled={sum.saved}
                      onClick={() => {
                        onSaveSummary(`Summary: ${note.title}`, sum.text!);
                        setSum((x) => ({ ...x, saved: true }));
                      }}
                      className="rounded-full bg-accent px-4 py-2 text-sm text-ink disabled:opacity-60"
                    >
                      {sum.saved ? 'Saved as a note' : 'Save as a note'}
                    </button>
                  )}
                  <button onClick={() => void runSummary(true)} className="rounded-full bg-raised px-4 py-2 text-sm text-muted hover:text-text">
                    {sum.text ? 'Rewrite' : 'Try again'}
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
        <nav aria-label="Outline" className={`hidden w-64 shrink-0 overflow-y-auto border-r border-line px-3 py-5 ${side && !focus.on ? 'lg:block' : ''}`}>
          <p className="mb-2 px-2 font-mono text-[11px] uppercase tracking-[0.08em] text-muted">In this note</p>
          <ol className="space-y-0.5">
            {nav.map((s, i) => (
              <li key={s.id}>
                <button
                  onClick={() => jump(s.id)}
                  className={`flex w-full gap-2 rounded-md px-2 py-1.5 text-left text-sm leading-5 ${active === `sec-${s.id}` ? 'bg-raised text-text' : 'text-muted hover:text-text'}`}
                >
                  <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, '0')}</span>
                  <span>{s.title}</span>
                </button>
              </li>
            ))}
          </ol>
        </nav>

        <div ref={scroller} className={`min-w-0 flex-1 overflow-auto overscroll-contain scroll-smooth px-4 pt-6 sm:px-8 ${listen.active ? (listen.tutor ? 'pb-72' : 'pb-32') : 'pb-[max(3rem,env(safe-area-inset-bottom))]'}`}>
          <article style={{ zoom, width: zoom > 1.01 ? '48rem' : undefined }} className="mx-auto max-w-3xl space-y-10 text-[15px] leading-7 text-text">
            {(map.items.length >= 3 || terms.length >= 3) && (
              <section className="mx-auto grid justify-items-center gap-4" style={{ zoom: 1 / zoom, maxWidth: 1100 }}>
                <NoteMap root={map.root} items={map.items} />
                {terms.length >= 3 && (
                  <details className="max-w-2xl rounded-lg ring-1 ring-line">
                    <summary className="flex min-h-11 cursor-pointer items-center px-4 py-2 font-mono text-[11px] uppercase tracking-[0.08em] text-accent">
                      Terms to know · {terms.length}
                    </summary>
                    <dl className="grid gap-x-4 gap-y-2 border-t border-line px-4 py-3 sm:grid-cols-2">
                      {terms.map((t) => (
                        <div key={t.term}>
                          <dt className="text-sm font-semibold">{t.term}</dt>
                          <dd className="text-xs leading-5 text-muted">{t.def.length > 110 ? t.def.slice(0, 109) + '…' : t.def}</dd>
                        </div>
                      ))}
                    </dl>
                  </details>
                )}
              </section>
            )}

            {sections.map((s, idx) => (
              <section key={s.id} id={`sec-${s.id}`} className="note-sec scroll-mt-4 space-y-4">
                <h3 className="flex items-baseline gap-3 border-b border-line pb-2 font-display text-xl text-text sm:text-2xl">
                  <span className="font-mono text-sm text-accent">{String(idx + 1).padStart(2, '0')}</span>
                  {s.title}
                </h3>
                {(() => {
                  // A real slide figure beats a drawn summary of the same list: skip the drawn one when the section has a picture.
                  const ds = s.groups.some((g) => g.kind === 'figure') ? [] : diagramsFor(s);
                  const shown = new Set(ds.flatMap((d) => d.covers));
                  return (
                    <>
                      {s.groups.filter((g) => !shown.has(g)).map((g, i) => <GroupView key={i} g={g} />)}
                      {ds.map((d, i) => <NoteDiagram key={i} d={d} />)}
                    </>
                  );
                })()}
                {(spots.get(idx) ?? []).map((id: TopicId) => (
                  <Suspense key={id} fallback={null}>
                    <div className="max-w-xl">
                      <VisualCard topicId={id} onOpen={onOpenVisual ? (t) => { onClose(); onOpenVisual(t); } : undefined} />
                    </div>
                  </Suspense>
                ))}
                <AnswerCard noteId={note.id} noteTitle={note.title} s={s} />
                <Recall section={s} />
              </section>
            ))}

            <section id="sec-aids" className="scroll-mt-4 space-y-4">
              <h3 className="flex items-baseline gap-3 border-b border-line pb-2 font-display text-xl text-text sm:text-2xl">
                <span className="font-mono text-sm text-accent">{String(sections.length + 1).padStart(2, '0')}</span>
                Study aids
              </h3>
              {(note.summary || aids.takeaways.length > 0) && (
                <div className="grid gap-3 sm:grid-cols-2">
                  {note.summary && (
                    <div className="rounded-xl bg-surface p-4 ring-1 ring-line">
                      <h4 className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">Summary</h4>
                      <p className="mt-2 text-sm leading-6">{note.summary}</p>
                    </div>
                  )}
                  {aids.takeaways.length > 0 && (
                    <div className="rounded-xl bg-surface p-4 ring-1 ring-line">
                      <h4 className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">Key takeaways</h4>
                      <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-6">
                        {aids.takeaways.map((t, i) => <li key={i}>{t}</li>)}
                      </ul>
                    </div>
                  )}
                </div>
              )}
              {aids.questions.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent">Practice questions</h4>
                  {aids.questions.map(({ sec, r }, i) => (
                    <details key={sec.id} className="group max-w-2xl rounded-lg ring-1 ring-line">
                      <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-4 py-2 text-sm marker:hidden [&::-webkit-details-marker]:hidden">
                        <span className="font-mono text-accent">{i + 1}.</span>
                        <span>{r!.q}</span>
                      </summary>
                      <ul className="space-y-1 border-t border-line px-4 py-3 text-sm leading-6 text-muted">
                        {r!.a.map((t, j) => <li key={j}>{t}</li>)}
                      </ul>
                    </details>
                  ))}
                </div>
              )}
            </section>
            {note.tags.length > 0 && <p className="text-sm text-muted">{note.tags.map((t) => `#${t}`).join('  ')}</p>}

            {(next || prev) && onGo && (
              <nav aria-label="More notes in this course" className="space-y-2 border-t border-line pt-6">
                {next && (
                  <button
                    onClick={() => onGo(next)}
                    className="hover-lift group flex w-full items-center justify-between gap-4 rounded-[24px] bg-accent p-5 text-left text-ink shadow-[0_18px_44px_-28px_var(--color-glow)]"
                  >
                    <span className="min-w-0">
                      <span className="block text-sm font-medium opacity-85">Next note</span>
                      <span className="mt-1 block font-display text-xl leading-snug">{next.title}</span>
                    </span>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-ink text-accent transition-transform group-hover:translate-x-0.5">
                      <ArrowRight aria-hidden className="h-5 w-5" />
                    </span>
                  </button>
                )}
                {!next && <p className="text-sm text-muted">That's the last note in this course.</p>}
                {prev && (
                  <button onClick={() => onGo(prev)} className="flex min-h-10 items-center gap-2 rounded-full px-3 text-sm text-muted hover:bg-raised hover:text-text">
                    <ArrowLeft aria-hidden className="h-4 w-4" /> <span className="truncate">Previous: {prev.title}</span>
                  </button>
                )}
              </nav>
            )}
          </article>
        </div>
      </div>
    </div>
  , document.body);
}
