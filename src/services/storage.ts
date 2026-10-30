import {
  Course,
  Note,
  LearningProfile,
  Flashcard,
  PortfolioSkill,
  PortfolioProject,
  ChatMessage,
  SeniorComment,
  StudyBlueprint,
  TutorProfile,
  TutorRequest,
} from '../types';
import {
  INITIAL_COURSES,
  INITIAL_NOTES,
  INITIAL_PROFILE,
  INITIAL_FLASHCARDS,
  INITIAL_SKILLS,
  INITIAL_PROJECTS,
  INITIAL_SENIOR_COMMENTS,
  INITIAL_STUDY_BLUEPRINTS,
  INITIAL_TUTORS,
  INITIAL_TUTOR_REQUESTS,
} from '../data/mockData';
import { DEMO_IDS, DEMO_UNIVERSITY } from '../data/demoIds';
import { apiGet, apiPost, apiPut } from '../lib/api';
import { get as idbGet, set as idbSet, del as idbDel } from 'idb-keyval';

/**
 * Client-side data facade. Reads are synchronous against an in-memory
 * cache; writes update the cache immediately and sync to the Postgres
 * backend (via /api/*) in the background. `hydrate()` must resolve once
 * after sign-in before views are mounted.
 *
 * The LLM API key / provider remain localStorage-only client secrets.
 */

export type LiveProviderId = string; // built-in, catalog or custom provider id
export type AiTask = 'ask' | 'quiz';
export interface AiConfig {
  order: LiveProviderId[]; // priority order, first is tried first. Only providers the student has added.
  routes: Record<AiTask, LiveProviderId | 'auto'>;
  failover: boolean; // on failure, hand the same request to the next provider
  custom: CustomProvider[]; // providers the student added by hand
}
import { BUILTIN_IDS, catalogById, type CustomProvider } from '../shared/providerCatalog';
const API_KEY = 'grove_api_key_v1';
const API_PROVIDER = 'grove_api_provider_v1';
const currentProvider = (): 'mock' | 'anthropic' | 'gemini' | 'openai' => {
  const p = localStorage.getItem(API_PROVIDER);
  return p === 'anthropic' || p === 'gemini' || p === 'openai' ? p : 'mock';
};

interface DataCache {
  courses: Course[];
  notes: Note[];
  profile: LearningProfile;
  flashcards: Flashcard[];
  skills: PortfolioSkill[];
  projects: PortfolioProject[];
  chat: ChatMessage[];
  seniorComments: SeniorComment[];
  blueprints: StudyBlueprint[];
  tutors: TutorProfile[];
  tutorRequests: TutorRequest[];
}

const cache: DataCache = {
  courses: INITIAL_COURSES,
  notes: INITIAL_NOTES,
  profile: INITIAL_PROFILE,
  flashcards: INITIAL_FLASHCARDS,
  skills: INITIAL_SKILLS,
  projects: INITIAL_PROJECTS,
  chat: [],
  seniorComments: INITIAL_SENIOR_COMMENTS,
  blueprints: INITIAL_STUDY_BLUEPRINTS,
  tutors: INITIAL_TUTORS,
  tutorRequests: INITIAL_TUTOR_REQUESTS,
};

let hydrated = false;
let hydrating: Promise<void> | null = null;

/* ---------- a copy on this device, so Grove opens and works without a connection ---------- */

/** Whose data this is (the signed-in account); the device copy is kept per account. */
let owner: string | null = null;
/** Where the data on screen came from: the server, the copy on this device, or nowhere yet (sample data). */
let source: 'server' | 'device' | 'none' = 'none';
const listeners = new Set<() => void>();
const notify = () => listeners.forEach((f) => f());

const SNAP = (id: string) => `grove-snap:${id}`;
const DIRTY = (id: string) => `grove_dirty_${id}`;
const LAST_USER = 'grove_last_user';
const ROUTES: Record<string, { route: string; field: keyof DataCache }> = {
  courses: { route: '/courses', field: 'courses' },
  notes: { route: '/notes', field: 'notes' },
  profile: { route: '/profile', field: 'profile' },
  flashcards: { route: '/flashcards', field: 'flashcards' },
  skills: { route: '/skills', field: 'skills' },
  projects: { route: '/projects', field: 'projects' },
  chat: { route: '/chat', field: 'chat' },
  'senior-comments': { route: '/senior-comments', field: 'seniorComments' },
  seniorComments: { route: '/senior-comments', field: 'seniorComments' },
  blueprints: { route: '/blueprints', field: 'blueprints' },
  tutors: { route: '/tutors', field: 'tutors' },
  'tutor-requests': { route: '/tutor-requests', field: 'tutorRequests' },
  tutorRequests: { route: '/tutor-requests', field: 'tutorRequests' },
};
const readDirty = (): string[] => {
  if (!owner) return [];
  try {
    return JSON.parse(localStorage.getItem(DIRTY(owner)) ?? '[]');
  } catch {
    return [];
  }
};
const writeDirty = (keys: string[]) => {
  if (!owner) return;
  try {
    if (keys.length) localStorage.setItem(DIRTY(owner), JSON.stringify([...new Set(keys)]));
    else localStorage.removeItem(DIRTY(owner));
  } catch {
    /* storage full or private mode */
  }
  notify();
};
let snapTimer: ReturnType<typeof setTimeout> | null = null;
function saveSnapshot(): void {
  // Only real data is kept: never the sample data shown before anything has loaded.
  if (!owner || source === 'none') return;
  if (snapTimer) clearTimeout(snapTimer);
  const id = owner;
  snapTimer = setTimeout(() => void idbSet(SNAP(id), { ...cache, at: Date.now() }).catch(() => {}), 600);
}

/** Sends changes made while offline. Each collection is saved whole, so the latest copy on this device wins. */
async function flushDirty(): Promise<void> {
  if (source === 'none') return;
  let left = readDirty();
  for (const key of [...left]) {
    const r = ROUTES[key];
    if (!r) {
      left = left.filter((k) => k !== key);
      continue;
    }
    try {
      await apiPut(r.route, cache[r.field]);
      left = left.filter((k) => k !== key);
    } catch {
      break; // still offline
    }
  }
  writeDirty(left);
}
if (typeof window !== 'undefined') window.addEventListener('online', () => void flushDirty());

// Background sync with a short debounce so rapid successive writes
// (e.g. toggling several settings) coalesce into one PUT.
const SYNC_DEBOUNCE_MS = 150;
const pendingSyncs = new Map<string, ReturnType<typeof setTimeout>>();

function scheduleSync(key: string, run: () => Promise<unknown>): void {
  const existing = pendingSyncs.get(key);
  if (existing) clearTimeout(existing);
  pendingSyncs.set(
    key,
    setTimeout(() => {
      pendingSyncs.delete(key);
      // Before anything real has loaded, the cache holds sample data: never send that over the student's own.
      if (source === 'none') return;
      saveSnapshot();
      const send = navigator.onLine ? run() : Promise.reject(new Error('offline'));
      send.catch((err) => {
        // Kept on this device and sent when the connection is back.
        writeDirty([...readDirty(), key]);
        if (navigator.onLine) console.error(`Sync failed for ${key}:`, err);
      });
    }, SYNC_DEBOUNCE_MS),
  );
}

/** Flushes any debounced writes immediately (used before sign-out). */
async function flushPendingSyncs(): Promise<void> {
  const entries = [...pendingSyncs.entries()];
  pendingSyncs.clear();
  await Promise.allSettled(entries.map(([, timer]) => clearTimeout(timer)));
}

async function loadAllFromServer(): Promise<void> {
  const [
    courses,
    notes,
    profile,
    flashcards,
    skills,
    projects,
    chat,
    seniorComments,
    blueprints,
    tutors,
    tutorRequests,
  ] = await Promise.all([
    apiGet<Course[]>('/courses'),
    apiGet<Note[]>('/notes'),
    apiGet<LearningProfile>('/profile'),
    apiGet<Flashcard[]>('/flashcards'),
    apiGet<PortfolioSkill[]>('/skills'),
    apiGet<PortfolioProject[]>('/projects'),
    apiGet<ChatMessage[]>('/chat'),
    apiGet<SeniorComment[]>('/senior-comments'),
    apiGet<StudyBlueprint[]>('/blueprints'),
    apiGet<TutorProfile[]>('/tutors'),
    apiGet<TutorRequest[]>('/tutor-requests'),
  ]);

  cache.courses = courses;
  cache.notes = notes;
  cache.profile = profile;
  cache.flashcards = flashcards;
  cache.skills = skills;
  cache.projects = projects;
  cache.chat = chat;
  cache.seniorComments = seniorComments;
  cache.blueprints = blueprints;
  cache.tutors = tutors;
  cache.tutorRequests = tutorRequests;
  source = 'server';
  // Changes made offline last time that never reached the server: the device copy of those collections wins.
  const dirty = readDirty();
  if (dirty.length && owner) {
    const snap = (await idbGet(SNAP(owner)).catch(() => undefined)) as Partial<DataCache> | undefined;
    if (snap) for (const k of dirty) {
      const f = ROUTES[k]?.field;
      if (f && snap[f] !== undefined) (cache as unknown as Record<string, unknown>)[f] = snap[f];
    }
  }
  purgeSamples();
  saveSnapshot();
  void flushDirty();
}

/** No connection: use the copy saved on this device the last time this account was online. */
async function loadFromDevice(): Promise<boolean> {
  if (!owner) return false;
  const snap = (await idbGet(SNAP(owner)).catch(() => undefined)) as (DataCache & { at: number }) | undefined;
  if (!snap) return false;
  for (const k of Object.keys(cache) as (keyof DataCache)[]) if (snap[k] !== undefined) (cache as unknown as Record<string, unknown>)[k] = snap[k];
  source = 'device';
  savedAt = snap.at;
  return true;
}
let savedAt = 0;

/** Accounts made before Grove started empty still hold the old sample records. Clear them once, and save the result. */
function purgeSamples(): void {
  const drop = <T>(items: T[], key: (t: T) => string, demo: readonly string[]): T[] => items.filter((t) => !demo.includes(key(t)));
  const clean = <K extends 'courses' | 'notes' | 'flashcards' | 'projects' | 'seniorComments' | 'blueprints' | 'tutors' | 'tutorRequests' | 'skills', V extends { id?: string; name?: string }>(
    name: K,
    route: string,
    items: V[],
    demo: readonly string[],
    key: (v: V) => string
  ) => {
    const kept = drop(items, key, demo);
    if (kept.length !== items.length) {
      (cache as unknown as Record<string, unknown>)[name] = kept;
      scheduleSync(name, () => apiPut(route, kept));
    }
  };
  clean('courses', '/courses', cache.courses, DEMO_IDS.courses, (c) => c.id ?? '');
  clean('notes', '/notes', cache.notes, DEMO_IDS.notes, (n) => n.id ?? '');
  clean('flashcards', '/flashcards', cache.flashcards, DEMO_IDS.flashcards, (f) => f.id ?? '');
  clean('projects', '/projects', cache.projects, DEMO_IDS.projects, (p) => p.id ?? '');
  clean('seniorComments', '/senior-comments', cache.seniorComments, DEMO_IDS.seniorComments, (c) => c.id ?? '');
  clean('blueprints', '/blueprints', cache.blueprints, DEMO_IDS.blueprints, (b) => b.id ?? '');
  clean('tutors', '/tutors', cache.tutors, DEMO_IDS.tutors, (t) => t.id ?? '');
  clean('tutorRequests', '/tutor-requests', cache.tutorRequests, DEMO_IDS.tutorRequests, (r) => r.id ?? '');
  clean('skills', '/skills', cache.skills, DEMO_IDS.skills, (k) => k.name ?? '');
  if (cache.profile.university === DEMO_UNIVERSITY) {
    // Keep the name the student set; drop the sample strengths, weak topics, memory log and counters.
    cache.profile = { ...INITIAL_PROFILE, studentName: cache.profile.studentName === 'Alex Chimwaza' ? '' : cache.profile.studentName, currentYear: 3 };
    scheduleSync('profile', () => apiPut('/profile', cache.profile));
  }
}

export const storage = {
  /**
   * Fetches all server data into the cache. Idempotent; concurrent
   * callers share one in-flight request. On network failure the demo
   * seed data in the cache is kept so the UI still works offline-ish.
   */
  hydrate(): Promise<void> {
    if (hydrated) return Promise.resolve();
    if (hydrating) return hydrating;

    hydrating = loadAllFromServer()
      .then(() => {
        hydrated = true;
      })
      .catch(async (err) => {
        if (await loadFromDevice()) return;
        console.error('Failed to load data from server and nothing is saved on this device:', err);
      })
      .finally(() => {
        hydrating = null;
        notify();
      });

    return hydrating;
  },

  isHydrated(): boolean {
    return hydrated;
  },

  /** The signed-in account, so its device copy is kept apart from anyone else who uses this browser. */
  setOwner(id: string | null, who?: { username?: string | null; name?: string | null }): void {
    owner = id;
    if (id && who) {
      try {
        localStorage.setItem(LAST_USER, JSON.stringify({ id, username: who.username ?? '', name: who.name ?? '' }));
      } catch {
        /* private mode */
      }
    }
  },
  /** Who last used Grove on this device: lets it open offline, when the sign-in service can't be reached. */
  lastUser(): { id: string; username: string; name: string } | null {
    try {
      return JSON.parse(localStorage.getItem(LAST_USER) ?? 'null');
    } catch {
      return null;
    }
  },
  /** Signing out removes this account's copy from the device. */
  async forgetDevice(): Promise<void> {
    await flushDirty().catch(() => {});
    const id = owner ?? storage.lastUser()?.id;
    if (id) await idbDel(SNAP(id)).catch(() => {});
    try {
      localStorage.removeItem(LAST_USER);
      if (id) localStorage.removeItem(DIRTY(id));
    } catch {
      /* ignore */
    }
  },
  /** For the offline banner: where data came from, when the device copy was saved, and how many changes wait to be sent. */
  status(): { source: 'server' | 'device' | 'none'; savedAt: number; waiting: number } {
    return { source, savedAt, waiting: readDirty().length };
  },
  subscribe(f: () => void): () => void {
    listeners.add(f);
    return () => listeners.delete(f);
  },
  flush: () => flushDirty(),

  // --- Courses ---
  getCourses(): Course[] {
    return cache.courses;
  },

  saveCourses(courses: Course[]): void {
    cache.courses = courses;
    scheduleSync('courses', () => apiPut('/courses', courses));
  },

  // --- Notes ---
  getNotes(): Note[] {
    return cache.notes;
  },

  saveNotes(notes: Note[]): void {
    cache.notes = notes;
    scheduleSync('notes', () => apiPut('/notes', notes));
  },

  // --- Profile ---
  getProfile(): LearningProfile {
    return cache.profile;
  },

  saveProfile(profile: LearningProfile): void {
    cache.profile = profile;
    scheduleSync('profile', () => apiPut('/profile', profile));
  },

  // --- Flashcards ---
  getFlashcards(): Flashcard[] {
    return cache.flashcards;
  },

  saveFlashcards(cards: Flashcard[]): void {
    cache.flashcards = cards;
    scheduleSync('flashcards', () => apiPut('/flashcards', cards));
  },

  // --- Portfolio skills ---
  getSkills(): PortfolioSkill[] {
    return cache.skills;
  },

  saveSkills(skills: PortfolioSkill[]): void {
    cache.skills = skills;
    scheduleSync('skills', () => apiPut('/skills', skills));
  },

  // --- Portfolio projects ---
  getProjects(): PortfolioProject[] {
    return cache.projects;
  },

  saveProjects(projects: PortfolioProject[]): void {
    cache.projects = projects;
    scheduleSync('projects', () => apiPut('/projects', projects));
  },

  // --- Chat history ---
  getChatHistory(): ChatMessage[] {
    return cache.chat;
  },

  saveChatHistory(history: ChatMessage[]): void {
    cache.chat = history;
    scheduleSync('chat', () => apiPut('/chat', history));
  },

  // --- Senior comments ---
  getSeniorComments(): SeniorComment[] {
    return cache.seniorComments;
  },

  saveSeniorComments(comments: SeniorComment[]): void {
    cache.seniorComments = comments;
    scheduleSync('senior-comments', () => apiPut('/senior-comments', comments));
  },

  toggleUpvoteComment(id: string): SeniorComment[] {
    const updated = cache.seniorComments.map((c) => {
      if (c.id !== id) return c;
      const hasUpvoted = !c.hasUpvoted;
      return {
        ...c,
        hasUpvoted,
        upvotes: hasUpvoted ? c.upvotes + 1 : c.upvotes - 1,
      };
    });
    this.saveSeniorComments(updated);
    return updated;
  },

  addSeniorComment(comment: SeniorComment): SeniorComment[] {
    const updated = [comment, ...cache.seniorComments];
    this.saveSeniorComments(updated);
    return updated;
  },

  // --- Study blueprints ---
  getBlueprints(): StudyBlueprint[] {
    return cache.blueprints;
  },

  saveBlueprints(blueprints: StudyBlueprint[]): void {
    cache.blueprints = blueprints;
    scheduleSync('blueprints', () => apiPut('/blueprints', blueprints));
  },

  toggleAdoptBlueprint(id: string): StudyBlueprint[] {
    const updated = cache.blueprints.map((bp) => {
      if (bp.id !== id) return bp;
      const isAdopted = !bp.isAdopted;
      return {
        ...bp,
        isAdopted,
        adoptedByCount: isAdopted ? bp.adoptedByCount + 1 : bp.adoptedByCount - 1,
      };
    });
    this.saveBlueprints(updated);
    return updated;
  },

  // --- Tutors ---
  getTutors(): TutorProfile[] {
    return cache.tutors;
  },

  saveTutors(tutors: TutorProfile[]): void {
    cache.tutors = tutors;
    scheduleSync('tutors', () => apiPut('/tutors', tutors));
  },

  // --- Tutor requests ---
  getTutorRequests(): TutorRequest[] {
    return cache.tutorRequests;
  },

  saveTutorRequests(requests: TutorRequest[]): void {
    cache.tutorRequests = requests;
    scheduleSync('tutor-requests', () => apiPut('/tutor-requests', requests));
  },

  addTutorRequest(req: TutorRequest): TutorRequest[] {
    const updated = [req, ...cache.tutorRequests];
    this.saveTutorRequests(updated);
    return updated;
  },

  updateRequestStatus(id: string, status: TutorRequest['status']): TutorRequest[] {
    const updated = cache.tutorRequests.map((r) => (r.id === id ? { ...r, status } : r));
    this.saveTutorRequests(updated);
    return updated;
  },

  // --- LLM provider settings (client-only secrets) ---
  // One key and one model per provider, so switching provider never sends the wrong key.
  getApiKey(provider: string = currentProvider()): string {
    return localStorage.getItem(`${API_KEY}_${provider}`) || (provider === 'gemini' || provider === 'openai' ? localStorage.getItem(API_KEY) || '' : '');
  },

  saveApiKey(key: string, provider: string = currentProvider()): void {
    if (key) localStorage.setItem(`${API_KEY}_${provider}`, key);
    else localStorage.removeItem(`${API_KEY}_${provider}`);
  },

  getApiModel(provider: string = currentProvider()): string {
    return localStorage.getItem(`grove_api_model_v1_${provider}`) || '';
  },

  saveApiModel(model: string, provider: string = currentProvider()): void {
    if (model) localStorage.setItem(`grove_api_model_v1_${provider}`, model);
    else localStorage.removeItem(`grove_api_model_v1_${provider}`);
  },

  getAiConfig(): AiConfig {
    let cfg: Partial<AiConfig> = {};
    try { cfg = JSON.parse(localStorage.getItem('grove_ai_config_v1') || '{}'); } catch { /* ignore */ }
    const custom = (cfg.custom ?? []).filter((c) => c && typeof c.id === 'string' && typeof c.baseUrl === 'string');
    const known = (id: string) => BUILTIN_IDS.includes(id) || !!catalogById(id) || custom.some((c) => c.id === id);
    const legacy = currentProvider();
    let order = (cfg.order ?? []).filter(known);
    if (order.length === 0 && legacy !== 'mock') order = [legacy];
    BUILTIN_IDS.forEach((p) => { if (!order.includes(p)) order.push(p); });
    const route = (r: string | undefined) => (r && r !== 'auto' && order.includes(r) ? r : 'auto');
    return { order, routes: { ask: route(cfg.routes?.ask), quiz: route(cfg.routes?.quiz) }, failover: cfg.failover !== false, custom };
  },

  saveAiConfig(cfg: AiConfig): void {
    localStorage.setItem('grove_ai_config_v1', JSON.stringify(cfg));
  },

  getApiProvider(): 'mock' | 'anthropic' | 'gemini' | 'openai' {
    const p = localStorage.getItem(API_PROVIDER);
    return p === 'anthropic' || p === 'gemini' || p === 'openai' ? p : 'mock';
  },

  saveApiProvider(provider: 'mock' | 'anthropic' | 'gemini' | 'openai'): void {
    localStorage.setItem(API_PROVIDER, provider);
  },

  // --- Backup / reset (server-backed) ---
  async resetAllToDemo(): Promise<void> {
    await flushPendingSyncs();
    await apiPost('/backup/reset');
    await loadAllFromServer();
  },

  async exportBackupJson(): Promise<string> {
    await flushPendingSyncs();
    const backup = await apiGet<Record<string, unknown>>('/backup');
    return JSON.stringify(backup, null, 2);
  },

  async importBackupJson(jsonString: string): Promise<boolean> {
    try {
      const data = JSON.parse(jsonString);
      await apiPost('/backup/import', data);
      await loadAllFromServer();
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  },
};
