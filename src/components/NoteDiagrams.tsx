/* Diagrams drawn from a note's own structure: pyramid, layers, flow, breakdown tree, for-and-against.
   Plain HTML and CSS so they wrap on phones and follow the theme. */
import React from 'react';
import type { Diagram, Node } from '../lib/noteStructure';

const tint = (pct: number) => `color-mix(in srgb, var(--color-accent) ${pct}%, var(--color-surface))`;
const delay = (i: number) => ({ animationDelay: `${Math.min(i, 12) * 55}ms`, animationFillMode: 'both' as const });

function Frame({ caption, kind, children }: { caption: string; kind: string; children: React.ReactNode }) {
  return (
    <figure className="max-w-2xl rounded-xl bg-bg p-4 ring-1 ring-line">
      <figcaption className="mb-3 flex flex-wrap items-baseline gap-x-2 font-mono text-[11px] uppercase tracking-[0.08em]">
        <span className="text-accent">{kind}</span>
        <span className="text-muted">{caption}</span>
      </figcaption>
      {children}
    </figure>
  );
}

function Pyramid({ items }: { items: Node[] }) {
  const n = items.length;
  return (
    <div className="flex items-stretch gap-3 sm:gap-5">
      <div className="flex w-[42%] max-w-[15rem] shrink-0 flex-col items-center gap-[3px]">
        {items.map((_, i) => {
          const top = (i / n) * 100;
          const bot = ((i + 1) / n) * 100;
          return (
            <div
              key={i}
              className="flex w-full flex-1 animate-fade-in items-center justify-center font-mono text-xs font-semibold text-ink"
              style={{
                minHeight: 38,
                background: tint(95 - (i / Math.max(1, n - 1)) * 62),
                clipPath: `polygon(${50 - top / 2}% 0, ${50 + top / 2}% 0, ${50 + bot / 2}% 100%, ${50 - bot / 2}% 100%)`,
                ...delay(i),
              }}
            >
              {i + 1}
            </div>
          );
        })}
      </div>
      <ol className="flex flex-1 flex-col gap-[3px]">
        {items.map((it, i) => (
          <li key={i} className="flex min-h-[38px] flex-1 animate-fade-in flex-col justify-center text-sm leading-5" style={delay(i)}>
            <span className="font-medium text-text">{it.text}</span>
            {it.sub && <span className="text-xs text-muted">{it.sub}</span>}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Layers({ items }: { items: Node[] }) {
  return (
    <div className="flex flex-col items-stretch">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          <div
            className="animate-fade-in rounded-lg px-4 py-3 ring-1 ring-line"
            style={{ background: tint(30 - i * (22 / Math.max(1, items.length - 1))), borderLeft: '4px solid var(--color-accent)', ...delay(i) }}
          >
            <p className="text-sm font-semibold text-text">{it.text}</p>
            {it.sub && <p className="text-xs leading-5 text-muted">{it.sub}</p>}
          </div>
          {i < items.length - 1 && <span aria-hidden className="py-0.5 text-center font-mono text-xs text-accent">▲ ▼</span>}
        </React.Fragment>
      ))}
    </div>
  );
}

function Flow({ items }: { items: Node[] }) {
  return (
    <ol className="flex flex-col items-stretch gap-1 sm:flex-row sm:flex-wrap sm:items-stretch">
      {items.map((it, i) => (
        <React.Fragment key={i}>
          <li className="relative flex min-w-[8rem] flex-1 animate-fade-in flex-col rounded-lg bg-surface p-3 ring-1 ring-line" style={delay(i)}>
            <span className="mb-1 flex h-6 w-6 items-center justify-center rounded-full bg-accent font-mono text-xs font-bold text-ink">{i + 1}</span>
            <span className="text-sm font-medium leading-5 text-text">{it.text}</span>
            {it.sub && <span className="mt-0.5 text-xs leading-5 text-muted">{it.sub}</span>}
          </li>
          {i < items.length - 1 && (
            <span aria-hidden className="self-center font-mono text-accent">
              <span className="sm:hidden">↓</span>
              <span className="hidden sm:inline">→</span>
            </span>
          )}
        </React.Fragment>
      ))}
    </ol>
  );
}

function Tree({ root, items }: { root: string; items: Node[] }) {
  return (
    <div className="flex flex-col items-center">
      <div className="max-w-full rounded-lg bg-accent px-4 py-2 text-center text-sm font-semibold text-ink">{root}</div>
      {/* Wide screens: a rail with a stub down to each branch. */}
      <div aria-hidden className="hidden h-4 w-px bg-line sm:block" />
      <div className="hidden w-full grid-cols-[repeat(auto-fit,minmax(8.5rem,1fr))] gap-x-2 gap-y-4 border-t border-line pt-4 sm:grid">
        {items.map((it, i) => (
          <div key={i} className="relative flex animate-fade-in flex-col items-center gap-1.5 before:absolute before:-top-4 before:left-1/2 before:h-4 before:w-px before:bg-line" style={delay(i)}>
            <Branch node={it} />
          </div>
        ))}
      </div>
      {/* Phones: a left rail with a tick to each branch. */}
      <div className="mt-2 w-full space-y-2 border-l border-line pl-3 sm:hidden">
        {items.map((it, i) => (
          <div key={i} className="relative animate-fade-in before:absolute before:-left-3 before:top-4 before:h-px before:w-3 before:bg-line" style={delay(i)}>
            <Branch node={it} left />
          </div>
        ))}
      </div>
    </div>
  );
}

function Branch({ node, left = false }: { node: Node; left?: boolean }) {
  return (
    <>
      <div className={`w-full rounded-lg bg-surface px-3 py-2 ring-1 ring-line ${left ? '' : 'text-center'}`}>
        <p className="text-sm font-medium leading-5 text-text">{node.text}</p>
        {node.sub && <p className="mt-0.5 text-xs leading-5 text-muted">{node.sub}</p>}
      </div>
      {node.kids && node.kids.length > 0 && (
        <ul className={`flex w-full flex-wrap gap-1 ${left ? '' : 'justify-center'}`}>
          {node.kids.map((k, j) => (
            <li key={j} className="rounded-full bg-raised px-2 py-0.5 text-[11px] leading-4 text-muted">{k.text}</li>
          ))}
        </ul>
      )}
    </>
  );
}

function Compare({ d }: { d: Extract<Diagram, { k: 'compare' }> }) {
  const col = (side: { label: string; items: string[] }, good: boolean) => (
    <div className="rounded-lg bg-surface p-3 ring-1 ring-line" style={{ borderTop: `3px solid ${good ? 'var(--color-accent)' : 'var(--color-warn)'}` }}>
      <p className={`mb-1.5 text-xs font-semibold uppercase tracking-[0.06em] ${good ? 'text-accent' : 'text-warn'}`}>{side.label}</p>
      <ul className="space-y-1 text-sm leading-5 text-text">
        {side.items.map((t, i) => (
          <li key={i} className="flex gap-2"><span aria-hidden className={good ? 'text-accent' : 'text-warn'}>{good ? '+' : '–'}</span>{t}</li>
        ))}
      </ul>
    </div>
  );
  return <div className="grid gap-2 sm:grid-cols-2">{col(d.left, true)}{col(d.right, false)}</div>;
}

const KIND: Record<Diagram['k'], string> = { pyramid: 'Pyramid', layers: 'Layers', flow: 'Flow', tree: 'Breakdown', compare: 'For and against' };

export function NoteDiagram({ d }: { d: Diagram }) {
  return (
    <Frame caption={d.caption} kind={KIND[d.k]}>
      {d.k === 'pyramid' && <Pyramid items={d.items} />}
      {d.k === 'layers' && <Layers items={d.items} />}
      {d.k === 'flow' && <Flow items={d.items} />}
      {d.k === 'tree' && <Tree root={d.root} items={d.items} />}
      {d.k === 'compare' && <Compare d={d} />}
    </Frame>
  );
}

/** The whole note on one picture. */
export function NoteMap({ root, items }: { root: string; items: Node[] }) {
  if (items.length < 2) return null;
  return (
    <Frame caption="the whole note on one page" kind="Map">
      <Tree root={root} items={items} />
    </Frame>
  );
}
