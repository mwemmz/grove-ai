import { createClerkClient, verifyToken } from '@clerk/backend';
import { eq } from 'drizzle-orm';
import { db, DbUser } from './db.js';
import { users } from '../../src/server/db/schema.js';
import { ApiError, HandlerReq } from './http.js';
import { seedUserData } from './collections.js';

function getClerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is not set');
  }
  return createClerkClient({ secretKey });
}

async function ensureDbUser(clerkId: string): Promise<DbUser> {
  const existing = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  let user = existing[0];

  if (!user) {
    let email: string | null = null;
    let name: string | null = null;
    try {
      const clerkUser = await getClerkClient().users.getUser(clerkId);
      email =
        clerkUser.emailAddresses.find((e) => e.id === clerkUser.primaryEmailAddressId)
          ?.emailAddress ??
        clerkUser.emailAddresses[0]?.emailAddress ??
        null;
      name = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || null;
    } catch {
      // Clerk user lookup is best-effort; the row is still usable without it.
    }
    // Several first requests arrive together; only one creates the row, the others read it.
    await db.insert(users).values({ clerkId, email, name }).onConflictDoNothing({ target: users.clerkId });
    user = (await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1))[0];
  }

  if (!user.seeded) {
    await seedUserData(user.id);
    const updated = await db
      .update(users)
      .set({ seeded: true })
      .where(eq(users.id, user.id))
      .returning();
    user = updated[0];
  }

  return user;
}

/** Verifies the Clerk session token and resolves (creating if needed) the DB user. */
export async function requireUser(req: HandlerReq): Promise<DbUser> {
  const header = req.headers.authorization;
  const raw = Array.isArray(header) ? header[0] : header;
  const token = raw?.startsWith('Bearer ') ? raw.slice('Bearer '.length).trim() : null;
  if (!token) {
    throw new ApiError(401, 'Missing bearer token');
  }

  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) {
    throw new Error('CLERK_SECRET_KEY is not set');
  }

  let clerkId: string | undefined;
  try {
    const payload = await verifyToken(token, { secretKey });
    clerkId = payload.sub;
  } catch {
    throw new ApiError(401, 'Invalid or expired token');
  }

  if (!clerkId) {
    throw new ApiError(401, 'Token missing subject claim');
  }

  return ensureDbUser(clerkId);
}
