/* Sign-in trail for admins. The sign-in screen reports each step (code requested, code sent, code rejected, ...)
   and any error Clerk returned, so an admin can see why a student is stuck. Students are not signed in yet when this
   is written, so writing is open but small, rate-limited and capped; reading is admin only. No passwords or codes are stored. */
import { createClerkClient } from '@clerk/backend';
import { sql } from 'drizzle-orm';
import { db, DbUser } from './db.js';
import { ApiError, HandlerReq, HandlerRes, json, requireObjectBody } from './http.js';
import { identity, isAdmin } from './packs.js';

let ready: Promise<unknown> | null = null;
function ensureTable() {
  ready ??= db
    .execute(sql`
      create table if not exists auth_events (
        id bigserial primary key,
        at timestamptz not null default now(),
        flow text not null,
        step text not null,
        ok boolean not null,
        code text,
        message text,
        who text,
        device text,
        ip text
      )`)
    .then(() => db.execute(sql`create index if not exists auth_events_at on auth_events (at desc)`));
  return ready;
}

const str = (v: unknown, max: number) => (typeof v === 'string' ? v.trim().slice(0, max) : '');
const header = (req: HandlerReq, k: string) => {
  const v = req.headers[k];
  return (Array.isArray(v) ? v[0] : v) ?? '';
};

// Best effort per-instance limit: 40 events per address per 10 minutes.
const hits = new Map<string, number[]>();
function limited(ip: string): boolean {
  const now = Date.now();
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < 10 * 60_000);
  recent.push(now);
  hits.set(ip, recent);
  if (hits.size > 5000) hits.clear();
  return recent.length > 40;
}

/** Short device description from the user agent: "Android Chrome", "iPhone Safari", "Windows Edge". */
function device(ua: string): string {
  const os = /Android/.test(ua) ? 'Android' : /iPhone|iPad/.test(ua) ? 'iPhone' : /Windows/.test(ua) ? 'Windows' : /Mac OS/.test(ua) ? 'Mac' : /Linux/.test(ua) ? 'Linux' : 'Other';
  const br = /Edg\//.test(ua) ? 'Edge' : /OPR\/|Opera/.test(ua) ? 'Opera' : /Chrome\//.test(ua) ? 'Chrome' : /Firefox\//.test(ua) ? 'Firefox' : /Safari\//.test(ua) ? 'Safari' : 'Browser';
  return `${os} ${br}`;
}

/** POST /api/auth-log, no sign-in needed. */
export async function writeAuthEvent(req: HandlerReq, res: HandlerRes): Promise<void> {
  const ip = header(req, 'x-forwarded-for').split(',')[0].trim() || 'unknown';
  if (limited(ip)) {
    json(res, { ok: true }); // drop quietly: the sign-in screen must never fail because of logging
    return;
  }
  const b = requireObjectBody(req.body);
  const flow = str(b.flow, 20);
  const step = str(b.step, 40);
  if (!flow || !step) throw new ApiError(400, 'flow and step are required');
  await ensureTable();
  await db.execute(sql`
    insert into auth_events (flow, step, ok, code, message, who, device, ip)
    values (${flow}, ${step}, ${b.ok === true}, ${str(b.code, 80) || null}, ${str(b.message, 300) || null},
            ${str(b.who, 120).toLowerCase() || null}, ${device(header(req, 'user-agent'))}, ${ip})`);
  // Keep the table small: drop anything older than 30 days now and then.
  if (Math.random() < 0.02) await db.execute(sql`delete from auth_events where at < now() - interval '30 days'`);
  json(res, { ok: true });
}

/** GET /api/auth-log[?who=...][&lookup=1], admins only. With lookup, also asks Clerk about that account. */
export async function readAuthEvents(req: HandlerReq, res: HandlerRes, user: DbUser): Promise<void> {
  if (!isAdmin(await identity(user.clerkId))) throw new ApiError(403, 'Admins only');
  await ensureTable();
  const q = req.query ?? {};
  const who = str(Array.isArray(q.who) ? q.who[0] : q.who, 120).toLowerCase();
  const rows = who
    ? await db.execute(sql`select * from auth_events where who ilike ${'%' + who + '%'} order by at desc limit 200`)
    : await db.execute(sql`select * from auth_events order by at desc limit 200`);
  const events = rows.rows;

  let account: unknown = undefined;
  if (who && (q.lookup === '1' || q.lookup === 'true')) {
    const secretKey = process.env.CLERK_SECRET_KEY;
    if (!secretKey) throw new Error('CLERK_SECRET_KEY is not set');
    const clerk = createClerkClient({ secretKey });
    const found = await clerk.users.getUserList({ query: who, limit: 5 });
    account = found.data.map((u) => ({
      name: [u.firstName, u.lastName].filter(Boolean).join(' ') || null,
      studentId: u.username,
      emails: u.emailAddresses.map((e) => ({ address: e.emailAddress, verified: e.verification?.status === 'verified', primary: e.id === u.primaryEmailAddressId })),
      hasPassword: u.passwordEnabled,
      createdAt: u.createdAt,
      lastSignInAt: u.lastSignInAt,
      banned: u.banned,
      locked: u.locked,
    }));
  }
  json(res, { events, account });
}
