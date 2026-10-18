import type { MethodId } from '../data/studyMethods';

export interface PlanTopic {
  id: string;
  name: string;
  /** 1 = shaky, 5 = confident. Shakier topics get more time. */
  confidence: number;
  courseCode?: string;
  courseId?: string;
}

export interface PlanInputs {
  goal: 'exam' | 'semester';
  /** yyyy-mm-dd. For an exam, study stops the day before. */
  targetDate: string;
  startDate: string;
  /** Monday first: [Mon, Tue, Wed, Thu, Fri, Sat, Sun] */
  days: boolean[];
  hoursPerDay: number;
  sessionMinutes: number;
  breakMinutes: number;
  /** HH:MM */
  startTime: string;
  topics: PlanTopic[];
  methods: MethodId[];
}

export type BlockKind = 'learn' | 'review' | 'practice';

export interface PlanBlock {
  id: string;
  date: string;
  start: string;
  end: string;
  topicId: string;
  topicName: string;
  courseCode?: string;
  courseId?: string;
  methodId: MethodId;
  kind: BlockKind;
  done: boolean;
}

export interface PlanResult {
  blocks: PlanBlock[];
  warnings: string[];
  studyDays: number;
  totalMinutes: number;
}

const LEARN_SEQ: MethodId[] = ['sq3r', 'feynman', 'cornell', 'worked-examples', 'dual-coding', 'interrogation', 'socratic'];
const REVIEW_SEQ: MethodId[] = ['blurting', 'recall', 'feynman', 'interleaving'];
const PRACTICE_SEQ: MethodId[] = ['interleaving', 'recall', 'blurting'];

export function parseDate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, 12);
}

export function fmtDate(d: Date): string {
  const p = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

export function addDays(d: Date, n: number): Date {
  const c = new Date(d);
  c.setDate(c.getDate() + n);
  return c;
}

function clock(totalMinutes: number): string {
  const m = ((totalMinutes % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
}

function pickMethod(seq: MethodId[], index: number, allowed: MethodId[]): MethodId {
  const usable = seq.filter((m) => allowed.includes(m));
  if (usable.length) return usable[index % usable.length];
  return allowed[0] ?? 'blurting';
}

export function generatePlan(input: PlanInputs): PlanResult {
  const warnings: string[] = [];
  const empty: PlanResult = { blocks: [], warnings, studyDays: 0, totalMinutes: 0 };

  if (input.topics.length === 0) {
    warnings.push('Pick at least one topic to plan around.');
    return empty;
  }
  if (!input.days.some(Boolean)) {
    warnings.push('Choose at least one day of the week you can study.');
    return empty;
  }
  if (!(input.hoursPerDay > 0) || !(input.sessionMinutes > 0)) {
    warnings.push('Set how many hours a day you can study.');
    return empty;
  }

  const start = parseDate(input.startDate);
  let end = parseDate(input.targetDate);
  if (input.goal === 'exam') end = addDays(end, -1);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    warnings.push('Enter a valid start date and target date.');
    return empty;
  }
  if (end < start) {
    warnings.push('The target date is before your start date. Pick a later date.');
    return empty;
  }

  const studyDates: Date[] = [];
  for (let d = start, guard = 0; d <= end && guard < 400; d = addDays(d, 1), guard++) {
    if (input.days[(d.getDay() + 6) % 7]) studyDates.push(d);
  }
  if (studyDates.length === 0) {
    warnings.push('None of your chosen study days fall before the target date.');
    return empty;
  }

  const session = Math.max(5, input.sessionMinutes);
  const gap = Math.max(0, input.breakMinutes);
  const perDayMinutes = input.hoursPerDay * 60;
  if (perDayMinutes < session) warnings.push('Your daily time is shorter than one session, so the plan has one short session a day.');
  const slotsPerDay = Math.max(1, Math.min(12, Math.floor((perDayMinutes + gap) / (session + gap))));
  if (input.hoursPerDay > 8) warnings.push('More than 8 hours a day is hard to keep up. Consider fewer hours and more days.');

  const n = studyDates.length;
  const learnEnd = n < 4 ? Math.ceil(n / 2) : Math.ceil(n * 0.6);
  const reviewEnd = n < 4 ? n : Math.ceil(n * 0.9);

  const totalSlots = n * slotsPerDay;
  if (totalSlots < input.topics.length * 2) {
    warnings.push(`That is ${totalSlots} sessions for ${input.topics.length} topics. Each topic gets about ${Math.max(1, Math.floor(totalSlots / input.topics.length))}. Add days or hours, or drop a topic.`);
  }

  const startMinutes = (() => {
    const [h, m] = input.startTime.split(':').map(Number);
    return (Number.isFinite(h) ? h : 18) * 60 + (Number.isFinite(m) ? m : 0);
  })();

  const weights = input.topics.map((t) => 6 - Math.min(5, Math.max(1, t.confidence)));
  const weightSum = weights.reduce((a, b) => a + b, 0);
  const allowed = input.methods.length ? input.methods : (['blurting'] as MethodId[]);
  const state = input.topics.map(() => ({ last: -99, blocks: 0 }));
  const blocks: PlanBlock[] = [];

  studyDates.forEach((date, di) => {
    const kind: BlockKind = di < learnEnd ? 'learn' : di < reviewEnd ? 'review' : 'practice';
    const today = input.topics.map(() => 0);
    for (let slot = 0; slot < slotsPerDay; slot++) {
      let best = 0;
      let bestScore = -Infinity;
      const assigned = blocks.length;
      input.topics.forEach((t, i) => {
        const st = state[i];
        // Fair share: each topic's slice of all sessions follows how shaky it is.
        const share = (weights[i] / weightSum) * (assigned + 1);
        let score = share - st.blocks + Math.min(di - st.last, 7) * 0.12 - today[i] * 1.2;
        if (kind === 'learn' && st.blocks === 0) score += 1;
        // stable tie-break so the plan is the same every time
        score -= i * 0.001;
        if (score > bestScore) {
          bestScore = score;
          best = i;
        }
      });
      const t = input.topics[best];
      const seq = kind === 'learn' ? LEARN_SEQ : kind === 'review' ? REVIEW_SEQ : PRACTICE_SEQ;
      const methodId = pickMethod(seq, state[best].blocks, allowed);
      const from = startMinutes + slot * (session + gap);
      blocks.push({
        id: `${fmtDate(date)}-${slot}`,
        date: fmtDate(date),
        start: clock(from),
        end: clock(from + session),
        topicId: t.id,
        topicName: t.name,
        courseCode: t.courseCode,
        courseId: t.courseId,
        methodId,
        kind,
        done: false,
      });
      state[best].blocks += 1;
      state[best].last = di;
      today[best] += 1;
    }
  });

  return { blocks, warnings, studyDays: n, totalMinutes: blocks.length * session };
}
