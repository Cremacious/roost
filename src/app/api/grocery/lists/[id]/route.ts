import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { grocery_lists } from "@/db/schema";
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
  const { householdId } = membership;

  if (membership.role === "child") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const [list] = await db
    .select()
    .from(grocery_lists)
    .where(
      and(
        eq(grocery_lists.id, id),
        eq(grocery_lists.household_id, householdId),
        isNull(grocery_lists.deleted_at)
      )
    )
    .limit(1);

  if (!list) {
    return Response.json({ error: "List not found" }, { status: 404 });
  }

  if (list.is_default) {
    return Response.json({ error: "Cannot rename the default list" }, { status: 400 });
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const [updated] = await db
    .update(grocery_lists)
    .set({ name: body.name.trim() })
    .where(eq(grocery_lists.id, id))
    .returning();

  return Response.json({ list: updated });
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
  const { householdId } = membership;

  if (membership.role !== "admin") {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }

  const [list] = await db
    .select()
    .from(grocery_lists)
    .where(
      and(
        eq(grocery_lists.id, id),
        eq(grocery_lists.household_id, householdId),
        isNull(grocery_lists.deleted_at)
      )
    )
    .limit(1);

  if (!list) {
    return Response.json({ error: "List not found" }, { status: 404 });
  }

  if (list.is_default) {
    return Response.json({ error: "Cannot delete the default list" }, { status: 400 });
  }

  await db
    .update(grocery_lists)
    .set({ deleted_at: new Date() })
    .where(eq(grocery_lists.id, id));

  return Response.json({ ok: true });
}
