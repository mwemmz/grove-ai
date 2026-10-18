import React, { useEffect, useRef, useState } from 'react';
import { MessageCircle, BookOpen, Repeat, User, MoreHorizontal, Compass, Users, Settings } from 'lucide-react';

export type AppTab = 'chat' | 'notes' | 'blueprints' | 'tutoring' | 'profile' | 'portfolio' | 'quiz';

interface NavProps {
  activeTab: AppTab;
  setActiveTab: (tab: AppTab) => void;
}

/** Four places a student actually goes. Everything else lives under "You" or the menu. */
const PRIMARY: { id: AppTab; label: string; icon: React.ElementType; match: AppTab[] }[] = [
  { id: 'chat', label: 'Ask', icon: MessageCircle, match: ['chat'] },
  { id: 'notes', label: 'Notes', icon: BookOpen, match: ['notes'] },
  { id: 'quiz', label: 'Recall', icon: Repeat, match: ['quiz'] },
  { id: 'profile', label: 'You', icon: User, match: ['profile', 'portfolio'] },
];

function Mark() {
  return (
    <svg viewBox="0 0 32 32" className="h-7 w-7" aria-hidden="true">
      <circle cx="16" cy="16" r="14" fill="none" stroke="currentColor" strokeOpacity="0.25" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="9" fill="none" stroke="currentColor" strokeOpacity="0.55" strokeWidth="1.5" />
      <circle cx="16" cy="16" r="4" fill="currentColor" />
    </svg>
  );
}

export const Header: React.FC<NavProps & { onOpenSettings: () => void }> = ({
  activeTab,
  setActiveTab,
  onOpenSettings,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenuOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [menuOpen]);

  const item =
    'flex w-full min-h-11 items-center gap-3 px-4 text-left text-sm text-text hover:bg-raised';

  return (
    <header className="z-40 shrink-0 border-b border-line bg-bg">
      <div className="mx-auto flex h-14 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <button
          onClick={() => setActiveTab('chat')}
          className="flex items-center gap-2 text-accent"
          aria-label="Grove home"
        >
          <Mark />
          <span className="text-lg font-semibold tracking-tight text-text">Grove</span>
        </button>

        <nav className="hidden sm:flex items-center gap-1" aria-label="Main">
          {PRIMARY.map((t) => {
            const active = t.match.includes(activeTab);
            return (
              <button
                key={t.id}
                onClick={() => setActiveTab(t.id)}
                aria-current={active ? 'page' : undefined}
                className={`relative min-h-14 px-4 text-sm font-medium transition-colors ${
                  active ? 'text-text' : 'text-muted hover:text-text'
                }`}
              >
                {t.label}
                {active && <span className="absolute inset-x-4 bottom-0 h-0.5 rounded-full bg-accent" />}
              </button>
            );
          })}
        </nav>

        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setMenuOpen((o) => !o)}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
            aria-label="More"
            className="flex h-10 w-10 items-center justify-center rounded-lg text-muted hover:bg-surface hover:text-text"
          >
            <MoreHorizontal className="h-5 w-5" />
          </button>
          {menuOpen && (
            <div
              role="menu"
              className="absolute right-0 top-12 w-60 overflow-hidden rounded-xl bg-surface py-1 shadow-xl ring-1 ring-line animate-fade-in"
            >
              <p className="px-4 pb-1 pt-2 text-xs text-muted">Community</p>
              <button role="menuitem" className={item} onClick={() => { setActiveTab('blueprints'); setMenuOpen(false); }}>
                <Compass className="h-4 w-4 text-muted" /> Study blueprints
              </button>
              <button role="menuitem" className={item} onClick={() => { setActiveTab('tutoring'); setMenuOpen(false); }}>
                <Users className="h-4 w-4 text-muted" /> Peer tutoring
              </button>
              <div className="my-1 border-t border-line" />
              <button role="menuitem" className={item} onClick={() => { onOpenSettings(); setMenuOpen(false); }}>
                <Settings className="h-4 w-4 text-muted" /> Settings
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

/** Phone navigation: reachable with a thumb, no scrolling strip. */
export const BottomNav: React.FC<NavProps> = ({ activeTab, setActiveTab }) => (
  <nav
    aria-label="Main"
    className="sm:hidden shrink-0 border-t border-line bg-bg pb-[env(safe-area-inset-bottom)]"
  >
    <div className="grid grid-cols-4">
      {PRIMARY.map((t) => {
        const active = t.match.includes(activeTab);
        const Icon = t.icon;
        return (
          <button
            key={t.id}
            onClick={() => setActiveTab(t.id)}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-14 flex-col items-center justify-center gap-0.5 text-xs font-medium ${
              active ? 'text-accent' : 'text-muted'
            }`}
          >
            <Icon className="h-5 w-5" />
            {t.label}
          </button>
        );
      })}
    </div>
  </nav>
);
