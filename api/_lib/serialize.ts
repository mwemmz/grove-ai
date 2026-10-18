import type {
  AcademicYear,
  AnswerLength,
  ChatMessage,
  Course,
  ExplanationStyle,
  Flashcard,
  LearningProfile,
  Note,
  PortfolioProject,
  PortfolioSkill,
  SeniorComment,
  StudyBlueprint,
  TutorProfile,
  TutorRequest,
} from '../../src/types';
import type {
  ChatMessageRow,
  CourseRow,
  FlashcardRow,
  LearningProfileRow,
  NoteRow,
  PortfolioProjectRow,
  PortfolioSkillRow,
  SeniorCommentRow,
  StudyBlueprintRow,
  TutorRequestRow,
  TutorRow,
} from '../../src/server/db/schema';

const year = (n: number): AcademicYear => n as AcademicYear;

export const fromCourseRow = (r: CourseRow): Course => ({
  id: r.id,
  code: r.code,
  name: r.name,
  year: year(r.year),
  semester: r.semester as 1 | 2,
  color: r.color,
  description: r.description,
});

export const fromNoteRow = (r: NoteRow): Note => ({
  id: r.id,
  courseId: r.courseId,
  year: year(r.year),
  title: r.title,
  content: r.content,
  summary: r.summary,
  tags: r.tags,
  keyTakeaways: r.keyTakeaways,
  createdAt: r.createdAt,
  updatedAt: r.updatedAt,
  masteryScore: r.masteryScore ?? undefined,
});

export const toNoteValues = (n: Note) => ({
  id: n.id,
  courseId: n.courseId,
  year: n.year,
  title: n.title,
  content: n.content,
  summary: n.summary,
  tags: n.tags,
  keyTakeaways: n.keyTakeaways,
  createdAt: n.createdAt,
  updatedAt: n.updatedAt,
  masteryScore: n.masteryScore ?? null,
});

export const fromProfileRow = (r: LearningProfileRow): LearningProfile => ({
  studentName: r.studentName,
  degreeName: r.degreeName,
  currentYear: year(r.currentYear),
  university: r.university,
  explanationStyle: r.explanationStyle as ExplanationStyle,
  answerLength: r.answerLength as AnswerLength,
  socraticPacing: r.socraticPacing,
  codeLanguagePreference: r.codeLanguagePreference,
  strengths: r.strengths,
  weakTopics: r.weakTopics,
  memoryLogs: r.memoryLogs,
  totalQuestionsAsked: r.totalQuestionsAsked,
  studyStreaksDays: r.studyStreaksDays,
  preferredStudyTime: r.preferredStudyTime,
  studentTier: (r.studentTier as LearningProfile['studentTier']) ?? undefined,
  workEthicArchetype: r.workEthicArchetype ?? undefined,
  clearedCourses: r.clearedCourses ?? undefined,
});

export const toProfileValues = (p: LearningProfile) => ({
  studentName: p.studentName,
  degreeName: p.degreeName,
  currentYear: p.currentYear,
  university: p.university,
  explanationStyle: p.explanationStyle,
  answerLength: p.answerLength,
  socraticPacing: p.socraticPacing,
  codeLanguagePreference: p.codeLanguagePreference,
  strengths: p.strengths,
  weakTopics: p.weakTopics,
  memoryLogs: p.memoryLogs,
  totalQuestionsAsked: p.totalQuestionsAsked,
  studyStreaksDays: p.studyStreaksDays,
  preferredStudyTime: p.preferredStudyTime,
  studentTier: p.studentTier ?? null,
  workEthicArchetype: p.workEthicArchetype ?? null,
  clearedCourses: p.clearedCourses ?? null,
});

export const fromFlashcardRow = (r: FlashcardRow): Flashcard => ({
  id: r.id,
  noteId: r.noteId,
  courseCode: r.courseCode,
  year: year(r.year),
  front: r.front,
  back: r.back,
  interval: r.intervalDays,
  repetition: r.repetition,
  easeFactor: r.easeFactor,
  dueDate: r.dueDate,
  lastReviewed: r.lastReviewed ?? undefined,
  status: r.status as Flashcard['status'],
});

export const toFlashcardValues = (f: Flashcard) => ({
  id: f.id,
  noteId: f.noteId,
  courseCode: f.courseCode,
  year: f.year,
  front: f.front,
  back: f.back,
  intervalDays: f.interval,
  repetition: f.repetition,
  easeFactor: f.easeFactor,
  dueDate: f.dueDate,
  lastReviewed: f.lastReviewed ?? null,
  status: f.status,
});

export const skillIdFromName = (name: string): string =>
  `skill-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;

export const toSkillValues = (s: PortfolioSkill) => ({
  id: skillIdFromName(s.name),
  name: s.name,
  category: s.category,
  level: s.level,
  firstAcquiredYear: s.firstAcquiredYear,
  evidenceNotes: s.evidenceNotes,
});

export const fromSkillRow = (r: PortfolioSkillRow): PortfolioSkill => ({
  name: r.name,
  category: r.category as PortfolioSkill['category'],
  level: r.level as PortfolioSkill['level'],
  firstAcquiredYear: year(r.firstAcquiredYear),
  evidenceNotes: r.evidenceNotes,
});

export const fromProjectRow = (r: PortfolioProjectRow): PortfolioProject => ({
  id: r.id,
  title: r.title,
  year: year(r.year),
  courseCode: r.courseCode,
  description: r.description,
  technologies: r.technologies,
  outcomes: r.outcomes,
  githubUrl: r.githubUrl ?? undefined,
  liveUrl: r.liveUrl ?? undefined,
});

export const toProjectValues = (p: PortfolioProject) => ({
  id: p.id,
  title: p.title,
  year: p.year,
  courseCode: p.courseCode,
  description: p.description,
  technologies: p.technologies,
  outcomes: p.outcomes,
  githubUrl: p.githubUrl ?? null,
  liveUrl: p.liveUrl ?? null,
});

export const fromChatRow = (r: ChatMessageRow): ChatMessage => ({
  id: r.id,
  sender: r.sender as ChatMessage['sender'],
  text: r.text,
  timestamp: r.timestamp,
  citedNotes: (r.citedNotes as ChatMessage['citedNotes']) ?? undefined,
  seniorTips: (r.seniorTips as ChatMessage['seniorTips']) ?? undefined,
  yearConnections: (r.yearConnections as ChatMessage['yearConnections']) ?? undefined,
  appliedProfileAttributes: r.appliedProfileAttributes ?? undefined,
});

export const toChatValues = (m: ChatMessage) => ({
  id: m.id,
  sender: m.sender,
  text: m.text,
  timestamp: m.timestamp,
  citedNotes: m.citedNotes ?? null,
  seniorTips: m.seniorTips ?? null,
  yearConnections: m.yearConnections ?? null,
  appliedProfileAttributes: m.appliedProfileAttributes ?? null,
});

export const fromSeniorCommentRow = (r: SeniorCommentRow): SeniorComment => ({
  id: r.id,
  courseCode: r.courseCode,
  topic: r.topic,
  authorName: r.authorName,
  authorGrade: r.authorGrade as SeniorComment['authorGrade'],
  semesterCleared: r.semesterCleared,
  category: r.category as SeniorComment['category'],
  commentText: r.commentText,
  upvotes: r.upvotes,
  hasUpvoted: r.hasUpvoted,
  verifiedClearance: r.verifiedClearance,
  createdAt: r.createdAt,
});

export const toSeniorCommentValues = (c: SeniorComment) => ({
  id: c.id,
  courseCode: c.courseCode,
  topic: c.topic,
  authorName: c.authorName,
  authorGrade: c.authorGrade,
  semesterCleared: c.semesterCleared,
  category: c.category,
  commentText: c.commentText,
  upvotes: c.upvotes,
  hasUpvoted: c.hasUpvoted ?? false,
  verifiedClearance: c.verifiedClearance,
  createdAt: c.createdAt,
});

export const fromBlueprintRow = (r: StudyBlueprintRow): StudyBlueprint => ({
  id: r.id,
  studentName: r.studentName,
  studentTier: r.studentTier as StudyBlueprint['studentTier'],
  archetype: r.archetype as StudyBlueprint['archetype'],
  courseCode: r.courseCode,
  courseName: r.courseName,
  overallGpa: r.overallGpa,
  weeklyHours: r.weeklyHours,
  pacingStrategy: r.pacingStrategy,
  examPrepDaysBefore: r.examPrepDaysBefore,
  flashcardReviewCadence: r.flashcardReviewCadence,
  summaryQuote: r.summaryQuote,
  recommendedHabits: r.recommendedHabits,
  syllabusMilestones: r.syllabusMilestones,
  adoptedByCount: r.adoptedByCount,
  isAdopted: r.isAdopted,
});

export const toBlueprintValues = (b: StudyBlueprint) => ({
  id: b.id,
  studentName: b.studentName,
  studentTier: b.studentTier,
  archetype: b.archetype,
  courseCode: b.courseCode,
  courseName: b.courseName,
  overallGpa: b.overallGpa,
  weeklyHours: b.weeklyHours,
  pacingStrategy: b.pacingStrategy,
  examPrepDaysBefore: b.examPrepDaysBefore,
  flashcardReviewCadence: b.flashcardReviewCadence,
  summaryQuote: b.summaryQuote,
  recommendedHabits: b.recommendedHabits,
  syllabusMilestones: b.syllabusMilestones,
  adoptedByCount: b.adoptedByCount,
  isAdopted: b.isAdopted ?? false,
});

export const fromTutorRow = (r: TutorRow): TutorProfile => ({
  id: r.id,
  name: r.name,
  currentYear: year(r.currentYear),
  degreeName: r.degreeName,
  clearedCourses: r.clearedCourses,
  bio: r.bio,
  explanationStyle: r.explanationStyle as ExplanationStyle,
  rating: r.rating,
  sessionsDelivered: r.sessionsDelivered,
  hourlyRate: r.hourlyRate,
  available: r.available,
  preferredContact: r.preferredContact,
});

export const toTutorValues = (t: TutorProfile) => ({
  id: t.id,
  name: t.name,
  currentYear: t.currentYear,
  degreeName: t.degreeName,
  clearedCourses: t.clearedCourses,
  bio: t.bio,
  explanationStyle: t.explanationStyle,
  rating: t.rating,
  sessionsDelivered: t.sessionsDelivered,
  hourlyRate: t.hourlyRate,
  available: t.available,
  preferredContact: t.preferredContact,
});

export const fromTutorRequestRow = (r: TutorRequestRow): TutorRequest => ({
  id: r.id,
  requesterName: r.requesterName,
  requesterYear: year(r.requesterYear),
  tutorId: r.tutorId,
  tutorName: r.tutorName,
  courseCode: r.courseCode,
  topic: r.topic,
  message: r.message,
  preferredTime: r.preferredTime,
  urgency: r.urgency as TutorRequest['urgency'],
  status: r.status as TutorRequest['status'],
  createdAt: r.createdAt,
});

export const toTutorRequestValues = (r: TutorRequest) => ({
  id: r.id,
  requesterName: r.requesterName,
  requesterYear: r.requesterYear,
  tutorId: r.tutorId,
  tutorName: r.tutorName,
  courseCode: r.courseCode,
  topic: r.topic,
  message: r.message,
  preferredTime: r.preferredTime,
  urgency: r.urgency,
  status: r.status,
  createdAt: r.createdAt,
});
