import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { expenses, expense_splits, users, notification_queue } from "@/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

// ---- POST: payee disputes the claimed payment --------------------------------

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

  let body: { fromUserId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.fromUserId) {
    return Response.json({ error: "fromUserId is required" }, { status: 400 });
  }

  const userId = session.user.id; // payee (creditor) disputing
  const fromUserId = body.fromUserId; // payer (debtor) who claimed

  const householdExpenses = await db
    .select({ id: expenses.id, paid_by: expenses.paid_by })
    .from(expenses)
    .where(and(eq(expenses.household_id, householdId), isNull(expenses.deleted_at)));

  const paidByMeIds = householdExpenses.filter((e) => e.paid_by === userId).map((e) => e.id);

  if (paidByMeIds.length === 0) {
    return Response.json({ disputed: 0 });
  }

  const result = await db
    .update(expense_splits)
    .set({ settlement_disputed: true, settled_by_payer: false, settlement_claimed_at: null })
    .where(
      and(
        inArray(expense_splits.expense_id, paidByMeIds),
        eq(expense_splits.user_id, fromUserId),
        eq(expense_splits.settled_by_payer, true),
        eq(expense_splits.settled_by_payee, false),
        eq(expense_splits.settlement_disputed, false)
      )
    )
    .returning({ id: expense_splits.id, amount: expense_splits.amount });

  const total = result.reduce((acc, s) => acc + parseFloat(s.amount ?? "0"), 0);

  // Notify payer
  if (result.length > 0) {
    const [me] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
    const myName = me?.name ?? "Someone";
    await db.insert(notification_queue).values({
      user_id: fromUserId,
      type: "settlement_disputed",
      title: `${myName} disputed your payment`,
      body: `${myName} says they did not receive your payment of $${total.toFixed(2)}. Please check with them directly.`,
    }).catch(() => {});
  }

  return Response.json({ disputed: result.length });
}
