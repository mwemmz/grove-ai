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
  TutorRequest
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
  INITIAL_TUTOR_REQUESTS
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
  SENIOR_COMMENTS: 'grove_senior_comments_v1',
  BLUEPRINTS: 'grove_blueprints_v1',
  TUTORS: 'grove_tutors_v1',
  TUTOR_REQUESTS: 'grove_tutor_requests_v1',
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

  // --- Senior Comments ---
  getSeniorComments(): SeniorComment[] {
    const raw = localStorage.getItem(STORAGE_KEYS.SENIOR_COMMENTS);
    if (!raw) {
      this.saveSeniorComments(INITIAL_SENIOR_COMMENTS);
      return INITIAL_SENIOR_COMMENTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_SENIOR_COMMENTS;
    }
  },

  saveSeniorComments(comments: SeniorComment[]): void {
    localStorage.setItem(STORAGE_KEYS.SENIOR_COMMENTS, JSON.stringify(comments));
  },

  toggleUpvoteComment(id: string): SeniorComment[] {
    const list = this.getSeniorComments();
    const updated = list.map(c => {
      if (c.id === id) {
        const hasUpvoted = !c.hasUpvoted;
        return {
          ...c,
          hasUpvoted,
          upvotes: hasUpvoted ? c.upvotes + 1 : c.upvotes - 1,
        };
      }
      return c;
    });
    this.saveSeniorComments(updated);
    return updated;
  },

  addSeniorComment(comment: SeniorComment): SeniorComment[] {
    const list = this.getSeniorComments();
    const updated = [comment, ...list];
    this.saveSeniorComments(updated);
    return updated;
  },

  // --- Study Blueprints ---
  getBlueprints(): StudyBlueprint[] {
    const raw = localStorage.getItem(STORAGE_KEYS.BLUEPRINTS);
    if (!raw) {
      this.saveBlueprints(INITIAL_STUDY_BLUEPRINTS);
      return INITIAL_STUDY_BLUEPRINTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_STUDY_BLUEPRINTS;
    }
  },

  saveBlueprints(blueprints: StudyBlueprint[]): void {
    localStorage.setItem(STORAGE_KEYS.BLUEPRINTS, JSON.stringify(blueprints));
  },

  toggleAdoptBlueprint(id: string): StudyBlueprint[] {
    const list = this.getBlueprints();
    const updated = list.map(bp => {
      if (bp.id === id) {
        const isAdopted = !bp.isAdopted;
        return {
          ...bp,
          isAdopted,
          adoptedByCount: isAdopted ? bp.adoptedByCount + 1 : bp.adoptedByCount - 1,
        };
      }
      return bp;
    });
    this.saveBlueprints(updated);
    return updated;
  },

  // --- Tutors ---
  getTutors(): TutorProfile[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TUTORS);
    if (!raw) {
      this.saveTutors(INITIAL_TUTORS);
      return INITIAL_TUTORS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_TUTORS;
    }
  },

  saveTutors(tutors: TutorProfile[]): void {
    localStorage.setItem(STORAGE_KEYS.TUTORS, JSON.stringify(tutors));
  },

  // --- Tutor Requests ---
  getTutorRequests(): TutorRequest[] {
    const raw = localStorage.getItem(STORAGE_KEYS.TUTOR_REQUESTS);
    if (!raw) {
      this.saveTutorRequests(INITIAL_TUTOR_REQUESTS);
      return INITIAL_TUTOR_REQUESTS;
    }
    try {
      return JSON.parse(raw);
    } catch {
      return INITIAL_TUTOR_REQUESTS;
    }
  },

  saveTutorRequests(requests: TutorRequest[]): void {
    localStorage.setItem(STORAGE_KEYS.TUTOR_REQUESTS, JSON.stringify(requests));
  },

  addTutorRequest(req: TutorRequest): TutorRequest[] {
    const list = this.getTutorRequests();
    const updated = [req, ...list];
    this.saveTutorRequests(updated);
    return updated;
  },

  updateRequestStatus(id: string, status: TutorRequest['status']): TutorRequest[] {
    const list = this.getTutorRequests();
    const updated = list.map(r => r.id === id ? { ...r, status } : r);
    this.saveTutorRequests(updated);
    return updated;
  },

  resetAllToDemo(): void {
    localStorage.removeItem(STORAGE_KEYS.COURSES);
    localStorage.removeItem(STORAGE_KEYS.NOTES);
    localStorage.removeItem(STORAGE_KEYS.PROFILE);
    localStorage.removeItem(STORAGE_KEYS.FLASHCARDS);
    localStorage.removeItem(STORAGE_KEYS.SKILLS);
    localStorage.removeItem(STORAGE_KEYS.PROJECTS);
    localStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
    localStorage.removeItem(STORAGE_KEYS.SENIOR_COMMENTS);
    localStorage.removeItem(STORAGE_KEYS.BLUEPRINTS);
    localStorage.removeItem(STORAGE_KEYS.TUTORS);
    localStorage.removeItem(STORAGE_KEYS.TUTOR_REQUESTS);
    
    this.saveCourses(INITIAL_COURSES);
    this.saveNotes(INITIAL_NOTES);
    this.saveProfile(INITIAL_PROFILE);
    this.saveFlashcards(INITIAL_FLASHCARDS);
    this.saveSkills(INITIAL_SKILLS);
    this.saveProjects(INITIAL_PROJECTS);
    this.saveSeniorComments(INITIAL_SENIOR_COMMENTS);
    this.saveBlueprints(INITIAL_STUDY_BLUEPRINTS);
    this.saveTutors(INITIAL_TUTORS);
    this.saveTutorRequests(INITIAL_TUTOR_REQUESTS);
  },

  exportBackupJson(): string {
    const backup = {
      courses: this.getCourses(),
      notes: this.getNotes(),
      profile: this.getProfile(),
      flashcards: this.getFlashcards(),
      skills: this.getSkills(),
      projects: this.getProjects(),
      seniorComments: this.getSeniorComments(),
      blueprints: this.getBlueprints(),
      tutors: this.getTutors(),
      tutorRequests: this.getTutorRequests(),
      exportedAt: new Date().toISOString(),
      app: 'Grove - Degree-Long AI Learning Companion with Clearance Advice & Tutoring'
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
      if (data.seniorComments && Array.isArray(data.seniorComments)) this.saveSeniorComments(data.seniorComments);
      if (data.blueprints && Array.isArray(data.blueprints)) this.saveBlueprints(data.blueprints);
      if (data.tutors && Array.isArray(data.tutors)) this.saveTutors(data.tutors);
      if (data.tutorRequests && Array.isArray(data.tutorRequests)) this.saveTutorRequests(data.tutorRequests);
      return true;
    } catch (e) {
      console.error('Import failed', e);
      return false;
    }
  }
};
