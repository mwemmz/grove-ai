/* The read-aloud controls at the bottom of a note. */
import { Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { setRate, skip, stop, toggle, useListen, voiceSettings } from '../services/readAloud';

const RATES = [0.8, 1, 1.2, 1.5];

export function ListenBar() {
  const s = useListen();
  if (!s.active) return null;
  const rate = voiceSettings().rate;
  return (
    <div role="region" aria-label="Reading aloud" className="glass-strong animate-slide-up absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 mx-auto max-w-2xl rounded-[24px] px-3 py-2.5 shadow-2xl ring-1 ring-line sm:inset-x-6">
      <div className="flex items-center gap-2">
        <button onClick={() => skip(-1)} aria-label="Previous section" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-text">
          <SkipBack aria-hidden className="h-4 w-4" />
        </button>
        <button onClick={toggle} aria-label={s.playing ? 'Pause' : 'Play'} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-ink">
          {s.playing ? <Pause aria-hidden className="h-5 w-5" /> : <Play aria-hidden className="h-5 w-5" />}
        </button>
        <button onClick={() => skip(1)} aria-label="Next section" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-text">
          <SkipForward aria-hidden className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-sm text-text">{s.sectionTitle}</p>
          <p className="truncate text-xs text-muted" aria-live="polite">
            {s.status ?? `Section ${s.section + 1} of ${s.total}${s.usingFallback ? " · phone's voice (natural voice not available)" : ''}`}
          </p>
        </div>
        <select
          aria-label="Reading speed"
          value={rate}
          onChange={(e) => setRate(Number(e.target.value))}
          className="h-9 shrink-0 rounded-full bg-raised px-2 text-xs text-text ring-1 ring-line focus:outline-none"
        >
          {RATES.map((r) => <option key={r} value={r}>{r}×</option>)}
        </select>
        <button onClick={stop} aria-label="Stop reading" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-text">
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
