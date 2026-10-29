/* Five questions, a "sure or guessing?" before each answer is revealed, and an honest summary at the end. */
import { useMemo, useState } from 'react';
import { ArrowRight, Check, Target, X } from 'lucide-react';
import type { Course, Flashcard, Note } from '../types';
import { buildCheck, isoWeek, saveResult, type CheckResult } from '../services/weeklyCheck';
import { signal } from '../services/signals';
import { Modal, primaryBtn, quietBtn } from './ui';

export function WeeklyCheck({
  course,
  notes,
  onClose,
  onOpenNote,
  onAddCards,
}: {
  course: Course;
  notes: Note[];
  onClose: () => void;
  onOpenNote: (id: string) => void;
  onAddCards: (cards: Flashcard[]) => void;
}) {
  const qs = useMemo(() => buildCheck(course, notes), [course, notes]);
  const [i, setI] = useState(0);
  const [choice, setChoice] = useState<number | null>(null);
  const [sure, setSure] = useState<boolean | null>(null);
  const [log, setLog] = useState<{ right: boolean; sure: boolean }[]>([]);
  const [added, setAdded] = useState(false);
  const q = qs[i];
  const revealed = choice !== null && sure !== null;
  const finished = qs.length > 0 && i >= qs.length;

  const answer = (isSure: boolean) => {
    if (choice === null || !q) return;
    setSure(isSure);
    const right = choice === q.correct;
    setLog((l) => [...l, { right, sure: isSure }]);
    signal(q.note, q.section, right ? 'check_right' : isSure ? 'check_overconfident' : 'check_missed');
  };

  const next = () => {
    if (i + 1 >= qs.length) {
      const res: CheckResult = {
        week: isoWeek(),
        total: qs.length,
        right: log.filter((x) => x.right).length,
        overconfident: qs.filter((_, k) => !log[k].right && log[k].sure).map((x) => ({ noteId: x.note.id, section: x.section, q: x.q })),
        missed: qs.filter((_, k) => !log[k].right).map((x) => ({ noteId: x.note.id, section: x.section, q: x.q })),
      };
      saveResult(course.code, res);
    }
    setI((n) => n + 1);
    setChoice(null);
    setSure(null);
  };

  const addMissed = () => {
    const today = new Date().toISOString().split('T')[0];
    onAddCards(
      qs
        .filter((_, k) => !log[k]?.right)
        .map((x, k) => ({
          id: `wk-${Date.now()}-${k}`,
          noteId: x.note.id,
          courseCode: course.code,
          year: x.note.year,
          front: x.card.front,
          back: x.card.back,
          interval: 1,
          repetition: 0,
          easeFactor: 2.5,
          dueDate: today,
          status: 'new' as const,
        })),
    );
    setAdded(true);
  };

  if (!qs.length) {
    return (
      <Modal title={`Weekly check · ${course.code}`} onClose={onClose}>
        <p className="text-sm text-muted">These notes don't have enough definitions yet to build a fair check. Try Recall instead.</p>
      </Modal>
    );
  }

  return (
    <Modal title={`Weekly check · ${course.code}`} onClose={onClose}>
      {!finished ? (
        <div className="space-y-4">
          <div className="flex items-center gap-1.5" aria-label={`Question ${i + 1} of ${qs.length}`}>
            {qs.map((_, k) => (
              <span key={k} className={`h-1.5 flex-1 rounded-full ${k < log.length ? (log[k].right ? 'bg-accent' : 'bg-warn') : k === i ? 'bg-text/50' : 'bg-raised'}`} />
            ))}
          </div>
          <p className="text-xs text-muted">{q.note.title}</p>
          <p key={q.id} className="animate-slide-up font-display text-xl leading-snug text-text">{q.q}</p>
          <div className="space-y-2" role="radiogroup" aria-label="Choices">
            {q.options.map((o, k) => {
              const isRight = revealed && k === q.correct;
              const isWrong = revealed && k === choice && k !== q.correct;
              return (
                <button
                  key={k}
                  role="radio"
                  aria-checked={choice === k}
                  disabled={revealed}
                  onClick={() => setChoice(k)}
                  className={`flex w-full items-start gap-3 rounded-2xl px-4 py-3 text-left text-sm ring-1 disabled:opacity-100 ${
                    isRight ? 'bg-accent text-ink ring-accent' : isWrong ? 'bg-warn/15 text-text ring-warn' : choice === k ? 'bg-raised text-text ring-2 ring-accent-text' : 'bg-surface text-text ring-edge hover:bg-raised'
                  }`}
                >
                  <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ring-1 ring-current text-[11px] font-semibold">
                    {isRight ? <Check className="h-3 w-3" /> : isWrong ? <X className="h-3 w-3" /> : String.fromCharCode(65 + k)}
                  </span>
                  <span>{o}</span>
                </button>
              );
            })}
          </div>
          {!revealed ? (
            <div className="space-y-2">
              <p className="text-sm text-muted">{choice === null ? 'Pick an answer.' : 'How sure are you?'}</p>
              <div className="flex gap-2">
                <button type="button" disabled={choice === null} onClick={() => answer(true)} className={primaryBtn}>I'm sure</button>
                <button type="button" disabled={choice === null} onClick={() => answer(false)} className={quietBtn}>I'm guessing</button>
              </div>
            </div>
          ) : (
            <div className="animate-slide-up flex flex-wrap items-center justify-between gap-3">
              <p className="text-sm text-text">
                {choice === q.correct ? (sure ? 'Right, and you knew it.' : 'Right, but you were guessing: worth a second look.') : sure ? 'Not this one, though you felt sure. This is the kind worth fixing first.' : 'Not this one. Good that you knew you were unsure.'}
              </p>
              <button type="button" onClick={next} className={primaryBtn}>
                {i + 1 < qs.length ? 'Next' : 'See results'} <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>
      ) : (
        <Summary qs={qs} log={log} added={added} onAdd={addMissed} onOpenNote={(id) => (onClose(), onOpenNote(id))} onClose={onClose} />
      )}
    </Modal>
  );
}

function Summary({
  qs,
  log,
  added,
  onAdd,
  onOpenNote,
  onClose,
}: {
  qs: ReturnType<typeof buildCheck>;
  log: { right: boolean; sure: boolean }[];
  added: boolean;
  onAdd: () => void;
  onOpenNote: (id: string) => void;
  onClose: () => void;
}) {
  const right = log.filter((x) => x.right).length;
  const over = qs.filter((_, k) => !log[k].right && log[k].sure);
  const guessed = qs.filter((_, k) => log[k].right && !log[k].sure);
  const missed = qs.filter((_, k) => !log[k].right);
  return (
    <div className="animate-slide-up space-y-4">
      <div className="flex items-center gap-3">
        <span className="flex h-12 w-12 items-center justify-center rounded-full bg-accent text-ink">
          <Target className="h-6 w-6" />
        </span>
        <div>
          <p className="font-display text-2xl text-text">{right} of {qs.length}</p>
          <p className="text-sm text-muted">{right === qs.length ? 'All right this week.' : 'Here is what to look at before it shows up in a test.'}</p>
        </div>
      </div>
      {over.length > 0 && (
        <div className="rounded-2xl bg-warn/10 p-4 ring-1 ring-warn/50">
          <p className="font-semibold text-text">Weaker than you think</p>
          <p className="mb-2 text-sm text-muted">You felt sure about these and got them wrong.</p>
          <ul className="space-y-1.5">
            {over.map((x) => (
              <li key={x.id}>
                <button onClick={() => onOpenNote(x.note.id)} className="text-left text-sm text-text underline-offset-2 hover:underline">
                  {x.section && x.section !== x.note.title ? (
                    <>
                      {x.section} <span className="text-muted">· {x.note.title}</span>
                    </>
                  ) : (
                    x.note.title
                  )}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {guessed.length > 0 && (
        <p className="text-sm text-muted">
          Right but guessed: {guessed.map((x) => x.section ?? x.note.title).join(', ')}. Worth a quick reread.
        </p>
      )}
      <div className="flex flex-wrap gap-2">
        {missed.length > 0 && (
          <button type="button" disabled={added} onClick={onAdd} className={primaryBtn}>
            {added ? `Added ${missed.length} to Recall` : `Add the ${missed.length} I missed to Recall`}
          </button>
        )}
        <button type="button" onClick={onClose} className={quietBtn}>Done</button>
      </div>
    </div>
  );
}
