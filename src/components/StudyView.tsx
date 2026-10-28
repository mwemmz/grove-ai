import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Check } from 'lucide-react';
import { Note, Course, Flashcard } from '../types';
import { STUDY_METHODS, METHOD_BY_ID, MethodId, StudyMethod } from '../data/studyMethods';
import { studyStore, StudySession } from '../services/studyStore';
import { coverage, keyPoints, longSentences } from '../lib/textUtil';
import { Disclosure, Segmented, field, labelCls, panel, primaryBtn, quietBtn, chip, Inline } from './ui';

export interface StudyPreset {
  methodId?: MethodId;
  courseId?: string;
  topicName?: string;
}

interface StudyViewProps {
  notes: Note[];
  courses: Course[];
  flashcards: Flashcard[];
  setFlashcards: React.Dispatch<React.SetStateAction<Flashcard[]>>;
  /** Read once when the tab opens, e.g. from a timetable block. */
  preset: StudyPreset | null;
}

type Stage = 'setup' | 'run' | 'done';

const LENGTHS = ['15', '25', '45', '60'] as const;
type Length = (typeof LENGTHS)[number];

function lengthFor(m: StudyMethod): Length {
  return m.defaultMinutes >= 40 ? '45' : m.defaultMinutes >= 25 ? '25' : '15';
}

function resolvePreset(preset: StudyPreset | null, notes: Note[]) {
  let noteId = notes[0]?.id ?? '';
  let customTopic = '';
  let methodId: MethodId = 'blurting';
  let length: Length = '25';
  if (preset?.methodId) {
    methodId = preset.methodId;
    length = lengthFor(METHOD_BY_ID[methodId]);
  }
  if (preset) {
    const lower = preset.topicName?.toLowerCase();
    const match =
      notes.find((n) => lower && n.title.toLowerCase() === lower) ??
      notes.find((n) => preset.courseId && n.courseId === preset.courseId);
    if (match) noteId = match.id;
    else if (preset.topicName) {
      noteId = '__custom';
      customTopic = preset.topicName;
    }
  }
  return { noteId, customTopic, methodId, length };
}

const evidenceTone: Record<StudyMethod['evidence'], string> = {
  Strong: 'text-accent-text',
  Good: 'text-text',
  Mixed: 'text-warn',
};

function mmss(totalSeconds: number): string {
  const s = Math.max(0, Math.round(totalSeconds));
  return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
}

/** Re-renders every second while mounted. Uses wall-clock time so a throttled tab stays correct. */
function useNow(active: boolean): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [active]);
  return now;
}

/* ------------------------------------------------------------------ runners */

interface RunnerProps {
  note: Note | null;
  topic: string;
  notes: Note[];
  flashcards: Flashcard[];
  setFlashcards: React.Dispatch<React.SetStateAction<Flashcard[]>>;
  onComplete: (score?: number) => void;
}

function NoteText({ note }: { note: Note }) {
  return (
    <div className="max-h-72 space-y-3 overflow-y-auto rounded-md bg-bg p-4 text-[15px] leading-7 ring-1 ring-line">
      {note.content
        .split('\n\n')
        .filter((p) => !p.startsWith('```'))
        .map((p, i) => (
          <p key={i} className="whitespace-pre-wrap">
            <Inline text={p.replace(/^#+\s/, '')} />
          </p>
        ))}
    </div>
  );
}

function PointChecklist({
  points,
  checked,
  onToggle,
}: {
  points: string[];
  checked: boolean[];
  onToggle: (i: number) => void;
}) {
  return (
    <ul className="divide-y divide-line">
      {points.map((p, i) => (
        <li key={i}>
          <label className="flex min-h-11 cursor-pointer items-start gap-3 py-2.5">
            <input
              type="checkbox"
              checked={checked[i] ?? false}
              onChange={() => onToggle(i)}
              className="mt-1 h-4 w-4 accent-[var(--color-accent)]"
            />
            <span className={checked[i] ? 'text-text' : 'text-muted'}>{p}</span>
          </label>
        </li>
      ))}
    </ul>
  );
}

function BlurtRunner({ note, setFlashcards, onComplete }: RunnerProps) {
  const [phase, setPhase] = useState<'read' | 'write' | 'compare'>('read');
  const [text, setText] = useState('');
  const points = useMemo(() => (note ? keyPoints(note) : []), [note]);
  const [checked, setChecked] = useState<boolean[]>([]);
  const [added, setAdded] = useState(0);

  const compare = () => {
    setChecked(points.map((p) => coverage(p, text) >= 0.5));
    setPhase('compare');
  };

  const gaps = points.filter((_, i) => !checked[i]);
  const score = points.length ? Math.round(((points.length - gaps.length) / points.length) * 100) : undefined;

  const makeCards = () => {
    if (!note) return;
    const fresh: Flashcard[] = gaps.map((g, i) => ({
      id: `fc-blurt-${Date.now()}-${i}`,
      noteId: note.id,
      courseCode: '',
      year: note.year,
      front: `From "${note.title}": recall this key point.`,
      back: g,
      interval: 1,
      repetition: 0,
      easeFactor: 2.5,
      dueDate: new Date().toISOString().slice(0, 10),
      status: 'new',
    }));
    setFlashcards((prev) => [...prev, ...fresh]);
    setAdded(fresh.length);
  };

  if (!note) {
    return (
      <div className="space-y-3">
        <p className="text-muted">Write what you remember about {`"`}the topic{`"`} without looking anything up. Then check it against your own notes.</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} className={`${field} resize-y`} placeholder="Everything you remember…" />
        <button className={primaryBtn} onClick={() => onComplete()}>Finish</button>
      </div>
    );
  }

  if (phase === 'read') {
    return (
      <div className="space-y-3">
        <p className="text-muted">Read your note. When you feel ready, hide it and write everything you remember.</p>
        <NoteText note={note} />
        <button className={primaryBtn} onClick={() => setPhase('write')}>Hide note and start writing</button>
      </div>
    );
  }

  if (phase === 'write') {
    return (
      <div className="space-y-3">
        <label htmlFor="blurt" className={labelCls}>Write everything you remember about {note.title}. No peeking.</label>
        <textarea id="blurt" autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={10} className={`${field} resize-y`} placeholder="Definitions, steps, examples, formulas…" />
        <button className={primaryBtn} disabled={text.trim().length < 10} onClick={compare}>Compare with my note</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <p className="font-mono text-xs uppercase tracking-wider text-accent">
          {score !== undefined ? `You covered ${points.length - gaps.length} of ${points.length} key points` : 'Compare'}
        </p>
        <p className="mt-1 text-sm text-muted">
          Grove ticked the points your text seems to cover. Fix any it got wrong. This check looks for matching words, so it cannot tell if a sentence is wrong. Read your answer against the note.
        </p>
      </div>
      <PointChecklist points={points} checked={checked} onToggle={(i) => setChecked((c) => c.map((v, j) => (j === i ? !v : v)))} />
      <Disclosure summary="Show my note again">
        <NoteText note={note} />
      </Disclosure>
      <div className="flex flex-wrap items-center gap-3">
        {gaps.length > 0 && added === 0 && (
          <button className={quietBtn} onClick={makeCards}>Turn {gaps.length} {gaps.length === 1 ? 'gap' : 'gaps'} into flashcards</button>
        )}
        {added > 0 && <span className="text-sm text-accent" role="status"><Check className="mr-1 inline h-4 w-4" />Added {added} flashcards to Recall</span>}
        <button className={primaryBtn} onClick={() => onComplete(score)}>Finish session</button>
      </div>
    </div>
  );
}

function FeynmanRunner({ note, onComplete }: RunnerProps) {
  const [text, setText] = useState('');
  const [again, setAgain] = useState('');
  const [phase, setPhase] = useState<'write' | 'check' | 'again'>('write');
  const points = useMemo(() => (note ? keyPoints(note) : []), [note]);
  const missing = points.filter((p) => coverage(p, text) < 0.5);
  const covered = points.length - missing.length;
  const long = longSentences(text);
  const termsUsed = note
    ? note.tags.filter((t) => t.length > 2 && new RegExp(`(^|[^a-z0-9])${t.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`).test(text.toLowerCase()))
    : [];

  const followUps = [
    ...missing.slice(0, 3).map((m) => `You did not cover this: "${m}" Why is it true?`),
    ...(missing.length === 0 ? ['What would break if the main idea were removed?', 'Where would this approach fail, and why?'] : []),
  ];

  const finalText = phase === 'again' && again.trim() ? again : text;
  const score = points.length
    ? Math.round(((points.length - points.filter((p) => coverage(p, finalText) < 0.5).length) / points.length) * 100)
    : undefined;

  if (phase === 'write') {
    return (
      <div className="space-y-3">
        <label htmlFor="feyn" className={labelCls}>Explain {note ? note.title : 'the topic'} to a first-year student, in plain words</label>
        <textarea id="feyn" autoFocus value={text} onChange={(e) => setText(e.target.value)} rows={9} className={`${field} resize-y`} placeholder="Pretend they know nothing yet. Avoid jargon you could not explain." />
        <button className={primaryBtn} disabled={text.trim().length < 20} onClick={() => setPhase('check')}>Check my explanation</button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {points.length > 0 ? (
        <p className="font-mono text-xs uppercase tracking-wider text-accent">You covered {covered} of {points.length} key points</p>
      ) : (
        <p className="text-muted">No notes to compare against. Read your explanation aloud and mark where you stumbled.</p>
      )}

      {missing.length > 0 && (
        <div>
          <p className="text-sm font-medium text-text">Gaps to fix</p>
          <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
            {missing.map((m, i) => <li key={i}>{m}</li>)}
          </ul>
        </div>
      )}
      {long.length > 0 && (
        <p className="text-sm text-muted">{long.length === 1 ? 'One sentence is' : `${long.length} sentences are`} very long. Try splitting {long.length === 1 ? 'it' : 'them'} into shorter steps.</p>
      )}
      {termsUsed.length > 0 && <p className="text-sm text-muted">Key terms you used: {termsUsed.join(', ')}.</p>}

      <div>
        <p className="text-sm font-medium text-text">Questions to answer out loud</p>
        <ul className="mt-1 list-disc space-y-1 pl-5 text-muted">
          {followUps.map((q, i) => <li key={i}>{q}</li>)}
        </ul>
      </div>

      {note && (
        <Disclosure summary="Open my note to fix the gaps">
          <NoteText note={note} />
        </Disclosure>
      )}

      {phase === 'check' ? (
        <div className="flex flex-wrap gap-3">
          <button className={primaryBtn} onClick={() => setPhase('again')}>Explain it again, simpler</button>
          <button className={quietBtn} onClick={() => onComplete(score)}>Finish session</button>
        </div>
      ) : (
        <div className="space-y-3">
          <label htmlFor="feyn2" className={labelCls}>Second try: shorter and simpler</label>
          <textarea id="feyn2" autoFocus value={again} onChange={(e) => setAgain(e.target.value)} rows={6} className={`${field} resize-y`} />
          <button className={primaryBtn} onClick={() => onComplete(score)}>Finish session</button>
        </div>
      )}
    </div>
  );
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function RecallRunner({ note, flashcards, onComplete, mixed }: RunnerProps & { mixed: boolean }) {
  const deck = useMemo(() => {
    let cards: { front: string; back: string }[];
    if (mixed || !note) {
      cards = shuffle(flashcards).slice(0, 10);
    } else {
      const own = flashcards.filter((f) => f.noteId === note.id);
      const sameYear = flashcards.filter((f) => f.noteId !== note.id && f.year === note.year);
      cards = [...own, ...shuffle(sameYear)].slice(0, 10);
      if (cards.length < 3) {
        cards = [...cards, ...keyPoints(note, 5).map((p) => ({ front: `Recall a key point from "${note.title}".`, back: p }))].slice(0, 10);
      }
    }
    return cards;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [note?.id, mixed]);
  const [i, setI] = useState(0);
  const [shown, setShown] = useState(false);
  const [got, setGot] = useState(0);
  const total = deck.length;

  if (total === 0) {
    return (
      <div className="space-y-3">
        <p className="text-muted">There are no flashcards yet. Try blurting on a note first, then turn the gaps into cards.</p>
        <button className={primaryBtn} onClick={() => onComplete()}>Close</button>
      </div>
    );
  }

  const answer = (ok: boolean) => {
    const nextGot = got + (ok ? 1 : 0);
    if (i + 1 >= total) {
      onComplete(Math.round((nextGot / total) * 100));
      return;
    }
    setGot(nextGot);
    setI(i + 1);
    setShown(false);
  };

  const card = deck[i];
  return (
    <div className="space-y-4">
      <p className="font-mono text-xs text-muted">Card {i + 1} of {total}</p>
      <p className="text-lg leading-8 text-text"><Inline text={card.front} /></p>
      {shown ? (
        <>
          <div className="rounded-md bg-bg p-4 leading-7 text-text ring-1 ring-line"><Inline text={card.back} /></div>
          <div className="flex gap-3">
            <button className={primaryBtn} onClick={() => answer(true)}>Got it</button>
            <button className={quietBtn} onClick={() => answer(false)}>Missed</button>
          </div>
        </>
      ) : (
        <button className={primaryBtn} onClick={() => setShown(true)}>Show answer</button>
      )}
    </div>
  );
}

function GuidedRunner({ method, note, topic, onComplete }: RunnerProps & { method: StudyMethod }) {
  const steps = method.guide ?? [];
  const [i, setI] = useState(0);
  const step = steps[i];
  const last = i === steps.length - 1;
  return (
    <div className="space-y-4">
      <ol className="flex flex-wrap gap-1.5" aria-label="Steps">
        {steps.map((s, idx) => (
          <li
            key={s.title}
            aria-current={idx === i ? 'step' : undefined}
            className={`rounded-full px-3 py-1 font-mono text-xs ${idx === i ? 'bg-accent text-ink' : idx < i ? 'bg-raised text-text' : 'text-muted ring-1 ring-line'}`}
          >
            {idx + 1}. {s.title}
          </li>
        ))}
      </ol>
      <p className="text-lg leading-8 text-text">{step.prompt.replace('{topic}', topic)}</p>
      {note && (
        <Disclosure summary="Open my note">
          <NoteText note={note} />
        </Disclosure>
      )}
      <div className="flex flex-wrap gap-3">
        {i > 0 && <button className={quietBtn} onClick={() => setI(i - 1)}>Back</button>}
        {last ? (
          <button className={primaryBtn} onClick={() => onComplete()}>Finish session</button>
        ) : (
          <button className={primaryBtn} onClick={() => setI(i + 1)}>Next step</button>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ main view */

export const StudyView: React.FC<StudyViewProps> = ({ notes, courses, flashcards, setFlashcards, preset }) => {
  const [init] = useState(() => resolvePreset(preset, notes));
  const [stage, setStage] = useState<Stage>('setup');
  const [sessions, setSessions] = useState<StudySession[]>(() => studyStore.getSessions());
  const [noteId, setNoteId] = useState(init.noteId);
  const [customTopic, setCustomTopic] = useState(init.customTopic);
  const [methodId, setMethodId] = useState<MethodId>(init.methodId);
  const [allMethods, setAllMethods] = useState(false);
  const [length, setLength] = useState<Length>(init.length);
  const [startedAt, setStartedAt] = useState(0);
  const [endAt, setEndAt] = useState(0);
  const [lastResult, setLastResult] = useState<StudySession | null>(null);
  const [breakEnd, setBreakEnd] = useState<number | null>(null);
  const topRef = useRef<HTMLDivElement>(null);

  const note = noteId === '__custom' ? null : notes.find((n) => n.id === noteId) ?? null;
  const topic = note ? note.title : customTopic.trim() || 'your topic';
  const method = METHOD_BY_ID[methodId];
  const running = stage === 'run' || breakEnd !== null;
  const now = useNow(running);

  const stats = useMemo(() => {
    const by = new Map<MethodId, { n: number; minutes: number; scores: number[] }>();
    for (const s of sessions) {
      const e = by.get(s.methodId) ?? { n: 0, minutes: 0, scores: [] };
      e.n += 1;
      e.minutes += s.actualMinutes;
      if (typeof s.score === 'number') e.scores.push(s.score);
      by.set(s.methodId, e);
    }
    return [...by.entries()]
      .map(([id, e]) => ({ id, n: e.n, minutes: e.minutes, avg: e.scores.length ? Math.round(e.scores.reduce((a, b) => a + b, 0) / e.scores.length) : null }))
      .sort((a, b) => b.n - a.n);
  }, [sessions]);

  const best = stats.filter((s) => s.avg !== null && s.n >= 2).sort((a, b) => (b.avg ?? 0) - (a.avg ?? 0))[0];

  const start = () => {
    const t = Date.now();
    setStartedAt(t);
    setEndAt(t + Number(length) * 60000);
    setStage('run');
    topRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const complete = (score?: number) => {
    const minutes = Math.max(1, Math.round((Date.now() - startedAt) / 60000));
    const s: StudySession = {
      id: `ss-${Date.now()}`,
      date: new Date().toISOString(),
      methodId,
      topic,
      courseCode: note ? courses.find((c) => c.id === note.courseId)?.code : undefined,
      plannedMinutes: Number(length),
      actualMinutes: minutes,
      score,
    };
    setSessions(studyStore.addSession(s));
    setLastResult(s);
    setStage('done');
  };

  const runnerProps: RunnerProps = { note, topic, notes, flashcards, setFlashcards, onComplete: complete };
  const remaining = (endAt - now) / 1000;

  return (
    <div className="space-y-5" ref={topRef}>
      {stage === 'setup' && (
        <>
          <section className={`${panel} space-y-5`} aria-label="Start a study session">
            <div>
              <h2 className="text-xl text-text">Start a study session</h2>
              <p className="mt-1 text-muted">Pick what you are studying and how. Grove guides you through the method and times the session.</p>
            </div>

            <div>
              <label htmlFor="s-topic" className={labelCls}>1. What are you studying?</label>
              <select id="s-topic" value={noteId} onChange={(e) => setNoteId(e.target.value)} className={field}>
                {courses.map((c) => {
                  const list = notes.filter((n) => n.courseId === c.id);
                  if (!list.length) return null;
                  return (
                    <optgroup key={c.id} label={`Year ${c.year} · ${c.code} ${c.name}`}>
                      {list.map((n) => (
                        <option key={n.id} value={n.id}>{n.title}</option>
                      ))}
                    </optgroup>
                  );
                })}
                <option value="__custom">Something else (type it)</option>
              </select>
              {noteId === '__custom' && (
                <input type="text" value={customTopic} onChange={(e) => setCustomTopic(e.target.value)} placeholder="e.g. Chapter 4: Normalisation" className={`${field} mt-2`} aria-label="Topic name" />
              )}
            </div>

            <div>
              <p className={labelCls}>2. Choose a method</p>
              {best && (
                <p className="mb-2 text-sm text-muted">
                  So far {METHOD_BY_ID[best.id].name} has your best scores ({best.avg}% over {best.n} sessions).
                </p>
              )}
              <div role="radiogroup" aria-label="Study method" className="grid gap-2 sm:grid-cols-2">
                {(allMethods ? STUDY_METHODS : STUDY_METHODS.filter((m) => m.evidence === 'Strong' || m.id === methodId)).map((m) => {
                  const active = m.id === methodId;
                  return (
                    <button
                      key={m.id}
                      role="radio"
                      aria-checked={active}
                      onClick={() => {
                        setMethodId(m.id);
                        setLength(lengthFor(m));
                      }}
                      className={`rounded-2xl px-4 py-3 text-left transition-colors ${active ? 'bg-surface ring-2 ring-accent' : 'bg-bg ring-1 ring-line hover:bg-raised'}`}
                    >
                      <span className="flex items-baseline justify-between gap-2">
                        <span className="font-medium text-text">{m.name}</span>
                        <span className={`font-mono text-[11px] ${evidenceTone[m.evidence]}`}>{m.evidence}</span>
                      </span>
                      <span className="mt-0.5 block text-sm text-muted">{m.tagline}</span>
                    </button>
                  );
                })}
              </div>
              <button type="button" onClick={() => setAllMethods((v) => !v)} className="mt-2 min-h-9 text-sm text-accent hover:underline">
                {allMethods ? 'Show the top methods only' : `Show all ${STUDY_METHODS.length} methods`}
              </button>
              <div className="mt-3 rounded-md bg-bg p-4 ring-1 ring-line">
                <p className="text-sm text-muted">Best for: <span className="text-text">{method.bestFor}</span></p>
                <ol className="mt-2 flex flex-wrap gap-1.5 text-xs">
                  {method.steps.map((s, i) => (
                    <li key={s} className={chip}>{i + 1}. {s}</li>
                  ))}
                </ol>
                {method.id === 'interleaving' && <p className="mt-2 text-sm text-muted">This one ignores the topic above and mixes cards from all your notes.</p>}
              </div>
            </div>

            <div>
              <p className={labelCls}>3. How long?</p>
              <div className="flex flex-wrap items-center gap-3">
                <Segmented
                  label="Session length in minutes"
                  value={length}
                  onChange={setLength}
                  options={LENGTHS.map((l) => ({ id: l, label: `${l} min` }))}
                />
                <span className="text-sm text-muted">Then a 5 minute break.</span>
              </div>
            </div>

            <button className={primaryBtn} onClick={start} disabled={noteId === '__custom' && !customTopic.trim() && method.runner !== 'recall'}>
              Start session
            </button>
          </section>

          <section className={panel} aria-label="Your sessions">
            <h3 className="text-[17px] text-text">Your sessions</h3>
            {sessions.length === 0 ? (
              <p className="mt-2 text-muted">Nothing yet. Finish a session and Grove starts tracking which methods work for you.</p>
            ) : (
              <>
                <p className="mt-1 text-sm text-muted">Scores come from recall, blurting and Feynman sessions. More sessions make the comparison more trustworthy.</p>
                <div className="mt-3 overflow-x-auto">
                  <table className="w-full min-w-[420px] text-left text-sm">
                    <thead className="font-mono text-xs uppercase tracking-wider text-muted">
                      <tr><th className="pb-2 font-normal">Method</th><th className="pb-2 font-normal">Sessions</th><th className="pb-2 font-normal">Minutes</th><th className="pb-2 font-normal">Avg score</th></tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {stats.map((s) => (
                        <tr key={s.id}><td className="py-2 text-text">{METHOD_BY_ID[s.id].name}</td><td>{s.n}</td><td>{s.minutes}</td><td>{s.avg === null ? 'n/a' : `${s.avg}%`}</td></tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <div className="mt-4">
                  <Disclosure summary={`Recent sessions (${Math.min(sessions.length, 8)})`}>
                    <ul className="divide-y divide-line">
                      {sessions.slice(0, 8).map((s) => (
                        <li key={s.id} className="flex flex-wrap items-baseline justify-between gap-2 py-2.5">
                          <span className="text-text">{s.topic}</span>
                          <span className="font-mono text-xs text-muted">
                            {METHOD_BY_ID[s.methodId].name} · {s.actualMinutes} min{typeof s.score === 'number' ? ` · ${s.score}%` : ''} · {new Date(s.date).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </Disclosure>
                </div>
              </>
            )}
          </section>
        </>
      )}

      {stage === 'run' && (
        <section className={`${panel} space-y-5`} aria-label="Study session">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="font-mono text-xs uppercase tracking-wider text-accent">{method.name}</p>
              <h2 className="mt-1 text-xl text-text">{topic}</h2>
            </div>
            <div className="text-right">
              <p className={`font-mono text-3xl tabular-nums ${remaining <= 0 ? 'text-warn' : 'text-text'}`} role="timer" aria-live="off">{mmss(remaining)}</p>
              <button className="mt-1 min-h-9 text-sm text-muted hover:text-text" onClick={() => setEndAt((e) => e + 5 * 60000)}>+5 min</button>
            </div>
          </div>

          {remaining <= 0 && (
            <p className="rounded-md bg-raised px-4 py-3 text-text" role="status">
              Time is up. Finish the step you are on, then wrap up. Short breaks help you remember more.
            </p>
          )}

          {method.runner === 'blurt' && <BlurtRunner {...runnerProps} />}
          {method.runner === 'feynman' && <FeynmanRunner {...runnerProps} />}
          {method.runner === 'recall' && <RecallRunner {...runnerProps} mixed={method.id === 'interleaving'} />}
          {method.runner === 'guided' && <GuidedRunner {...runnerProps} method={method} />}

          <button className="min-h-10 text-sm text-muted hover:text-text" onClick={() => setStage('setup')}>
            End without saving
          </button>
        </section>
      )}

      {stage === 'done' && lastResult && (
        <section className={`${panel} space-y-4`} aria-label="Session complete">
          <h2 className="text-xl text-text">Session saved</h2>
          <p className="text-muted">
            {METHOD_BY_ID[lastResult.methodId].name} on {lastResult.topic} for {lastResult.actualMinutes} {lastResult.actualMinutes === 1 ? 'minute' : 'minutes'}
            {typeof lastResult.score === 'number' ? `, score ${lastResult.score}%` : ''}.
          </p>
          {breakEnd !== null ? (
            <p className="font-mono text-2xl tabular-nums text-text" role="timer">
              Break {mmss((breakEnd - now) / 1000)}
              {breakEnd - now <= 0 && <span className="ml-3 font-sans text-base text-accent">Break over</span>}
            </p>
          ) : (
            <p className="text-muted">Take a 5 minute break away from the screen, then try recalling what you just did without notes.</p>
          )}
          <div className="flex flex-wrap gap-3">
            {breakEnd === null && <button className={primaryBtn} onClick={() => setBreakEnd(Date.now() + 5 * 60000)}>Start 5 minute break</button>}
            <button className={quietBtn} onClick={() => { setBreakEnd(null); setStage('setup'); }}>Back to methods</button>
          </div>
        </section>
      )}
    </div>
  );
};
