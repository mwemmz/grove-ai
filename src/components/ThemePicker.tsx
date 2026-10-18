import { useEffect, useState } from 'react';
import { Check } from 'lucide-react';
import { THEMES, applyTheme, getStoredTheme } from '../themes';

/** Swatch grid. Each swatch previews its own bg / surface / accent so the choice is visible before clicking. */
export const ThemePicker = ({ compact = false }: { compact?: boolean }) => {
  const [active, setActive] = useState(getStoredTheme);

  useEffect(() => {
    const on = (e: Event) => setActive((e as CustomEvent<string>).detail);
    window.addEventListener('grove-theme-changed', on);
    return () => window.removeEventListener('grove-theme-changed', on);
  }, []);

  return (
    <div role="radiogroup" aria-label="Colour theme" className={`grid gap-2 ${compact ? 'grid-cols-2' : 'grid-cols-2 sm:grid-cols-3'}`}>
      {THEMES.map((t) => {
        const on = t.id === active;
        return (
          <button
            key={t.id}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => applyTheme(t.id)}
            className={`flex items-center gap-2 rounded-lg border p-1.5 text-left text-xs ${
              on ? 'border-accent bg-raised text-text' : 'border-line text-muted hover:bg-raised hover:text-text'
            }`}
          >
            <span
              aria-hidden
              className="relative flex h-8 w-8 shrink-0 items-center justify-center overflow-hidden rounded-md border"
              style={{ background: t.bg, borderColor: t.line }}
            >
              <span className="absolute bottom-0 left-0 right-0 h-3" style={{ background: t.surface }} />
              <span className="relative h-3 w-3 rounded-full" style={{ background: t.accent }} />
            </span>
            <span className="min-w-0 flex-1 truncate font-medium">{t.name}</span>
            {on && <Check className="h-3.5 w-3.5 shrink-0 text-accent" />}
          </button>
        );
      })}
    </div>
  );
};
