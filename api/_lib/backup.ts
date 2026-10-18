import {
  getProfile,
  listBlueprints,
  listChat,
  listCourses,
  listFlashcards,
  listNotes,
  listProjects,
  listSeniorComments,
  listSkills,
  listTutorRequests,
  listTutors,
  replaceBlueprints,
  replaceChat,
  replaceCourses,
  replaceFlashcards,
  replaceNotes,
  replaceProjects,
  replaceSeniorComments,
  replaceSkills,
  replaceTutorRequests,
  replaceTutors,
  resetUserData,
  saveProfile,
} from './collections';
import { ApiError } from './http';
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
} from '../../src/types';

export interface BackupPayload {
  courses?: Course[];
  notes?: Note[];
  profile?: LearningProfile;
  flashcards?: Flashcard[];
  skills?: PortfolioSkill[];
  projects?: PortfolioProject[];
  chat?: ChatMessage[];
  seniorComments?: SeniorComment[];
  blueprints?: StudyBlueprint[];
  tutors?: TutorProfile[];
  tutorRequests?: TutorRequest[];
}

export async function exportBackup(userId: string) {
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
    listCourses(userId),
    listNotes(userId),
    getProfile(userId),
    listFlashcards(userId),
    listSkills(userId),
    listProjects(userId),
    listChat(userId),
    listSeniorComments(userId),
    listBlueprints(userId),
    listTutors(userId),
    listTutorRequests(userId),
  ]);

  return {
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
    exportedAt: new Date().toISOString(),
    app: 'Grove - Degree-Long AI Learning Companion with Clearance Advice & Tutoring',
  };
}

function asArray(value: unknown, field: string): unknown[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) {
    throw new ApiError(400, `Backup field "${field}" must be an array`);
  }
  return value;
}

export async function importBackup(userId: string, data: BackupPayload) {
  if (typeof data !== 'object' || data === null || Array.isArray(data)) {
    throw new ApiError(400, 'Backup payload must be a JSON object');
  }

  if (data.profile && typeof data.profile === 'object') {
    await saveProfile(userId, data.profile);
  }
  const courses = asArray(data.courses, 'courses') as Course[];
  const notes = asArray(data.notes, 'notes') as Note[];
  const flashcards = asArray(data.flashcards, 'flashcards') as Flashcard[];
  const skills = asArray(data.skills, 'skills') as PortfolioSkill[];
  const projects = asArray(data.projects, 'projects') as PortfolioProject[];
  const chat = asArray(data.chat, 'chat') as ChatMessage[];
  const seniorComments = asArray(data.seniorComments, 'seniorComments') as SeniorComment[];
  const blueprints = asArray(data.blueprints, 'blueprints') as StudyBlueprint[];
  const tutors = asArray(data.tutors, 'tutors') as TutorProfile[];
  const tutorRequests = asArray(data.tutorRequests, 'tutorRequests') as TutorRequest[];

  await Promise.all([
    courses.length ? replaceCourses(userId, courses) : Promise.resolve(),
    notes.length ? replaceNotes(userId, notes) : Promise.resolve(),
    flashcards.length ? replaceFlashcards(userId, flashcards) : Promise.resolve(),
    skills.length ? replaceSkills(userId, skills) : Promise.resolve(),
    projects.length ? replaceProjects(userId, projects) : Promise.resolve(),
    chat.length ? replaceChat(userId, chat) : Promise.resolve(),
    seniorComments.length ? replaceSeniorComments(userId, seniorComments) : Promise.resolve(),
    blueprints.length ? replaceBlueprints(userId, blueprints) : Promise.resolve(),
    tutors.length ? replaceTutors(userId, tutors) : Promise.resolve(),
    tutorRequests.length ? replaceTutorRequests(userId, tutorRequests) : Promise.resolve(),
  ]);

  return { ok: true as const };
}

export async function resetBackup(userId: string) {
  await resetUserData(userId);
  return { ok: true as const };
}
