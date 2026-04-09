import { NextRequest } from "next/server";
import { requireSession, requirePremium } from "@/lib/auth/helpers";
import { getUserHousehold } from "@/app/api/chores/route";
import { db } from "@/lib/db";
import {
  chores,
  chore_completions,
  chore_streaks,
  expenses,
  expense_categories,
  expense_splits,
  tasks,
  meal_plan_slots,
  meals,
  meal_suggestions,
  grocery_items,
  household_activity,
  household_members,
  households,
  users,
} from "@/db/schema";
import { and, eq, gte, isNull, lte, lt, sql } from "drizzle-orm";
import { differenceInDays } from "date-fns";

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
  const { householdId } = membership;

  try {
    await requirePremium(request, householdId);
  } catch (r) {
    return r as Response;
  }

  const { searchParams } = new URL(request.url);
  const start = searchParams.get("start");
  const end = searchParams.get("end");
  if (!start || !end) {
    return Response.json({ error: "start and end are required" }, { status: 400 });
  }

  const startDate = new Date(`${start}T00:00:00`);
  const endDate = new Date(`${end}T23:59:59`);

  const [
    // Chores
    q1_totalCompletions,
    q2_completionsPerMember,
    q3_mostCompletedChore,
    q4_completionsOverTime,
    q5_pointsPerMember,
    // Expenses
    q6_totalSpent,
    q7_byCategory,
    q8_spendingOverTime,
    q9_settledVsUnsettled,
    // Tasks
    q10_tasksSummary,
    q11_overdueTasks,
    q12_tasksByPriority,
    // Meals
    q13_mealsPlanned,
    q14_mostPlannedMeal,
    q15_suggestions,
    // Grocery
    q16_itemsAdded,
    q17_itemsChecked,
    q18_mostAddedItem,
    // Activity
    q19_mostActiveMember,
    q20_activityByType,
    // Household
    q21_members,
    q22_householdInfo,
  ] = await Promise.all([

    // ---- CHORES ---------------------------------------------------------------

    // 1. Total chore completions in range
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(chore_completions)
      .innerJoin(chores, eq(chore_completions.chore_id, chores.id))
      .where(
        and(
          eq(chores.household_id, householdId),
          isNull(chores.deleted_at),
          gte(chore_completions.completed_at, startDate),
          lte(chore_completions.completed_at, endDate),
        )
      ),

    // 2. Completions per member (joined with users for name)
    db
      .select({
        userId: chore_completions.completed_by,
        name: users.name,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(chore_completions)
      .innerJoin(chores, eq(chore_completions.chore_id, chores.id))
      .leftJoin(users, eq(chore_completions.completed_by, users.id))
      .where(
        and(
          eq(chores.household_id, householdId),
          isNull(chores.deleted_at),
          gte(chore_completions.completed_at, startDate),
          lte(chore_completions.completed_at, endDate),
        )
      )
      .groupBy(chore_completions.completed_by, users.name)
      .orderBy(sql`count(*) desc`),

    // 3. Most completed chore
    db
      .select({
        choreId: chore_completions.chore_id,
        title: chores.title,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(chore_completions)
      .innerJoin(chores, eq(chore_completions.chore_id, chores.id))
      .where(
        and(
          eq(chores.household_id, householdId),
          isNull(chores.deleted_at),
          gte(chore_completions.completed_at, startDate),
          lte(chore_completions.completed_at, endDate),
        )
      )
      .groupBy(chore_completions.chore_id, chores.title)
      .orderBy(sql`count(*) desc`)
      .limit(1),

    // 4. Completions over time (daily buckets)
    db
      .select({
        date: sql<string>`to_char(date_trunc('day', ${chore_completions.completed_at}), 'YYYY-MM-DD')`,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(chore_completions)
      .innerJoin(chores, eq(chore_completions.chore_id, chores.id))
      .where(
        and(
          eq(chores.household_id, householdId),
          isNull(chores.deleted_at),
          gte(chore_completions.completed_at, startDate),
          lte(chore_completions.completed_at, endDate),
        )
      )
      .groupBy(sql`date_trunc('day', ${chore_completions.completed_at})`)
      .orderBy(sql`date_trunc('day', ${chore_completions.completed_at})`),

    // 5. Total points per member (lifetime, all weeks)
    db
      .select({
        userId: chore_streaks.user_id,
        name: users.name,
        totalPoints: sql<number>`cast(coalesce(sum(${chore_streaks.points}), 0) as int)`,
      })
      .from(chore_streaks)
      .leftJoin(users, eq(chore_streaks.user_id, users.id))
      .where(eq(chore_streaks.household_id, householdId))
      .groupBy(chore_streaks.user_id, users.name)
      .orderBy(sql`sum(${chore_streaks.points}) desc`),

    // ---- EXPENSES -------------------------------------------------------------

    // 6. Total spent in range
    db
      .select({ total: sql<string>`coalesce(sum(${expenses.total_amount}), '0')` })
      .from(expenses)
      .where(
        and(
          eq(expenses.household_id, householdId),
          isNull(expenses.deleted_at),
          eq(expenses.is_recurring_draft, false),
          gte(expenses.created_at, startDate),
          lte(expenses.created_at, endDate),
        )
      ),

    // 7. Spending by category
    db
      .select({
        categoryId: expenses.category_id,
        categoryName: expense_categories.name,
        categoryColor: expense_categories.color,
        total: sql<string>`coalesce(sum(${expenses.total_amount}), '0')`,
      })
      .from(expenses)
      .leftJoin(expense_categories, eq(expenses.category_id, expense_categories.id))
      .where(
        and(
          eq(expenses.household_id, householdId),
          isNull(expenses.deleted_at),
          eq(expenses.is_recurring_draft, false),
          gte(expenses.created_at, startDate),
          lte(expenses.created_at, endDate),
        )
      )
      .groupBy(expenses.category_id, expense_categories.name, expense_categories.color)
      .orderBy(sql`sum(${expenses.total_amount}) desc`),

    // 8. Spending over time (weekly buckets)
    db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${expenses.created_at}), 'YYYY-MM-DD')`,
        total: sql<string>`coalesce(sum(${expenses.total_amount}), '0')`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.household_id, householdId),
          isNull(expenses.deleted_at),
          eq(expenses.is_recurring_draft, false),
          gte(expenses.created_at, startDate),
          lte(expenses.created_at, endDate),
        )
      )
      .groupBy(sql`date_trunc('week', ${expenses.created_at})`)
      .orderBy(sql`date_trunc('week', ${expenses.created_at})`),

    // 9. Settled vs unsettled split count
    db
      .select({
        settled: sql<number>`cast(count(*) filter (where ${expense_splits.settled} = true) as int)`,
        unsettled: sql<number>`cast(count(*) filter (where ${expense_splits.settled} = false) as int)`,
      })
      .from(expense_splits)
      .innerJoin(
        expenses,
        and(
          eq(expense_splits.expense_id, expenses.id),
          eq(expenses.household_id, householdId),
          isNull(expenses.deleted_at),
        )
      ),

    // ---- TASKS ----------------------------------------------------------------

    // 10. Tasks created vs completed in range
    db
      .select({
        totalCreated: sql<number>`cast(count(*) as int)`,
        totalCompleted: sql<number>`cast(count(*) filter (where ${tasks.completed} = true) as int)`,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.household_id, householdId),
          isNull(tasks.deleted_at),
          gte(tasks.created_at, startDate),
          lte(tasks.created_at, endDate),
        )
      ),

    // 11. Overdue tasks (current snapshot, not range-filtered)
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(tasks)
      .where(
        and(
          eq(tasks.household_id, householdId),
          isNull(tasks.deleted_at),
          eq(tasks.completed, false),
          lt(tasks.due_date, new Date()),
        )
      ),

    // 12. Tasks by priority in range
    db
      .select({
        priority: tasks.priority,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(tasks)
      .where(
        and(
          eq(tasks.household_id, householdId),
          isNull(tasks.deleted_at),
          gte(tasks.created_at, startDate),
          lte(tasks.created_at, endDate),
        )
      )
      .groupBy(tasks.priority),

    // ---- MEALS ----------------------------------------------------------------

    // 13. Meals planned in range
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(meal_plan_slots)
      .where(
        and(
          eq(meal_plan_slots.household_id, householdId),
          gte(meal_plan_slots.slot_date, start),
          lte(meal_plan_slots.slot_date, end),
        )
      ),

    // 14. Most planned meal in range
    db
      .select({
        mealName: sql<string>`coalesce(${meals.name}, ${meal_plan_slots.custom_meal_name}, 'Custom')`,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(meal_plan_slots)
      .leftJoin(meals, eq(meal_plan_slots.meal_id, meals.id))
      .where(
        and(
          eq(meal_plan_slots.household_id, householdId),
          gte(meal_plan_slots.slot_date, start),
          lte(meal_plan_slots.slot_date, end),
        )
      )
      .groupBy(sql`coalesce(${meals.name}, ${meal_plan_slots.custom_meal_name}, 'Custom')`)
      .orderBy(sql`count(*) desc`)
      .limit(1),

    // 15. Suggestions submitted vs approved in range
    db
      .select({
        submitted: sql<number>`cast(count(*) as int)`,
        approved: sql<number>`cast(count(*) filter (where ${meal_suggestions.status} = 'approved') as int)`,
      })
      .from(meal_suggestions)
      .where(
        and(
          eq(meal_suggestions.household_id, householdId),
          gte(meal_suggestions.created_at, startDate),
          lte(meal_suggestions.created_at, endDate),
        )
      ),

    // ---- GROCERY --------------------------------------------------------------

    // 16. Items added in range (grocery_items has household_id directly)
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(grocery_items)
      .where(
        and(
          eq(grocery_items.household_id, householdId),
          isNull(grocery_items.deleted_at),
          gte(grocery_items.created_at, startDate),
          lte(grocery_items.created_at, endDate),
        )
      ),

    // 17. Items checked off in range
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(grocery_items)
      .where(
        and(
          eq(grocery_items.household_id, householdId),
          eq(grocery_items.checked, true),
          isNull(grocery_items.deleted_at),
          gte(grocery_items.checked_at, startDate),
          lte(grocery_items.checked_at, endDate),
        )
      ),

    // 18. Most added grocery item in range
    db
      .select({
        name: grocery_items.name,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(grocery_items)
      .where(
        and(
          eq(grocery_items.household_id, householdId),
          isNull(grocery_items.deleted_at),
          gte(grocery_items.created_at, startDate),
          lte(grocery_items.created_at, endDate),
        )
      )
      .groupBy(grocery_items.name)
      .orderBy(sql`count(*) desc`)
      .limit(1),

    // ---- ACTIVITY -------------------------------------------------------------

    // 19. Most active member in range
    db
      .select({
        userId: household_activity.user_id,
        name: users.name,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(household_activity)
      .leftJoin(users, eq(household_activity.user_id, users.id))
      .where(
        and(
          eq(household_activity.household_id, householdId),
          gte(household_activity.created_at, startDate),
          lte(household_activity.created_at, endDate),
        )
      )
      .groupBy(household_activity.user_id, users.name)
      .orderBy(sql`count(*) desc`)
      .limit(1),

    // 20. Activity count by type
    db
      .select({
        type: household_activity.type,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(household_activity)
      .where(
        and(
          eq(household_activity.household_id, householdId),
          gte(household_activity.created_at, startDate),
          lte(household_activity.created_at, endDate),
        )
      )
      .groupBy(household_activity.type),

    // ---- HOUSEHOLD ------------------------------------------------------------

    // 21. Members with roles and join dates
    db
      .select({
        userId: household_members.user_id,
        role: household_members.role,
        joinedAt: household_members.joined_at,
        name: users.name,
      })
      .from(household_members)
      .innerJoin(users, eq(household_members.user_id, users.id))
      .where(eq(household_members.household_id, householdId))
      .orderBy(household_members.joined_at),

    // 22. Household created_at
    db
      .select({ createdAt: households.created_at })
      .from(households)
      .where(eq(households.id, householdId))
      .limit(1),
  ]);

  // ---- Build response -------------------------------------------------------

  const totalCompletions = q1_totalCompletions[0]?.count ?? 0;
  const mostCompletedChore = q3_mostCompletedChore[0]
    ? { title: q3_mostCompletedChore[0].title, count: q3_mostCompletedChore[0].count }
    : null;
  const completionsPerMember = q2_completionsPerMember.map((r) => ({
    userId: r.userId,
    name: r.name ?? "Former Member",
    count: r.count,
  }));
  const completionsOverTime = q4_completionsOverTime.map((r) => ({
    date: r.date,
    count: r.count,
  }));
  const pointsPerMember = q5_pointsPerMember.map((r) => ({
    userId: r.userId,
    name: r.name ?? "Former Member",
    totalPoints: r.totalPoints,
  }));

  const totalSpent = parseFloat(q6_totalSpent[0]?.total ?? "0");
  const totalExpenseCount = q7_byCategory.reduce((s, r) => s + 1, 0);
  void totalExpenseCount;
  const byCategory = q7_byCategory.map((r) => ({
    categoryId: r.categoryId,
    name: r.categoryName ?? "Other",
    color: r.categoryColor ?? "#9CA3AF",
    total: parseFloat(r.total ?? "0"),
  }));
  const spendingOverTime = q8_spendingOverTime.map((r) => ({
    week: r.week,
    total: parseFloat(r.total ?? "0"),
  }));
  const settledVsUnsettled = {
    settled: q9_settledVsUnsettled[0]?.settled ?? 0,
    unsettled: q9_settledVsUnsettled[0]?.unsettled ?? 0,
  };

  const taskSummary = q10_tasksSummary[0];
  const totalCreated = taskSummary?.totalCreated ?? 0;
  const totalCompleted = taskSummary?.totalCompleted ?? 0;
  const completionRate = totalCreated > 0 ? Math.round((totalCompleted / totalCreated) * 100) : 0;
  const overdueCount = q11_overdueTasks[0]?.count ?? 0;
  const byPriority = q12_tasksByPriority.map((r) => ({ priority: r.priority, count: r.count }));

  const totalPlanned = q13_mealsPlanned[0]?.count ?? 0;
  const mostPlannedMeal = q14_mostPlannedMeal[0]
    ? { name: q14_mostPlannedMeal[0].mealName, count: q14_mostPlannedMeal[0].count }
    : null;
  const suggestions = {
    submitted: q15_suggestions[0]?.submitted ?? 0,
    approved: q15_suggestions[0]?.approved ?? 0,
  };

  const itemsAdded = q16_itemsAdded[0]?.count ?? 0;
  const itemsChecked = q17_itemsChecked[0]?.count ?? 0;
  const checkRate = itemsAdded > 0 ? Math.round((itemsChecked / itemsAdded) * 100) : 0;
  const mostAddedItem = q18_mostAddedItem[0]
    ? { name: q18_mostAddedItem[0].name, count: q18_mostAddedItem[0].count }
    : null;

  const mostActiveMember = q19_mostActiveMember[0]
    ? { userId: q19_mostActiveMember[0].userId, name: q19_mostActiveMember[0].name ?? "Unknown", count: q19_mostActiveMember[0].count }
    : null;

  const CHORE_TYPES = new Set(["chore_completed"]);
  const TASK_TYPES = new Set(["task_completed", "task_added"]);
  const EXPENSE_TYPES = new Set(["expense_added", "expense_settled", "settlement_confirmed", "settlement_claimed", "settlement_disputed", "recurring_expense_posted"]);
  const MEAL_TYPES = new Set(["meal_planned", "meal_suggested"]);
  const GROCERY_TYPES = new Set(["item_checked", "item_added"]);

  const byTypeGroup = { chores: 0, tasks: 0, expenses: 0, meals: 0, grocery: 0, other: 0 };
  for (const row of q20_activityByType) {
    if (CHORE_TYPES.has(row.type)) byTypeGroup.chores += row.count;
    else if (TASK_TYPES.has(row.type)) byTypeGroup.tasks += row.count;
    else if (EXPENSE_TYPES.has(row.type)) byTypeGroup.expenses += row.count;
    else if (MEAL_TYPES.has(row.type)) byTypeGroup.meals += row.count;
    else if (GROCERY_TYPES.has(row.type)) byTypeGroup.grocery += row.count;
    else byTypeGroup.other += row.count;
  }

  const members = q21_members.map((m) => ({
    userId: m.userId,
    name: m.name,
    role: m.role,
    joinedAt: m.joinedAt?.toISOString() ?? null,
  }));
  const oldestMember = members[0] ?? null;
  const householdAge = q22_householdInfo[0]?.createdAt
    ? differenceInDays(new Date(), q22_householdInfo[0].createdAt)
    : 0;

  return Response.json({
    chores: { totalCompletions, completionsPerMember, mostCompletedChore, completionsOverTime, pointsPerMember },
    expenses: { totalSpent, byCategory, overTime: spendingOverTime, settledVsUnsettled },
    tasks: { totalCreated, totalCompleted, completionRate, overdueCount, byPriority },
    meals: { totalPlanned, mostPlannedMeal, suggestions },
    grocery: { itemsAdded, itemsChecked, checkRate, mostAddedItem },
    activity: { mostActiveMember, byTypeGroup },
    household: { memberCount: members.length, members, oldestMember, householdAge },
  });
}
