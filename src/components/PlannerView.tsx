import React, { useMemo, useState } from 'react';
import { Download, Copy, Check } from 'lucide-react';
import { Course, LearningProfile } from '../types';
import { STUDY_METHODS, METHOD_BY_ID, MethodId } from '../data/studyMethods';
import { addDays, fmtDate, generatePlan, parseDate, PlanBlock, PlanInputs, PlanTopic } from '../lib/planner';
import { studyStore, SavedPlan } from '../services/studyStore';
import { Disclosure, Segmented, field, labelCls, panel, primaryBtn, quietBtn, chip } from './ui';
import type { StudyPreset } from './StudyView';

interface PlannerViewProps {
  courses: Course[];
  profile: LearningProfile;
  onStartSession: (preset: StudyPreset) => void;
}

const DAY_LABELS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const SESSION_OPTIONS = ['25', '45', '60', '90'] as const;
const KIND_LABEL = { learn: 'Learn', review: 'Review', practice: 'Exam practice' } as const;

/** Every course is offered. This year's are ticked first, and shaky ones start with lower confidence. */
function courseTopics(courses: Course[], profile: LearningProfile, saved?: PlanTopic[]): { topics: PlanTopic[]; excluded: Set<string> } {
  const topics: PlanTopic[] = courses.map((c) => {
    const id = `course-${c.id}`;
    const weak = profile.weakTopics.some((w) => w.courseCode === c.code && w.masteryLevel < 70);
    const prior = saved?.find((t) => t.id === id);
    return { id, name: `${c.code} ${c.name}`, confidence: prior?.confidence ?? (weak ? 2 : 3), courseCode: c.code, courseId: c.id };
  });
  const customs = (saved ?? []).filter((t) => t.id.startsWith('custom-'));
  const all = [...topics, ...customs];
  const excluded = new Set<string>();
  if (saved) {
    all.forEach((t) => !saved.some((s) => s.id === t.id) && excluded.add(t.id));
  } else {
    const thisYear = new Set(courses.filter((c) => c.year === profile.currentYear).map((c) => `course-${c.id}`));
    const anyThisYear = thisYear.size > 0;
    topics.forEach((t) => anyThisYear && !thisYear.has(t.id) && excluded.add(t.id));
  }
  return { topics: all, excluded };
}

function defaultInputs(courses: Course[], profile: LearningProfile): PlanInputs {
  const today = new Date();
  today.setHours(12);
  return {
    goal: 'exam',
    startDate: fmtDate(today),
    targetDate: fmtDate(addDays(today, 28)),
    days: [true, true, true, true, true, false, false],
    hoursPerDay: 2,
    sessionMinutes: 45,
    breakMinutes: 10,
    startTime: '18:00',
    topics: courseTopics(courses, profile).topics,
    methods: STUDY_METHODS.map((m) => m.id),
  };
}

const longDate = (d: string) => parseDate(d).toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short' });

function planAsText(blocks: PlanBlock[]): string {
  const lines: string[] = [];
  let current = '';
  for (const b of blocks) {
    if (b.date !== current) {
      current = b.date;
      lines.push('', longDate(b.date));
    }
    lines.push(`  ${b.start}-${b.end}  ${b.topicName}  (${METHOD_BY_ID[b.methodId].name}, ${KIND_LABEL[b.kind].toLowerCase()})`);
  }
  return lines.join('\n').trim();
}

function planAsIcs(blocks: PlanBlock[]): string {
  const stamp = (d: string, t: string) => `${d.replace(/-/g, '')}T${t.replace(':', '')}00`;
  const esc = (s: string) => s.replace(/([,;\\])/g, '\\$1');
  const events = blocks.map((b) =>
    [
      'BEGIN:VEVENT',
      `UID:${b.id}@grove`,
      `DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').slice(0, 15)}Z`,
      `DTSTART:${stamp(b.date, b.start)}`,
      `DTEND:${stamp(b.date, b.end)}`,
      `SUMMARY:${esc(`Study: ${b.topicName}`)}`,
      `DESCRIPTION:${esc(`${METHOD_BY_ID[b.methodId].name} (${KIND_LABEL[b.kind].toLowerCase()})`)}`,
      'END:VEVENT',
    ].join('\r\n')
  );
  return ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Grove//Study plan//EN', ...events, 'END:VCALENDAR'].join('\r\n');
}

export const PlannerView: React.FC<PlannerViewProps> = ({ courses, profile, onStartSession }) => {
  const saved = useMemo(() => studyStore.getPlan(), []);
  const [inputs, setInputs] = useState<PlanInputs>(() =>
    saved ? { ...saved.inputs, topics: courseTopics(courses, profile, saved.inputs.topics).topics } : defaultInputs(courses, profile)
  );
  const [plan, setPlan] = useState<SavedPlan | null>(saved);
  const [customTopic, setCustomTopic] = useState('');
  const [copied, setCopied] = useState(false);
  const [weeks, setWeeks] = useState('');

  const set = <K extends keyof PlanInputs>(key: K, value: PlanInputs[K]) => setInputs((p) => ({ ...p, [key]: value }));
  const [today] = useState(() => fmtDate(new Date()));

  const allTopics = inputs.topics;
  const setTopic = (id: string, patch: Partial<PlanTopic>) => set('topics', allTopics.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  const [excluded, setExcluded] = useState<Set<string>>(() => courseTopics(courses, profile, saved?.inputs.topics).excluded);
  const activeTopics = allTopics.filter((t) => !excluded.has(t.id));

  const build = () => {
    const result = generatePlan({ ...inputs, topics: activeTopics });
    const next: SavedPlan = { inputs: { ...inputs, topics: activeTopics }, blocks: result.blocks, warnings: result.warnings, generatedAt: new Date().toISOString() };
    setPlan(next);
    studyStore.savePlan(next);
  };

  const toggleDone = (id: string) => {
    if (!plan) return;
    const next = { ...plan, blocks: plan.blocks.map((b) => (b.id === id ? { ...b, done: !b.done } : b)) };
    setPlan(next);
    studyStore.savePlan(next);
  };

  const clearPlan = () => {
    setPlan(null);
    studyStore.savePlan(null);
  };

  const copyText = async () => {
    if (!plan) return;
    try {
      await navigator.clipboard.writeText(planAsText(plan.blocks));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* clipboard blocked */
    }
  };

  const downloadIcs = () => {
    if (!plan) return;
    const url = URL.createObjectURL(new Blob([planAsIcs(plan.blocks)], { type: 'text/calendar' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = 'grove-study-plan.ics';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleMethod = (id: MethodId) =>
    set('methods', inputs.methods.includes(id) ? inputs.methods.filter((m) => m !== id) : [...inputs.methods, id]);

  const addCustom = () => {
    const name = customTopic.trim();
    if (!name) return;
    set('topics', [...allTopics, { id: `custom-${Date.now()}`, name, confidence: 3 }]);
    setCustomTopic('');
  };

  // Group the timetable by week, Monday first.
  const weeksList = useMemo(() => {
    if (!plan) return [];
    const groups = new Map<string, PlanBlock[]>();
    for (const b of plan.blocks) {
      const d = parseDate(b.date);
      const monday = addDays(d, -((d.getDay() + 6) % 7));
      const key = fmtDate(monday);
      groups.set(key, [...(groups.get(key) ?? []), b]);
    }
    return [...groups.entries()];
  }, [plan]);

  const done = plan ? plan.blocks.filter((b) => b.done).length : 0;
  const total = plan ? plan.blocks.length : 0;
  const perTopic = useMemo(() => {
    if (!plan) return [];
    const m = new Map<string, number>();
    plan.blocks.forEach((b) => m.set(b.topicName, (m.get(b.topicName) ?? 0) + 1));
    return [...m.entries()].sort((a, b) => b[1] - a[1]);
  }, [plan]);
  const maxPer = perTopic[0]?.[1] ?? 1;
  const studyDays = plan ? new Set(plan.blocks.map((b) => b.date)).size : 0;
  const hours = plan ? Math.round(((total * plan.inputs.sessionMinutes) / 60) * 10) / 10 : 0;

  return (
    <div className="space-y-5">
      <section className={`${panel} space-y-6`} aria-label="Timetable details">
        <div>
          <h2 className="text-xl text-text">Build your study timetable</h2>
          <p className="mt-1 text-muted">Tell Grove how long you have and how much time you can give. It spreads your topics across the days, gives shakier topics more time, and picks a method for each session.</p>
        </div>

        <fieldset className="space-y-3">
          <legend className={labelCls}>1. When do you need to be ready?</legend>
          <Segmented
            label="Goal"
            value={inputs.goal}
            onChange={(g) => set('goal', g)}
            options={[
              { id: 'exam', label: 'My next exam' },
              { id: 'semester', label: 'End of semester' },
            ]}
          />
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="p-start" className={labelCls}>Start from</label>
              <input id="p-start" type="date" value={inputs.startDate} min={today} onChange={(e) => set('startDate', e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="p-target" className={labelCls}>{inputs.goal === 'exam' ? 'Exam date' : 'Semester ends'}</label>
              <input id="p-target" type="date" value={inputs.targetDate} min={inputs.startDate} onChange={(e) => set('targetDate', e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="p-weeks" className={labelCls}>Or weeks from start</label>
              <input
                id="p-weeks"
                type="number"
                min={1}
                max={30}
                inputMode="numeric"
                value={weeks}
                placeholder="e.g. 6"
                onChange={(e) => {
                  setWeeks(e.target.value);
                  const n = Number(e.target.value);
                  if (n > 0) set('targetDate', fmtDate(addDays(parseDate(inputs.startDate), n * 7)));
                }}
                className={field}
              />
            </div>
          </div>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className={labelCls}>2. How much time can you give?</legend>
          <div>
            <p className="mb-1.5 text-sm text-muted">Days you can study</p>
            <div className="flex flex-wrap gap-1.5" role="group" aria-label="Study days">
              {DAY_LABELS.map((d, i) => (
                <button
                  key={d}
                  type="button"
                  aria-pressed={inputs.days[i]}
                  onClick={() => set('days', inputs.days.map((v, j) => (j === i ? !v : v)))}
                  className={`min-h-10 min-w-12 rounded-md px-3 text-sm font-medium ${inputs.days[i] ? 'bg-accent text-ink' : 'text-muted ring-1 ring-line hover:bg-raised'}`}
                >
                  {d}
                </button>
              ))}
            </div>
          </div>
          <Disclosure summary={`Hours, start time, breaks (${inputs.hoursPerDay} h a day, ${inputs.sessionMinutes} min sessions)`}>
          <div className="space-y-3">
          <div className="grid gap-3 sm:grid-cols-3">
            <div>
              <label htmlFor="p-hours" className={labelCls}>Hours on a study day</label>
              <input
                id="p-hours"
                type="number"
                min={0.5}
                max={12}
                step={0.5}
                inputMode="decimal"
                value={inputs.hoursPerDay}
                onChange={(e) => set('hoursPerDay', Number(e.target.value))}
                className={field}
              />
            </div>
            <div>
              <label htmlFor="p-time" className={labelCls}>Usual start time</label>
              <input id="p-time" type="time" value={inputs.startTime} onChange={(e) => set('startTime', e.target.value)} className={field} />
            </div>
            <div>
              <label htmlFor="p-break" className={labelCls}>Break between sessions</label>
              <select id="p-break" value={inputs.breakMinutes} onChange={(e) => set('breakMinutes', Number(e.target.value))} className={field}>
                {[5, 10, 15].map((m) => (
                  <option key={m} value={m}>{m} minutes</option>
                ))}
              </select>
            </div>
          </div>
          <div>
            <p className="mb-1.5 text-sm text-muted">Session length</p>
            <Segmented
              label="Session length in minutes"
              value={String(inputs.sessionMinutes) as (typeof SESSION_OPTIONS)[number]}
              onChange={(v) => set('sessionMinutes', Number(v))}
              options={SESSION_OPTIONS.map((s) => ({ id: s, label: `${s} min` }))}
            />
          </div>
          </div>
          </Disclosure>
        </fieldset>

        <fieldset className="space-y-3">
          <legend className={labelCls}>3. What are you studying, and how confident are you?</legend>
          <ul className="divide-y divide-line">
            {allTopics.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-2">
                <label className="flex min-h-10 min-w-0 flex-1 basis-56 cursor-pointer items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!excluded.has(t.id)}
                    onChange={() => setExcluded((s) => { const n = new Set(s); if (n.has(t.id)) n.delete(t.id); else n.add(t.id); return n; })}
                    className="h-4 w-4 accent-[var(--color-accent)]"
                  />
                  <span className="truncate text-text">{t.name}</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-muted">
                  <span>Confidence</span>
                  <select value={t.confidence} onChange={(e) => setTopic(t.id, { confidence: Number(e.target.value) })} className="rounded-md bg-bg px-2 py-1.5 text-text ring-1 ring-line">
                    <option value={1}>1 Shaky</option>
                    <option value={2}>2 Unsure</option>
                    <option value={3}>3 Okay</option>
                    <option value={4}>4 Good</option>
                    <option value={5}>5 Strong</option>
                  </select>
                </label>
              </li>
            ))}
          </ul>
          <div className="flex gap-2">
            <input
              type="text"
              value={customTopic}
              onChange={(e) => setCustomTopic(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCustom(); } }}
              placeholder="Add another topic or course"
              aria-label="Add another topic"
              className={field}
            />
            <button type="button" className={quietBtn} onClick={addCustom}>Add</button>
          </div>
        </fieldset>

        <Disclosure summary={`Study methods to use (${inputs.methods.length} of ${STUDY_METHODS.length})`}>
          <div className="flex flex-wrap gap-2" role="group" aria-label="Methods">
            {STUDY_METHODS.map((m) => (
              <button
                key={m.id}
                type="button"
                aria-pressed={inputs.methods.includes(m.id)}
                onClick={() => toggleMethod(m.id)}
                className={`min-h-9 rounded-full px-3.5 text-sm ${inputs.methods.includes(m.id) ? 'bg-raised text-text ring-1 ring-accent/60' : 'text-muted ring-1 ring-line'}`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </Disclosure>

        <div className="flex flex-wrap items-center gap-3">
          <button className={primaryBtn} onClick={build}>{plan ? 'Rebuild timetable' : 'Build my timetable'}</button>
          {plan && <button className={quietBtn} onClick={clearPlan}>Clear</button>}
        </div>
      </section>

      {plan && plan.warnings.length > 0 && (
        <section className="rounded-[10px] bg-surface p-4 ring-1 ring-warn/50" role="status">
          <ul className="list-disc space-y-1 pl-5 text-text">
            {plan.warnings.map((w, i) => <li key={i}>{w}</li>)}
          </ul>
        </section>
      )}

      {plan && plan.blocks.length > 0 && (
        <>
          <section className={`${panel} space-y-4`} aria-label="Plan summary">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="text-[17px] text-text">Your timetable</h3>
                <p className="mt-1 text-sm text-muted">{studyDays} study days · {total} sessions · {hours} hours · {done} done</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className={quietBtn} onClick={copyText}>
                  {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                  {copied ? 'Copied' : 'Copy as text'}
                </button>
                <button className={quietBtn} onClick={downloadIcs}>
                  <Download className="h-4 w-4" />
                  Add to calendar
                </button>
              </div>
            </div>

            <div className="h-1.5 overflow-hidden rounded-full bg-raised" role="progressbar" aria-valuenow={done} aria-valuemin={0} aria-valuemax={total} aria-label="Sessions completed">
              <div className="h-full rounded-full bg-accent" style={{ width: `${total ? (done / total) * 100 : 0}%` }} />
            </div>

            <div>
              <p className={labelCls}>Sessions per topic</p>
              <ul className="space-y-1.5">
                {perTopic.map(([name, n]) => (
                  <li key={name} className="grid grid-cols-[minmax(0,12rem)_1fr_2rem] items-center gap-3 text-sm">
                    <span className="truncate text-muted">{name}</span>
                    <span className="h-1.5 overflow-hidden rounded-full bg-raised"><span className="block h-full rounded-full bg-accent/70" style={{ width: `${(n / maxPer) * 100}%` }} /></span>
                    <span className="text-right tabular-nums text-muted">{n}</span>
                  </li>
                ))}
              </ul>
            </div>
            <p className="text-sm text-muted">
              The plan starts with learning new material, moves to review as the date gets closer, and ends with exam practice. Tap Start on any session to open it in the Study tab.
            </p>
          </section>

          {weeksList.map(([monday, blocks], idx) => {
            const dates = [...new Set(blocks.map((b) => b.date))];
            const firstOpen = weeksList.findIndex(([, bl]) => bl.some((b) => b.date >= today));
            return (
              <section key={monday} className={panel} aria-label={`Week of ${longDate(monday)}`}>
                <Disclosure defaultOpen={idx === (firstOpen === -1 ? 0 : firstOpen)} summary={<span className="font-display text-[17px] text-text">Week of {longDate(monday)} <span className="font-sans text-sm text-muted">· {blocks.filter((b) => b.done).length}/{blocks.length} done</span></span>}>
                  <div className="space-y-4">
                    {dates.map((d) => (
                      <div key={d}>
                        <p className="font-mono text-xs uppercase tracking-[0.08em] text-accent">
                          {longDate(d)}{d === today ? ' · today' : ''}
                        </p>
                        <ul className="mt-1 divide-y divide-line">
                          {blocks.filter((b) => b.date === d).map((b) => (
                            <li key={b.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                              <label className="flex min-h-10 min-w-0 flex-1 basis-64 cursor-pointer items-center gap-3">
                                <input type="checkbox" checked={b.done} onChange={() => toggleDone(b.id)} className="h-4 w-4 accent-[var(--color-accent)]" aria-label={`Mark ${b.topicName} at ${b.start} done`} />
                                <span className="min-w-0">
                                  <span className={`block truncate ${b.done ? 'text-muted line-through' : 'text-text'}`}>{b.topicName}</span>
                                  <span className="block font-mono text-xs text-muted">{b.start} to {b.end}</span>
                                </span>
                              </label>
                              <span className={chip}>{METHOD_BY_ID[b.methodId].name}</span>
                              <span className="w-24 text-xs text-muted">{KIND_LABEL[b.kind]}</span>
                              <button
                                className="min-h-9 rounded-md px-3 text-sm font-medium text-accent hover:bg-raised"
                                onClick={() => onStartSession({ methodId: b.methodId, courseId: b.courseId, topicName: b.topicName })}
                              >
                                Start
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ))}
                  </div>
                </Disclosure>
              </section>
            );
          })}
        </>
      )}
    </div>
  );
};
