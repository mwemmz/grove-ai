/* Phones only: the main sections one thumb-tap away, in a floating dock. Everything else stays in the full menu. */
import { BookOpen, House, Menu, NotebookText, Timer } from 'lucide-react';
import type { AppTab } from './Header';

const ITEMS: { id: AppTab; label: string; Icon: typeof BookOpen }[] = [
  { id: 'today', label: 'Today', Icon: House },
  { id: 'notes', label: 'Notes', Icon: NotebookText },
  { id: 'remember', label: 'Ask', Icon: BookOpen },
  { id: 'study', label: 'Study', Icon: Timer },
];

export function BottomNav({ tab, onTab, onMenu }: { tab: AppTab; onTab: (t: AppTab) => void; onMenu: () => void }) {
  const found = ITEMS.findIndex((i) => i.id === tab);
  const index = found === -1 ? ITEMS.length : found; // "More" holds every other section
  const cells = ITEMS.length + 1;

  const cell = (active: boolean) =>
    `relative z-[1] flex min-h-14 flex-1 flex-col items-center justify-center gap-0.5 rounded-full text-[11px] font-medium transition-colors duration-200 ${
      active ? 'text-ink' : 'text-muted'
    }`;

  return (
    <div className="px-3 pb-[max(10px,env(safe-area-inset-bottom))]">
      <nav aria-label="Main sections" className="glass pointer-events-auto relative flex rounded-full p-1.5 ring-1 ring-line">
        {/* The active pill slides from cell to cell. Cells are equal width, so a transform is all it needs. */}
        <span
          aria-hidden
          className="slide-indicator absolute bottom-1.5 left-1.5 top-1.5 rounded-full bg-accent"
          style={{ width: `calc((100% - 12px) / ${cells})`, transform: `translateX(${index * 100}%)` }}
        />
        {ITEMS.map(({ id, label, Icon }, i) => (
          <button key={id} onClick={() => onTab(id)} aria-current={i === index ? 'page' : undefined} className={cell(i === index)}>
            <Icon className="h-5 w-5" aria-hidden />
            {label}
          </button>
        ))}
        <button onClick={onMenu} aria-current={index === ITEMS.length ? 'page' : undefined} className={cell(index === ITEMS.length)}>
          <Menu className="h-5 w-5" aria-hidden />
          More
        </button>
      </nav>
    </div>
  );
}
