import React, { useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, X } from 'lucide-react';

/** One consistent page title: a heading, one line of context, an optional action. */
export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
      <div className="min-w-0 flex-1 basis-72">
        <h1 className="font-display text-2xl tracking-tight text-text">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-muted max-w-prose">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/** Two-to-four option switch used instead of a second row of nav tabs.
 *  The active pill slides between options: a copy of the labels in active colours sits on top and is clipped to the
 *  chosen option, so the colour change travels with the pill instead of two colours cross-fading. */
export function Segmented<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T;
  options: { id: T; label: string }[];
  onChange: (id: T) => void;
  label: string;
}) {
  const track = useRef<HTMLDivElement>(null);
  const refs = useRef(new Map<string, HTMLButtonElement>());
  const [clip, setClip] = useState<string | null>(null);

  useLayoutEffect(() => {
    const t = track.current;
    if (!t) return;
    const measure = () => {
      const b = refs.current.get(value);
      if (!b) return setClip(null);
      const top = b.offsetTop, left = b.offsetLeft;
      const right = t.clientWidth - left - b.offsetWidth, bottom = t.clientHeight - top - b.offsetHeight;
      setClip(`inset(${top}px ${right}px ${bottom}px ${left}px round 999px)`);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(t);
    return () => ro.disconnect();
  }, [value, options.length]);

  const row = (active: boolean) =>
    options.map((o) => (
      <button
        key={o.id}
        ref={active ? undefined : (el) => { if (el) refs.current.set(o.id, el); else refs.current.delete(o.id); }}
        role={active ? undefined : 'tab'}
        aria-selected={active ? undefined : value === o.id}
        tabIndex={active ? -1 : undefined}
        onClick={active ? undefined : () => onChange(o.id)}
        className={`min-h-9 whitespace-nowrap rounded-full px-4 text-sm font-medium ${
          active ? 'text-ink' : value === o.id ? 'text-text' : 'text-muted hover:text-text'
        }`}
      >
        {o.label}
      </button>
    ));

  return (
    <div
      ref={track}
      role="tablist"
      aria-label={label}
      className="relative inline-flex max-w-full flex-wrap gap-0.5 rounded-full bg-surface/70 p-1 ring-1 ring-line"
    >
      {row(false)}
      {clip && (
        <div
          aria-hidden
          className="slide-indicator pointer-events-none absolute inset-0 flex flex-wrap gap-0.5 rounded-full bg-accent p-1"
          style={{ clipPath: clip, transition: 'clip-path 320ms var(--ease-out-expo)' }}
        >
          {row(true)}
        </div>
      )}
    </div>
  );
}

/** Content that stays out of the way until the reader asks for it. */
export function Disclosure({
  summary,
  children,
  defaultOpen = false,
}: {
  summary: React.ReactNode;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex min-h-9 items-center gap-1.5 text-sm text-muted hover:text-text transition-colors"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? '' : '-rotate-90'}`} />
        <span>{summary}</span>
      </button>
      {open && <div className="mt-2 animate-slide-up">{children}</div>}
    </div>
  );
}

/** Quiet confirmation near the bottom of the screen. Replaces the bouncing top-right toasts. */
export function Toast({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <div
      role="status"
      className="pointer-events-none fixed inset-x-0 bottom-24 z-50 flex justify-center px-4 sm:bottom-8"
    >
      <div className="animate-slide-up glass flex items-center gap-2 rounded-full px-4 py-2.5 text-sm text-text ring-1 ring-line">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-accent text-ink"><Check className="h-3 w-3" /></span>
        <span>{message}</span>
      </div>
    </div>
  );
}

/** Renders full-screen layers on <body>, so no transformed or frosted ancestor can trap them. */
export function Portal({ children }: { children: React.ReactNode }) {
  return createPortal(children, document.body);
}

/** Full-screen dialog shell shared by every "add something" form. */
export function Modal({
  title,
  onClose,
  children,
  wide = false,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  wide?: boolean;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 backdrop-blur-sm sm:items-center sm:p-4 animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`dialog-in flex max-h-[90dvh] w-full flex-col rounded-t-[28px] bg-surface ring-1 ring-line shadow-2xl sm:rounded-[28px] ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
        }`}
      >
        <div className="flex items-center justify-between px-6 pb-3 pt-5">
          <h2 className="font-display text-lg text-text">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-full bg-raised text-muted hover:text-text"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="overflow-y-auto px-6 pb-6">{children}</div>
      </div>
    </div>
  , document.body);
}

export const field =
  'w-full rounded-2xl bg-bg/80 px-4 py-2.5 text-sm text-text placeholder:text-muted ring-1 ring-edge transition-shadow focus:outline-none focus:ring-2 focus:ring-accent-text';
export const labelCls = 'mb-1.5 block text-xs font-semibold uppercase tracking-[0.06em] text-text/80';
/** Main action: a full pill in the accent colour. Add an ArrowRight as the last child and it leans on hover. */
export const primaryBtn =
  'nudge inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-accent px-5 text-sm font-semibold text-ink shadow-[0_8px_24px_-12px_var(--color-glow)] hover:brightness-110';
export const quietBtn =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-full bg-surface/60 px-5 text-sm font-medium text-text ring-1 ring-line hover:bg-raised';
/** The one container style used everywhere: a frosted panel with 24px corners. */
export const panel = 'glass rounded-[24px] p-5 ring-1 ring-line/80';
export const chip =
  'inline-flex items-center gap-1.5 rounded-full bg-raised px-2.5 py-0.5 font-mono text-xs text-text';

/** Renders **bold** and `code` inside a line of text. Everything else stays plain. */
export function Inline({ text }: { text: string }) {
  return (
    <>
      {text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g).map((part, i) => {
        if (part.startsWith('**') && part.endsWith('**') && part.length > 4) {
          return <strong key={i} className="font-semibold text-text">{part.slice(2, -2)}</strong>;
        }
        if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
          return <code key={i} className="rounded bg-raised px-1.5 py-0.5 font-mono text-[0.85em]">{part.slice(1, -1)}</code>;
        }
        return <React.Fragment key={i}>{part}</React.Fragment>;
      })}
    </>
  );
}
