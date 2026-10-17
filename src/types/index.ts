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
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  citedNotes?: {
    noteId: string;
    courseCode: string;
    year: AcademicYear;
    title: string;
    relevanceQuote: string;
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
