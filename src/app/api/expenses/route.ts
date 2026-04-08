import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { expenses, expense_splits, expense_categories, expense_budgets, user, users, households, recurring_expense_templates } from "@/db/schema";
import { and, desc, eq, gte, inArray, isNull, lte, sql } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { logActivity } from "@/lib/utils/activity";
import { startOfMonth, endOfMonth, format } from "date-fns";

// ---- Debt simplification ----------------------------------------------------

interface Balance {
  userId: string;
  name: string;
  avatarColor: string | null;
  net: number; // positive = owed money, negative = owes money
}

interface Debt {
  fromUserId: string;
  fromName: string;
  toUserId: string;
  toName: string;
  amount: number;
}

function simplifyDebts(balances: Balance[]): Debt[] {
  const debts: Debt[] = [];
  const creditors = balances.filter((b) => b.net > 0.005).map((b) => ({ ...b }));
  const debtors = balances.filter((b) => b.net < -0.005).map((b) => ({ ...b }));

  let ci = 0;
  let di = 0;

  while (ci < creditors.length && di < debtors.length) {
    const creditor = creditors[ci];
    const debtor = debtors[di];
    const amount = Math.min(creditor.net, -debtor.net);

    debts.push({
      fromUserId: debtor.userId,
      fromName: debtor.name,
      toUserId: creditor.userId,
      toName: creditor.name,
      amount: Math.round(amount * 100) / 100,
    });

    creditor.net -= amount;
    debtor.net += amount;

    if (Math.abs(creditor.net) < 0.005) ci++;
    if (Math.abs(debtor.net) < 0.005) di++;
  }

  return debts;
}

// ---- GET --------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<Response> {
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

  // Check premium
  const [household] = await db
    .select({ subscription_status: households.subscription_status })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);

  const isPremium = household?.subscription_status === "premium";

  // Fetch non-draft expenses with payer info + category join
  const expenseRows = await db
    .select({
      id: expenses.id,
      title: expenses.title,
      total_amount: expenses.total_amount,
      paid_by: expenses.paid_by,
      category: expenses.category,
      category_id: expenses.category_id,
      receipt_data: expenses.receipt_data,
      recurring_template_id: expenses.recurring_template_id,
      is_recurring_draft: expenses.is_recurring_draft,
      created_at: expenses.created_at,
      updated_at: expenses.updated_at,
      payer_name: user.name,
      payer_avatar: users.avatar_color,
      cat_name: expense_categories.name,
      cat_icon: expense_categories.icon,
      cat_color: expense_categories.color,
    })
    .from(expenses)
    .leftJoin(user, eq(expenses.paid_by, user.id))
    .leftJoin(users, eq(expenses.paid_by, users.id))
    .leftJoin(expense_categories, eq(expenses.category_id, expense_categories.id))
    .where(
      and(
        eq(expenses.household_id, householdId),
        isNull(expenses.deleted_at),
        eq(expenses.is_recurring_draft, false)
      )
    )
    .orderBy(desc(expenses.created_at));

  // Fetch recurring drafts (pending admin confirmation) with template info
  const draftRows = isPremium
    ? await db
        .select({
          id: expenses.id,
          title: expenses.title,
          total_amount: expenses.total_amount,
          paid_by: expenses.paid_by,
          category: expenses.category,
          recurring_template_id: expenses.recurring_template_id,
          created_at: expenses.created_at,
          template_frequency: recurring_expense_templates.frequency,
          template_splits: recurring_expense_templates.splits,
        })
        .from(expenses)
        .leftJoin(
          recurring_expense_templates,
          sql`${expenses.recurring_template_id}::uuid = ${recurring_expense_templates.id}`
        )
        .where(
          and(
            eq(expenses.household_id, householdId),
            isNull(expenses.deleted_at),
            eq(expenses.is_recurring_draft, true)
          )
        )
        .orderBy(expenses.created_at)
    : [];

  // Fetch splits for all expenses
  const expenseIds = expenseRows.map((e) => e.id);
  let allSplits: {
    id: string;
    expense_id: string;
    user_id: string;
    amount: string;
    settled: boolean;
    settled_at: Date | null;
    settled_by_payer: boolean;
    settled_by_payee: boolean;
    settlement_claimed_at: Date | null;
    settlement_disputed: boolean;
    user_name: string | null;
    user_avatar: string | null;
  }[] = [];

  if (expenseIds.length > 0) {
    allSplits = await db
      .select({
        id: expense_splits.id,
        expense_id: expense_splits.expense_id,
        user_id: expense_splits.user_id,
        amount: expense_splits.amount,
        settled: expense_splits.settled,
        settled_at: expense_splits.settled_at,
        settled_by_payer: expense_splits.settled_by_payer,
        settled_by_payee: expense_splits.settled_by_payee,
        settlement_claimed_at: expense_splits.settlement_claimed_at,
        settlement_disputed: expense_splits.settlement_disputed,
        user_name: user.name,
        user_avatar: users.avatar_color,
      })
      .from(expense_splits)
      .leftJoin(user, eq(expense_splits.user_id, user.id))
      .leftJoin(users, eq(expense_splits.user_id, users.id))
      .where(inArray(expense_splits.expense_id, expenseIds));
  }

  // Group splits by expense
  const splitsByExpense: Record<string, typeof allSplits> = {};
  for (const split of allSplits) {
    if (!splitsByExpense[split.expense_id]) splitsByExpense[split.expense_id] = [];
    splitsByExpense[split.expense_id].push(split);
  }

  // Assemble full expense objects
  const expensesWithSplits = expenseRows.map((e) => ({
    ...e,
    total_amount: e.total_amount, // keep as string, client will parseFloat
    splits: splitsByExpense[e.id] ?? [],
  }));

  // Compute balances (per-person net)
  // net > 0 means others owe them; net < 0 means they owe others
  const balanceMap: Record<string, { userId: string; name: string; avatarColor: string | null; net: number }> = {};

  function ensureBalance(userId: string, name: string, avatarColor: string | null) {
    if (!balanceMap[userId]) balanceMap[userId] = { userId, name, avatarColor, net: 0 };
  }

  for (const expense of expensesWithSplits) {
    const payerId = expense.paid_by;
    const payerName = expense.payer_name ?? "Unknown";
    const payerAvatar = expense.payer_avatar ?? null;
    ensureBalance(payerId, payerName, payerAvatar);

    for (const split of expense.splits) {
      const splitUserId = split.user_id;
      const splitName = split.user_name ?? "Unknown";
      const splitAvatar = split.user_avatar ?? null;
      ensureBalance(splitUserId, splitName, splitAvatar);

      if (split.settled) continue;
      if (splitUserId === payerId) continue; // payer's own share, skip

      const amt = parseFloat(split.amount);
      balanceMap[payerId].net += amt;     // payer is owed
      balanceMap[splitUserId].net -= amt; // split person owes
    }
  }

  const balanceList = Object.values(balanceMap);
  const debts = simplifyDebts(balanceList);

  // Current user's summary
  const myBalance = balanceMap[session.user.id]?.net ?? 0;

  // Compute total spent this month (all household expenses)
  const monthStart = startOfMonth(new Date());
  const monthEnd = endOfMonth(new Date());
  const totalSpentThisMonth = expenseRows
    .filter((e) => e.created_at && e.created_at >= monthStart && e.created_at <= monthEnd)
    .reduce((acc, e) => acc + parseFloat(e.total_amount ?? "0"), 0);

  // Compute pending claims: splits claimed by payer but not yet confirmed by payee
  const expensePaidByMap: Record<string, string> = {};
  for (const e of expenseRows) expensePaidByMap[e.id] = e.paid_by;

  const pendingClaimsMap: Record<string, { fromUserId: string; toUserId: string; amount: number; claimedAt: string }> = {};
  for (const split of allSplits) {
    if (!split.settled_by_payer || split.settled_by_payee || split.settlement_disputed) continue;
    const payeeId = expensePaidByMap[split.expense_id];
    if (!payeeId) continue;
    const key = `${split.user_id}_${payeeId}`;
    if (!pendingClaimsMap[key]) {
      pendingClaimsMap[key] = {
        fromUserId: split.user_id,
        toUserId: payeeId,
        amount: 0,
        claimedAt: split.settlement_claimed_at?.toISOString() ?? new Date().toISOString(),
      };
    }
    pendingClaimsMap[key].amount += parseFloat(split.amount);
  }
  // Embed pendingClaim directly on each debt for reliable lookup
  const enhancedDebts = debts.map((debt) => {
    const pc = pendingClaimsMap[`${debt.fromUserId}_${debt.toUserId}`];
    return {
      ...debt,
      pendingClaim: pc
        ? { fromUserId: pc.fromUserId, toUserId: pc.toUserId, amount: Math.round(pc.amount * 100) / 100, claimedAt: pc.claimedAt }
        : null,
    };
  });

  return Response.json({
    expenses: expensesWithSplits,
    balances: balanceList,
    debts: enhancedDebts,
    myBalance: Math.round(myBalance * 100) / 100,
    totalSpentThisMonth: Math.round(totalSpentThisMonth * 100) / 100,
    isPremium,
    recurringDrafts: draftRows,
  });
}

// ---- POST -------------------------------------------------------------------

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

  // Premium check
  const [household] = await db
    .select({ subscription_status: households.subscription_status })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);

  if (!household || household.subscription_status !== "premium") {
    return Response.json({ error: "Premium required" }, { status: 403 });
  }

  let body: {
    title?: string;
    total_amount?: number;
    paid_by?: string;
    category?: string;
    category_id?: string;
    splits?: { user_id: string; amount: number }[];
    receipt_data?: string;
  };
  try {
    body = await request.json();
  } catch (err) {
    console.error("[POST /api/expenses] Failed to parse body:", err);
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }
  if (!body.total_amount || body.total_amount <= 0) {
    return Response.json({ error: "Amount must be greater than 0" }, { status: 400 });
  }
  if (!body.paid_by) {
    return Response.json({ error: "Paid by is required" }, { status: 400 });
  }
  if (!body.splits || body.splits.length === 0) {
    return Response.json({ error: "At least one split is required" }, { status: 400 });
  }

  // Validate splits sum to total
  const splitsSum = body.splits.reduce((acc, s) => acc + s.amount, 0);
  const diff = Math.abs(splitsSum - body.total_amount);
  if (diff > 0.02) {
    return Response.json({ error: "Splits must add up to the total amount" }, { status: 400 });
  }

  const [expense] = await db
    .insert(expenses)
    .values({
      household_id: householdId,
      title: body.title.trim(),
      total_amount: body.total_amount.toFixed(2),
      paid_by: body.paid_by,
      category: body.category?.trim() || null,
      category_id: body.category_id ?? null,
      receipt_data: body.receipt_data ?? null,
    })
    .returning();

  if (body.splits.length > 0) {
    await db.insert(expense_splits).values(
      body.splits.map((s) => ({
        expense_id: expense.id,
        user_id: s.user_id,
        amount: s.amount.toFixed(2),
      }))
    );
  }

  // ---- Budget notification trigger ----
  if (body.category_id) {
    try {
      const [budget] = await db
        .select()
        .from(expense_budgets)
        .where(
          and(
            eq(expense_budgets.household_id, householdId),
            eq(expense_budgets.category_id, body.category_id)
          )
        )
        .limit(1);

      if (budget) {
        const periodStart = new Date(`${budget.period_start}T00:00:00`);
        const [spentRow] = await db
          .select({ total: sql<string>`COALESCE(SUM(${expenses.total_amount}), 0)` })
          .from(expenses)
          .where(
            and(
              eq(expenses.household_id, householdId),
              eq(expenses.category_id, body.category_id),
              gte(expenses.created_at, periodStart),
              isNull(expenses.deleted_at),
              eq(expenses.is_recurring_draft, false)
            )
          );

        const spent = parseFloat(spentRow?.total ?? "0");
        const limit = parseFloat(budget.amount);
        const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
        const threshold = budget.warning_threshold ?? 80;

        // Fetch category name for notification
        const [cat] = await db
          .select({ name: expense_categories.name })
          .from(expense_categories)
          .where(eq(expense_categories.id, body.category_id))
          .limit(1);
        const catName = cat?.name ?? "Budget";

        // TODO: send push when Expo is wired
        // For now just log (future: notify all household members)
        if (percentage >= 100) {
          console.info(`[budget] ${catName} budget exceeded: ${percentage}% of $${limit}`);
        } else if (percentage >= threshold) {
          console.info(`[budget] ${catName} budget warning: ${percentage}% of $${limit}`);
        }
      }
    } catch (err) {
      // Non-fatal: budget notification should never block expense creation
      console.error("[POST /api/expenses] Budget check failed:", err);
    }
  }
  // ---- End budget trigger ----

  await logActivity({
    householdId,
    userId: session.user.id,
    type: "expense_added",
    description: `added an expense: ${expense.title}`,
    entityId: expense.id,
    entityType: "expense",
  });

  return Response.json({ expense }, { status: 201 });
}
