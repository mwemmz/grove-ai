/* Dual coding where the words are: a small animated picture placed next to an answer or a slide that talks about
   the same idea. The step text under it changes with the animation, so the picture and the words stay in step. */
import React, { useEffect, useRef, useState } from 'react';
import '@hyperframes/player';
import type { HyperframesPlayer } from '@hyperframes/player';
import { TOPIC_BY_ID, type TopicId } from '../data/visualTopics';
import { getStoredTheme, themeById, visualPalette } from '../themes';
import { primaryBtn, quietBtn } from './ui';

export default function VisualCard({ topicId, onOpen }: { topicId: TopicId; onOpen?: (id: TopicId) => void }) {
  const topic = TOPIC_BY_ID[topicId];
  const ref = useRef<HyperframesPlayer>(null);
  const [time, setTime] = useState(0);
  const [failed, setFailed] = useState(false);
  const src = `${import.meta.env.BASE_URL}${topic.src}?p=${encodeURIComponent(JSON.stringify(visualPalette(themeById(getStoredTheme()))))}`;

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onTime = (e: Event) => setTime((e as CustomEvent<{ currentTime: number }>).detail.currentTime);
    const onError = () => setFailed(true);
    // Open on the finished picture, so it reads at a glance before anyone presses play.
    const end = topic.steps[topic.steps.length - 1].t1 - 0.05;
    const onReady = () => {
      el.seek(end);
      setTime(end);
    };
    el.addEventListener('ready', onReady);
    el.addEventListener('timeupdate', onTime);
    el.addEventListener('error', onError);
    return () => {
      el.removeEventListener('ready', onReady);
      el.removeEventListener('timeupdate', onTime);
      el.removeEventListener('error', onError);
    };
  }, [topic]);

  if (!topic) return null;
  const i = Math.max(0, topic.steps.filter((s) => s.t0 <= time + 0.05).length - 1);
  const step = topic.steps[i];

  return (
    <figure className="overflow-hidden rounded-[22px] bg-surface ring-1 ring-line" aria-label={`Picture: ${topic.name}`}>
      <div className="relative w-full bg-bg" style={{ aspectRatio: '16 / 9' }}>
        <hyperframes-player
          ref={ref}
          src={src}
          width={1280}
          height={720}
          controls
          audio-locked
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', display: 'block' }}
        />
        {failed && (
          <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-sm text-warn" role="alert">
            The picture could not load.
          </p>
        )}
      </div>
      <figcaption className="space-y-2 p-3">
        <p className="font-mono text-xs uppercase tracking-wider text-muted">
          See it · {topic.name}
          {topic.unit ? ` · ${topic.unit}` : ''}
        </p>
        <p className="text-sm text-text" aria-live="polite">
          <span className="font-semibold">{i + 1}. {step.title}.</span> {step.text}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => {
              const el = ref.current;
              if (!el) return;
              el.seek(0);
              void el.play();
            }}
            className={`${primaryBtn} !min-h-9 !px-3 text-sm`}
          >
            Play the steps
          </button>
          {onOpen && (
            <button onClick={() => onOpen(topicId)} className={`${quietBtn} !min-h-9 !px-3 text-sm`}>
              Open it with sliders and a quiz
            </button>
          )}
        </div>
      </figcaption>
    </figure>
  );
}
