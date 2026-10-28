export type AcademicYear = 1 | 2 | 3 | 4;

export interface Course {
  id: string;
  code: string;
  name: string;
  year: AcademicYear;
  semester: 1 | 2;
  color: string;
  description: string;
}

export interface Note {
  id: string;
  courseId: string;
  year: AcademicYear;
  title: string;
  content: string;
  summary: string;
  tags: string[];
  keyTakeaways: string[];
  createdAt: string;
  updatedAt: string;
  masteryScore?: number; // 0-100
}

export interface ConceptualLink {
  sourceNoteId: string;
  targetNoteId: string;
  sourceYear: AcademicYear;
  targetYear: AcademicYear;
  relationship: string;
  explanation: string;
}

export type ExplanationStyle = 
  | 'first-principles' 
  | 'analogies' 
  | 'code-first' 
  | 'academic' 
  | 'socratic' 
  | 'eli5';

export type AnswerLength = 'concise' | 'balanced' | 'deep-dive';

export interface MemoryLogEntry {
  id: string;
  timestamp: string;
  trigger: string;
  insight: string;
  category: 'style' | 'weakness' | 'strength' | 'habit';
  confidence: number; // 0 - 1
  isActive: boolean;
}

export interface TopicMastery {
  topic: string;
  courseCode: string;
  year: AcademicYear;
  masteryLevel: number; // 0 - 100
  needsRevisit: boolean;
  lastReviewed: string;
  confidenceScore: number;
}

export interface LearningProfile {
  studentName: string;
  degreeName: string;
  currentYear: AcademicYear;
  university: string;
  explanationStyle: ExplanationStyle;
  answerLength: AnswerLength;
  socraticPacing: boolean;
  codeLanguagePreference: string;
  strengths: string[];
  weakTopics: TopicMastery[];
  memoryLogs: MemoryLogEntry[];
  totalQuestionsAsked: number;
  studyStreaksDays: number;
  preferredStudyTime: string;
  studentTier?: 'A+' | 'A' | 'B+' | 'B';
  workEthicArchetype?: string;
  clearedCourses?: string[];
}

/** A piece of the university's own material that an answer drew on. */
export interface SourceRef {
  id: string;
  kind: 'project' | 'course' | 'policy';
  title: string;
  meta: string;
  demo: boolean;
  quote: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  sources?: SourceRef[];
  citedNotes?: {
    noteId: string;
    courseCode: string;
    year: AcademicYear;
    title: string;
    relevanceQuote: string;
  }[];
  seniorTips?: {
    authorName: string;
    authorGrade: StudentTier;
    courseCode: string;
    tip: string;
  }[];
  yearConnections?: {
    earlierYear: AcademicYear;
    earlierCourse: string;
    earlierTopic: string;
    connectionText: string;
  }[];
  appliedProfileAttributes?: string[];
}

export interface Flashcard {
  id: string;
  noteId: string;
  courseCode: string;
  year: AcademicYear;
  front: string;
  back: string;
  interval: number; // in days
  repetition: number;
  easeFactor: number;
  dueDate: string;
  lastReviewed?: string;
  status: 'new' | 'learning' | 'mastered';
  /** FSRS memory state for this card (stability in days, difficulty 1-10, dates as ISO strings). */
  fsrs?: {
    due: string;
    stability: number;
    difficulty: number;
    elapsed_days: number;
    scheduled_days: number;
    learning_steps: number;
    reps: number;
    lapses: number;
    state: number;
    last_review?: string;
  };
}

export interface PortfolioSkill {
  name: string;
  category: 'Languages' | 'Systems' | 'Algorithms' | 'Tools & Cloud' | 'Theory';
  level: 'Proficient' | 'Advanced' | 'Expert';
  firstAcquiredYear: AcademicYear;
  evidenceNotes: {
    noteId: string;
    courseCode: string;
    title: string;
  }[];
}

export interface PortfolioProject {
  id: string;
  title: string;
  year: AcademicYear;
  courseCode: string;
  description: string;
  technologies: string[];
  outcomes: string[];
  githubUrl?: string;
  liveUrl?: string;
}

export interface GraduationCV {
  name: string;
  headline: string;
  education: {
    degree: string;
    institution: string;
    years: string;
    gpaOrHonors: string;
    courseworkByYear: {
      year: AcademicYear;
      courses: string[];
    }[];
  };
  skills: PortfolioSkill[];
  projects: PortfolioProject[];
  academicHighlights: string[];
}

// -------------------------------------------------------------
// NEW: Senior Advice, Student Categorization & Peer Tutoring
// -------------------------------------------------------------

export type StudentTier = 'A+' | 'A' | 'B+' | 'B';

export type WorkEthicArchetype = 
  | 'Consistent Daily Architect' 
  | 'Active Recall Specialist' 
  | 'High-Intensity Sprinter' 
  | 'First-Principles Deep Diver';

export interface SeniorComment {
  id: string;
  courseCode: string;
  topic: string;
  authorName: string;
  authorGrade: StudentTier;
  semesterCleared: string;
  category: 'exam-gotcha' | 'study-strategy' | 'lecturer-quirk' | 'resource-gem';
  commentText: string;
  upvotes: number;
  hasUpvoted?: boolean;
  verifiedClearance: boolean;
  createdAt: string;
}

export interface WeeklyMilestone {
  week: number;
  topic: string;
  focus: string;
  workloadHours: number;
  proTip: string;
}

export interface StudyBlueprint {
  id: string;
  studentName: string;
  studentTier: StudentTier;
  archetype: WorkEthicArchetype;
  courseCode: string;
  courseName: string;
  overallGpa: string;
  weeklyHours: number;
  pacingStrategy: string;
  examPrepDaysBefore: number;
  flashcardReviewCadence: string;
  summaryQuote: string;
  recommendedHabits: string[];
  syllabusMilestones: WeeklyMilestone[];
  adoptedByCount: number;
  isAdopted?: boolean;
}

export interface TutorProfile {
  id: string;
  name: string;
  currentYear: AcademicYear;
  degreeName: string;
  clearedCourses: {
    courseCode: string;
    courseName: string;
    grade: StudentTier;
    yearCleared: number;
  }[];
  bio: string;
  explanationStyle: ExplanationStyle;
  rating: number; // 4.9 etc
  sessionsDelivered: number;
  hourlyRate: string; // e.g. "Free / Volunteer" or "$15/hr"
  available: boolean;
  preferredContact: string;
}

export interface TutorRequest {
  id: string;
  requesterName: string;
  requesterYear: AcademicYear;
  tutorId: string;
  tutorName: string;
  courseCode: string;
  topic: string;
  message: string;
  preferredTime: string;
  urgency: 'routine' | 'midterm-prep' | 'assignment-deadline';
  status: 'pending' | 'accepted' | 'completed' | 'declined';
  createdAt: string;
}
