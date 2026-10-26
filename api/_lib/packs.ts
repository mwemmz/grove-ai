/* Course packs: a course's notes, published once by an admin and delivered by the server only to students whose
   student ID (their Clerk username) starts with the pack's prefix, e.g. BIT353 → "BIT".
   The notes live in the database, never in the public repository or in the app's own files. */
import { createClerkClient } from '@clerk/backend';
import { sql } from 'drizzle-orm';
import { db, DbUser } from './db.js';
import { ApiError, HandlerReq, HandlerRes, json, requireObjectBody } from './http.js';

/* ---------- table, created on first use so no manual migration is needed ---------- */

let ready: Promise<unknown> | null = null;
function ensureTable() {
  ready ??= db.execute(sql`
    create table if not exists course_packs (
      code text primary key,
      audience text,
      pack jsonb not null,
      updated_at timestamptz not null default now(),
      updated_by text
    )`);
  return ready;
}

/* ---------- who is asking ---------- */

interface Identity {
  studentId: string;
  emails: string[];
}

const cache = new Map<string, { at: number; id: Identity }>();

async function identity(clerkId: string): Promise<Identity> {
  const hit = cache.get(clerkId);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.id;
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error('CLERK_SECRET_KEY is not set');
  const u = await createClerkClient({ secretKey }).users.getUser(clerkId);
  const id = { studentId: (u.username ?? '').trim(), emails: u.emailAddresses.map((e) => e.emailAddress.toLowerCase()) };
  cache.set(clerkId, { at: Date.now(), id });
  return id;
}

/** Test hook: lets tests say who a Clerk user is without calling Clerk. */
export function primeIdentity(clerkId: string, id: Identity) {
  cache.set(clerkId, { at: Date.now(), id });
}

/** GROVE_ADMINS: comma-separated emails or student IDs allowed to publish packs. */
function isAdmin(id: Identity): boolean {
  const admins = (process.env.GROVE_ADMINS ?? '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return admins.includes(id.studentId.toLowerCase()) || id.emails.some((e) => admins.includes(e));
}

const allowed = (audience: string | null, id: Identity) => !audience || id.studentId.toUpperCase().startsWith(audience.toUpperCase());

/* ---------- validation (mirrors src/services/notesPack.ts) ---------- */

interface Pack {
  audience?: string;
  course: { code: string; name: string; year: number; semester: number; color: string; description: string };
  notes: { title: string; content: string; tags?: string[]; summary?: string }[];
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.slice(0, max) : '');

function validate(body: Record<string, unknown>): Pack {
  if (body.grove !== 'notes-pack') throw new ApiError(400, 'Not a Grove notes pack');
  const c = (body.course ?? {}) as Record<string, unknown>;
  const code = str(c.code, 20).trim().toUpperCase();
  if (!code || !/^[A-Z0-9]+$/.test(code)) throw new ApiError(400, 'The pack needs a course code (letters and digits)');
  const notes = (Array.isArray(body.notes) ? body.notes : [])
    .map((n) => {
      const r = (n ?? {}) as Record<string, unknown>;
      return {
        title: str(r.title, 200).trim(),
        content: str(r.content, 200_000).trim(),
        tags: Array.isArray(r.tags) ? r.tags.filter((t): t is string => typeof t === 'string').slice(0, 20) : undefined,
        summary: str(r.summary, 400) || undefined,
      };
    })
    .filter((n) => n.title && n.content)
    .slice(0, 200);
  if (notes.length === 0) throw new ApiError(400, 'The pack has no notes');
  const aud = (body.audience ?? {}) as Record<string, unknown>;
  return {
    audience: str(aud.studentIdPrefix, 20).trim().toUpperCase() || undefined,
    course: {
      code,
      name: str(c.name, 120) || code,
      year: [1, 2, 3, 4].includes(Number(c.year)) ? Number(c.year) : 1,
      semester: Number(c.semester) === 2 ? 2 : 1,
      color: /^#[0-9a-f]{6}$/i.test(str(c.color, 7)) ? str(c.color, 7) : '#0ea5e9',
      description: str(c.description, 400),
    },
    notes,
  };
}

/* ---------- routes: /api/me, /api/packs, /api/packs/<code> ---------- */

interface Row {
  code: string;
  audience: string | null;
  pack: Pack;
  updated_at: string;
}

export async function handlePacks(req: HandlerReq, res: HandlerRes, user: DbUser, segments: string[]): Promise<void> {
  const id = await identity(user.clerkId);
  const admin = isAdmin(id);
  const method = req.method ?? 'GET';

  if (segments[1] === 'me') {
    json(res, { studentId: id.studentId || null, admin });
    return;
  }

  await ensureTable();
  const code = segments[2]?.toUpperCase();

  if (!code && method === 'GET') {
    // Summaries of the packs this student may have (admins see all, marked).
    const rows = (await db.execute(sql`select code, audience, pack, updated_at from course_packs order by code`)).rows as unknown as Row[];
    json(
      res,
      rows
        .filter((r) => admin || allowed(r.audience, id))
        .map((r) => ({
          code: r.code,
          name: r.pack.course.name,
          audience: r.audience,
          notes: r.pack.notes.length,
          updatedAt: r.updated_at,
          forMe: allowed(r.audience, id),
        }))
    );
    return;
  }

  if (code && method === 'GET') {
    const row = ((await db.execute(sql`select code, audience, pack, updated_at from course_packs where code = ${code}`)).rows as unknown as Row[])[0];
    if (!row) throw new ApiError(404, 'No such pack');
    if (!allowed(row.audience, id)) throw new ApiError(403, `These notes are only for students whose ID starts with ${row.audience}`);
    json(res, row.pack);
    return;
  }

  if (!admin) throw new ApiError(403, 'Only Grove admins can publish or remove notes packs');

  if (code && method === 'PUT') {
    const pack = validate(requireObjectBody(req.body));
    if (pack.course.code !== code) throw new ApiError(400, `The pack is for ${pack.course.code}, not ${code}`);
    await db.execute(sql`
      insert into course_packs (code, audience, pack, updated_at, updated_by)
      values (${code}, ${pack.audience ?? null}, ${JSON.stringify(pack)}::jsonb, now(), ${id.studentId || id.emails[0] || user.clerkId})
      on conflict (code) do update set audience = excluded.audience, pack = excluded.pack, updated_at = now(), updated_by = excluded.updated_by`);
    json(res, { ok: true, code, audience: pack.audience ?? null, notes: pack.notes.length });
    return;
  }

  if (code && method === 'DELETE') {
    await db.execute(sql`delete from course_packs where code = ${code}`);
    json(res, { ok: true });
    return;
  }

  throw new ApiError(405, `Method ${method} not allowed`);
}
