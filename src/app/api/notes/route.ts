import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { notes, users } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { logActivity } from "@/lib/utils/activity";

// ---- GET --------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const membership = await getUserHousehold(session.user.id);
  if (!membership) {
    return Response.json({ error: "No household found" }, { status: 404 });
  }
  const { householdId } = membership;

  const noteRows = await db
    .select({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      created_by: notes.created_by,
      created_at: notes.created_at,
      updated_at: notes.updated_at,
      creator_name: users.name,
      creator_avatar: users.avatar_color,
    })
    .from(notes)
    .leftJoin(users, eq(notes.created_by, users.id))
    .where(and(eq(notes.household_id, householdId), isNull(notes.deleted_at)))
    .orderBy(desc(notes.created_at));

  return Response.json({ notes: noteRows });
}

// ---- POST -------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const membership = await getUserHousehold(session.user.id);
  if (!membership) {
    return Response.json({ error: "No household found" }, { status: 404 });
  }
  if (membership.role === "child") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const { householdId } = membership;

  let body: { title?: string; content?: string };
  try {
    body = await request.json();
  } catch (err) {
    console.error("[POST /api/notes] Failed to parse body:", err);
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.content?.trim()) {
    return Response.json({ error: "Content is required" }, { status: 400 });
  }
  if (body.content.trim().length > 1000) {
    return Response.json({ error: "Content must be 1000 characters or less" }, { status: 400 });
  }

  const [note] = await db
    .insert(notes)
    .values({
      household_id: householdId,
      title: body.title?.trim() || null,
      content: body.content.trim(),
      created_by: session.user.id,
    })
    .returning();

  await logActivity({
    householdId,
    userId: session.user.id,
    type: "note_added",
    description: "left a note",
    entityId: note.id,
    entityType: "note",
  });

  return Response.json({ note }, { status: 201 });
}
