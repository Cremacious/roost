import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { expense_budgets, expense_categories, expenses, households } from "@/db/schema";
import { and, eq, gte, sql } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { startOfMonth, format } from "date-fns";

// ---- GET --------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const membership = await getUserHousehold(session.user.id);
  if (!membership) return Response.json({ error: "No household found" }, { status: 404 });
  const { householdId } = membership;

  // Premium gate
  const [household] = await db
    .select({ subscription_status: households.subscription_status })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);
  if (!household || household.subscription_status !== "premium") {
    return Response.json({ error: "Premium required", code: "BUDGETS_PREMIUM" }, { status: 403 });
  }

  // Fetch budgets with category info
  const budgetRows = await db
    .select({
      id: expense_budgets.id,
      household_id: expense_budgets.household_id,
      category_id: expense_budgets.category_id,
      amount: expense_budgets.amount,
      reset_type: expense_budgets.reset_type,
      warning_threshold: expense_budgets.warning_threshold,
      period_start: expense_budgets.period_start,
      last_reset_at: expense_budgets.last_reset_at,
      created_at: expense_budgets.created_at,
      cat_name: expense_categories.name,
      cat_icon: expense_categories.icon,
      cat_color: expense_categories.color,
    })
    .from(expense_budgets)
    .leftJoin(expense_categories, eq(expense_budgets.category_id, expense_categories.id))
    .where(eq(expense_budgets.household_id, householdId));

  // Calculate current_spent for each budget fresh from expenses
  const now = new Date();

  const enriched = await Promise.all(
    budgetRows.map(async (budget) => {
      const periodStart = new Date(`${budget.period_start}T00:00:00`);

      const [spentRow] = await db
        .select({ total: sql<string>`COALESCE(SUM(${expenses.total_amount}), 0)` })
        .from(expenses)
        .where(
          and(
            eq(expenses.household_id, householdId),
            eq(expenses.category_id, budget.category_id),
            gte(expenses.created_at, periodStart),
            sql`${expenses.deleted_at} IS NULL`,
            sql`${expenses.is_recurring_draft} = false`
          )
        );

      const spent = parseFloat(spentRow?.total ?? "0");
      const limit = parseFloat(budget.amount);
      const percentage = limit > 0 ? Math.round((spent / limit) * 100) : 0;
      const threshold = budget.warning_threshold ?? 80;
      const status: "ok" | "warning" | "over" =
        percentage >= 100 ? "over" : percentage >= threshold ? "warning" : "ok";

      // Days until reset (for monthly)
      let daysUntilReset: number | null = null;
      if (budget.reset_type === "monthly") {
        const nextReset = new Date(now.getFullYear(), now.getMonth() + 1, 1);
        daysUntilReset = Math.ceil((nextReset.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
      }

      return {
        id: budget.id,
        category_id: budget.category_id,
        category: {
          name: budget.cat_name ?? "Unknown",
          icon: budget.cat_icon ?? "Receipt",
          color: budget.cat_color ?? "#6B7280",
        },
        amount: limit,
        reset_type: budget.reset_type,
        warning_threshold: threshold,
        period_start: budget.period_start,
        last_reset_at: budget.last_reset_at,
        current_spent: spent,
        percentage,
        status,
        daysUntilReset,
      };
    })
  );

  // Sort: over first, warning next, ok last
  const sorted = enriched.sort((a, b) => {
    const order = { over: 0, warning: 1, ok: 2 };
    return order[a.status] - order[b.status];
  });

  const totalBudgeted = enriched.reduce((acc, b) => acc + b.amount, 0);
  const totalSpent = enriched.reduce((acc, b) => acc + b.current_spent, 0);

  return Response.json({ budgets: sorted, totalBudgeted, totalSpent });
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
  if (!membership) return Response.json({ error: "No household found" }, { status: 404 });
  if (membership.role !== "admin") return Response.json({ error: "Admin only" }, { status: 403 });
  const { householdId } = membership;

  const [household] = await db
    .select({ subscription_status: households.subscription_status })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);
  if (!household || household.subscription_status !== "premium") {
    return Response.json({ error: "Premium required", code: "BUDGETS_PREMIUM" }, { status: 403 });
  }

  let body: { categoryId?: string; amount?: number; resetType?: string; warningThreshold?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.categoryId) return Response.json({ error: "Category is required" }, { status: 400 });
  if (!body.amount || body.amount <= 0) return Response.json({ error: "Amount must be greater than 0" }, { status: 400 });

  // Check category belongs to this household
  const [cat] = await db
    .select({ id: expense_categories.id })
    .from(expense_categories)
    .where(and(eq(expense_categories.id, body.categoryId), eq(expense_categories.household_id, householdId)))
    .limit(1);
  if (!cat) return Response.json({ error: "Category not found" }, { status: 404 });

  const periodStart = format(startOfMonth(new Date()), "yyyy-MM-dd");

  const [budget] = await db
    .insert(expense_budgets)
    .values({
      household_id: householdId,
      category_id: body.categoryId,
      amount: body.amount.toFixed(2),
      reset_type: body.resetType ?? "monthly",
      warning_threshold: body.warningThreshold ?? 80,
      period_start: periodStart,
    })
    .returning();

  return Response.json({ budget }, { status: 201 });
}
