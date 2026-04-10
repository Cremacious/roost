import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
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

  return Response.json({ user });
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

  if (body.email !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return Response.json({ error: "Invalid email address" }, { status: 400 });
    }
    // Check email not already taken by another user
    const [existing] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, body.email))
      .limit(1);
    if (existing && existing.id !== session.user.id) {
      return Response.json({ error: "Email already in use" }, { status: 409 });
    }
  }

  const updates: Record<string, unknown> = { updated_at: new Date() };
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.email !== undefined) updates.email = body.email.trim().toLowerCase();
  if (body.avatar_color !== undefined) updates.avatar_color = body.avatar_color;
  if (body.timezone !== undefined) updates.timezone = body.timezone;
  if (body.language !== undefined) updates.language = body.language;
  if (body.push_token !== undefined) updates.push_token = body.push_token;

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, session.user.id))
    .returning({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar_color: users.avatar_color,
      timezone: users.timezone,
      language: users.language,
      theme: users.theme,
    });

  return Response.json({ user: updated });
}
