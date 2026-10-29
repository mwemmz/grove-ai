/* Class insights: where a course's students get stuck, as anonymous totals for lecturers.
   Students opt in (Settings, or the card on Today). Each signal stores the course, the topic (a note and section of
   that course's pack) and what happened ("asked about it", "I'm lost", "missed it in Recall", "missed it in the weekly
   check"). It never stores who: only a weekly hash of the student, so the same student is counted once per topic per
   week, and that hash changes every week so weeks can't be joined up. Topics with fewer than 3 students are hidden.
   Question text is never stored. */
import { createHash } from 'node:crypto';
import { sql } from 'drizzle-orm';
import { db, DbUser } from './db.js';
import { ApiError, HandlerReq, HandlerRes, json, requireObjectBody } from './http.js';
import { identity, isAdmin } from './packs.js';

const KINDS = ['asked', 'lost', 'recall_missed', 'check_missed', 'check_right', 'check_overconfident'] as const;
type Kind = (typeof KINDS)[number];
const MIN_STUDENTS = 3;

let ready: Promise<unknown> | null = null;
function ensureTable() {
  ready ??= db
    .execute(sql`
      create table if not exists class_signals (
        id bigserial primary key,
        at timestamptz not null default now(),
        course text not null,
        topic text not null,
        note text,
        kind text not null,
        who text not null
      )`)
    .then(() => db.execute(sql`create index if not exists class_signals_course_at on class_signals (course, at desc)`));
  return ready;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');

/** The student, as a value that is stable for this ISO week only. Needs a secret so it can't be recomputed from IDs. */
function weeklyWho(clerkId: string): string {
  const secret = process.env.INSIGHTS_SECRET || process.env.CLERK_SECRET_KEY;
  if (!secret) throw new Error('INSIGHTS_SECRET is not set');
  const d = new Date();
  const day = (d.getUTCDay() + 6) % 7;
  const monday = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate() - day));
  return createHash('sha256').update(`${secret}|${clerkId}|${monday.toISOString().slice(0, 10)}`).digest('hex').slice(0, 24);
}

/** Staff who may read insights: GROVE_STAFF (emails or student IDs, comma-separated), plus Grove admins. */
export function isStaff(id: { studentId: string; emails: string[] }): boolean {
  if (isAdmin(id)) return true;
  const staff = (process.env.GROVE_STAFF ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  return staff.includes(id.studentId.toLowerCase()) || id.emails.some((e) => staff.includes(e));
}

/** POST /api/signals  { consent: true, signals: [{ course, topic, note?, kind }] } */
export async function writeSignals(req: HandlerReq, res: HandlerRes, user: DbUser): Promise<void> {
  const b = requireObjectBody(req.body);
  if (b.consent !== true) throw new ApiError(400, 'Only sent with the student’s consent');
  const list = Array.isArray(b.signals) ? b.signals.slice(0, 20) : [];
  const who = weeklyWho(user.clerkId);
  await ensureTable();
  let n = 0;
  for (const raw of list) {
    const s = (raw ?? {}) as Record<string, unknown>;
    const course = str(s.course, 20).toUpperCase();
    const topic = str(s.topic, 160);
    const kind = str(s.kind, 30) as Kind;
    if (!/^[A-Z0-9]+$/.test(course) || !topic || !KINDS.includes(kind)) continue;
    await db.execute(sql`insert into class_signals (course, topic, note, kind, who) values (${course}, ${topic}, ${str(s.note, 160) || null}, ${kind}, ${who})`);
    n++;
  }
  if (Math.random() < 0.02) await db.execute(sql`delete from class_signals where at < now() - interval '180 days'`);
  json(res, { ok: true, saved: n });
}

/** GET /api/insights[?course=BIT301][&days=7|30|90]  staff only. */
export async function readInsights(req: HandlerReq, res: HandlerRes, user: DbUser): Promise<void> {
  if (!isStaff(await identity(user.clerkId))) throw new ApiError(403, 'Class insights are for lecturers and staff');
  await ensureTable();
  const q = req.query ?? {};
  const one = (v: unknown) => (Array.isArray(v) ? v[0] : v);
  const days = Math.min(Math.max(Number(one(q.days)) || 30, 1), 180);
  const course = str(one(q.course), 20).toUpperCase();

  const courses = (
    await db.execute(sql`
      select course, count(distinct who)::int as students, count(*)::int as signals
      from class_signals where at > now() - make_interval(days => ${days})
      group by course order by course`)
  ).rows as unknown as { course: string; students: number; signals: number }[];

  let topics: unknown[] = [];
  let hidden = 0;
  if (course) {
    const rows = (
      await db.execute(sql`
        select topic, note,
          count(distinct who)::int as students,
          count(distinct who) filter (where kind = 'asked')::int as asked,
          count(distinct who) filter (where kind = 'lost')::int as lost,
          count(distinct who) filter (where kind = 'recall_missed')::int as recall_missed,
          count(distinct who) filter (where kind in ('check_missed', 'check_overconfident'))::int as check_missed,
          count(distinct who) filter (where kind = 'check_overconfident')::int as overconfident,
          count(distinct who) filter (where kind = 'check_right')::int as check_right
        from class_signals
        where course = ${course} and at > now() - make_interval(days => ${days})
        group by note, topic`)
    ).rows as unknown as { topic: string; note: string | null; students: number; asked: number; lost: number; recall_missed: number; check_missed: number; overconfident: number; check_right: number }[];
    const shown = rows.filter((r) => r.students >= MIN_STUDENTS);
    hidden = rows.length - shown.length;
    // "Stuck" = students who were lost, missed it in Recall or missed it in the weekly check. Asking is counted separately.
    topics = shown
      .map((r) => ({ ...r, stuck: Math.max(r.lost, r.recall_missed, r.check_missed) }))
      .sort((a, b) => b.stuck - a.stuck || b.asked - a.asked)
      .slice(0, 40);
  }
  json(res, { days, minStudents: MIN_STUDENTS, courses, topics, hidden });
}
