import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { expenses, expense_splits, users, notification_queue } from "@/db/schema";
import { and, eq, isNull, lt } from "drizzle-orm";

// ---- GET: daily cron - remind payees of pending settlements over 7 days old -

export async function GET(request: NextRequest): Promise<Response> {
  const cronSecret = request.headers.get("authorization")?.replace("Bearer ", "");
  if (cronSecret !== process.env.CRON_SECRET) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  // Find all pending splits where claimed more than 7 days ago
  const pendingSplits = await db
    .select({
      id: expense_splits.id,
      user_id: expense_splits.user_id,
      amount: expense_splits.amount,
      expense_id: expense_splits.expense_id,
      settlement_claimed_at: expense_splits.settlement_claimed_at,
    })
    .from(expense_splits)
    .where(
      and(
        eq(expense_splits.settled_by_payer, true),
        eq(expense_splits.settled_by_payee, false),
        eq(expense_splits.settlement_disputed, false),
        lt(expense_splits.settlement_claimed_at, sevenDaysAgo)
      )
    );

  if (pendingSplits.length === 0) {
    return Response.json({ reminded: 0 });
  }

  // Get expense paid_by info
  const expenseIds = [...new Set(pendingSplits.map((s) => s.expense_id))];
  const expenseRows = await db
    .select({ id: expenses.id, paid_by: expenses.paid_by })
    .from(expenses)
    .where(isNull(expenses.deleted_at));

  const expensePaidByMap: Record<string, string> = {};
  for (const e of expenseRows) expensePaidByMap[e.id] = e.paid_by;

  // Group by (debtor, creditor) pair
  type Pair = { debtorId: string; creditorId: string; total: number };
  const pairs: Record<string, Pair> = {};
  for (const s of pendingSplits) {
    const creditorId = expensePaidByMap[s.expense_id];
    if (!creditorId) continue;
    const key = `${s.user_id}_${creditorId}`;
    if (!pairs[key]) pairs[key] = { debtorId: s.user_id, creditorId, total: 0 };
    pairs[key].total += parseFloat(s.amount ?? "0");
  }

  // Get debtor names
  const debtorIds = [...new Set(Object.values(pairs).map((p) => p.debtorId))];
  const debtorUsers = await db
    .select({ id: users.id, name: users.name })
    .from(users)
    .where(isNull(users.deleted_at));
  const nameMap: Record<string, string> = {};
  for (const u of debtorUsers) nameMap[u.id] = u.name;

  let reminded = 0;
  for (const pair of Object.values(pairs)) {
    const debtorName = nameMap[pair.debtorId] ?? "Someone";
    await db.insert(notification_queue).values({
      user_id: pair.creditorId,
      type: "settlement_claimed",
      title: `Reminder: ${debtorName} says they paid you`,
      body: `${debtorName} is waiting for you to confirm their $${pair.total.toFixed(2)} payment. Open Roost to confirm or dispute.`,
    }).catch(() => {});
    reminded++;
  }

  return Response.json({ reminded });
}
