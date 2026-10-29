/* Asking once, plainly, whether a student will share anonymous totals with their lecturers; and the switch in Settings. */
import { Users } from 'lucide-react';
import { setConsent, useConsent } from '../services/signals';
import { labelCls, primaryBtn, quietBtn } from './ui';

const WHAT =
  "Only counts, per topic in your university's course notes: which topics people asked about, said they were lost on, or missed in a check. Never your name, your questions, your answers or your own notes, and a topic is only shown once 3 or more students have a count there.";

export function ShareAsk() {
  const consent = useConsent();
  if (consent !== null) return null;
  return (
    <section className="glass animate-slide-up rounded-[24px] p-4 ring-1 ring-line/80 sm:p-5" aria-label="Help your lecturers see where the class is stuck">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-raised text-accent ring-1 ring-line">
          <Users aria-hidden className="h-5 w-5" />
        </span>
        <div className="min-w-0 space-y-2">
          <p className="font-display text-lg text-text">Let your lecturers see where the class is stuck?</p>
          <p className="text-sm text-muted">{WHAT}</p>
          <div className="flex flex-wrap gap-2 pt-1">
            <button type="button" onClick={() => setConsent('yes')} className={primaryBtn}>Share anonymous totals</button>
            <button type="button" onClick={() => setConsent('no')} className={quietBtn}>No thanks</button>
          </div>
          <p className="text-xs text-muted">You can change this any time in Settings.</p>
        </div>
      </div>
    </section>
  );
}

export function ShareToggle() {
  const on = useConsent() === 'yes';
  return (
    <section className="space-y-2 border-t border-line pt-4" aria-label="Share anonymous totals with lecturers">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className={labelCls}>Share anonymous totals with lecturers</p>
          <p className="text-sm text-muted">{WHAT}</p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Share anonymous totals with lecturers"
          onClick={() => setConsent(on ? 'no' : 'yes')}
          className={`relative h-7 w-12 shrink-0 rounded-full ring-1 transition-colors ${on ? 'bg-accent ring-accent' : 'bg-raised ring-edge'}`}
        >
          <span className={`absolute top-1 h-5 w-5 rounded-full transition-transform duration-200 ${on ? 'translate-x-6 bg-ink' : 'translate-x-1 bg-muted'}`} style={{ left: 0 }} />
        </button>
      </div>
    </section>
  );
}
