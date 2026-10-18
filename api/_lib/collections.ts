import { eq } from 'drizzle-orm';
import { db } from './db.js';
import {
  chatMessages,
  courses,
  flashcards,
  learningProfiles,
  notes,
  portfolioProjects,
  portfolioSkills,
  seniorComments,
  studyBlueprints,
  tutorRequests,
  tutors,
} from '../../src/server/db/schema.js';
import type {
  ChatMessage,
  Course,
  Flashcard,
  LearningProfile,
  Note,
  PortfolioProject,
  PortfolioSkill,
  SeniorComment,
  StudyBlueprint,
  TutorProfile,
  TutorRequest,
} from '../../src/types/index.js';
import {
  fromBlueprintRow,
  fromChatRow,
  fromCourseRow,
  fromFlashcardRow,
  fromNoteRow,
  fromProfileRow,
  fromProjectRow,
  fromSeniorCommentRow,
  fromSkillRow,
  fromTutorRequestRow,
  fromTutorRow,
  toBlueprintValues,
  toChatValues,
  toFlashcardValues,
  toNoteValues,
  toProfileValues,
  toProjectValues,
  toSeniorCommentValues,
  toSkillValues,
  toTutorRequestValues,
  toTutorValues,
} from './serialize.js';
import {
  INITIAL_COURSES,
  INITIAL_FLASHCARDS,
  INITIAL_NOTES,
  INITIAL_PROFILE,
  INITIAL_PROJECTS,
  INITIAL_SENIOR_COMMENTS,
  INITIAL_SKILLS,
  INITIAL_STUDY_BLUEPRINTS,
  INITIAL_TUTORS,
  INITIAL_TUTOR_REQUESTS,
} from '../../src/data/mockData.js';

export async function listCourses(userId: string): Promise<Course[]> {
  const rows = await db.select().from(courses).where(eq(courses.userId, userId));
  return rows.map(fromCourseRow);
}

export async function replaceCourses(userId: string, items: Course[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(courses).where(eq(courses.userId, userId));
    if (items.length > 0) {
      await tx.insert(courses).values(items.map((c) => ({ ...c, userId })));
    }
  });
}

export async function listNotes(userId: string): Promise<Note[]> {
  const rows = await db.select().from(notes).where(eq(notes.userId, userId));
  return rows.map(fromNoteRow);
}

export async function replaceNotes(userId: string, items: Note[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(notes).where(eq(notes.userId, userId));
    if (items.length > 0) {
      await tx.insert(notes).values(items.map((n) => ({ ...toNoteValues(n), userId })));
    }
  });
}

export async function getProfile(userId: string): Promise<LearningProfile | null> {
  const rows = await db.select().from(learningProfiles).where(eq(learningProfiles.userId, userId));
  return rows[0] ? fromProfileRow(rows[0]) : null;
}

export async function saveProfile(userId: string, profile: LearningProfile): Promise<void> {
  const values = { ...toProfileValues(profile), userId };
  await db
    .insert(learningProfiles)
    .values(values)
    .onConflictDoUpdate({ target: learningProfiles.userId, set: values });
}

export async function listFlashcards(userId: string): Promise<Flashcard[]> {
  const rows = await db.select().from(flashcards).where(eq(flashcards.userId, userId));
  return rows.map(fromFlashcardRow);
}

export async function replaceFlashcards(userId: string, items: Flashcard[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(flashcards).where(eq(flashcards.userId, userId));
    if (items.length > 0) {
      await tx.insert(flashcards).values(items.map((f) => ({ ...toFlashcardValues(f), userId })));
    }
  });
}

export async function listSkills(userId: string): Promise<PortfolioSkill[]> {
  const rows = await db.select().from(portfolioSkills).where(eq(portfolioSkills.userId, userId));
  return rows.map(fromSkillRow);
}

export async function replaceSkills(userId: string, items: PortfolioSkill[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(portfolioSkills).where(eq(portfolioSkills.userId, userId));
    if (items.length > 0) {
      await tx.insert(portfolioSkills).values(items.map((s) => ({ ...toSkillValues(s), userId })));
    }
  });
}

export async function listProjects(userId: string): Promise<PortfolioProject[]> {
  const rows = await db.select().from(portfolioProjects).where(eq(portfolioProjects.userId, userId));
  return rows.map(fromProjectRow);
}

export async function replaceProjects(userId: string, items: PortfolioProject[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(portfolioProjects).where(eq(portfolioProjects.userId, userId));
    if (items.length > 0) {
      await tx.insert(portfolioProjects).values(items.map((p) => ({ ...toProjectValues(p), userId })));
    }
  });
}

export async function listChat(userId: string): Promise<ChatMessage[]> {
  const rows = await db.select().from(chatMessages).where(eq(chatMessages.userId, userId));
  return rows.map(fromChatRow);
}

export async function replaceChat(userId: string, items: ChatMessage[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(chatMessages).where(eq(chatMessages.userId, userId));
    if (items.length > 0) {
      await tx.insert(chatMessages).values(items.map((m) => ({ ...toChatValues(m), userId })));
    }
  });
}

export async function listSeniorComments(userId: string): Promise<SeniorComment[]> {
  const rows = await db.select().from(seniorComments).where(eq(seniorComments.userId, userId));
  return rows.map(fromSeniorCommentRow);
}

export async function replaceSeniorComments(userId: string, items: SeniorComment[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(seniorComments).where(eq(seniorComments.userId, userId));
    if (items.length > 0) {
      await tx.insert(seniorComments).values(items.map((c) => ({ ...toSeniorCommentValues(c), userId })));
    }
  });
}

export async function listBlueprints(userId: string): Promise<StudyBlueprint[]> {
  const rows = await db.select().from(studyBlueprints).where(eq(studyBlueprints.userId, userId));
  return rows.map(fromBlueprintRow);
}

export async function replaceBlueprints(userId: string, items: StudyBlueprint[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(studyBlueprints).where(eq(studyBlueprints.userId, userId));
    if (items.length > 0) {
      await tx.insert(studyBlueprints).values(items.map((b) => ({ ...toBlueprintValues(b), userId })));
    }
  });
}

export async function listTutors(userId: string): Promise<TutorProfile[]> {
  const rows = await db.select().from(tutors).where(eq(tutors.userId, userId));
  return rows.map(fromTutorRow);
}

export async function replaceTutors(userId: string, items: TutorProfile[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(tutors).where(eq(tutors.userId, userId));
    if (items.length > 0) {
      await tx.insert(tutors).values(items.map((t) => ({ ...toTutorValues(t), userId })));
    }
  });
}

export async function listTutorRequests(userId: string): Promise<TutorRequest[]> {
  const rows = await db.select().from(tutorRequests).where(eq(tutorRequests.userId, userId));
  return rows.map(fromTutorRequestRow);
}

export async function replaceTutorRequests(userId: string, items: TutorRequest[]): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(tutorRequests).where(eq(tutorRequests.userId, userId));
    if (items.length > 0) {
      await tx.insert(tutorRequests).values(items.map((r) => ({ ...toTutorRequestValues(r), userId })));
    }
  });
}

/** Seeds the demo dataset for a freshly created user. */
export async function seedUserData(userId: string): Promise<void> {
  await replaceCourses(userId, INITIAL_COURSES);
  await replaceNotes(userId, INITIAL_NOTES);
  await saveProfile(userId, INITIAL_PROFILE);
  await replaceFlashcards(userId, INITIAL_FLASHCARDS);
  await replaceSkills(userId, INITIAL_SKILLS);
  await replaceProjects(userId, INITIAL_PROJECTS);
  await replaceSeniorComments(userId, INITIAL_SENIOR_COMMENTS);
  await replaceBlueprints(userId, INITIAL_STUDY_BLUEPRINTS);
  await replaceTutors(userId, INITIAL_TUTORS);
  await replaceTutorRequests(userId, INITIAL_TUTOR_REQUESTS);
}

/** Wipes all of a user's data and re-seeds the demo dataset. */
export async function resetUserData(userId: string): Promise<void> {
  await db.transaction(async (tx) => {
    await tx.delete(chatMessages).where(eq(chatMessages.userId, userId));
    await tx.delete(notes).where(eq(notes.userId, userId));
    await tx.delete(courses).where(eq(courses.userId, userId));
    await tx.delete(flashcards).where(eq(flashcards.userId, userId));
    await tx.delete(portfolioSkills).where(eq(portfolioSkills.userId, userId));
    await tx.delete(portfolioProjects).where(eq(portfolioProjects.userId, userId));
    await tx.delete(seniorComments).where(eq(seniorComments.userId, userId));
    await tx.delete(studyBlueprints).where(eq(studyBlueprints.userId, userId));
    await tx.delete(tutors).where(eq(tutors.userId, userId));
    await tx.delete(tutorRequests).where(eq(tutorRequests.userId, userId));
  });
  await seedUserData(userId);
}
