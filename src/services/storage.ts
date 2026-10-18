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
import { apiGet, apiPost, apiPut } from '../lib/api';

/**
 * Client-side data facade. Reads are synchronous against an in-memory
 * cache; writes update the cache immediately and sync to the Postgres
 * backend (via /api/*) in the background. `hydrate()` must resolve once
 * after sign-in before views are mounted.
 *
 * The LLM API key / provider remain localStorage-only client secrets.
 */

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
      run().catch((err) => console.error(`Sync failed for ${key}:`, err));
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
      .catch((err) => {
        console.error('Failed to load data from server, using local demo data:', err);
      })
      .finally(() => {
        hydrating = null;
      });

    return hydrating;
  },

  isHydrated(): boolean {
    return hydrated;
  },

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
