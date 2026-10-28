import React, { useCallback, useEffect, useState } from 'react';
import { Menu, PanelRight } from 'lucide-react';
import { CopilotButton } from './Copilot';

const LG = '(min-width: 1024px)';
const XL = '(min-width: 1280px)';
const PREF_KEY = 'grove_layout_v1';

const matches = (q: string) => typeof window !== 'undefined' && window.matchMedia(q).matches;

function readPref(): { left?: boolean; right?: boolean } {
  try {
    return JSON.parse(localStorage.getItem(PREF_KEY) || '{}');
  } catch {
    return {};
  }
}

function writePref(patch: { left?: boolean; right?: boolean }) {
  try {
    localStorage.setItem(PREF_KEY, JSON.stringify({ ...readPref(), ...patch }));
  } catch {
    /* storage blocked: layout still works for this visit */
  }
}

export interface PanelApi {
  /** Closes the panel only when it is a drawer over the page (small screens). */
  closeIfDrawer: () => void;
  close: () => void;
}

interface ShellProps {
  title: string;
  sidebar: (api: PanelApi) => React.ReactNode;
  panel: (api: PanelApi) => React.ReactNode;
  children: React.ReactNode;
  /** Phone-only bar under the page (hidden from lg up); receives a way to open the full menu. */
  bottom?: (openMenu: () => void) => React.ReactNode;
}

/**
 * Three panels: history and navigation on the left, the work in the middle, progress on the right.
 * Wide screens show all three. Narrower screens show the middle, and the sides slide over it.
 */
export function Shell({ title, sidebar, panel, children, bottom }: ShellProps) {
  const [left, setLeft] = useState(() => matches(LG) && (readPref().left ?? true));
  const [right, setRight] = useState(() => matches(XL) && (readPref().right ?? false));

  // When the window crosses a breakpoint, fall back to the saved choice (wide) or close the drawer (narrow).
  useEffect(() => {
    const lg = window.matchMedia(LG);
    const xl = window.matchMedia(XL);
    const onLg = () => setLeft(lg.matches ? readPref().left ?? true : false);
    const onXl = () => setRight(xl.matches ? readPref().right ?? false : false);
    lg.addEventListener('change', onLg);
    xl.addEventListener('change', onXl);
    return () => {
      lg.removeEventListener('change', onLg);
      xl.removeEventListener('change', onXl);
    };
  }, []);

  // Escape closes whichever drawer is covering the page.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      if (left && !matches(LG)) setLeft(false);
      if (right && !matches(XL)) setRight(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [left, right]);

  const setLeftPref = useCallback((open: boolean) => {
    setLeft(open);
    if (matches(LG)) writePref({ left: open });
  }, []);
  const setRightPref = useCallback((open: boolean) => {
    setRight(open);
    if (matches(XL)) writePref({ right: open });
  }, []);

  const leftApi: PanelApi = {
    close: () => setLeftPref(false),
    closeIfDrawer: () => {
      if (!matches(LG)) setLeft(false);
    },
  };
  const rightApi: PanelApi = {
    close: () => setRightPref(false),
    closeIfDrawer: () => {
      if (!matches(XL)) setRight(false);
    },
  };

  return (
    <div className="app-shell relative isolate flex h-dvh overflow-clip bg-bg font-sans text-text selection:bg-accent/30">
      <div aria-hidden className="ambient no-print" style={{ zIndex: -1 }} />
      {left && <div aria-hidden onClick={() => setLeft(false)} className="no-print fixed inset-0 z-30 animate-fade-in bg-black/50 backdrop-blur-[2px] lg:hidden" />}
      {right && <div aria-hidden onClick={() => setRight(false)} className="no-print fixed inset-0 z-30 animate-fade-in bg-black/50 backdrop-blur-[2px] xl:hidden" />}

      <aside
        id="grove-sidebar"
        aria-label="Navigation and recent questions"
        inert={!left}
        className={`no-print glass-strong fixed inset-y-0 left-0 z-40 overflow-hidden border-r border-line/70 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] lg:static lg:z-auto lg:shrink-0 lg:translate-x-0 lg:transition-[width] ${
          left ? 'translate-x-0 lg:w-72' : '-translate-x-full lg:w-0 lg:border-r-0'
        }`}
      >
        <div className="h-full w-[84vw] max-w-[300px] lg:w-72 lg:max-w-none">{sidebar(leftApi)}</div>
      </aside>

      <div className="relative flex min-w-0 flex-1 flex-col">
        <header className="no-print flex h-16 shrink-0 items-center gap-2 px-2 sm:px-4">
          <button
            onClick={() => setLeftPref(!left)}
            aria-label={left ? 'Close menu' : 'Open menu'}
            aria-expanded={left}
            aria-controls="grove-sidebar"
            className="flex h-11 w-11 items-center justify-center rounded-full text-muted hover:bg-surface hover:text-text"
          >
            <Menu className="h-5 w-5" />
          </button>
          <p key={title} className="animate-fade-in min-w-0 flex-1 truncate font-display text-xl text-text">{title}</p>
          <CopilotButton />
          <button
            onClick={() => setRightPref(!right)}
            aria-label={right ? 'Close progress panel' : 'Open progress panel'}
            aria-expanded={right}
            aria-controls="grove-panel"
            className={`flex h-10 items-center gap-2 rounded-full px-4 text-sm ring-1 ${right ? 'bg-accent text-ink ring-accent' : 'bg-surface/60 text-muted ring-line hover:text-text'}`}
          >
            <PanelRight className="h-5 w-5" />
            <span className="hidden sm:inline">Progress</span>
          </button>
        </header>
        <main className="app-main relative min-h-0 flex-1 overflow-y-auto">
          <div key={title} className="view-enter mx-auto w-full max-w-[860px] px-4 pb-28 pt-4 sm:px-8 lg:pb-16">{children}</div>
        </main>
        {bottom && <div className="no-print pointer-events-none absolute inset-x-0 bottom-0 z-20 lg:hidden">{bottom(() => setLeftPref(true))}</div>}
      </div>

      <aside
        id="grove-panel"
        aria-label="Progress"
        inert={!right}
        className={`no-print glass-strong fixed inset-y-0 right-0 z-40 overflow-hidden border-l border-line/70 transition-transform duration-300 ease-[cubic-bezier(0.32,0.72,0,1)] xl:static xl:z-auto xl:shrink-0 xl:translate-x-0 xl:transition-[width] ${
          right ? 'translate-x-0 xl:w-80' : 'translate-x-full xl:w-0 xl:border-l-0'
        }`}
      >
        <div className="h-full w-[88vw] max-w-[340px] xl:w-80 xl:max-w-none">{panel(rightApi)}</div>
      </aside>
    </div>
  );
}
