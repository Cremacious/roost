import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { tasks, users, households } from "@/db/schema";
import { and, asc, desc, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { logActivity } from "@/lib/utils/activity";
import { checkTaskLimit } from "@/lib/utils/premiumGating";

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

  // Fetch incomplete tasks (ordered by due_date asc — null last)
  const incomplete = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      assigned_to: tasks.assigned_to,
      due_date: tasks.due_date,
      priority: tasks.priority,
      completed: tasks.completed,
      completed_by: tasks.completed_by,
      completed_at: tasks.completed_at,
      created_by: tasks.created_by,
      created_at: tasks.created_at,
      assignee_name: users.name,
      assignee_avatar: users.avatar_color,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigned_to, users.id))
    .where(
      and(
        eq(tasks.household_id, householdId),
        isNull(tasks.deleted_at),
        eq(tasks.completed, false)
      )
    )
    .orderBy(asc(tasks.due_date));

  // Fetch completed tasks (most recently completed first)
  const completed = await db
    .select({
      id: tasks.id,
      title: tasks.title,
      description: tasks.description,
      assigned_to: tasks.assigned_to,
      due_date: tasks.due_date,
      priority: tasks.priority,
      completed: tasks.completed,
      completed_by: tasks.completed_by,
      completed_at: tasks.completed_at,
      created_by: tasks.created_by,
      created_at: tasks.created_at,
      assignee_name: users.name,
      assignee_avatar: users.avatar_color,
    })
    .from(tasks)
    .leftJoin(users, eq(tasks.assigned_to, users.id))
    .where(
      and(
        eq(tasks.household_id, householdId),
        isNull(tasks.deleted_at),
        eq(tasks.completed, true)
      )
    )
    .orderBy(desc(tasks.completed_at));

  return Response.json({ tasks: [...incomplete, ...completed] });
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
    const { allowed, count } = await checkTaskLimit(householdId);
    if (!allowed) {
      return Response.json(
        { error: "Free tier limit reached", code: "TASKS_LIMIT", limit: 10, current: count },
        { status: 403 }
      );
    }
  }

  let body: {
    title?: string;
    description?: string;
    assigned_to?: string | null;
    due_date?: string | null;
    priority?: string;
  };
  try {
    body = await request.json();
  } catch (err) {
    console.error("[POST /api/tasks] Failed to parse body:", err);
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  const [task] = await db
    .insert(tasks)
    .values({
      household_id: householdId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      assigned_to: body.assigned_to || null,
      due_date: body.due_date ? new Date(body.due_date) : null,
      priority: body.priority ?? "medium",
      created_by: session.user.id,
    })
    .returning();

  await logActivity({
    householdId,
    userId: session.user.id,
    type: "task_added",
    description: `added task ${task.title}`,
    entityId: task.id,
    entityType: "task",
  });

  return Response.json({ task }, { status: 201 });
}
