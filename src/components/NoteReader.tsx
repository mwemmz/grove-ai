/* Full-screen note reader: headed sections, an outline to jump around, diagrams drawn from the note's own structure,
   animated pictures beside the matching idea, and recall prompts. */
import { createPortal } from 'react-dom';
import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { lazyWithReload } from '../lib/lazyReload';
import type { Note } from '../types';
import { placePictures } from '../data/pictureMatch';
import type { TopicId } from '../data/visualTopics';
import { diagramsFor, glossary, noteMap, parseSections, recallFor, type Group, type Section } from '../lib/noteStructure';
import { NoteDiagram, NoteMap } from './NoteDiagrams';
import { Inline } from './ui';
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

export function NoteReader({
  note,
  courseName,
  onClose,
  onOpenVisual,
}: {
  note: Note;
  courseName?: string;
  onClose: () => void;
  onOpenVisual?: (id: TopicId) => void;
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
  const [progress, setProgress] = useState(0);
  const askPill = useAskOnSelect(scroller);

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
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => {
    const root = scroller.current;
    if (!root) return;
    const onScroll = () => setProgress(root.scrollHeight - root.clientHeight > 0 ? root.scrollTop / (root.scrollHeight - root.clientHeight) : 0);
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

  const jump = (id: string) => {
    document.getElementById(`sec-${id}`)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    setActive(`sec-${id}`);
  };

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={note.title} className="view-enter fixed inset-0 z-50 isolate flex flex-col bg-bg">
      <div aria-hidden className="ambient" style={{ zIndex: -1 }} />
      {askPill}
      <header className="glass-strong relative flex items-center gap-3 border-b border-line/70 px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] sm:px-5">
        <button onClick={onClose} className="flex min-h-10 items-center gap-1.5 rounded-md px-2 text-sm text-muted hover:bg-raised hover:text-text">
          <ArrowLeft className="h-4 w-4" /> Notes
        </button>
        <div className="min-w-0 flex-1">
          <h2 className="truncate font-display text-base text-text sm:text-lg">{note.title}</h2>
          <p className="truncate font-mono text-[11px] text-muted">
            Year {note.year} · {courseName || 'Course'} · {sections.length} sections
          </p>
        </div>
        <CopilotButton />
        <div aria-hidden className="absolute inset-x-0 bottom-0 h-0.5 bg-line">
          <div className="h-full bg-accent transition-[width] duration-150" style={{ width: `${Math.round(progress * 100)}%` }} />
        </div>
      </header>

      {/* Phones: the outline is a row of chips. */}
      <nav aria-label="Sections" className="flex gap-1.5 overflow-x-auto border-b border-line px-3 py-2 lg:hidden">
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

      <div className="flex min-h-0 flex-1">
        <nav aria-label="Outline" className="hidden w-64 shrink-0 overflow-y-auto border-r border-line px-3 py-5 lg:block">
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

        <div ref={scroller} className="min-w-0 flex-1 overflow-y-auto overscroll-contain scroll-smooth px-4 pb-[max(3rem,env(safe-area-inset-bottom))] pt-6 sm:px-8">
          <article className="mx-auto max-w-3xl space-y-10 text-[15px] leading-7 text-text">
            {(map.items.length >= 3 || terms.length >= 3) && (
              <section className="space-y-4">
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
              <section key={s.id} id={`sec-${s.id}`} className="scroll-mt-4 space-y-4">
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
          </article>
        </div>
      </div>
    </div>
  , document.body);
}
