import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { grocery_items, grocery_lists } from "@/db/schema";
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
  const { householdId } = membership;

  const [item] = await db
    .select()
    .from(grocery_items)
    .where(
      and(
        eq(grocery_items.id, id),
        eq(grocery_items.household_id, householdId),
        isNull(grocery_items.deleted_at)
      )
    )
    .limit(1);

  if (!item) {
    return Response.json({ error: "Item not found" }, { status: 404 });
  }

  let body: { name?: string; quantity?: string; checked?: boolean };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const now = new Date();
  const updates: Partial<typeof grocery_items.$inferInsert> = {};

  if (body.name !== undefined) {
    if (!body.name.trim()) {
      return Response.json({ error: "Name cannot be empty" }, { status: 400 });
    }
    updates.name = body.name.trim();
  }

  if (body.quantity !== undefined) {
    updates.quantity = body.quantity.trim() || null;
  }

  if (body.checked !== undefined) {
    updates.checked = body.checked;
    if (body.checked) {
      updates.checked_by = session.user.id;
      updates.checked_at = now;
    } else {
      updates.checked_by = null;
      updates.checked_at = null;
    }
  }

  const [updated] = await db
    .update(grocery_items)
    .set(updates)
    .where(eq(grocery_items.id, id))
    .returning();

  // Log activity when item is checked off
  if (body.checked === true) {
    // Get list name for description
    const [list] = await db
      .select({ name: grocery_lists.name })
      .from(grocery_lists)
      .where(eq(grocery_lists.id, item.list_id))
      .limit(1);

    await logActivity({
      householdId,
      userId: session.user.id,
      type: "item_checked",
      description: `checked off ${item.name}${list ? ` from ${list.name}` : ""}`,
      entityId: item.id,
      entityType: "grocery_item",
    });
  }

  return Response.json({ item: updated });
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

  const [item] = await db
    .select()
    .from(grocery_items)
    .where(
      and(
        eq(grocery_items.id, id),
        eq(grocery_items.household_id, householdId),
        isNull(grocery_items.deleted_at)
      )
    )
    .limit(1);

  if (!item) {
    return Response.json({ error: "Item not found" }, { status: 404 });
  }

  await db
    .update(grocery_items)
    .set({ deleted_at: new Date() })
    .where(eq(grocery_items.id, id));

  return Response.json({ ok: true });
}
