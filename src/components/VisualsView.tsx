import React, { useCallback, useEffect, useRef, useState } from 'react';
import '@hyperframes/player';
import type { HyperframesPlayer } from '@hyperframes/player';
import { Segmented, labelCls, panel, primaryBtn, quietBtn } from './ui';

/** The animation is 15 seconds: five steps of three seconds each. */
const STEP_SECONDS = 3;

const STEPS = [
  { title: 'Fetch', text: 'The Program Counter holds the address of the next instruction and sends it to memory.' },
  { title: 'Memory answers', text: 'RAM looks up that address and sends the instruction back into the CPU.' },
  { title: 'Decode', text: 'The Control Unit reads the instruction and works out what to do.' },
  { title: 'Execute', text: 'The ALU does the arithmetic on values fetched from the registers.' },
  { title: 'Write back', text: 'The result is stored in a register and the Program Counter moves on.' },
];

/** Box positions in the 1280x720 composition, used to lay clickable hotspots over the player. */
const PARTS = [
  { id: 'pc', name: 'Program Counter (PC)', x: 96, y: 168, w: 160, h: 96, step: 0, text: 'Holds the address of the next instruction. After each instruction it moves on by one.' },
  { id: 'mar', name: 'Memory Address Register (MAR)', x: 96, y: 318, w: 160, h: 96, step: 0, text: 'Holds the address the CPU is about to read from memory, so memory knows which row to answer.' },
  { id: 'ir', name: 'Instruction Register (IR)', x: 96, y: 468, w: 200, h: 104, step: 1, text: 'Holds the instruction that was just fetched while it is decoded and run.' },
  { id: 'cu', name: 'Control Unit', x: 376, y: 344, w: 220, h: 120, step: 2, text: 'Reads the instruction, works out what it means, and tells the other parts what to do.' },
  { id: 'alu', name: 'ALU', x: 376, y: 496, w: 220, h: 96, step: 3, text: 'The Arithmetic Logic Unit. It does the maths (add, subtract) and the comparisons (equal, greater than).' },
  { id: 'reg', name: 'Registers', x: 660, y: 344, w: 156, h: 248, step: 3, text: 'A few tiny, very fast storage slots inside the CPU. The ALU works on values held here.' },
  { id: 'ram', name: 'RAM (memory)', x: 920, y: 96, w: 320, h: 520, step: 1, text: 'Stores the program and its data while it runs. Much bigger than the registers, but slower to reach.' },
] as const;

type PartId = (typeof PARTS)[number]['id'];

const QUIZ: { q: string; answer: PartId; why: string }[] = [
  { q: 'Click the part that holds the address of the next instruction.', answer: 'pc', why: 'The Program Counter always points at the next instruction to fetch.' },
  { q: 'Click the part that does the arithmetic.', answer: 'alu', why: 'The ALU performs the maths and comparisons.' },
  { q: 'Click the part that stores the program while it runs.', answer: 'ram', why: 'RAM holds the program and its data. The CPU fetches from it.' },
  { q: 'Click the part that works out what an instruction means.', answer: 'cu', why: 'The Control Unit decodes the instruction and directs the others.' },
  { q: 'Click the part that holds the instruction being run right now.', answer: 'ir', why: 'The Instruction Register holds it during decode and execute.' },
  { q: 'Click the part with tiny, very fast slots holding values like 2 and 3.', answer: 'reg', why: 'Registers sit inside the CPU, so the ALU can reach them at once.' },
];

type Mode = 'explore' | 'quiz';

export const VisualsView: React.FC = () => {
  const playerRef = useRef<HyperframesPlayer>(null);
  const [mode, setMode] = useState<Mode>('explore');
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  const [time, setTime] = useState(0);
  const [selected, setSelected] = useState<PartId | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [answer, setAnswer] = useState<{ picked: PartId; correct: boolean } | null>(null);

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

  const playStep = useCallback((index: number) => {
    const el = playerRef.current;
    if (!el) return;
    el.rangeStart = index * STEP_SECONDS;
    el.rangeEnd = (index + 1) * STEP_SECONDS;
    el.seek(index * STEP_SECONDS);
    void el.play();
  }, []);

  const playAll = () => {
    const el = playerRef.current;
    if (!el) return;
    el.rangeStart = null;
    el.rangeEnd = null;
    el.seek(0);
    void el.play();
  };

  const currentStep = Math.min(STEPS.length - 1, Math.floor(time / STEP_SECONDS));
  const part = PARTS.find((p) => p.id === selected);
  const question = QUIZ[qIndex];
  const finished = qIndex >= QUIZ.length;

  const clickPart = (p: (typeof PARTS)[number]) => {
    if (mode === 'quiz') {
      if (answer || finished) return;
      const correct = p.id === question.answer;
      setAnswer({ picked: p.id, correct });
      if (correct) setScore((s) => s + 1);
      const target = PARTS.find((x) => x.id === question.answer)!;
      playStep(target.step);
      return;
    }
    setSelected(p.id);
    playStep(p.step);
  };

  const nextQuestion = () => {
    setAnswer(null);
    setQIndex((i) => i + 1);
  };

  const restartQuiz = () => {
    setAnswer(null);
    setQIndex(0);
    setScore(0);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 basis-72 flex-1">
          <h2 className="font-display text-2xl text-text">How a CPU runs one instruction</h2>
          <p className="mt-1 max-w-prose text-sm text-muted">
            Watch one instruction travel through the processor. Press a step, or click any part to see what it does.
          </p>
        </div>
        <Segmented
          label="Visual mode"
          value={mode}
          onChange={(m) => {
            setMode(m);
            setAnswer(null);
            if (m === 'quiz') restartQuiz();
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
            src={`${import.meta.env.BASE_URL}visuals/cpu/index.html`}
            width={1280}
            height={720}
            controls
            disable-click-to-play
            audio-locked
            style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
          />
          {ready && !loadError &&
            PARTS.map((p) => {
              const isTarget = mode === 'explore' && selected === p.id;
              const wasPicked = answer?.picked === p.id;
              const isAnswer = answer && p.id === question?.answer;
              return (
                <button
                  key={p.id}
                  onClick={() => clickPart(p)}
                  aria-label={mode === 'quiz' ? `Choose ${p.name}` : `Explain ${p.name}`}
                  className={`absolute rounded-[10px] outline-offset-2 transition-colors hover:bg-accent/15 focus-visible:outline focus-visible:outline-2 focus-visible:outline-accent ${
                    isTarget ? 'ring-2 ring-accent' : ''
                  } ${isAnswer ? 'ring-2 ring-accent bg-accent/15' : ''} ${wasPicked && !answer?.correct ? 'ring-2 ring-warn bg-warn/15' : ''}`}
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
            Play all five steps
          </button>
          {STEPS.map((s, i) => (
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
          {part ? (
            <>
              <p className={labelCls}>{part.name}</p>
              <p className="text-text">{part.text}</p>
              <p className="mt-2 text-sm text-muted">
                Active in step {part.step + 1}: {STEPS[part.step].title}.
              </p>
            </>
          ) : (
            <>
              <p className={labelCls}>Step {currentStep + 1} of 5 · {STEPS[currentStep].title}</p>
              <p className="text-text">{STEPS[currentStep].text}</p>
              <p className="mt-2 text-sm text-muted">Click any part of the diagram to see what it does and when it works.</p>
            </>
          )}
        </section>
      ) : (
        <section className={panel} aria-live="polite">
          {!finished ? (
            <div className="space-y-3">
              <p className={labelCls}>Question {qIndex + 1} of {QUIZ.length}</p>
              <p className="text-text">{question.q}</p>
              {answer && (
                <div className="space-y-3">
                  <p className={answer.correct ? 'text-accent' : 'text-warn'}>
                    {answer.correct ? 'Correct.' : `Not quite. That was the ${PARTS.find((p) => p.id === answer.picked)?.name}.`}{' '}
                    <span className="text-text">{question.why}</span>
                  </p>
                  <button onClick={nextQuestion} className={primaryBtn}>
                    {qIndex === QUIZ.length - 1 ? 'See my score' : 'Next question'}
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              <p className={labelCls}>Done</p>
              <p className="font-display text-2xl text-text">{score} of {QUIZ.length} correct</p>
              <p className="text-sm text-muted">
                {score === QUIZ.length
                  ? 'Every part placed. Try explaining the five steps out loud without looking.'
                  : 'Switch to Explore and watch the steps you missed, then try again.'}
              </p>
              <button onClick={restartQuiz} className={primaryBtn}>Try again</button>
            </div>
          )}
        </section>
      )}
    </div>
  );
};
