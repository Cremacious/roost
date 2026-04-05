import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { expenses, expense_splits } from "@/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

// ---- POST: settle all debts between two users --------------------------------
// Settles all unsettled splits where userA paid and userB owes, or userB paid and userA owes

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

  let body: { with_user_id?: string };
  try {
    body = await request.json();
  } catch (err) {
    console.error("[POST /api/expenses/settle-all] Failed to parse body:", err);
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.with_user_id) {
    return Response.json({ error: "with_user_id is required" }, { status: 400 });
  }

  const userId = session.user.id;
  const otherId = body.with_user_id;

  // Get all household expenses
  const householdExpenses = await db
    .select({ id: expenses.id, paid_by: expenses.paid_by })
    .from(expenses)
    .where(and(eq(expenses.household_id, householdId), isNull(expenses.deleted_at)));

  const expenseIds = householdExpenses.map((e) => e.id);
  if (expenseIds.length === 0) {
    return Response.json({ settled: 0 });
  }

  // Expenses paid by userId — settle otherId's splits
  const paidByMeExpenseIds = householdExpenses.filter((e) => e.paid_by === userId).map((e) => e.id);
  // Expenses paid by otherId — settle my splits
  const paidByOtherExpenseIds = householdExpenses.filter((e) => e.paid_by === otherId).map((e) => e.id);

  let settledCount = 0;
  const now = new Date();

  if (paidByMeExpenseIds.length > 0) {
    const result = await db
      .update(expense_splits)
      .set({ settled: true, settled_at: now })
      .where(
        and(
          inArray(expense_splits.expense_id, paidByMeExpenseIds),
          eq(expense_splits.user_id, otherId),
          eq(expense_splits.settled, false)
        )
      )
      .returning({ id: expense_splits.id });
    settledCount += result.length;
  }

  if (paidByOtherExpenseIds.length > 0) {
    const result = await db
      .update(expense_splits)
      .set({ settled: true, settled_at: now })
      .where(
        and(
          inArray(expense_splits.expense_id, paidByOtherExpenseIds),
          eq(expense_splits.user_id, userId),
          eq(expense_splits.settled, false)
        )
      )
      .returning({ id: expense_splits.id });
    settledCount += result.length;
  }

  return Response.json({ settled: settledCount });
}
