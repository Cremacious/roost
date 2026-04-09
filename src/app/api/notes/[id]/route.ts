import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { notes } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

// ---- PATCH ------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

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
  const { householdId, role } = membership;

  const [existing] = await db
    .select()
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.household_id, householdId), isNull(notes.deleted_at)))
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Note not found" }, { status: 404 });
  }
  if (existing.created_by !== session.user.id && role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { title?: string | null; content?: string };
  try {
    body = await request.json();
  } catch (err) {
    console.error("[PATCH /api/notes/[id]] Failed to parse body:", err);
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.content !== undefined) {
    const isEmpty =
      body.content.trim() === "" || body.content === "<p></p>";
    if (isEmpty) {
      return Response.json({ error: "Content is required" }, { status: 400 });
    }
    if (body.content.length > 50000) {
      return Response.json({ error: "Content must be 50,000 characters or less" }, { status: 400 });
    }
  }

  const [updated] = await db
    .update(notes)
    .set({
      title: body.title !== undefined ? (body.title?.trim() || null) : existing.title,
      content: body.content ?? existing.content,
      updated_at: new Date(),
    })
    .where(eq(notes.id, id))
    .returning();

  return Response.json({ note: updated });
}

// ---- DELETE -----------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

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
  const { householdId, role } = membership;

  const [existing] = await db
    .select({ id: notes.id, created_by: notes.created_by })
    .from(notes)
    .where(and(eq(notes.id, id), eq(notes.household_id, householdId), isNull(notes.deleted_at)))
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Note not found" }, { status: 404 });
  }
  if (existing.created_by !== session.user.id && role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.update(notes).set({ deleted_at: new Date() }).where(eq(notes.id, id));

  return Response.json({ ok: true });
}
