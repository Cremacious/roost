import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { expenses, expense_splits, expense_categories, user, users, households } from "@/db/schema";
import { and, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { format, startOfMonth, endOfMonth, parseISO } from "date-fns";

export async function GET(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const membership = await getUserHousehold(session.user.id);
  if (!membership) return Response.json({ error: "No household found" }, { status: 404 });
  if (membership.role === "child") return Response.json({ error: "Forbidden" }, { status: 403 });
  const { householdId } = membership;

  // Premium gate
  const [household] = await db
    .select({ subscription_status: households.subscription_status })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);
  if (!household || household.subscription_status !== "premium") {
    return Response.json({ error: "Premium required", code: "INSIGHTS_PREMIUM" }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const fromParam = searchParams.get("from");
  const toParam = searchParams.get("to");

  const fromDate = fromParam ? new Date(`${fromParam}T00:00:00`) : startOfMonth(new Date());
  const toDate = toParam ? new Date(`${toParam}T23:59:59`) : endOfMonth(new Date());

  // Fetch all expenses in range with category info
  const expenseRows = await db
    .select({
      id: expenses.id,
      title: expenses.title,
      total_amount: expenses.total_amount,
      paid_by: expenses.paid_by,
      category_id: expenses.category_id,
      created_at: expenses.created_at,
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
        sql`${expenses.is_recurring_draft} = false`,
        gte(expenses.created_at, fromDate),
        lte(expenses.created_at, toDate)
      )
    );

  if (expenseRows.length === 0) {
    return Response.json({
      summary: {
        totalSpent: 0, expenseCount: 0, avgPerMember: 0,
        biggestCategory: null, biggestExpense: null, mostActiveMonth: null,
      },
      byCategory: [],
      overTime: [],
      byMember: [],
      recentExpenses: [],
    });
  }

  // Fetch splits for these expenses
  const expenseIds = expenseRows.map((e) => e.id);
  const allSplits = await db
    .select({
      expense_id: expense_splits.expense_id,
      user_id: expense_splits.user_id,
      amount: expense_splits.amount,
      settled: expense_splits.settled,
      user_name: user.name,
      user_avatar: users.avatar_color,
    })
    .from(expense_splits)
    .leftJoin(user, eq(expense_splits.user_id, user.id))
    .leftJoin(users, eq(expense_splits.user_id, users.id))
    .where(sql`${expense_splits.expense_id} = ANY(ARRAY[${sql.join(expenseIds.map(id => sql`${id}::uuid`), sql`, `)}])`);

  // Group splits by expense
  const splitsByExpense: Record<string, typeof allSplits> = {};
  for (const s of allSplits) {
    if (!splitsByExpense[s.expense_id]) splitsByExpense[s.expense_id] = [];
    splitsByExpense[s.expense_id].push(s);
  }

  // Unique member count
  const memberSet = new Set<string>();
  for (const e of expenseRows) memberSet.add(e.paid_by);
  for (const s of allSplits) memberSet.add(s.user_id);
  const memberCount = memberSet.size || 1;

  const totalSpent = expenseRows.reduce((acc, e) => acc + parseFloat(e.total_amount), 0);

  // By category
  const catMap: Record<string, { name: string; icon: string; color: string; amount: number; count: number }> = {};
  for (const e of expenseRows) {
    const catId = e.category_id ?? "uncategorized";
    if (!catMap[catId]) {
      catMap[catId] = {
        name: e.cat_name ?? "Uncategorized",
        icon: e.cat_icon ?? "Receipt",
        color: e.cat_color ?? "#6B7280",
        amount: 0,
        count: 0,
      };
    }
    catMap[catId].amount += parseFloat(e.total_amount);
    catMap[catId].count += 1;
  }
  const byCategory = Object.entries(catMap)
    .map(([categoryId, data]) => ({
      categoryId,
      ...data,
      amount: Math.round(data.amount * 100) / 100,
      percentage: totalSpent > 0 ? Math.round((data.amount / totalSpent) * 100) : 0,
    }))
    .sort((a, b) => b.amount - a.amount);

  const biggestCategory = byCategory[0] ?? null;

  // Biggest single expense
  const biggestExpense = expenseRows.reduce<{ title: string; amount: number; date: string } | null>((best, e) => {
    const amt = parseFloat(e.total_amount);
    if (!best || amt > best.amount) {
      return { title: e.title, amount: amt, date: e.created_at?.toISOString() ?? "" };
    }
    return best;
  }, null);

  // Over time (by month)
  const monthMap: Record<string, { month: string; amount: number; expenseCount: number }> = {};
  for (const e of expenseRows) {
    if (!e.created_at) continue;
    const monthKey = format(e.created_at, "MMM yyyy");
    if (!monthMap[monthKey]) monthMap[monthKey] = { month: monthKey, amount: 0, expenseCount: 0 };
    monthMap[monthKey].amount += parseFloat(e.total_amount);
    monthMap[monthKey].expenseCount += 1;
  }
  const overTime = Object.values(monthMap)
    .map((m) => ({ ...m, amount: Math.round(m.amount * 100) / 100 }))
    .sort((a, b) => new Date(`01 ${a.month}`).getTime() - new Date(`01 ${b.month}`).getTime());

  const mostActiveMonth = overTime.reduce<string | null>((best, m) => {
    if (!best) return m.month;
    const bestData = monthMap[best];
    return m.amount > bestData.amount ? m.month : best;
  }, null);

  // By member
  const memberMap: Record<string, { userId: string; name: string; avatarColor: string | null; paid: number; owes: number }> = {};
  function ensureMember(userId: string, name: string, avatarColor: string | null) {
    if (!memberMap[userId]) memberMap[userId] = { userId, name, avatarColor, paid: 0, owes: 0 };
  }
  for (const e of expenseRows) {
    ensureMember(e.paid_by, e.payer_name ?? "Unknown", e.payer_avatar ?? null);
    memberMap[e.paid_by].paid += parseFloat(e.total_amount);
    const splits = splitsByExpense[e.id] ?? [];
    for (const s of splits) {
      ensureMember(s.user_id, s.user_name ?? "Unknown", s.user_avatar ?? null);
      if (s.user_id !== e.paid_by) {
        memberMap[s.user_id].owes += parseFloat(s.amount);
      }
    }
  }
  const byMember = Object.values(memberMap)
    .map((m) => ({
      ...m,
      paid: Math.round(m.paid * 100) / 100,
      owes: Math.round(m.owes * 100) / 100,
      netAmount: Math.round((m.paid - m.owes) * 100) / 100,
    }))
    .sort((a, b) => b.paid - a.paid);

  // Recent expenses (last 5)
  const recentExpenses = expenseRows.slice(0, 5).map((e) => ({
    id: e.id,
    title: e.title,
    amount: parseFloat(e.total_amount),
    date: e.created_at?.toISOString() ?? "",
    payer_name: e.payer_name,
    cat_name: e.cat_name,
    cat_color: e.cat_color,
  }));

  return Response.json({
    summary: {
      totalSpent: Math.round(totalSpent * 100) / 100,
      expenseCount: expenseRows.length,
      avgPerMember: Math.round((totalSpent / memberCount) * 100) / 100,
      biggestCategory,
      biggestExpense,
      mostActiveMonth,
    },
    byCategory,
    overTime,
    byMember,
    recentExpenses,
  });
}
