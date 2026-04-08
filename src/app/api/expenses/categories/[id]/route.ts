import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { expense_categories, expenses } from "@/db/schema";
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
    .from(expense_categories)
    .where(and(eq(expense_categories.id, id), eq(expense_categories.household_id, householdId)))
    .limit(1);

  if (!existing) return Response.json({ error: "Category not found" }, { status: 404 });

  let body: { name?: string; icon?: string; color?: string; status?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const updates: Partial<typeof expense_categories.$inferInsert> = {};
  if (body.name !== undefined) updates.name = body.name.trim();
  if (body.icon !== undefined) updates.icon = body.icon.trim();
  if (body.color !== undefined) updates.color = body.color.trim();
  if (body.status !== undefined) updates.status = body.status;

  const [updated] = await db
    .update(expense_categories)
    .set(updates)
    .where(eq(expense_categories.id, id))
    .returning();

  // TODO: notify suggester when status changes to active/rejected (Expo push)
  // If status === 'active': 'Your category [name] was approved!'
  // If status === 'rejected': 'Your category suggestion [name] was not approved.'

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
    .from(expense_categories)
    .where(and(eq(expense_categories.id, id), eq(expense_categories.household_id, householdId)))
    .limit(1);

  if (!existing) return Response.json({ error: "Category not found" }, { status: 404 });
  if (existing.is_default) {
    return Response.json({ error: "Cannot delete default categories" }, { status: 400 });
  }

  // Find the 'Other' category for this household to reassign expenses
  const [otherCat] = await db
    .select({ id: expense_categories.id })
    .from(expense_categories)
    .where(
      and(
        eq(expense_categories.household_id, householdId),
        eq(expense_categories.name, "Other"),
        eq(expense_categories.is_default, true)
      )
    )
    .limit(1);

  // Reassign any expenses using this category
  let movedCount = 0;
  if (otherCat) {
    const result = await db
      .update(expenses)
      .set({ category_id: otherCat.id })
      .where(
        and(
          eq(expenses.household_id, householdId),
          eq(expenses.category_id, id),
          isNull(expenses.deleted_at)
        )
      )
      .returning({ id: expenses.id });
    movedCount = result.length;
  }

  await db.delete(expense_categories).where(eq(expense_categories.id, id));

  return Response.json({ success: true, moved: movedCount });
}
