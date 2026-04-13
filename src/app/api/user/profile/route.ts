import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { users, user as authUserTable } from "@/db/schema";
import { eq } from "drizzle-orm";

// ---- GET --------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar_color: users.avatar_color,
      timezone: users.timezone,
      language: users.language,
      theme: users.theme,
      has_seen_welcome: users.has_seen_welcome,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  return Response.json({
    user: {
      ...user,
      avatar_color: user.avatar_color ?? "#2563EB",
    },
  });
}

// ---- PATCH ------------------------------------------------------------------

export async function PATCH(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  let body: {
    name?: string;
    email?: string;
    avatar_color?: string;
    timezone?: string;
    language?: string;
    push_token?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Normalize email upfront so all checks and writes use the same value.
  const normalizedEmail =
    body.email !== undefined ? body.email.trim().toLowerCase() : undefined;

  if (normalizedEmail !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalizedEmail)) {
      return Response.json({ error: "Invalid email address" }, { status: 400 });
    }

    // Check the Better Auth table first — this is what drives login.
    const [authConflict] = await db
      .select({ id: authUserTable.id })
      .from(authUserTable)
      .where(eq(authUserTable.email, normalizedEmail))
      .limit(1);
    if (authConflict && authConflict.id !== session.user.id) {
      return Response.json({ error: "Email already in use" }, { status: 409 });
    }

    // Also check the app users table to catch any de-sync edge cases.
    const [appConflict] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1);
    if (appConflict && appConflict.id !== session.user.id) {
      return Response.json({ error: "Email already in use" }, { status: 409 });
    }
  }

  const appUpdates: Record<string, unknown> = { updated_at: new Date() };
  if (body.name !== undefined) appUpdates.name = body.name.trim();
  if (normalizedEmail !== undefined) appUpdates.email = normalizedEmail;
  if (body.avatar_color !== undefined) appUpdates.avatar_color = body.avatar_color;
  if (body.timezone !== undefined) appUpdates.timezone = body.timezone;
  if (body.language !== undefined) appUpdates.language = body.language;
  if (body.push_token !== undefined) appUpdates.push_token = body.push_token;

  const returning = {
    id: users.id,
    name: users.name,
    email: users.email,
    avatar_color: users.avatar_color,
    timezone: users.timezone,
    language: users.language,
    theme: users.theme,
  } as const;

  let updated;

  if (normalizedEmail !== undefined) {
    // Keep both tables in sync inside a transaction when email changes.
    try {
      updated = await db.transaction(async (tx) => {
        await tx
          .update(authUserTable)
          .set({ email: normalizedEmail, updatedAt: new Date() })
          .where(eq(authUserTable.id, session.user.id));

        const [row] = await tx
          .update(users)
          .set(appUpdates)
          .where(eq(users.id, session.user.id))
          .returning(returning);

        return row;
      });
    } catch (err) {
      // Unique constraint violation — another user claimed this email between
      // our pre-check and the write (race condition).
      if (err instanceof Error && err.message.includes("unique")) {
        return Response.json({ error: "Email already in use" }, { status: 409 });
      }
      throw err;
    }
  } else {
    const [row] = await db
      .update(users)
      .set(appUpdates)
      .where(eq(users.id, session.user.id))
      .returning(returning);
    updated = row;
  }

  return Response.json({ user: updated });
}
