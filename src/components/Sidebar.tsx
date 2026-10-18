import React, { useState } from 'react';
import { ChevronDown, Plus, Settings, TreePine, X } from 'lucide-react';
import { AppTab, MORE_NAV, NavItem, PRIMARY_NAV } from './Header';

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
}

const sectionLabel = 'px-3 pb-1 font-mono text-xs uppercase tracking-[0.08em] text-muted';

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
}) => {
  const activeInMore = MORE_NAV.some((n) => n.id === tab);
  const [moreOpen, setMoreOpen] = useState(activeInMore);
  const showMore = moreOpen || activeInMore;

  const row = (item: NavItem) => {
    const active = tab === item.id;
    const Icon = item.icon;
    return (
      <li key={item.id}>
        <button
          onClick={() => {
            onTab(item.id);
            afterChoose();
          }}
          aria-current={active ? 'page' : undefined}
          className={`flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-left text-[15px] transition-colors ${
            active ? 'bg-raised text-text' : 'text-muted hover:bg-surface hover:text-text'
          }`}
        >
          <Icon className={`h-[18px] w-[18px] shrink-0 ${active ? 'text-accent' : ''}`} />
          <span className="truncate">{item.label}</span>
        </button>
      </li>
    );
  };

  const initial = (name.trim()[0] || 'S').toUpperCase();

  return (
    <div className="flex h-full flex-col">
      <div className="flex h-14 shrink-0 items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <TreePine className="h-5 w-5 text-accent" aria-hidden />
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
          className="flex min-h-11 w-full items-center gap-3 rounded-md px-3 text-[15px] font-medium text-text ring-1 ring-line transition-colors hover:bg-raised"
        >
          <Plus className="h-[18px] w-[18px] text-accent" />
          New question
        </button>
      </div>

      <nav aria-label="Sections" className="mt-3 px-3">
        <ul className="space-y-0.5">{PRIMARY_NAV.map(row)}</ul>
        <button
          onClick={() => setMoreOpen((o) => !o)}
          aria-expanded={showMore}
          disabled={activeInMore}
          className="mt-1 flex min-h-9 w-full items-center gap-2 rounded-md px-3 text-sm text-muted hover:text-text disabled:cursor-default disabled:hover:text-muted"
        >
          <ChevronDown className={`h-4 w-4 transition-transform ${showMore ? '' : '-rotate-90'}`} />
          More
        </button>
        {showMore && <ul className="animate-fade-in space-y-0.5">{MORE_NAV.map(row)}</ul>}
      </nav>

      <div className="mt-4 min-h-0 flex-1 overflow-y-auto px-3 pb-3">
        <p className={sectionLabel}>Recent questions</p>
        {recents.length === 0 ? (
          <p className="px-3 text-sm text-muted">Your questions will appear here.</p>
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
                    className={`min-h-10 w-full truncate rounded-md px-3 text-left text-sm transition-colors ${
                      active ? 'bg-raised text-text' : 'text-muted hover:bg-surface hover:text-text'
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

      <div className="flex shrink-0 items-center gap-3 border-t border-line p-3">
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
          onClick={() => {
            onSettings();
            afterChoose();
          }}
          aria-label="Settings"
          className="flex h-10 w-10 items-center justify-center rounded-md text-muted hover:bg-raised hover:text-text"
        >
          <Settings className="h-[18px] w-[18px]" />
        </button>
      </div>
    </div>
  );
};
