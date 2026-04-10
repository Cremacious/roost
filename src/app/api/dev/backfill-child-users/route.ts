import { db } from "@/lib/db";
import { user, users } from "@/db/schema";
import { eq } from "drizzle-orm";

// One-time backfill: insert missing better-auth "user" rows for child accounts.
// Child accounts created before the fix have rows in "users" (app table) and
// "household_members" but not in better-auth's "user" table, so createSession()
// fails with a FK constraint violation. Delete this route after running it once.

export async function GET(): Promise<Response> {
  const childUsers = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(eq(users.is_child_account, true));

  let backfilled = 0;
  const ids: string[] = [];

  for (const child of childUsers) {
    const placeholderEmail = `child_${child.id}@roost.internal`;

    await db.insert(user).values({
      id: child.id,
      name: child.name,
      email: placeholderEmail,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();

    backfilled++;
    ids.push(child.id);
  }

  return Response.json({ backfilled, ids });
}
