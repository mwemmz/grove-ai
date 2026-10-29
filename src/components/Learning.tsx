/* Two habits that make help stick: have a go before seeing the answer, and check yourself after it.
   Students in our pilot said that after AI help they often couldn't do the same task alone; these are the counterweight. */
import { useState } from 'react';
import { CheckCircle2, Lightbulb, PenLine, RotateCcw } from 'lucide-react';
import { primaryBtn, quietBtn } from './ui';

/** Shown instead of the answer to a problem-style question: a hint from the notes and a place for the student's attempt. */
export function TryFirst({
  question,
  hint,
  onAttempt,
  onSkip,
  compact = false,
}: {
  question: string;
  hint?: string | null;
  onAttempt: (attempt: string) => void;
  onSkip: () => void;
  compact?: boolean;
}) {
  const [attempt, setAttempt] = useState('');
  return (
    <div className={`animate-slide-up space-y-3 rounded-[22px] bg-raised/60 ring-1 ring-line ${compact ? 'p-3' : 'p-4'}`}>
      <div className="flex items-start gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent text-ink">
          <PenLine className="h-4 w-4" />
        </span>
        <div className="min-w-0">
          <p className="font-display text-lg leading-snug text-text">Have a go first</p>
          <p className="text-sm text-muted">Try it yourself, even roughly. Grove checks your attempt, then shows the full working. You remember it far better this way.</p>
        </div>
      </div>
      <p className="rounded-xl bg-bg/60 px-3 py-2 text-sm text-text ring-1 ring-line">{question}</p>
      {hint && (
        <p className="flex items-start gap-2 text-sm text-text">
          <Lightbulb aria-hidden className="mt-0.5 h-4 w-4 shrink-0 text-accent-text" />
          <span>
            <span className="font-semibold">Hint: </span>
            {hint}
          </span>
        </p>
      )}
      <textarea
        value={attempt}
        onChange={(e) => setAttempt(e.target.value)}
        rows={compact ? 3 : 4}
        placeholder="Your working, your answer, or what you think the first step is"
        aria-label="Your attempt"
        className="w-full resize-y rounded-2xl bg-bg/80 px-4 py-2.5 text-sm text-text ring-1 ring-edge placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-accent-text"
      />
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" disabled={!attempt.trim()} onClick={() => onAttempt(attempt.trim())} className={primaryBtn}>
          Check my attempt
        </button>
        <button type="button" onClick={onSkip} className={quietBtn}>
          Just show me
        </button>
      </div>
    </div>
  );
}

/** After an answer: one question from that part of the notes, with the answer behind a tap. */
export function CheckYourself({
  check,
  onResult,
  compact = false,
}: {
  check: { q: string; a: string[] };
  onResult?: (gotIt: boolean) => void;
  compact?: boolean;
}) {
  const [shown, setShown] = useState(false);
  const [done, setDone] = useState<null | boolean>(null);
  return (
    <div className={`rounded-[20px] ring-1 ring-line ${compact ? 'p-3' : 'p-4'} bg-surface/60`}>
      <p className="font-mono text-[11px] uppercase tracking-[0.08em] text-accent-text">Check yourself</p>
      <p className="mt-1 text-[15px] text-text">{check.q}</p>
      {!shown ? (
        <button type="button" onClick={() => setShown(true)} className={`${quietBtn} mt-3 !min-h-9`}>
          Show the answer
        </button>
      ) : (
        <div className="animate-slide-up mt-3 space-y-3">
          <ul className="list-disc space-y-1 pl-5 text-sm text-text marker:text-accent-text">
            {check.a.map((x, i) => (
              <li key={i}>{x}</li>
            ))}
          </ul>
          {done === null ? (
            <div className="flex flex-wrap gap-2">
              <button type="button" onClick={() => (setDone(true), onResult?.(true))} className={`${quietBtn} !min-h-9`}>
                <CheckCircle2 className="h-4 w-4" /> I got it
              </button>
              <button type="button" onClick={() => (setDone(false), onResult?.(false))} className={`${quietBtn} !min-h-9`}>
                <RotateCcw className="h-4 w-4" /> Not yet
              </button>
            </div>
          ) : (
            <p className="text-sm text-muted">{done ? 'Nice. It will come back in Recall later to keep it fresh.' : 'Read that part of the note again, then ask about the bit that is unclear.'}</p>
          )}
        </div>
      )}
    </div>
  );
}
