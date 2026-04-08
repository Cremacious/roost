import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { expenses, expense_splits } from "@/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

// ---- POST: payer cancels their pending claim ---------------------------------

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

  let body: { toUserId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.toUserId) {
    return Response.json({ error: "toUserId is required" }, { status: 400 });
  }

  const userId = session.user.id;
  const toUserId = body.toUserId;

  const householdExpenses = await db
    .select({ id: expenses.id, paid_by: expenses.paid_by })
    .from(expenses)
    .where(and(eq(expenses.household_id, householdId), isNull(expenses.deleted_at)));

  const paidByCreditorIds = householdExpenses.filter((e) => e.paid_by === toUserId).map((e) => e.id);

  if (paidByCreditorIds.length === 0) {
    return Response.json({ cancelled: 0 });
  }

  const result = await db
    .update(expense_splits)
    .set({ settled_by_payer: false, settlement_claimed_at: null })
    .where(
      and(
        inArray(expense_splits.expense_id, paidByCreditorIds),
        eq(expense_splits.user_id, userId),
        eq(expense_splits.settled_by_payer, true),
        eq(expense_splits.settled_by_payee, false)
      )
    )
    .returning({ id: expense_splits.id });

  return Response.json({ cancelled: result.length });
}
