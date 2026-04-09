import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { chore_categories, chores } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

// ---- PATCH ------------------------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const membership = await getUserHousehold(session.user.id);
  if (!membership) return Response.json({ error: "No household found" }, { status: 404 });
  if (membership.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });
  const { householdId } = membership;
  const { id } = await params;

  const [existing] = await db
    .select()
    .from(chore_categories)
    .where(and(eq(chore_categories.id, id), eq(chore_categories.household_id, householdId)))
    .limit(1);

  if (!existing) return Response.json({ error: "Category not found" }, { status: 404 });

  let body: { name?: string; icon?: string; color?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const updates: Partial<typeof chore_categories.$inferInsert> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.icon !== undefined) updates.icon = body.icon.trim();
  if (body.color !== undefined) updates.color = body.color.trim();
  if (body.status !== undefined) updates.status = body.status;

  const [updated] = await db
    .update(chore_categories)
    .set(updates)
    .where(eq(chore_categories.id, id))
    .returning();

  // TODO: notify suggester when status changes to active/rejected (Expo push)

  return Response.json({ category: updated });
}

// ---- DELETE -----------------------------------------------------------------

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const membership = await getUserHousehold(session.user.id);
  if (!membership) return Response.json({ error: "No household found" }, { status: 404 });
  if (membership.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });
  const { householdId } = membership;
  const { id } = await params;

  const [existing] = await db
    .select()
    .from(chore_categories)
    .where(and(eq(chore_categories.id, id), eq(chore_categories.household_id, householdId)))
    .limit(1);

  if (!existing) return Response.json({ error: "Category not found" }, { status: 404 });
  if (existing.is_default) {
    return Response.json({ error: "Cannot delete default categories" }, { status: 400 });
  }

  // Unassign chores that use this category (set category_id to null)
  await db
    .update(chores)
    .set({ category_id: null })
    .where(
      and(
        eq(chores.household_id, householdId),
        eq(chores.category_id, id),
        isNull(chores.deleted_at)
      )
    );

  await db.delete(chore_categories).where(eq(chore_categories.id, id));

  return Response.json({ success: true });
}
