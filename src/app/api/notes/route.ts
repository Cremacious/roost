import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { notes, users, households } from "@/db/schema";
import { and, desc, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { logActivity } from "@/lib/utils/activity";
import { checkNoteLimit } from "@/lib/utils/premiumGating";

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

  // Premium check
  const [household] = await db
    .select({ subscription_status: households.subscription_status })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);
  if (household?.subscription_status !== "premium") {
    const { allowed, count } = await checkNoteLimit(householdId);
    if (!allowed) {
      return Response.json(
        { error: "Free tier limit reached", code: "NOTES_LIMIT", limit: 10, current: count },
        { status: 403 }
      );
    }
  }

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
