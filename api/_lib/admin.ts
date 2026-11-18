/* Admin support: see who is using Grove and what they were doing, and fix their notes from the admin account.
   What an admin can see: a student's name, ID, courses, note titles and sizes, and a log of what they did in Grove
   (screens opened, notes opened, uploads, errors). Never their chat questions, passwords or the text of their notes.
   Every fix is recorded in admin_audit. A fix changes the student's saved data straight away and is also queued for
   their device, so a copy kept on the phone cannot undo it. */
import { createClerkClient } from '@clerk/backend';
import { sql } from 'drizzle-orm';
import { db, DbUser } from './db.js';
import { ApiError, HandlerReq, HandlerRes, json, requireObjectBody } from './http.js';
import { identity, isAdmin } from './packs.js';

let ready: Promise<unknown> | null = null;
export function ensureAdminTables() {
  ready ??= (async () => {
    await db.execute(sql`create table if not exists user_activity (id bigserial primary key, user_id uuid not null, at timestamptz not null default now(), kind text not null, detail text)`);
    await db.execute(sql`create index if not exists user_activity_user on user_activity (user_id, at desc)`);
    await db.execute(sql`create table if not exists admin_fixes (id bigserial primary key, user_id uuid not null, at timestamptz not null default now(), by text, payload jsonb not null, applied_at timestamptz)`);
    await db.execute(sql`create index if not exists admin_fixes_user on admin_fixes (user_id) where applied_at is null`);
    await db.execute(sql`create table if not exists admin_audit (id bigserial primary key, at timestamptz not null default now(), admin text not null, target uuid not null, action text not null, detail text)`);
  })();
  return ready;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const q1 = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? '';
const KINDS = new Set(['open', 'tab', 'note', 'upload', 'error', 'sync', 'ask', 'lecture', 'listen', 'fix']);

/** Writes one line of what a student did. Same kind and detail within a minute is written once. */
export async function recordActivity(userId: string, kind: string, detail: string): Promise<void> {
  if (!KINDS.has(kind)) return;
  await ensureAdminTables();
  await db.execute(sql`
    insert into user_activity (user_id, kind, detail)
    select ${userId}::uuid, ${kind}::text, ${detail.slice(0, 160)}::text
    where not exists (select 1 from user_activity where user_id = ${userId}::uuid and kind = ${kind}::text and detail is not distinct from ${detail.slice(0, 160)}::text and at > now() - interval '60 seconds')`);
  if (Math.random() < 0.02) await db.execute(sql`delete from user_activity where at < now() - interval '60 days'`);
}

/** POST /api/activity: the student's own device reports what they are doing. */
export async function writeActivity(req: HandlerReq, res: HandlerRes, user: DbUser): Promise<void> {
  const b = requireObjectBody(req.body);
  const events = Array.isArray(b.events) ? b.events.slice(0, 20) : [];
  for (const e of events) {
    const o = (e ?? {}) as Record<string, unknown>;
    await recordActivity(user.id, str(o.kind, 20), str(o.detail, 160));
  }
  json(res, { ok: true });
}

/** GET /api/fixes: fixes an admin made that this device has not applied yet. POST /api/fixes {ids}: it has. */
export async function studentFixes(req: HandlerReq, res: HandlerRes, user: DbUser): Promise<void> {
  await ensureAdminTables();
  if (req.method === 'POST') {
    const b = requireObjectBody(req.body);
    const ids = (Array.isArray(b.ids) ? b.ids : []).map(Number).filter((n) => Number.isInteger(n)).slice(0, 100);
    if (ids.length) await db.execute(sql`update admin_fixes set applied_at = now() where user_id = ${user.id}::uuid and id in ${inList(ids)} and applied_at is null`);
    json(res, { ok: true });
    return;
  }
  const rows = await db.execute(sql`select id, payload from admin_fixes where user_id = ${user.id}::uuid and applied_at is null order by id limit 50`);
  json(res, { fixes: rows.rows });
}

async function usernames(clerkIds: string[]): Promise<Map<string, { studentId: string | null; lastSignInAt: number | null }>> {
  const out = new Map<string, { studentId: string | null; lastSignInAt: number | null }>();
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey || !clerkIds.length) return out;
  try {
    const found = await createClerkClient({ secretKey }).users.getUserList({ userId: clerkIds.slice(0, 100), limit: 100 });
    for (const u of found.data) out.set(u.id, { studentId: u.username, lastSignInAt: u.lastSignInAt });
  } catch {
    /* the list still works without student IDs */
  }
  return out;
}

/** `in (a, b, c)`: drizzle spreads a JS array into a tuple, so lists are built explicitly. */
const inList = (items: (string | number)[]) => sql`(${sql.join(items.map((i) => sql`${i}`), sql`, `)})`;

const audit = (admin: string, target: string, action: string, detail: string) =>
  db.execute(sql`insert into admin_audit (admin, target, action, detail) values (${admin}, ${target}::uuid, ${action}, ${detail.slice(0, 300)})`);

/** /api/admin/<students|student|fix>, admins only. */
export async function handleAdmin(req: HandlerReq, res: HandlerRes, user: DbUser, sub: string): Promise<void> {
  const me = await identity(user.clerkId);
  if (!isAdmin(me)) throw new ApiError(403, 'Admins only');
  await ensureAdminTables();
  const adminName = me.studentId || me.emails[0] || user.id;
  const method = req.method ?? 'GET';
  const query = req.query ?? {};

  if (sub === 'students' && method === 'GET') {
    const term = str(q1(query.q), 80).toLowerCase();
    const rows = (await db.execute(sql`
      select u.id, u.clerk_id, u.name, u.email, u.created_at,
        (select count(*)::int from notes n where n.user_id = u.id) as notes,
        (select max(at) from user_activity a where a.user_id = u.id) as last_seen
      from users u order by last_seen desc nulls last, u.created_at desc limit 300`)).rows as Record<string, unknown>[];
    const names = await usernames(rows.map((r) => String(r.clerk_id)));
    let list = rows.map((r) => ({
      id: r.id,
      name: r.name,
      email: r.email,
      studentId: names.get(String(r.clerk_id))?.studentId ?? null,
      notes: r.notes,
      lastSeen: r.last_seen,
      createdAt: r.created_at,
    }));
    if (term) list = list.filter((s) => [s.name, s.email, s.studentId].some((v) => String(v ?? '').toLowerCase().includes(term)));
    json(res, { students: list });
    return;
  }

  if (sub === 'student' && method === 'GET') {
    const id = str(q1(query.id), 40);
    if (!/^[0-9a-f-]{36}$/i.test(id)) throw new ApiError(400, 'Bad student id');
    const u = (await db.execute(sql`select id, clerk_id, name, email, created_at from users where id = ${id}::uuid`)).rows[0] as Record<string, unknown> | undefined;
    if (!u) throw new ApiError(404, 'No such student');
    const [courses, notes, activity, pending, names] = await Promise.all([
      db.execute(sql`select id, code, name, year, semester, color from courses where user_id = ${id}::uuid order by code`),
      db.execute(sql`select id, title, course_id as "courseId", year, length(content)::int as size, updated_at as "updatedAt" from notes where user_id = ${id}::uuid order by updated_at desc limit 500`),
      db.execute(sql`select at, kind, detail from user_activity where user_id = ${id}::uuid order by at desc limit 80`),
      db.execute(sql`select count(*)::int as n from admin_fixes where user_id = ${id}::uuid and applied_at is null`),
      usernames([String(u.clerk_id)]),
    ]);
    const seen = await db.execute(sql`select 1 from admin_audit where admin = ${adminName}::text and target = ${id}::uuid and action = 'view' and at > now() - interval '10 minutes' limit 1`);
    if (!seen.rows.length) await audit(adminName, id, 'view', 'Opened the student in Admin');
    json(res, {
      student: { id, name: u.name, email: u.email, studentId: names.get(String(u.clerk_id))?.studentId ?? null, createdAt: u.created_at, lastSignInAt: names.get(String(u.clerk_id))?.lastSignInAt ?? null },
      courses: courses.rows,
      notes: notes.rows,
      activity: activity.rows,
      pendingFixes: (pending.rows[0] as { n: number }).n,
    });
    return;
  }

  if (sub === 'fix' && method === 'POST') {
    const b = requireObjectBody(req.body);
    const target = str(b.userId, 40);
    if (!/^[0-9a-f-]{36}$/i.test(target)) throw new ApiError(400, 'Bad student id');
    const action = str(b.action, 30);
    const noteIds = (Array.isArray(b.noteIds) ? b.noteIds : []).map((x) => str(x, 120)).filter(Boolean).slice(0, 500);
    const queue = (payload: Record<string, unknown>) => db.execute(sql`insert into admin_fixes (user_id, by, payload) values (${target}::uuid, ${adminName}, ${JSON.stringify(payload)}::jsonb)`);

    if (action === 'move-notes') {
      const c = (b.course ?? {}) as Record<string, unknown>;
      const code = str(c.code, 20).toUpperCase();
      if (!code) throw new ApiError(400, 'Say which course to move the notes to');
      const fromCourse = str(b.fromCourseId, 120);
      let course = (await db.execute(sql`select id, code, name, year, semester, color, description from courses where user_id = ${target}::uuid and upper(code) = ${code} limit 1`)).rows[0] as Record<string, unknown> | undefined;
      if (!course) {
        const name = str(c.name, 120);
        if (!name) throw new ApiError(400, `The student has no ${code} course yet: give its name so it can be created`);
        course = { id: `c-${code.toLowerCase()}-${Date.now().toString(36)}`, code, name, year: Math.min(6, Math.max(1, Number(c.year) || 1)), semester: Number(c.semester) === 2 ? 2 : 1, color: str(c.color, 20) || '#6366f1', description: str(c.description, 300) };
        await db.execute(sql`insert into courses (id, user_id, code, name, year, semester, color, description) values (${String(course.id)}, ${target}::uuid, ${code}, ${name}, ${Number(course.year)}, ${Number(course.semester)}, ${String(course.color)}, ${String(course.description)})`);
      }
      const ids = noteIds.length
        ? noteIds
        : fromCourse
          ? ((await db.execute(sql`select id from notes where user_id = ${target}::uuid and course_id = ${fromCourse}`)).rows as { id: string }[]).map((r) => r.id)
          : [];
      if (!ids.length) throw new ApiError(400, 'No notes selected');
      await db.execute(sql`update notes set course_id = ${String(course.id)}, year = ${Number(course.year)} where user_id = ${target}::uuid and id in ${inList(ids)}`);
      await queue({ type: 'move-notes', noteIds: ids, course });
      await audit(adminName, target, 'move-notes', `${ids.length} notes to ${code}`);
      json(res, { ok: true, moved: ids.length, course });
      return;
    }

    if (action === 'delete-notes') {
      if (!noteIds.length) throw new ApiError(400, 'No notes selected');
      await db.execute(sql`delete from notes where user_id = ${target}::uuid and id in ${inList(noteIds)}`);
      await queue({ type: 'delete-notes', noteIds });
      await audit(adminName, target, 'delete-notes', `${noteIds.length} notes`);
      json(res, { ok: true, deleted: noteIds.length });
      return;
    }

    if (action === 'update-course') {
      const courseId = str(b.courseId, 120);
      const name = str(b.name, 120);
      const code = str(b.code, 20).toUpperCase();
      if (!courseId || (!name && !code)) throw new ApiError(400, 'Nothing to change');
      const row = (await db.execute(sql`update courses set name = coalesce(nullif(${name}::text, ''), name), code = coalesce(nullif(${code}::text, ''), code) where user_id = ${target}::uuid and id = ${courseId} returning id, code, name, year, semester, color, description`)).rows[0];
      if (!row) throw new ApiError(404, 'No such course');
      await queue({ type: 'update-course', course: row });
      await audit(adminName, target, 'update-course', `${courseId} → ${code || ''} ${name || ''}`.trim());
      json(res, { ok: true, course: row });
      return;
    }
    throw new ApiError(400, 'Unknown fix');
  }

  throw new ApiError(404, 'Not found');
}
