import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { expense_budgets, households } from "@/db/schema";
import { and, eq } from "drizzle-orm";
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
    .from(expense_budgets)
    .where(and(eq(expense_budgets.id, id), eq(expense_budgets.household_id, householdId)))
    .limit(1);
  if (!existing) return Response.json({ error: "Budget not found" }, { status: 404 });

  let body: { amount?: number; resetType?: string; warningThreshold?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const updates: Partial<typeof expense_budgets.$inferInsert> = {};
  if (body.amount !== undefined) updates.amount = body.amount.toFixed(2);
  if (body.resetType !== undefined) updates.reset_type = body.resetType;
  if (body.warningThreshold !== undefined) updates.warning_threshold = body.warningThreshold;

  const [updated] = await db
    .update(expense_budgets)
    .set(updates)
    .where(eq(expense_budgets.id, id))
    .returning();

  return Response.json({ budget: updated });
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
    .select({ id: expense_budgets.id })
    .from(expense_budgets)
    .where(and(eq(expense_budgets.id, id), eq(expense_budgets.household_id, householdId)))
    .limit(1);
  if (!existing) return Response.json({ error: "Budget not found" }, { status: 404 });

  await db.delete(expense_budgets).where(eq(expense_budgets.id, id));

  return Response.json({ success: true });
}
