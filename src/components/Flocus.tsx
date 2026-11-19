/* Flocus: a full-screen, no-distractions way to read a note, with an optional timer for deep focus.
   The timer counts from a fixed end time, so it stays right if the phone sleeps the page for a moment. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { Pause, Play, X } from 'lucide-react';

const KEY = 'grove_flocus';
const today = () => new Date().toISOString().slice(0, 10);
export function focusedToday(): number {
  try {
    const v = JSON.parse(localStorage.getItem(KEY) ?? '{}') as { day?: string; min?: number };
    return v.day === today() ? v.min ?? 0 : 0;
  } catch {
    return 0;
  }
}
function addFocused(min: number) {
  if (min <= 0) return;
  try {
    localStorage.setItem(KEY, JSON.stringify({ day: today(), min: focusedToday() + min }));
  } catch {
    /* private mode: the count is only a nicety */
  }
}
function chime() {
  try {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new C();
    [660, 880, 1100].forEach((f, i) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.frequency.value = f;
      o.connect(g);
      g.connect(ctx.destination);
      const t = ctx.currentTime + i * 0.28;
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.18, t + 0.04);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
      o.start(t);
      o.stop(t + 0.55);
    });
    setTimeout(() => void ctx.close(), 1800);
  } catch {
    /* no sound available: the card still shows */
  }
}

interface Timer { total: number; end: number; left: number; running: boolean }

export function useFlocus() {
  const [on, setOn] = useState(false);
  const [timer, setTimer] = useState<Timer | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const fs = useRef(false);
  const timerRef = useRef<Timer | null>(null);
  timerRef.current = timer;

  const leave = useCallback((credit: boolean) => {
    const t = timerRef.current;
    if (credit && t) addFocused(Math.floor((t.total - t.left) / 60));
    fs.current = false;
    if (document.fullscreenElement) void document.exitFullscreen().catch(() => {});
    setOn(false);
    setTimer(null);
    setDone(null);
  }, []);

  const enter = useCallback((minutes: number) => {
    setDone(null);
    setTimer(minutes > 0 ? { total: minutes * 60, end: Date.now() + minutes * 60_000, left: minutes * 60, running: true } : null);
    setOn(true);
    // Real full screen where the browser allows it; the page still hides everything else where it does not (iPhone).
    try {
      void document.documentElement.requestFullscreen?.().then(() => { fs.current = true; }).catch(() => {});
    } catch {
      /* not allowed here */
    }
  }, []);

  useEffect(() => {
    if (!timer?.running) return;
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((timer.end - Date.now()) / 1000));
      if (left <= 0) {
        clearInterval(id);
        addFocused(Math.round(timer.total / 60));
        chime();
        setDone(Math.round(timer.total / 60));
        setTimer(null);
      } else setTimer((t) => (t ? { ...t, left } : t));
    }, 500);
    return () => clearInterval(id);
  }, [timer?.running, timer?.end, timer?.total]);

  // Escape inside full screen is taken by the browser: when it leaves full screen, leave focus too.
  useEffect(() => {
    const onFs = () => {
      if (!document.fullscreenElement && fs.current) leave(true);
    };
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, [leave]);
  useEffect(() => () => { if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); }, []);

  const toggle = () => setTimer((t) => (t ? (t.running ? { ...t, running: false } : { ...t, end: Date.now() + t.left * 1000, running: true }) : t));
  return { on, timer, done, enter, leave, toggle };
}

const mmss = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
const MINUTES = [15, 25, 45, 60];

/** Choose how long to focus, or read full screen with no timer. */
export function FlocusSheet({ onStart, onClose }: { onStart: (minutes: number) => void; onClose: () => void }) {
  const [m, setM] = useState(25);
  const [custom, setCustom] = useState('');
  const mins = custom ? Math.min(180, Math.max(1, Number(custom) || 0)) : m;
  const earlier = focusedToday();
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center bg-black/55 p-0 sm:items-center sm:p-6" onClick={onClose}>
      <div role="dialog" aria-label="Flocus" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-t-2xl bg-surface p-5 ring-1 ring-line sm:rounded-2xl">
        <h3 className="font-display text-xl text-text">Flocus</h3>
        <p className="mt-1 text-sm text-muted">Reads this note full screen with everything else out of the way. Add a timer if you want a deep-focus session.</p>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Session length">
          {MINUTES.map((x) => (
            <button key={x} onClick={() => { setM(x); setCustom(''); }} aria-pressed={!custom && m === x} className={`min-h-10 rounded-full px-4 text-sm ring-1 ring-line ${!custom && m === x ? 'bg-accent text-ink' : 'bg-raised text-text'}`}>{x} min</button>
          ))}
          <input value={custom} onChange={(e) => setCustom(e.target.value.replace(/\D/g, '').slice(0, 3))} inputMode="numeric" placeholder="Other" aria-label="Other length in minutes" className="min-h-10 w-20 rounded-full bg-raised px-4 text-sm text-text ring-1 ring-line placeholder:text-muted" />
        </div>
        {earlier > 0 && <p className="mt-3 text-xs text-muted">Focused today: {earlier} min</p>}
        <div className="mt-5 flex flex-wrap gap-2">
          <button onClick={() => onStart(mins)} className="min-h-11 rounded-full bg-accent px-5 text-sm font-semibold text-ink">Start {mins}-minute Flocus</button>
          <button onClick={() => onStart(0)} className="min-h-11 rounded-full bg-raised px-5 text-sm text-text ring-1 ring-line">Full screen, no timer</button>
          <button onClick={onClose} className="min-h-11 rounded-full px-4 text-sm text-muted hover:text-text">Cancel</button>
        </div>
      </div>
    </div>
  );
}

/** The only thing left on screen in focus mode: a small, quiet control corner. */
export function FlocusHud({ f }: { f: ReturnType<typeof useFlocus> }) {
  return (
    <>
      <div className="fixed right-3 top-3 z-[65] flex items-center gap-1 rounded-full bg-surface/80 p-1 pl-3 text-sm text-muted opacity-70 ring-1 ring-line backdrop-blur transition-opacity hover:opacity-100 focus-within:opacity-100 pt-[max(0.25rem,env(safe-area-inset-top))]">
        {f.timer && (
          <>
            <span className="font-mono text-sm tabular-nums text-text" aria-live="off" aria-label={`${mmss(f.timer.left)} left`}>{mmss(f.timer.left)}</span>
            <button onClick={f.toggle} aria-label={f.timer.running ? 'Pause timer' : 'Resume timer'} className="grid h-8 w-8 place-items-center rounded-full hover:bg-raised hover:text-text">
              {f.timer.running ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
            </button>
          </>
        )}
        <button onClick={() => f.leave(true)} aria-label="Leave Flocus" title="Leave Flocus (Esc)" className="flex h-8 items-center gap-1.5 rounded-full px-2.5 hover:bg-raised hover:text-text">
          <X className="h-4 w-4" /> <span className="text-xs">Leave</span>
        </button>
      </div>
      {f.timer && (
        <div aria-hidden className="fixed inset-x-0 top-0 z-[64] h-0.5 bg-line/60">
          <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${((f.timer.total - f.timer.left) / f.timer.total) * 100}%` }} />
        </div>
      )}
      {f.done !== null && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 p-6">
          <div role="dialog" aria-label="Flocus complete" className="w-full max-w-sm rounded-2xl bg-surface p-6 text-center ring-1 ring-line">
            <p className="font-display text-2xl text-text">Well done</p>
            <p className="mt-2 text-sm text-muted">You focused for {f.done} minutes. Stand up, drink some water, rest your eyes for five.</p>
            <div className="mt-5 flex flex-wrap justify-center gap-2">
              <button onClick={() => f.enter(f.done ?? 25)} className="min-h-11 rounded-full bg-accent px-5 text-sm font-semibold text-ink">Another {f.done} min</button>
              <button onClick={() => f.leave(false)} className="min-h-11 rounded-full bg-raised px-5 text-sm text-text ring-1 ring-line">Leave Flocus</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
