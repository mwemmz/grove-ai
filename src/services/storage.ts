import { Course, Note, LearningProfile, Flashcard, PortfolioSkill, PortfolioProject, ChatMessage } from '../types';
import { 
  INITIAL_COURSES, 
  INITIAL_NOTES, 
  INITIAL_PROFILE, 
  INITIAL_FLASHCARDS, 
  INITIAL_SKILLS, 
  INITIAL_PROJECTS 
} from '../data/mockData';

const STORAGE_KEYS = {
  COURSES: 'grove_courses_v1',
  NOTES: 'grove_notes_v1',
  PROFILE: 'grove_profile_v1',
  FLASHCARDS: 'grove_flashcards_v1',
  SKILLS: 'grove_skills_v1',
  PROJECTS: 'grove_projects_v1',
  CHAT_HISTORY: 'grove_chat_v1',
  API_KEY: 'grove_api_key_v1',
  API_PROVIDER: 'grove_api_provider_v1',
};

export const storage = {
  getCourses(): Course[] {
    const raw = localStorage.getItem(STORAGE_KEYS.COURSES);
    if (!raw) {
      this.saveCourses(INITIAL_COURSES);
      return INITIAL_COURSES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_COURSES;
    }
  },

  saveCourses(courses: Course[]): void {
    localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
  },

  getNotes(): Note[] {
    const raw = localStorage.getItem(STORAGE_KEYS.NOTES);
    if (!raw) {
      this.saveNotes(INITIAL_NOTES);
      return INITIAL_NOTES;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_NOTES;
    }
  },

  saveNotes(notes: Note[]): void {
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(notes));
  },

  getProfile(): LearningProfile {
    const raw = localStorage.getItem(STORAGE_KEYS.PROFILE);
    if (!raw) {
      this.saveProfile(INITIAL_PROFILE);
      return INITIAL_PROFILE;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_PROFILE;
    }
  },

  saveProfile(profile: LearningProfile): void {
    localStorage.setItem(STORAGE_KEYS.PROFILE, JSON.stringify(profile));
  },

  getFlashcards(): Flashcard[] {
    const raw = localStorage.getItem(STORAGE_KEYS.FLASHCARDS);
    if (!raw) {
      this.saveFlashcards(INITIAL_FLASHCARDS);
      return INITIAL_FLASHCARDS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_FLASHCARDS;
    }
  },

  saveFlashcards(cards: Flashcard[]): void {
    localStorage.setItem(STORAGE_KEYS.FLASHCARDS, JSON.stringify(cards));
  },

  getSkills(): PortfolioSkill[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SKILLS);
    if (!raw) {
      this.saveSkills(INITIAL_SKILLS);
      return INITIAL_SKILLS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_SKILLS;
    }
  },

  saveSkills(skills: PortfolioSkill[]): void {
    localStorage.setItem(STORAGE_KEYS.SKILLS, JSON.stringify(skills));
  },

  getProjects(): PortfolioProject[] {
    const raw = localStorage.getItem(STORAGE_KEYS.PROJECTS);
    if (!raw) {
      this.saveProjects(INITIAL_PROJECTS);
      return INITIAL_PROJECTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_PROJECTS;
    }
  },

  saveProjects(projects: PortfolioProject[]): void {
    localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify(projects));
  },

  getChatHistory(): ChatMessage[] {
    const raw = localStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    if (!raw) return [];
    try {
      return JSON.parse(raw);
    } catch {
      return [];
    }
  },

  saveChatHistory(history: ChatMessage[]): void {
    localStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(history));
  },

  getApiKey(): string {
    return localStorage.getItem(STORAGE_KEYS.API_KEY) || '';
  },

  saveApiKey(key: string): void {
    localStorage.setItem(STORAGE_KEYS.API_KEY, key);
  },

  getApiProvider(): 'mock' | 'gemini' | 'openai' {
    return (localStorage.getItem(STORAGE_KEYS.API_PROVIDER) as any) || 'mock';
  },

  saveApiProvider(provider: 'mock' | 'gemini' | 'openai'): void {
    localStorage.setItem(STORAGE_KEYS.API_PROVIDER, provider);
  },

  resetAllToDemo(): void {
    localStorage.removeItem(STORAGE_KEYS.COURSES);
    localStorage.removeItem(STORAGE_KEYS.NOTES);
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    localStorage.removeItem(STORAGE_KEYS.FLASHCARDS);
    localStorage.removeItem(STORAGE_KEYS.SKILLS);
    localStorage.removeItem(STORAGE_KEYS.PROJECTS);
    localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
    
    this.saveCourses(INITIAL_COURSES);
    this.saveNotes(INITIAL_NOTES);
    this.saveProfile(INITIAL_PROFILE);
    this.saveFlashcards(INITIAL_FLASHCARDS);
    this.saveSkills(INITIAL_SKILLS);
    this.saveProjects(INITIAL_PROJECTS);
  },

  exportBackupJson(): string {
    const backup = {
      courses: this.getCourses(),
      notes: this.getNotes(),
      profile: this.getProfile(),
      flashcards: this.getFlashcards(),
      skills: this.getSkills(),
      projects: this.getProjects(),
      exportedAt: new Date().toISOString(),
      app: 'Grove - Degree-Long AI Learning Companion'
    };
    return JSON.stringify(backup, null, 2);
  },

  importBackupJson(jsonString: string): boolean {
    try {
      const data = JSON.parse(jsonString);
      if (data.notes && Array.isArray(data.notes)) this.saveNotes(data.notes);
      if (data.courses && Array.isArray(data.courses)) this.saveCourses(data.courses);
      if (data.profile) this.saveProfile(data.profile);
      if (data.flashcards && Array.isArray(data.flashcards)) this.saveFlashcards(data.flashcards);
      if (data.skills && Array.isArray(data.skills)) this.saveSkills(data.skills);
      if (data.projects && Array.isArray(data.projects)) this.saveProjects(data.projects);
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }
};
