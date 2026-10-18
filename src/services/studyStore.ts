import type { MethodId } from '../data/studyMethods';
import type { PlanInputs, PlanBlock } from '../lib/planner';

const SESSIONS_KEY = 'grove_study_sessions_v1';
const PLAN_KEY = 'grove_study_plan_v1';

export interface StudySession {
  id: string;
  date: string;
  methodId: MethodId;
  topic: string;
  courseCode?: string;
  plannedMinutes: number;
  actualMinutes: number;
  /** 0 to 100 when the method produces a score (recall, blurting, feynman). */
  score?: number;
}

export interface SavedPlan {
  inputs: PlanInputs;
  blocks: PlanBlock[];
  warnings: string[];
  generatedAt: string;
}

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* storage blocked: the app still works for this visit */
  }
}

export const studyStore = {
  getSessions: (): StudySession[] => read<StudySession[]>(SESSIONS_KEY, []),
  addSession(s: StudySession): StudySession[] {
    const all = [s, ...studyStore.getSessions()].slice(0, 200);
    write(SESSIONS_KEY, all);
    return all;
  },
  getPlan: (): SavedPlan | null => read<SavedPlan | null>(PLAN_KEY, null),
  savePlan: (p: SavedPlan | null) => write(PLAN_KEY, p),
};
