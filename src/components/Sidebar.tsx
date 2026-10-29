import React, { useLayoutEffect, useRef, useState } from 'react';
import { ChevronDown, Palette, Plus, Settings, TreePine, X } from 'lucide-react';
import { ThemePicker } from './ThemePicker';
import { AppTab, MORE_NAV, NavItem, PRIMARY_NAV, STAFF_NAV } from './Header';

export interface Recent {
  id: string;
  text: string;
}

interface SidebarProps {
  tab: AppTab;
  onTab: (tab: AppTab) => void;
  recents: Recent[];
  activeRecentId: string | null;
  onRecent: (id: string) => void;
  onNew: () => void;
  name: string;
  year: number;
  onSettings: () => void;
  /** Closes the drawer on small screens after something is chosen. */
  afterChoose: () => void;
  onClose: () => void;
  /** Lecturers and admins also get the class insights screen. */
  staff?: boolean;
}

const sectionLabel = 'px-4 pb-1 font-mono text-xs uppercase tracking-[0.08em] text-muted';

export const Sidebar: React.FC<SidebarProps> = ({
  tab,
  onTab,
  recents,
  activeRecentId,
  onRecent,
  onNew,
  name,
  year,
  onSettings,
  afterChoose,
  onClose,
  staff = false,
}) => {
  const [themesOpen, setThemesOpen] = useState(false);
  const activeInMore = MORE_NAV.some((n) => n.id === tab);
  const [moreOpen, setMoreOpen] = useState(activeInMore);
  const showMore = moreOpen || activeInMore;

  // One highlight pill for the whole menu. It glides to the chosen row instead of rows switching colour on their own.
  const navRef = useRef<HTMLElement>(null);
  const rowRefs = useRef(new Map<string, HTMLButtonElement>());
  const [pill, setPill] = useState<{ y: number; h: number } | null>(null);
  useLayoutEffect(() => {
    const b = rowRefs.current.get(tab);
    const nav = navRef.current;
    if (!b || !nav) return setPill(null);
    const r = b.getBoundingClientRect(), n = nav.getBoundingClientRect();
    setPill({ y: r.top - n.top, h: r.height });
  }, [tab, showMore]);

  const row = (item: NavItem) => {
    const active = tab === item.id;
    const Icon = item.icon;
    return (
      <li key={item.id}>
        <button
          ref={(el) => { if (el) rowRefs.current.set(item.id, el); else rowRefs.current.delete(item.id); }}
          onClick={() => {
            onTab(item.id);
            afterChoose();
          }}
          aria-current={active ? 'page' : undefined}
          className={`relative z-[1] flex min-h-11 w-full items-center gap-3 rounded-full px-4 text-left text-[15px] transition-colors duration-200 ${
            active ? 'font-medium text-ink' : 'text-muted hover:bg-surface/70 hover:text-text'
          }`}
        >
          <Icon className="h-[18px] w-[18px] shrink-0" />
          <span className="truncate">{item.label}</span>
        </button>
      </li>
    );
  };

  const initial = (name.trim()[0] || 'S').toUpperCase();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-16 shrink-0 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <span aria-hidden className="flex h-8 w-8 items-center justify-center rounded-full bg-accent text-ink">
            <TreePine className="h-4 w-4" />
          </span>
          <span className="font-display text-xl text-text">Grove</span>
        </div>
        <button
          onClick={onClose}
          aria-label="Close menu"
          className="flex h-10 w-10 items-center justify-center rounded-md text-muted hover:bg-raised hover:text-text lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-3">
        <button
          onClick={() => {
            onNew();
            afterChoose();
          }}
          className="nudge flex min-h-11 w-full items-center gap-3 rounded-full bg-surface/70 px-4 text-[15px] font-medium text-text ring-1 ring-line hover:bg-raised"
        >
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-accent text-ink">
            <Plus className="h-4 w-4" />
          </span>
          New question
        </button>
      </div>

      {/* Menu and recent questions scroll together, so nothing is cut off on short screens or with More open. */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <nav ref={navRef} aria-label="Sections" className="relative mt-3 px-3">
        {pill && (
          <span
            aria-hidden
            className="slide-indicator pointer-events-none absolute left-3 right-3 top-0 rounded-full bg-accent shadow-[0_8px_22px_-12px_var(--color-glow)]"
            style={{ height: pill.h, transform: `translateY(${pill.y}px)` }}
          />
        )}
        <ul className="space-y-0.5">{(staff ? [...PRIMARY_NAV, STAFF_NAV] : PRIMARY_NAV).map(row)}</ul>
        <button
          onClick={() => setMoreOpen((o) => !o)}
          aria-expanded={showMore}
          disabled={activeInMore}
          className="mt-1 flex min-h-9 w-full items-center gap-2 rounded-full px-4 text-sm text-muted hover:text-text disabled:cursor-default disabled:hover:text-muted"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${showMore ? '' : '-rotate-90'}`} />
          More
        </button>
        {showMore && <ul className="stagger space-y-0.5">{MORE_NAV.map(row)}</ul>}
      </nav>

      <div className="mt-4 px-3 pb-3">
        <p className={sectionLabel}>Recent questions</p>
        {recents.length === 0 ? (
          <p className="px-4 text-sm text-muted">Your questions will appear here.</p>
        ) : (
          <ul className="space-y-0.5">
            {recents.map((r) => {
              const active = r.id === activeRecentId;
              return (
                <li key={r.id}>
                  <button
                    onClick={() => {
                      onRecent(r.id);
                      afterChoose();
                    }}
                    aria-current={active ? 'true' : undefined}
                    title={r.text}
                    className={`min-h-10 w-full truncate rounded-full px-4 text-left text-sm transition-colors ${
                      active ? 'bg-raised text-text' : 'text-muted hover:bg-surface/70 hover:text-text'
                    }`}
                  >
                    {r.text}
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      </div>

      {themesOpen && (
        <div className="animate-slide-up max-h-[45%] shrink-0 overflow-y-auto px-3 pt-2">
          <ThemePicker compact />
        </div>
      )}
      <div className="m-3 flex shrink-0 items-center gap-3 rounded-[22px] bg-surface/60 p-2.5 ring-1 ring-line">
        <span
          aria-hidden
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-raised font-semibold text-accent"
        >
          {initial}
        </span>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="truncate text-sm font-medium text-text">{name || 'Student'}</p>
          <p className="font-mono text-xs text-muted">Year {year}</p>
        </div>
        <button
          onClick={() => setThemesOpen((v) => !v)}
          aria-label="Colour theme"
          aria-expanded={themesOpen}
          className={`flex h-10 w-10 items-center justify-center rounded-full hover:bg-raised hover:text-text ${themesOpen ? 'bg-raised text-text' : 'text-muted'}`}
        >
          <Palette className="h-[18px] w-[18px]" />
        </button>
        <button
          onClick={() => {
            onSettings();
            afterChoose();
          }}
          aria-label="Settings"
          className="flex h-10 w-10 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-text"
        >
          <Settings className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
};
