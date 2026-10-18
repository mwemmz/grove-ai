import 'dotenv/config';
import { db } from '../api/_lib/db.js';
import { users } from '../src/server/db/schema.js';
import { seedUserData } from '../api/_lib/collections.js';
import { eq } from 'drizzle-orm';

/**
 * Seeds demo data for an existing user (matched by Clerk user ID).
 * Usage: npm run db:seed -- <clerk_user_id>
 */
async function main() {
  const clerkId = process.argv[2];
  if (!clerkId) {
    console.error('Usage: npm run db:seed -- <clerk_user_id>');
    process.exit(1);
  }

  const existing = await db.select().from(users).where(eq(users.clerkId, clerkId)).limit(1);
  let user = existing[0];

  if (!user) {
    const inserted = await db
      .insert(users)
      .values({ clerkId, seeded: true })
      .returning();
    user = inserted[0];
  } else if (!user.seeded) {
    const updated = await db
      .update(users)
      .set({ seeded: true })
      .where(eq(users.id, user.id))
      .returning();
    user = updated[0];
  }

  await seedUserData(user.id);
  console.log(`Seeded demo data for user ${clerkId} (db id: ${user.id})`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
