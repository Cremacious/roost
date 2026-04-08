import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { expenses, expense_splits, users, notification_queue } from "@/db/schema";
import { and, eq, inArray, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

// ---- POST: payer sends a reminder to the payee to confirm --------------------
// Rate limited: once per 24h per pair (checked via settlement_last_reminded_at)

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
    return Response.json({ error: "No pending claim found" }, { status: 404 });
  }

  // Find pending splits and check rate limit
  const pendingSplits = await db
    .select({
      id: expense_splits.id,
      amount: expense_splits.amount,
      settlement_last_reminded_at: expense_splits.settlement_last_reminded_at,
    })
    .from(expense_splits)
    .where(
      and(
        inArray(expense_splits.expense_id, paidByCreditorIds),
        eq(expense_splits.user_id, userId),
        eq(expense_splits.settled_by_payer, true),
        eq(expense_splits.settled_by_payee, false),
        eq(expense_splits.settlement_disputed, false)
      )
    );

  if (pendingSplits.length === 0) {
    return Response.json({ error: "No pending claim found" }, { status: 404 });
  }

  // Rate limit: check if any split was reminded less than 24h ago
  const now = new Date();
  const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const tooSoon = pendingSplits.some(
    (s) => s.settlement_last_reminded_at && s.settlement_last_reminded_at > twentyFourHoursAgo
  );
  if (tooSoon) {
    return Response.json({ error: "You can only send one reminder per 24 hours" }, { status: 429 });
  }

  const total = pendingSplits.reduce((acc, s) => acc + parseFloat(s.amount ?? "0"), 0);

  // Update last reminded timestamp
  await db
    .update(expense_splits)
    .set({ settlement_last_reminded_at: now })
    .where(
      and(
        inArray(expense_splits.expense_id, paidByCreditorIds),
        eq(expense_splits.user_id, userId),
        eq(expense_splits.settled_by_payer, true),
        eq(expense_splits.settled_by_payee, false)
      )
    );

  // Send notification
  const [me] = await db.select({ name: users.name }).from(users).where(eq(users.id, userId)).limit(1);
  const myName = me?.name ?? "Someone";
  await db.insert(notification_queue).values({
    user_id: toUserId,
    type: "settlement_claimed",
    title: `Reminder: ${myName} says they paid you`,
    body: `${myName} is waiting for you to confirm their $${total.toFixed(2)} payment in Roost.`,
  }).catch(() => {});

  return Response.json({ sent: true });
}
