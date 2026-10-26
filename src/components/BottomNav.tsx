/* Phones only: the main sections one thumb-tap away. Everything else stays in the full menu. */
import { BookOpen, Cpu, Library, Menu, NotebookText, Timer } from 'lucide-react';
import type { AppTab } from './Header';

const ITEMS: { id: AppTab; label: string; Icon: typeof BookOpen }[] = [
  { id: 'remember', label: 'Ask', Icon: BookOpen },
  { id: 'notes', label: 'Notes', Icon: NotebookText },
  { id: 'library', label: 'Library', Icon: Library },
  { id: 'visuals', label: 'Visuals', Icon: Cpu },
  { id: 'study', label: 'Study', Icon: Timer },
];

export function BottomNav({ tab, onTab, onMenu }: { tab: AppTab; onTab: (t: AppTab) => void; onMenu: () => void }) {
  const inMenu = !ITEMS.some((i) => i.id === tab);
  return (
    <nav aria-label="Main sections" className="flex border-t border-line bg-side pb-[env(safe-area-inset-bottom)]">
      {ITEMS.map(({ id, label, Icon }) => {
        const active = tab === id;
        return (
          <button
            key={id}
            onClick={() => onTab(id)}
            aria-current={active ? 'page' : undefined}
            className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${active ? 'text-accent' : 'text-muted'}`}
          >
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </button>
        );
      })}
      <button
        onClick={onMenu}
        aria-current={inMenu ? 'page' : undefined}
        className={`flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium ${inMenu ? 'text-accent' : 'text-muted'}`}
      >
        <Menu className="h-5 w-5" aria-hidden />
        More
      </button>
    </nav>
  );
}
