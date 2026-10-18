import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  jsonb,
  uuid,
  timestamp,
  primaryKey,
} from 'drizzle-orm/pg-core';
import type {
  MemoryLogEntry,
  StudentTier,
  TopicMastery,
  WeeklyMilestone,
} from '../../types/index.js';

/**
 * All application data is scoped per user (user_id FK). Community-style
 * entities (senior comments, blueprints, tutors) are intentionally
 * per-user seeded copies for now; promoting them to shared global tables
 * is a follow-up.
 *
 * Entity ids are client-generated strings, so every data table uses a
 * composite primary key of (user_id, id).
 */

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  clerkId: text('clerk_id').notNull().unique(),
  email: text('email'),
  name: text('name'),
  seeded: boolean('seeded').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const courses = pgTable(
  'courses',
  {
    id: text('id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    name: text('name').notNull(),
    year: integer('year').notNull(),
    semester: integer('semester').notNull(),
    color: text('color').notNull(),
    description: text('description').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })],
);

export const notes = pgTable(
  'notes',
  {
    id: text('id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseId: text('course_id').notNull(),
    year: integer('year').notNull(),
    title: text('title').notNull(),
    content: text('content').notNull(),
    summary: text('summary').notNull(),
    tags: jsonb('tags').$type<string[]>().notNull().default([]),
    keyTakeaways: jsonb('key_takeaways').$type<string[]>().notNull().default([]),
    createdAt: text('created_at').notNull(),
    updatedAt: text('updated_at').notNull(),
    masteryScore: integer('mastery_score'),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })],
);

export const learningProfiles = pgTable('learning_profiles', {
  userId: uuid('user_id')
    .primaryKey()
    .references(() => users.id, { onDelete: 'cascade' }),
  studentName: text('student_name').notNull(),
  degreeName: text('degree_name').notNull(),
  currentYear: integer('current_year').notNull(),
  university: text('university').notNull(),
  explanationStyle: text('explanation_style').notNull(),
  answerLength: text('answer_length').notNull(),
  socraticPacing: boolean('socratic_pacing').notNull(),
  codeLanguagePreference: text('code_language_preference').notNull(),
  strengths: jsonb('strengths').$type<string[]>().notNull().default([]),
  weakTopics: jsonb('weak_topics').$type<TopicMastery[]>().notNull().default([]),
  memoryLogs: jsonb('memory_logs').$type<MemoryLogEntry[]>().notNull().default([]),
  totalQuestionsAsked: integer('total_questions_asked').notNull(),
  studyStreaksDays: integer('study_streaks_days').notNull(),
  preferredStudyTime: text('preferred_study_time').notNull(),
  studentTier: text('student_tier'),
  workEthicArchetype: text('work_ethic_archetype'),
  clearedCourses: jsonb('cleared_courses').$type<string[]>(),
});

export const flashcards = pgTable(
  'flashcards',
  {
    id: text('id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    noteId: text('note_id').notNull(),
    courseCode: text('course_code').notNull(),
    year: integer('year').notNull(),
    front: text('front').notNull(),
    back: text('back').notNull(),
    intervalDays: integer('interval_days').notNull(),
    repetition: integer('repetition').notNull(),
    easeFactor: real('ease_factor').notNull(),
    dueDate: text('due_date').notNull(),
    lastReviewed: text('last_reviewed'),
    status: text('status').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })],
);

export const portfolioSkills = pgTable(
  'portfolio_skills',
  {
    id: text('id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    category: text('category').notNull(),
    level: text('level').notNull(),
    firstAcquiredYear: integer('first_acquired_year').notNull(),
    evidenceNotes: jsonb('evidence_notes')
      .$type<{ noteId: string; courseCode: string; title: string }[]>()
      .notNull()
      .default([]),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })],
);

export const portfolioProjects = pgTable(
  'portfolio_projects',
  {
    id: text('id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    year: integer('year').notNull(),
    courseCode: text('course_code').notNull(),
    description: text('description').notNull(),
    technologies: jsonb('technologies').$type<string[]>().notNull().default([]),
    outcomes: jsonb('outcomes').$type<string[]>().notNull().default([]),
    githubUrl: text('github_url'),
    liveUrl: text('live_url'),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })],
);

export const chatMessages = pgTable(
  'chat_messages',
  {
    id: text('id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    sender: text('sender').notNull(),
    text: text('text').notNull(),
    timestamp: text('timestamp').notNull(),
    citedNotes: jsonb('cited_notes'),
    seniorTips: jsonb('senior_tips'),
    yearConnections: jsonb('year_connections'),
    appliedProfileAttributes: jsonb('applied_profile_attributes').$type<string[]>(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })],
);

export const seniorComments = pgTable(
  'senior_comments',
  {
    id: text('id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    courseCode: text('course_code').notNull(),
    topic: text('topic').notNull(),
    authorName: text('author_name').notNull(),
    authorGrade: text('author_grade').notNull(),
    semesterCleared: text('semester_cleared').notNull(),
    category: text('category').notNull(),
    commentText: text('comment_text').notNull(),
    upvotes: integer('upvotes').notNull(),
    hasUpvoted: boolean('has_upvoted').notNull().default(false),
    verifiedClearance: boolean('verified_clearance').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })],
);

export const studyBlueprints = pgTable(
  'study_blueprints',
  {
    id: text('id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    studentName: text('student_name').notNull(),
    studentTier: text('student_tier').notNull(),
    archetype: text('archetype').notNull(),
    courseCode: text('course_code').notNull(),
    courseName: text('course_name').notNull(),
    overallGpa: text('overall_gpa').notNull(),
    weeklyHours: integer('weekly_hours').notNull(),
    pacingStrategy: text('pacing_strategy').notNull(),
    examPrepDaysBefore: integer('exam_prep_days_before').notNull(),
    flashcardReviewCadence: text('flashcard_review_cadence').notNull(),
    summaryQuote: text('summary_quote').notNull(),
    recommendedHabits: jsonb('recommended_habits').$type<string[]>().notNull().default([]),
    syllabusMilestones: jsonb('syllabus_milestones').$type<WeeklyMilestone[]>()
      .notNull()
      .default([]),
    adoptedByCount: integer('adopted_by_count').notNull(),
    isAdopted: boolean('is_adopted').notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })],
);

export const tutors = pgTable(
  'tutors',
  {
    id: text('id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    currentYear: integer('current_year').notNull(),
    degreeName: text('degree_name').notNull(),
    clearedCourses: jsonb('cleared_courses')
      .$type<{ courseCode: string; courseName: string; grade: StudentTier; yearCleared: number }[]>()
      .notNull()
      .default([]),
    bio: text('bio').notNull(),
    explanationStyle: text('explanation_style').notNull(),
    rating: real('rating').notNull(),
    sessionsDelivered: integer('sessions_delivered').notNull(),
    hourlyRate: text('hourly_rate').notNull(),
    available: boolean('available').notNull(),
    preferredContact: text('preferred_contact').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })],
);

export const tutorRequests = pgTable(
  'tutor_requests',
  {
    id: text('id').notNull(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    requesterName: text('requester_name').notNull(),
    requesterYear: integer('requester_year').notNull(),
    tutorId: text('tutor_id').notNull(),
    tutorName: text('tutor_name').notNull(),
    courseCode: text('course_code').notNull(),
    topic: text('topic').notNull(),
    message: text('message').notNull(),
    preferredTime: text('preferred_time').notNull(),
    urgency: text('urgency').notNull(),
    status: text('status').notNull(),
    createdAt: text('created_at').notNull(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.id] })],
);

export type User = typeof users.$inferSelect;
export type CourseRow = typeof courses.$inferSelect;
export type NoteRow = typeof notes.$inferSelect;
export type LearningProfileRow = typeof learningProfiles.$inferSelect;
export type FlashcardRow = typeof flashcards.$inferSelect;
export type PortfolioSkillRow = typeof portfolioSkills.$inferSelect;
export type PortfolioProjectRow = typeof portfolioProjects.$inferSelect;
export type ChatMessageRow = typeof chatMessages.$inferSelect;
export type SeniorCommentRow = typeof seniorComments.$inferSelect;
export type StudyBlueprintRow = typeof studyBlueprints.$inferSelect;
export type TutorRow = typeof tutors.$inferSelect;
export type TutorRequestRow = typeof tutorRequests.$inferSelect;
