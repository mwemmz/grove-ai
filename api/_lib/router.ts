import { ApiError, HandlerReq, HandlerRes, json, requireArrayBody, requireObjectBody } from './http.js';
import { requireUser } from './auth.js';
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
  saveProfile,
} from './collections.js';
import { exportBackup, importBackup, resetBackup } from './backup.js';
import { handlePacks } from './packs.js';
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

type RouteHandler = (req: HandlerReq, res: HandlerRes, userId: string) => Promise<void>;

function collectionRoutes<T>(
  list: (userId: string) => Promise<T[]>,
  replace: (userId: string, items: T[]) => Promise<void>,
): Record<string, RouteHandler> {
  return {
    GET: async (_req, res, userId) => {
      json(res, await list(userId));
    },
    PUT: async (req, res, userId) => {
      const body = requireArrayBody(req.body);
      await replace(userId, body as T[]);
      json(res, { ok: true });
    },
  };
}

const routes: Record<string, Record<string, RouteHandler>> = {
  notes: collectionRoutes<Note>(listNotes, replaceNotes),
  courses: collectionRoutes<Course>(listCourses, replaceCourses),
  flashcards: collectionRoutes<Flashcard>(listFlashcards, replaceFlashcards),
  skills: collectionRoutes<PortfolioSkill>(listSkills, replaceSkills),
  projects: collectionRoutes<PortfolioProject>(listProjects, replaceProjects),
  chat: collectionRoutes<ChatMessage>(listChat, replaceChat),
  'senior-comments': collectionRoutes<SeniorComment>(listSeniorComments, replaceSeniorComments),
  blueprints: collectionRoutes<StudyBlueprint>(listBlueprints, replaceBlueprints),
  tutors: collectionRoutes<TutorProfile>(listTutors, replaceTutors),
  'tutor-requests': collectionRoutes<TutorRequest>(listTutorRequests, replaceTutorRequests),
  profile: {
    GET: async (_req, res, userId) => {
      const profile = await getProfile(userId);
      if (!profile) {
        throw new ApiError(404, 'Profile not found');
      }
      json(res, profile);
    },
    PUT: async (req, res, userId) => {
      const body = requireObjectBody(req.body) as unknown as LearningProfile;
      await saveProfile(userId, body);
      json(res, { ok: true });
    },
  },
  backup: {
    GET: async (_req, res, userId) => {
      json(res, await exportBackup(userId));
    },
    POST: async (req, res, userId) => {
      json(res, await importBackup(userId, req.body as never));
    },
    DELETE: async (_req, res, userId) => {
      json(res, await resetBackup(userId));
    },
  },
};

export async function handleRequest(req: HandlerReq, res: HandlerRes): Promise<void> {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const segments = url.pathname.split('/').filter(Boolean);

  // Expect /api/<resource>[/<sub>]
  if (segments[0] !== 'api' || segments.length < 2 || segments.length > 3) {
    throw new ApiError(404, 'Not found');
  }

  const resource = segments[1];
  if (resource === 'packs' || resource === 'me') {
    await handlePacks(req, res, await requireUser(req), segments);
    return;
  }
  const group = routes[resource];
  if (!group) {
    throw new ApiError(404, 'Not found');
  }

  const user = await requireUser(req);
  const method = req.method ?? 'GET';

  let handler: RouteHandler | undefined;
  if (segments.length === 2) {
    handler = group[method];
  } else {
    // /api/backup/import (POST) and /api/backup/reset (POST) aliases
    const sub = segments[2];
    if (resource === 'backup' && method === 'POST' && sub === 'import') {
      handler = group.POST;
    } else if (resource === 'backup' && method === 'POST' && sub === 'reset') {
      handler = async (_req, res, userId) => {
        json(res, await resetBackup(userId));
      };
    }
  }

  if (!handler) {
    throw new ApiError(405, `Method ${method} not allowed`);
  }

  await handler(req, res, user.id);
}
