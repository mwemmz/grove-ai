/* The listening controls at the bottom of a note. In tutor mode they also hold the conversation:
   the student can answer by voice or typing, ask something, or ask for it again, simpler, or with an example. */
import { useEffect, useState } from 'react';
import { Mic, Pause, Play, Send, SkipBack, SkipForward, X } from 'lucide-react';
import { NATURAL_VOICES, deviceVoices, setRate, setVoice, skip, stop, switchMode, toggle, tutorNext, tutorSay, useListen, voiceSettings } from '../services/readAloud';
import { canHear, hearOnce, stopHearing, tutorAvailable } from '../services/tutor';

const RATES = [0.8, 1, 1.2, 1.5];
const chip = 'min-h-9 shrink-0 rounded-full bg-raised px-3 text-xs text-text ring-1 ring-line hover:ring-accent-text disabled:opacity-50';

export function ListenBar() {
  const s = useListen();
  const [text, setText] = useState('');
  const [hearing, setHearing] = useState(false);
  const [, bump] = useState(0);
  useEffect(() => {
    // Browsers load their voice list a moment after the page opens.
    const f = () => bump((n) => n + 1);
    try {
      speechSynthesis.addEventListener('voiceschanged', f);
      return () => speechSynthesis.removeEventListener('voiceschanged', f);
    } catch {
      return undefined;
    }
  }, []);
  if (!s.active) return null;
  const vs = voiceSettings();
  const rate = vs.rate;
  const phone = deviceVoices();
  const current = vs.mode === 'natural' ? `n:${vs.voice}` : `d:${vs.deviceVoice || phone[0]?.name || ''}`;
  const asking = s.waiting || s.busy;

  const send = (kind: 'answer' | 'ask') => {
    const t = text.trim();
    if (!t) return;
    setText('');
    void tutorSay(kind, t);
  };
  const speak = async () => {
    if (hearing) return stopHearing();
    setHearing(true);
    stopHearing();
    const said = await hearOnce();
    setHearing(false);
    if (said) void tutorSay(s.question ? 'answer' : 'ask', said);
  };

  return (
    <div role="region" aria-label={s.tutor ? 'Tutor' : 'Reading aloud'} className="glass-strong animate-slide-up absolute inset-x-3 bottom-[max(0.75rem,env(safe-area-inset-bottom))] z-10 mx-auto max-w-2xl rounded-[24px] px-3 py-2.5 shadow-2xl ring-1 ring-line sm:inset-x-6">
      {s.tutor && (s.caption || s.question) && (
        <p className="mb-2 line-clamp-3 px-2 text-sm leading-6 text-text" aria-live="polite">
          {s.waiting && s.question ? s.question : s.caption}
        </p>
      )}
      <div className="flex items-center gap-2">
        <button onClick={() => skip(-1)} aria-label="Previous section" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-text">
          <SkipBack aria-hidden className="h-4 w-4" />
        </button>
        <button onClick={toggle} disabled={asking} aria-label={s.playing ? 'Pause' : 'Play'} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-accent text-ink disabled:opacity-40">
          {s.playing ? <Pause aria-hidden className="h-5 w-5" /> : <Play aria-hidden className="h-5 w-5" />}
        </button>
        <button onClick={() => (s.tutor ? tutorNext() : skip(1))} aria-label="Next section" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-text">
          <SkipForward aria-hidden className="h-4 w-4" />
        </button>
        <div className="min-w-0 flex-1 px-1">
          <p className="truncate text-sm text-text">{s.sectionTitle}</p>
          <p className="truncate text-xs text-muted" aria-live="polite">
            {s.status ?? `${s.tutor ? 'Tutor · ' : ''}Section ${s.section + 1} of ${s.total}${s.usingFallback ? " · phone's voice (natural voice not available)" : ''}`}
          </p>
        </div>
        <select
          aria-label="Voice"
          value={current}
          onChange={(e) => {
            const [k, ...r] = e.target.value.split(':');
            const v = r.join(':');
            if (k === 'n') setVoice({ mode: 'natural', voice: v });
            else setVoice({ mode: 'device', deviceVoice: v });
          }}
          className="h-9 w-28 shrink-0 rounded-full bg-raised px-2 text-xs text-text ring-1 ring-line focus:outline-none sm:w-36"
        >
          <optgroup label="Natural (downloads once)">
            {NATURAL_VOICES.map((v) => <option key={v.id} value={`n:${v.id}`}>{v.label.replace(/ \(.*\)/, '')}</option>)}
          </optgroup>
          {phone.length > 0 && (
            <optgroup label="This device">
              {phone.map((v) => <option key={v.name} value={`d:${v.name}`}>{v.name.replace(/^Microsoft /, '').replace(/ - .*$/, '')}</option>)}
            </optgroup>
          )}
        </select>
        <select aria-label="Reading speed" value={rate} onChange={(e) => setRate(Number(e.target.value))} className="h-9 shrink-0 rounded-full bg-raised px-2 text-xs text-text ring-1 ring-line focus:outline-none">
          {RATES.map((r) => <option key={r} value={r}>{r}×</option>)}
        </select>
        <button onClick={stop} aria-label="Stop" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-text">
          <X aria-hidden className="h-4 w-4" />
        </button>
      </div>

      {s.tutor && (
        <div className="mt-2 space-y-2 border-t border-line pt-2">
          <div className="flex gap-2 overflow-x-auto">
            <button className={chip} disabled={s.busy} onClick={() => void tutorSay('again')}>Explain again</button>
            <button className={chip} disabled={s.busy} onClick={() => void tutorSay('simpler')}>Make it simpler</button>
            <button className={chip} disabled={s.busy} onClick={() => void tutorSay('example')}>Give an example</button>
            <button className={`${chip} bg-accent text-ink`} disabled={s.busy} onClick={tutorNext}>Next</button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              send(s.waiting && s.question ? 'answer' : 'ask');
            }}
            className="flex items-center gap-2"
          >
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              onFocus={() => s.playing && toggle()}
              disabled={s.busy}
              aria-label={s.question ? 'Your answer' : 'Ask the tutor'}
              placeholder={s.waiting && s.question ? 'Type your answer…' : 'Ask the tutor a question…'}
              className="h-10 min-w-0 flex-1 rounded-full bg-bg/80 px-4 text-sm text-text ring-1 ring-line focus:outline-none focus:ring-accent-text"
            />
            {canHear() && (
              <button type="button" onClick={() => void speak()} disabled={s.busy} aria-label={hearing ? 'Stop listening' : 'Answer by voice'} aria-pressed={hearing} className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ring-1 ring-line ${hearing ? 'bg-accent text-ink' : 'bg-raised text-text'}`}>
                <Mic aria-hidden className="h-4 w-4" />
              </button>
            )}
            <button type="submit" disabled={s.busy || !text.trim()} aria-label="Send" className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-accent text-ink disabled:opacity-40">
              <Send aria-hidden className="h-4 w-4" />
            </button>
          </form>
          <button onClick={switchMode} className="text-xs text-muted underline-offset-2 hover:underline">Just read the notes as written</button>
        </div>
      )}
      {!s.tutor && tutorAvailableHint()}
    </div>
  );
}

function tutorAvailableHint() {
  return tutorAvailable() ? (
    <button onClick={switchMode} className="mt-1 px-2 text-xs text-muted underline-offset-2 hover:underline">Have a tutor explain it instead</button>
  ) : null;
}
