import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { expenses, expense_splits } from "@/db/schema";
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
    .from(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.household_id, householdId), isNull(expenses.deleted_at)))
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Expense not found" }, { status: 404 });
  }
  if (existing.paid_by !== session.user.id && role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { title?: string; category?: string | null };
  try {
    body = await request.json();
  } catch (err) {
    console.error("[PATCH /api/expenses/[id]] Failed to parse body:", err);
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.title !== undefined && !body.title.trim()) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }

  const [updated] = await db
    .update(expenses)
    .set({
      title: body.title?.trim() ?? existing.title,
      category: body.category !== undefined ? (body.category?.trim() || null) : existing.category,
      updated_at: new Date(),
    })
    .where(eq(expenses.id, id))
    .returning();

  return Response.json({ expense: updated });
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
    .select({ id: expenses.id, paid_by: expenses.paid_by })
    .from(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.household_id, householdId), isNull(expenses.deleted_at)))
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Expense not found" }, { status: 404 });
  }
  if (existing.paid_by !== session.user.id && role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.update(expenses).set({ deleted_at: new Date() }).where(eq(expenses.id, id));

  return Response.json({ ok: true });
}
