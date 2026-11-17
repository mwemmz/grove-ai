/* Record a lecture (or bring a recording) and turn it into a note, on this device. */
import { useEffect, useRef, useState } from 'react';
import { FileAudio, Mic, Pause, Play, Sparkles, Square, Trash2 } from 'lucide-react';
import type { Course } from '../types';
import {
  MODELS,
  Recorder,
  audioMb,
  canTidy,
  clock,
  deleteRecording,
  getModelKey,
  importAudio,
  listRecordings,
  plainNote,
  setModelKey,
  tidyWithAI,
  transcribe,
  transcriptText,
  updateRecording,
  type ModelKey,
  type Recording,
} from '../services/lecture';
import { Modal, field, labelCls, primaryBtn, quietBtn } from './ui';

type Stage =
  | { k: 'pick' }
  | { k: 'recording'; paused: boolean }
  | { k: 'importing'; msg: string }
  | { k: 'transcribing'; rec: Recording }
  | { k: 'review'; rec: Recording; content: string; tidied: boolean };

export function LectureRecorder({
  courses,
  defaultCourseId,
  onClose,
  onSave,
}: {
  courses: Course[];
  defaultCourseId?: string;
  onClose: () => void;
  onSave: (title: string, content: string, courseId: string) => string;
}) {
  const today = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  const [title, setTitle] = useState(`Lecture · ${today}`);
  const [courseId, setCourseId] = useState(defaultCourseId ?? courses[0]?.id ?? '');
  const [model, setModel] = useState<ModelKey>(getModelKey());
  const [stage, setStage] = useState<Stage>({ k: 'pick' });
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<Recording[]>([]);
  const [level, setLevel] = useState(0);
  const [secs, setSecs] = useState(0);
  const [dl, setDl] = useState<{ loaded: number; total: number } | null>(null);
  const [tidyStep, setTidyStep] = useState<string | null>(null);
  const [dropAudio, setDropAudio] = useState(true);
  const recorder = useRef<Recorder | null>(null);
  const stopper = useRef({ stopped: false });
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void listRecordings().then((all) => setSaved(all.filter((r) => !r.noteId)));
  }, [stage.k]);

  // While recording, the clock ticks every second.
  useEffect(() => {
    if (stage.k !== 'recording') return;
    const t = setInterval(() => setSecs(recorder.current?.elapsed() ?? 0), 500);
    return () => clearInterval(t);
  }, [stage.k]);

  const busy = stage.k === 'recording' || stage.k === 'transcribing' || stage.k === 'importing';
  const close = () => {
    if (stage.k === 'recording' && !confirm('Stop recording and close? What was recorded so far is kept.')) return;
    stopper.current.stopped = true;
    if (recorder.current) void recorder.current.stop();
    onClose();
  };

  const startRecording = async () => {
    setError(null);
    try {
      const r = new Recorder(title);
      r.onLevel = setLevel;
      await r.start();
      recorder.current = r;
      setSecs(0);
      setStage({ k: 'recording', paused: false });
    } catch (e) {
      setError(e instanceof Error && /denied|allowed|permission/i.test(e.message) ? 'Grove needs permission to use the microphone. Allow it in your browser, then try again.' : `Could not start recording: ${e instanceof Error ? e.message : e}`);
    }
  };

  const stopRecording = async () => {
    const rec = await recorder.current!.stop();
    recorder.current = null;
    void run(rec);
  };

  const pickFile = async (f: File) => {
    setError(null);
    setStage({ k: 'importing', msg: 'Opening the recording…' });
    try {
      const rec = await importAudio(f, title || f.name.replace(/\.[^.]+$/, ''), (msg) => setStage({ k: 'importing', msg }));
      void run(rec);
    } catch {
      setStage({ k: 'pick' });
      setError("Grove couldn't read that file. Try an MP3, M4A, WAV, OGG or WEBM recording.");
    }
  };

  const run = async (rec: Recording) => {
    setModelKey(model);
    stopper.current = { stopped: false };
    setStage({ k: 'transcribing', rec });
    setDl(null);
    try {
      const done = await transcribe(rec, model, { onDownload: (loaded, total) => setDl({ loaded, total }), onProgress: (_d, _t, r) => setStage({ k: 'transcribing', rec: r }) }, stopper.current);
      if (stopper.current.stopped && done.done < done.blocks) {
        setStage({ k: 'pick' });
        return;
      }
      setStage({ k: 'review', rec: done, content: plainNote(done), tidied: false });
    } catch (e) {
      setStage({ k: 'pick' });
      const msg = e instanceof Error ? e.message : String(e);
      setError(
        !navigator.onLine || /fetch|network|load/i.test(msg)
          ? "Grove couldn't download the speech model. It needs a connection the first time; after that it works offline. Your recording is kept below: tap Carry on when you're connected."
          : `Transcription stopped (${msg}). What was done is kept; tap Carry on below to continue.`,
      );
    }
  };

  const tidy = async (s: Extract<Stage, { k: 'review' }>) => {
    setError(null);
    try {
      const course = courses.find((c) => c.id === courseId);
      const content = await tidyWithAI(s.rec, course ? `${course.code} ${course.name}` : '', (d, t) => setTidyStep(`Tidying part ${Math.min(d + 1, t)} of ${t}…`));
      setStage({ ...s, content, tidied: true });
    } catch (e) {
      setError(`The AI could not tidy it (${e instanceof Error ? e.message : e}). The plain transcript is still here.`);
    } finally {
      setTidyStep(null);
    }
  };

  const save = async (s: Extract<Stage, { k: 'review' }>) => {
    const id = onSave(title.trim() || s.rec.title, s.content, courseId);
    if (dropAudio) await deleteRecording(s.rec.id);
    else await updateRecording({ ...s.rec, noteId: id, title });
    onClose();
  };

  const mb = (n: number) => `${Math.round(n / 1e6)} MB`;

  return (
    <Modal title="Lecture to notes" onClose={close} wide>
      <div className="space-y-4">
        {error && <p role="alert" className="rounded-2xl bg-warn/10 p-3 text-sm text-text ring-1 ring-warn/50">{error}</p>}

        {stage.k === 'pick' && (
          <>
            <p className="text-sm text-muted">Grove turns what was said into a note on this phone. The recording never leaves your device.</p>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label htmlFor="lec-title" className={labelCls}>Title</label>
                <input id="lec-title" value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
              </div>
              {courses.length > 0 && (
                <div>
                  <label htmlFor="lec-course" className={labelCls}>Course</label>
                  <select id="lec-course" value={courseId} onChange={(e) => setCourseId(e.target.value)} className={field}>
                    {courses.map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
                  </select>
                </div>
              )}
            </div>
            <fieldset>
              <legend className={labelCls}>Speech model</legend>
              <div className="grid gap-2 sm:grid-cols-2">
                {(Object.keys(MODELS) as ModelKey[]).map((k) => (
                  <label key={k} className={`flex cursor-pointer items-start gap-3 rounded-2xl p-3 ring-1 ${model === k ? 'bg-raised ring-accent-text' : 'ring-edge'}`}>
                    <input type="radio" name="asr-model" checked={model === k} onChange={() => setModel(k)} className="mt-1 accent-[var(--color-accent)]" />
                    <span>
                      <span className="block text-sm font-semibold text-text">{MODELS[k].label}</span>
                      <span className="block text-xs text-muted">{MODELS[k].detail}{k === 'quick' ? ', faster on phones' : ', better with accents and noise'}</span>
                    </span>
                  </label>
                ))}
              </div>
            </fieldset>
            <div className="grid gap-2 sm:grid-cols-2">
              <button type="button" onClick={() => void startRecording()} className={primaryBtn}>
                <Mic aria-hidden className="h-4 w-4" /> Record now
              </button>
              <button type="button" onClick={() => fileRef.current?.click()} className={quietBtn}>
                <FileAudio aria-hidden className="h-4 w-4" /> Choose a recording
              </button>
              <input ref={fileRef} type="file" accept="audio/*,video/*,.m4a,.mp3,.wav,.ogg,.webm,.aac,.amr" className="hidden" onChange={(e) => e.target.files?.[0] && void pickFile(e.target.files[0])} />
            </div>
            <p className="text-xs text-muted">
              For a long lecture, your phone's own recorder app is the safest way to record; then choose the file here. Sit near the front: clear audio makes a much better note.
            </p>
            {saved.length > 0 && (
              <div className="space-y-2 border-t border-line pt-4">
                <p className={labelCls}>Unfinished</p>
                {saved.map((r) => (
                  <div key={r.id} className="flex items-center gap-3 rounded-2xl bg-bg/50 p-3 ring-1 ring-line">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm text-text">{r.title}</p>
                      <p className="text-xs text-muted">
                        {clock(r.seconds)} · {r.blocks ? Math.round((r.done / r.blocks) * 100) : 0}% transcribed · {audioMb(r)} MB on this device
                      </p>
                    </div>
                    <button type="button" onClick={() => (r.done >= r.blocks ? setStage({ k: 'review', rec: r, content: plainNote(r), tidied: false }) : void run(r))} className={`${quietBtn} !min-h-9 !px-3`}>
                      {r.done >= r.blocks ? 'Review' : 'Carry on'}
                    </button>
                    <button type="button" aria-label={`Delete ${r.title}`} onClick={() => void deleteRecording(r.id).then(() => setSaved((x) => x.filter((y) => y.id !== r.id)))} className="flex h-9 w-9 items-center justify-center rounded-full text-muted hover:bg-raised hover:text-text">
                      <Trash2 aria-hidden className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        )}

        {stage.k === 'recording' && (
          <div className="space-y-5 py-2 text-center">
            <p className="font-mono text-5xl tabular-nums text-text">{clock(secs)}</p>
            <div className="mx-auto h-2 max-w-xs overflow-hidden rounded-full bg-raised" aria-hidden>
              <div className="h-full rounded-full bg-accent transition-[width] duration-150" style={{ width: `${stage.paused ? 0 : Math.round(level * 100)}%` }} />
            </div>
            <p className="text-sm text-muted">{stage.paused ? 'Paused.' : 'Recording. Keep Grove open and the screen on.'}</p>
            <div className="flex justify-center gap-2">
              <button
                type="button"
                onClick={() => {
                  if (stage.paused) void recorder.current?.resume();
                  else void recorder.current?.pause();
                  setStage({ k: 'recording', paused: !stage.paused });
                }}
                className={quietBtn}
              >
                {stage.paused ? <Play aria-hidden className="h-4 w-4" /> : <Pause aria-hidden className="h-4 w-4" />} {stage.paused ? 'Resume' : 'Pause'}
              </button>
              <button type="button" onClick={() => void stopRecording()} className={primaryBtn}>
                <Square aria-hidden className="h-4 w-4" /> Stop and make notes
              </button>
            </div>
          </div>
        )}

        {stage.k === 'importing' && <p className="py-6 text-center text-sm text-muted" role="status">{stage.msg}</p>}

        {stage.k === 'transcribing' && (
          <div className="space-y-4" role="status">
            {dl && dl.loaded < dl.total ? (
              <>
                <p className="text-sm text-text">Downloading the speech model ({mb(dl.loaded)} of {mb(dl.total)}). This happens once; after that it works offline.</p>
                <div className="h-2 overflow-hidden rounded-full bg-raised"><div className="h-full rounded-full bg-accent" style={{ width: `${(dl.loaded / dl.total) * 100}%` }} /></div>
              </>
            ) : (
              <>
                <p className="text-sm text-text">
                  Listening… {clock((stage.rec.done / Math.max(1, stage.rec.blocks)) * stage.rec.seconds)} of {clock(stage.rec.seconds)}
                </p>
                <div className="h-2 overflow-hidden rounded-full bg-raised">
                  <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${(stage.rec.done / Math.max(1, stage.rec.blocks)) * 100}%` }} />
                </div>
                <p className="text-xs text-muted">This runs on your phone, so a long lecture takes a while. Keep Grove open. You can stop and carry on later.</p>
                {transcriptText(stage.rec) && <p className="max-h-32 overflow-y-auto rounded-2xl bg-bg/50 p-3 text-sm leading-6 text-muted ring-1 ring-line">…{transcriptText(stage.rec).slice(-400)}</p>}
              </>
            )}
            <button type="button" onClick={() => (stopper.current.stopped = true)} className={quietBtn}>Stop for now</button>
          </div>
        )}

        {stage.k === 'review' && (
          <div className="space-y-4">
            {!transcriptText(stage.rec) ? (
              <p className="text-sm text-text">Grove couldn't hear any speech in this recording. Check the microphone was close enough and not covered.</p>
            ) : (
              <>
                <div>
                  <label htmlFor="lec-title2" className={labelCls}>Title</label>
                  <input id="lec-title2" value={title} onChange={(e) => setTitle(e.target.value)} className={field} />
                </div>
                <div>
                  <label htmlFor="lec-body" className={labelCls}>{stage.tidied ? 'Notes' : 'What was said'}</label>
                  <textarea id="lec-body" rows={12} value={stage.content} onChange={(e) => setStage({ ...stage, content: e.target.value })} className={`${field} font-mono text-[13px] leading-6`} />
                  <p className="mt-1 text-xs text-muted">Fix any mis-heard words before saving. Speech recognition gets names and technical terms wrong sometimes.</p>
                </div>
                {!stage.tidied && canTidy() && (
                  <button type="button" disabled={!!tidyStep || !navigator.onLine} onClick={() => void tidy(stage)} className={quietBtn}>
                    <Sparkles aria-hidden className="h-4 w-4" /> {tidyStep ?? 'Tidy into headed notes with AI'}
                  </button>
                )}
                <label className="flex items-center gap-2 text-sm text-text">
                  <input type="checkbox" checked={dropAudio} onChange={(e) => setDropAudio(e.target.checked)} className="accent-[var(--color-accent)]" />
                  Delete the audio after saving (frees {audioMb(stage.rec)} MB)
                </label>
                <button type="button" onClick={() => void save(stage)} disabled={!!tidyStep} className={primaryBtn}>Save note</button>
              </>
            )}
          </div>
        )}

        {busy && <p className="sr-only">Working</p>}
      </div>
    </Modal>
  );
}
