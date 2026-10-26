import React, { useCallback, useEffect, useRef, useState } from 'react';
import '@hyperframes/player';
import type { HyperframesPlayer } from '@hyperframes/player';
import { Note, Course } from '../types';
import { getStoredTheme, themeById, visualPalette } from '../themes';
import { Segmented, labelCls, panel, primaryBtn, quietBtn, chip } from './ui';
import type { StudyPreset } from './StudyView';
import { EconLab } from './EconLab';
import { econVisualsFor } from '../data/econVisuals';
import {
  BUILDS_ON,
  CPU_PARTS,
  CPU_PART_QUIZ,
  CpuPartId,
  TOPIC_BY_ID,
  TopicId,
  VISUAL_TOPICS,
  VISUALS_FOR_COURSE,
  VisualTopic,
} from '../data/visualTopics';

interface VisualsViewProps {
  notes: Note[];
  courses: Course[];
  currentYear: number;
  onOpenNote: (noteId: string) => void;
  onStartSession: (preset: StudyPreset) => void;
  /** Open straight onto this topic, e.g. from a "See it" link on an answer or a note. */
  focusTopic?: TopicId | null;
}

type View = 'animations' | 'programme';
type Mode = 'explore' | 'quiz';

/* ---------------------------------------------------------------- animation player */

function TopicPlayer({
  topic,
  courses,
  notes,
  onOpenNote,
  onStartSession,
}: {
  topic: VisualTopic;
  courses: Course[];
  notes: Note[];
  onOpenNote: (id: string) => void;
  onStartSession: (p: StudyPreset) => void;
}) {
  const playerRef = useRef<HyperframesPlayer>(null);
  const playerSrc = `${import.meta.env.BASE_URL}${topic.src}?p=${encodeURIComponent(JSON.stringify(visualPalette(themeById(getStoredTheme()))))}`;
  const [mode, setMode] = useState<Mode>('explore');
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [time, setTime] = useState(0);
  const [selected, setSelected] = useState<CpuPartId | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [picked, setPicked] = useState<number | CpuPartId | null>(null);

  const isCpu = topic.id === 'cpu';
  const total = isCpu ? CPU_PART_QUIZ.length : topic.quiz.length;
  const finished = qIndex >= total;
  const course = courses.find((c) => c.code === topic.courseCode);
  const courseNotes = notes.filter((n) => n.courseId === course?.id);
  // Notes that talk about this picture: the words that go with it, in the student's own material.
  const matchingNotes = courseNotes.filter((n) => econVisualsFor(`${n.title} ${n.content}`, 3).includes(topic.id as never));
  const relatedNotes = (matchingNotes.length ? matchingNotes : courseNotes).slice(0, 3);

  useEffect(() => {
    const el = playerRef.current;
    if (!el) return;
    const onReady = () => setReady(true);
    const onTime = (e: Event) => setTime((e as CustomEvent<{ currentTime: number }>).detail.currentTime);
    const onError = () => setLoadError(true);
    el.addEventListener('ready', onReady);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('error', onError);
    return () => {
      el.removeEventListener('ready', onReady);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('error', onError);
    };
  }, []);

  const playStep = useCallback(
    (index: number) => {
      const el = playerRef.current;
      const step = topic.steps[index];
      if (!el || !step) return;
      el.rangeStart = step.t0;
      el.rangeEnd = step.t1;
      el.seek(step.t0);
      void el.play();
    },
    [topic]
  );

  const playAll = () => {
    const el = playerRef.current;
    if (!el) return;
    el.rangeStart = null;
    el.rangeEnd = null;
    el.seek(0);
    void el.play();
  };

  const currentStep = Math.max(0, topic.steps.filter((s) => s.t0 <= time + 0.05).length - 1);
  const part = CPU_PARTS.find((p) => p.id === selected);

  const restartQuiz = () => {
    setPicked(null);
    setQIndex(0);
    setScore(0);
  };

  const clickPart = (id: CpuPartId) => {
    const p = CPU_PARTS.find((x) => x.id === id)!;
    if (mode === 'quiz') {
      if (picked !== null || finished) return;
      const q = CPU_PART_QUIZ[qIndex];
      setPicked(id);
      if (id === q.answer) setScore((s) => s + 1);
      playStep(CPU_PARTS.find((x) => x.id === q.answer)!.step);
      return;
    }
    setSelected(id);
    playStep(p.step);
  };

  const choose = (i: number) => {
    if (picked !== null || finished) return;
    const q = topic.quiz[qIndex];
    setPicked(i);
    if (i === q.answer) setScore((s) => s + 1);
    playStep(q.step);
  };

  const cpuQ = CPU_PART_QUIZ[qIndex];
  const choiceQ = topic.quiz[qIndex];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1 basis-64">
          <h2 className="font-display text-2xl text-text">{topic.name}</h2>
          <p className="mt-1 text-sm text-muted">
            {topic.courseCode}
            {topic.unit ? ` · ${topic.unit}` : course ? ` · ${course.name}` : ''} · {isCpu ? 'click any part to see what it does' : 'press a step, or play it all'}
          </p>
        </div>
        <Segmented
          label="Visual mode"
          value={mode}
          onChange={(m) => {
            setMode(m);
            restartQuiz();
          }}
          options={[
            { id: 'explore', label: 'Explore' },
            { id: 'quiz', label: 'Test yourself' },
          ]}
        />
      </div>

      <div className={`${panel} space-y-4 !p-3 sm:!p-4`}>
        <div className="relative w-full overflow-hidden rounded-md bg-bg" style={{ aspectRatio: '16 / 9' }}>
          <hyperframes-player
            ref={playerRef}
            src={playerSrc}
            width={1280}
            height={720}
            controls
            disable-click-to-play
            audio-locked
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
          />
          {isCpu &&
            ready &&
            !loadError &&
            CPU_PARTS.map((p) => {
              const isTarget = mode === 'explore' && selected === p.id;
              const wasPicked = picked === p.id;
              const isAnswer = picked !== null && !finished && p.id === cpuQ?.answer;
              return (
                <button
                  key={p.id}
                  onClick={() => clickPart(p.id)}
                  aria-label={mode === 'quiz' ? `Choose ${p.name}` : `Explain ${p.name}`}
                  className={`absolute rounded-[10px] outline-offset-2 transition-colors hover:bg-accent/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                    isTarget || isAnswer ? 'bg-accent/15 ring-2 ring-accent' : ''
                  } ${wasPicked && picked !== cpuQ?.answer ? 'bg-warn/15 ring-2 ring-warn' : ''}`}
                  style={{
                    left: `${(p.x / 1280) * 100}%`,
                    top: `${(p.y / 720) * 100}%`,
                    width: `${(p.w / 1280) * 100}%`,
                    height: `${(p.h / 720) * 100}%`,
                  }}
                />
              );
            })}
          {!ready && !loadError && (
            <p className="absolute inset-0 flex items-center justify-center text-sm text-muted" role="status">
              Loading the animation…
            </p>
          )}
          {loadError && (
            <p className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-warn" role="alert">
              The animation could not load. Check your connection and reload the page.
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button onClick={playAll} className={primaryBtn} disabled={!ready}>
            Play all
          </button>
          {topic.steps.map((s, i) => (
            <button
              key={s.title}
              onClick={() => playStep(i)}
              disabled={!ready}
              aria-current={currentStep === i}
              className={`${quietBtn} !min-h-9 !px-3 ${currentStep === i ? '!bg-raised ring-accent/70' : ''}`}
            >
              {i + 1} · {s.title}
            </button>
          ))}
        </div>
      </div>

      {mode === 'explore' ? (
        <section className={panel} aria-live="polite">
          {isCpu && part ? (
            <>
              <p className={labelCls}>{part.name}</p>
              <p className="text-text">{part.text}</p>
              <p className="mt-2 text-sm text-muted">Active in step {part.step + 1}: {topic.steps[part.step].title}.</p>
            </>
          ) : (
            <>
              <p className={labelCls}>Step {currentStep + 1} of {topic.steps.length} · {topic.steps[currentStep].title}</p>
              <p className="text-text">{topic.steps[currentStep].text}</p>
            </>
          )}
        </section>
      ) : (
        <section className={panel} aria-live="polite">
          {!finished ? (
            <div className="space-y-3">
              <p className={labelCls}>Question {qIndex + 1} of {total}</p>
              {isCpu ? (
                <>
                  <p className="text-text">{cpuQ.q}</p>
                  {picked !== null && (
                    <div className="space-y-3">
                      <p className={picked === cpuQ.answer ? 'text-accent' : 'text-warn'}>
                        {picked === cpuQ.answer ? 'Correct.' : `Not quite. That was the ${CPU_PARTS.find((p) => p.id === picked)?.name}.`}{' '}
                        <span className="text-text">{cpuQ.why}</span>
                      </p>
                      <button onClick={() => { setPicked(null); setQIndex((i) => i + 1); }} className={primaryBtn}>
                        {qIndex === total - 1 ? 'See my score' : 'Next question'}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="text-text">{choiceQ.q}</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {choiceQ.options.map((o, i) => {
                      const answered = picked !== null;
                      const right = i === choiceQ.answer;
                      return (
                        <button
                          key={o}
                          onClick={() => choose(i)}
                          disabled={answered}
                          className={`min-h-11 rounded-md px-3.5 py-2 text-left text-sm ring-1 transition-colors ${
                            answered && right
                              ? 'bg-accent/15 text-text ring-accent'
                              : answered && picked === i
                                ? 'bg-warn/15 text-text ring-warn'
                                : 'text-text ring-line hover:bg-raised disabled:opacity-60'
                          }`}
                        >
                          {o}
                        </button>
                      );
                    })}
                  </div>
                  {picked !== null && (
                    <div className="space-y-3">
                      <p className={picked === choiceQ.answer ? 'text-accent' : 'text-warn'}>
                        {picked === choiceQ.answer ? 'Correct.' : 'Not quite.'} <span className="text-text">{choiceQ.why}</span>
                      </p>
                      <button onClick={() => { setPicked(null); setQIndex((i) => i + 1); }} className={primaryBtn}>
                        {qIndex === total - 1 ? 'See my score' : 'Next question'}
                      </button>
                    </div>
                  )}
                </>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className={labelCls}>Done</p>
              <p className="font-display text-2xl text-text">{score} of {total} correct</p>
              <p className="text-sm text-muted">
                {score === total
                  ? 'Every one right. Now try explaining the steps out loud without looking.'
                  : 'Switch to Explore and watch the steps you missed, then try again.'}
              </p>
              <button onClick={restartQuiz} className={primaryBtn}>Try again</button>
            </div>
          )}
        </section>
      )}

      <EconLab topicId={topic.id} />

      <section className={`${panel} space-y-5`} aria-label={`${topic.name} notes`}>
        <div>
          <p className={labelCls}>Notes</p>
          <p className="max-w-prose text-text">{topic.notes.summary}</p>
        </div>

        <div>
          <p className={labelCls}>Key ideas</p>
          <ul className="list-disc space-y-1.5 pl-5 text-text marker:text-accent">
            {topic.notes.ideas.map((i) => (
              <li key={i}>{i}</li>
            ))}
          </ul>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] border-collapse text-left text-sm">
            <thead>
              <tr className="font-mono text-xs uppercase tracking-[0.06em] text-muted">
                {topic.notes.table.heading.map((h) => (
                  <th key={h} className="border-b border-line py-2 pr-4 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topic.notes.table.rows.map((r) => (
                <tr key={r[0]} className="border-b border-line/60 align-top">
                  <td className="py-2.5 pr-4 font-medium text-text">{r[0]}</td>
                  <td className="py-2.5 pr-4 font-mono text-accent">{r[1]}</td>
                  <td className="py-2.5 text-muted">{r[2]}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          <div>
            <p className={labelCls}>Use it when</p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-text marker:text-accent">
              {topic.notes.useWhen.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </div>
          <div>
            <p className={labelCls}>Watch out</p>
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-text marker:text-warn">
              {topic.notes.watchOut.map((u) => (
                <li key={u}>{u}</li>
              ))}
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 border-t border-line pt-4">
          <button
            onClick={() => onStartSession({ methodId: 'blurting', courseId: course?.id, topicName: topic.name })}
            className={primaryBtn}
          >
            Practise with blurting
          </button>
          {relatedNotes.map((n) => (
            <button key={n.id} onClick={() => onOpenNote(n.id)} className={quietBtn} title="Open the note this picture explains">
              Read: {n.title.length > 42 ? n.title.slice(0, 40) + '…' : n.title}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

/* ---------------------------------------------------------------- course programme */

function ProgrammeMap({
  courses,
  notes,
  currentYear,
  onOpenNote,
  onOpenVisual,
}: {
  courses: Course[];
  notes: Note[];
  currentYear: number;
  onOpenNote: (id: string) => void;
  onOpenVisual: (id: TopicId) => void;
}) {
  const [sel, setSel] = useState<string | null>(null);
  const byCode = (code: string) => courses.find((c) => c.code === code);
  const leadsTo = (code: string) => courses.filter((c) => (BUILDS_ON[c.code] ?? []).includes(code)).map((c) => c.code);
  const mastery = (c: Course) => {
    const ns = notes.filter((n) => n.courseId === c.id && n.masteryScore);
    return ns.length ? Math.round(ns.reduce((s, n) => s + (n.masteryScore ?? 0), 0) / ns.length) : null;
  };
  const selected = sel ? byCode(sel) : undefined;
  const before = sel ? BUILDS_ON[sel] ?? [] : [];
  const after = sel ? leadsTo(sel) : [];
  const selNotes = selected ? notes.filter((n) => n.courseId === selected.id) : [];
  const selVisuals = selected ? VISUALS_FOR_COURSE(selected.code) : [];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-display text-2xl text-text">Your course programme</h2>
        <p className="mt-1 max-w-prose text-sm text-muted">
          Four years on one page. Select a course to see what it builds on, what builds on it, and your notes.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        {[1, 2, 3, 4].map((year) => (
          <section key={year} aria-label={`Year ${year}`} className="space-y-3">
            <p className={`font-mono text-xs uppercase tracking-[0.08em] ${year === currentYear ? 'text-accent' : 'text-muted'}`}>
              Year {year}
              {year === currentYear ? ' · now' : ''}
            </p>
            {[1, 2].map((sem) => {
              const list = courses.filter((c) => c.year === year && c.semester === sem);
              if (list.length === 0) return null;
              return (
                <div key={sem} className="space-y-2">
                  <p className="text-xs text-muted">Semester {sem}</p>
                  {list.map((c) => {
                    const m = mastery(c);
                    const isSel = sel === c.code;
                    const isBefore = before.includes(c.code);
                    const isAfter = after.includes(c.code);
                    return (
                      <button
                        key={c.id}
                        onClick={() => setSel(isSel ? null : c.code)}
                        aria-pressed={isSel}
                        className={`block w-full rounded-[10px] bg-surface p-3 text-left ring-1 transition-colors hover:bg-raised ${
                          isSel ? 'ring-2 ring-accent' : isBefore ? 'ring-2 ring-warn/80' : isAfter ? 'ring-2 ring-accent/50' : 'ring-line'
                        } ${sel && !isSel && !isBefore && !isAfter ? 'opacity-50' : ''}`}
                      >
                        <span className="font-mono text-xs text-muted">{c.code}</span>
                        <span className="mt-0.5 block text-sm font-semibold leading-snug text-text">{c.name}</span>
                        {m !== null && (
                          <span className="mt-2 block" aria-label={`Mastery ${m} percent`}>
                            <span className="block h-1.5 overflow-hidden rounded-full bg-bg">
                              <span className="block h-full rounded-full bg-accent" style={{ width: `${m}%` }} />
                            </span>
                          </span>
                        )}
                        {VISUALS_FOR_COURSE(c.code).length > 0 && (
                          <span className="mt-2 inline-block font-mono text-[11px] text-warn">▶ visuals</span>
                        )}
                      </button>
                    );
                  })}
                </div>
              );
            })}
          </section>
        ))}
      </div>

      {sel && (
        <p className="text-xs text-muted">
          <span className="text-warn">Gold outline</span> = builds on · <span className="text-accent">green outline</span> = leads to
        </p>
      )}

      {selected ? (
        <section className={`${panel} space-y-4`} aria-live="polite">
          <div>
            <p className={labelCls}>{selected.code} · Year {selected.year}, semester {selected.semester}</p>
            <h3 className="font-display text-xl text-text">{selected.name}</h3>
            <p className="mt-1 max-w-prose text-sm text-muted">{selected.description}</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className={labelCls}>Builds on</p>
              <div className="flex flex-wrap gap-2">
                {before.length === 0 && <span className="text-sm text-muted">Nothing, this is a starting point.</span>}
                {before.map((code) => (
                  <button key={code} onClick={() => setSel(code)} className={`${chip} hover:brightness-125`}>
                    {code} · {byCode(code)?.name}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <p className={labelCls}>Leads to</p>
              <div className="flex flex-wrap gap-2">
                {after.length === 0 && <span className="text-sm text-muted">Nothing further in this programme.</span>}
                {after.map((code) => (
                  <button key={code} onClick={() => setSel(code)} className={`${chip} hover:brightness-125`}>
                    {code} · {byCode(code)?.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <p className={labelCls}>Your notes ({selNotes.length})</p>
            {selNotes.length === 0 ? (
              <p className="text-sm text-muted">No notes for this course yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {selNotes.slice(0, 5).map((n) => (
                  <li key={n.id}>
                    <button onClick={() => onOpenNote(n.id)} className="block min-h-11 w-full py-2 text-left text-sm text-text hover:text-accent">
                      {n.title}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
          {selVisuals.length > 0 && (
            <div className="flex flex-wrap gap-2 border-t border-line pt-4">
              {selVisuals.map((t) => (
                <button key={t.id} onClick={() => onOpenVisual(t.id)} className={quietBtn}>
                  ▶ {t.name}
                </button>
              ))}
            </div>
          )}
        </section>
      ) : (
        <p className="text-sm text-muted">Select a course above.</p>
      )}
    </div>
  );
}

/* ---------------------------------------------------------------- tab */

export const VisualsView: React.FC<VisualsViewProps> = ({ notes, courses, currentYear, onOpenNote, onStartSession, focusTopic }) => {
  const [view, setView] = useState<View>('animations');
  const [topicId, setTopicId] = useState<TopicId>(focusTopic ?? 'cpu');
  useEffect(() => {
    if (focusTopic) {
      setTopicId(focusTopic);
      setView('animations');
    }
  }, [focusTopic]);
  const topic = TOPIC_BY_ID[topicId];
  const [themeId, setThemeId] = useState(getStoredTheme);
  useEffect(() => {
    const on = (e: Event) => setThemeId((e as CustomEvent<string>).detail);
    window.addEventListener('grove-theme-changed', on);
    return () => window.removeEventListener('grove-theme-changed', on);
  }, []);
  const groups = ['Economics', 'Computer systems', 'Data structures'] as const;

  return (
    <div className="space-y-5">
      <Segmented
        label="Visuals sections"
        value={view}
        onChange={setView}
        options={[
          { id: 'animations', label: 'Animations' },
          { id: 'programme', label: 'Course programme' },
        ]}
      />

      {view === 'animations' ? (
        <>
          <div className="space-y-3">
            {groups.map((g) => (
              <div key={g}>
                <p className={labelCls}>{g}</p>
                <div className="flex flex-wrap gap-2">
                  {VISUAL_TOPICS.filter((t) => t.group === g).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setTopicId(t.id)}
                      aria-pressed={topicId === t.id}
                      className={`min-h-10 rounded-md px-3.5 text-sm font-medium ring-1 transition-colors ${
                        topicId === t.id ? 'bg-raised text-text ring-accent/70' : 'text-muted ring-line hover:bg-surface hover:text-text'
                      }`}
                    >
                      {t.name}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
          <TopicPlayer key={`${topic.id}-${themeId}`} topic={topic} courses={courses} notes={notes} onOpenNote={onOpenNote} onStartSession={onStartSession} />
        </>
      ) : (
        <ProgrammeMap
          courses={courses}
          notes={notes}
          currentYear={currentYear}
          onOpenNote={onOpenNote}
          onOpenVisual={(id) => {
            setTopicId(id);
            setView('animations');
          }}
        />
      )}
    </div>
  );
};
