import React, { useState } from 'react';
import { ChevronDown, Check } from 'lucide-react';

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

/** Two-to-four option switch used instead of a second row of nav tabs. */
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
  return (
    <div
      role="tablist"
      aria-label={label}
      className="inline-flex max-w-full flex-wrap gap-0.5 rounded-md bg-surface p-1 ring-1 ring-line"
    >
      {options.map((o) => (
        <button
          key={o.id}
          role="tab"
          aria-selected={value === o.id}
          onClick={() => onChange(o.id)}
          className={`min-h-9 whitespace-nowrap rounded px-3.5 text-sm font-medium transition-colors ${
            value === o.id ? 'bg-raised text-text' : 'text-muted hover:text-text'
          }`}
        >
          {o.label}
        </button>
      ))}
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
      {open && <div className="mt-2 animate-fade-in">{children}</div>}
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
      <div className="animate-slide-up flex items-center gap-2 rounded-full bg-raised px-4 py-2 text-sm text-text shadow-lg ring-1 ring-line">
        <Check className="h-4 w-4 text-accent" />
        <span>{message}</span>
      </div>
    </div>
  );
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
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/70 p-0 sm:items-center sm:p-4 animate-fade-in"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`flex max-h-[90dvh] w-full flex-col rounded-t-2xl bg-surface ring-1 ring-line sm:rounded-[10px] ${
          wide ? 'sm:max-w-3xl' : 'sm:max-w-lg'
        }`}
      >
        <div className="flex items-center justify-between px-5 py-4">
          <h2 className="font-display text-lg text-text">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-muted hover:bg-raised hover:text-text"
          >
            ✕
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-5">{children}</div>
      </div>
    </div>
  );
}

export const field =
  'w-full rounded-md bg-surface px-3 py-2.5 text-sm text-text placeholder:text-muted/70 ring-1 ring-line focus:outline-none focus:ring-accent/70';
export const labelCls = 'mb-1.5 block text-xs font-medium uppercase tracking-[0.06em] text-muted';
export const primaryBtn =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-accent px-4 text-sm font-semibold text-ink hover:brightness-110 transition-[filter]';
export const quietBtn =
  'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-4 text-sm font-medium text-text ring-1 ring-line hover:bg-raised transition-colors';
/** The one container style used everywhere: a bordered surface with 10px corners. */
export const panel = 'rounded-[10px] bg-surface p-5 ring-1 ring-line';
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
