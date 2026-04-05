import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { expenses, expense_splits } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

// ---- POST: settle a single split --------------------------------------------

export async function POST(
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

  // Validate expense belongs to this household
  const [expense] = await db
    .select({ id: expenses.id, paid_by: expenses.paid_by })
    .from(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.household_id, householdId), isNull(expenses.deleted_at)))
    .limit(1);

  if (!expense) {
    return Response.json({ error: "Expense not found" }, { status: 404 });
  }

  let body: { split_id?: string };
  try {
    body = await request.json();
  } catch (err) {
    console.error("[POST /api/expenses/[id]/settle] Failed to parse body:", err);
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.split_id) {
    return Response.json({ error: "split_id is required" }, { status: 400 });
  }

  const [split] = await db
    .select()
    .from(expense_splits)
    .where(and(eq(expense_splits.id, body.split_id), eq(expense_splits.expense_id, id)))
    .limit(1);

  if (!split) {
    return Response.json({ error: "Split not found" }, { status: 404 });
  }

  // Only the payer or admin can mark a split as settled
  if (expense.paid_by !== session.user.id && role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const [updated] = await db
    .update(expense_splits)
    .set({ settled: true, settled_at: new Date() })
    .where(eq(expense_splits.id, body.split_id))
    .returning();

  return Response.json({ split: updated });
}
