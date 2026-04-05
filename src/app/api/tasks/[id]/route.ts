import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { tasks } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { logActivity } from "@/lib/utils/activity";

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
  const { householdId, role } = membership;

  const [existing] = await db
    .select()
    .from(tasks)
    .where(
      and(
        eq(tasks.id, id),
        eq(tasks.household_id, householdId),
        isNull(tasks.deleted_at)
      )
    )
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Task not found" }, { status: 404 });
  }

  let body: {
    title?: string;
    description?: string;
    assigned_to?: string | null;
    due_date?: string | null;
    priority?: string;
    completed?: boolean;
  };
  try {
    body = await request.json();
  } catch (err) {
    console.error("[PATCH /api/tasks/[id]] Failed to parse body:", err);
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Editing task details: block children
  const isCompletionToggle = body.completed !== undefined &&
    Object.keys(body).length === 1;

  if (!isCompletionToggle && role === "child") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const now = new Date();
  const updateValues: Partial<typeof tasks.$inferInsert> = {
    updated_at: now,
  };

  if (body.completed === true) {
    updateValues.completed = true;
    updateValues.completed_by = session.user.id;
    updateValues.completed_at = now;
  } else if (body.completed === false) {
    updateValues.completed = false;
    updateValues.completed_by = null;
    updateValues.completed_at = null;
  }

  if (body.title !== undefined) {
    if (!body.title.trim()) {
      return Response.json({ error: "Title is required" }, { status: 400 });
    }
    updateValues.title = body.title.trim();
  }
  if (body.description !== undefined) {
    updateValues.description = body.description?.trim() || null;
  }
  if (body.assigned_to !== undefined) {
    updateValues.assigned_to = body.assigned_to || null;
  }
  if (body.due_date !== undefined) {
    updateValues.due_date = body.due_date ? new Date(body.due_date) : null;
  }
  if (body.priority !== undefined) {
    updateValues.priority = body.priority;
  }

  const [updated] = await db
    .update(tasks)
    .set(updateValues)
    .where(eq(tasks.id, id))
    .returning();

  // Log completion
  if (body.completed === true) {
    await logActivity({
      householdId,
      userId: session.user.id,
      type: "task_completed",
      description: `completed ${existing.title}`,
      entityId: id,
      entityType: "task",
    });
  }

  return Response.json({ task: updated });
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
    .select({ id: tasks.id, created_by: tasks.created_by })
    .from(tasks)
    .where(
      and(
        eq(tasks.id, id),
        eq(tasks.household_id, householdId),
        isNull(tasks.deleted_at)
      )
    )
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Task not found" }, { status: 404 });
  }

  // Only creator or admin can delete
  if (existing.created_by !== session.user.id && role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await db
    .update(tasks)
    .set({ deleted_at: new Date() })
    .where(eq(tasks.id, id));

  return Response.json({ ok: true });
}
