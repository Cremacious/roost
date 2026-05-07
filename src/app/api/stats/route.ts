import { NextRequest } from "next/server";
import { getSession, getUserHousehold } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import {
  chores,
  choreCompletions,
  expenseCategories,
  expenses,
  expenseSplits,
  tasks,
  mealPlanSlots,
  meals,
  mealSuggestions,
  groceryItems,
  householdActivity,
  householdMembers,
  households,
  users,
} from "@/db/schema";
import { and, eq, gte, isNull, isNotNull, lte, lt, sql } from "drizzle-orm";
import { differenceInDays } from "date-fns";

export async function GET(request: NextRequest): Promise<Response> {
  const session = await getSession();
  if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

  const membership = await getUserHousehold(session.user.id);
  if (!membership) {
    return Response.json({ error: "No household found" }, { status: 404 });
  }
  const { householdId } = membership;

  // Premium check
  if (membership.household.subscriptionStatus !== "premium") {
    return Response.json({ error: "Premium required", code: "STATS_PREMIUM" }, { status: 403 });
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
      .from(choreCompletions)
      .innerJoin(chores, eq(choreCompletions.choreId, chores.id))
      .where(
        and(
          eq(chores.householdId, householdId),
          isNull(chores.deletedAt),
          gte(choreCompletions.completedAt, startDate),
          lte(choreCompletions.completedAt, endDate),
        )
      ),

    // 2. Completions per member (joined with users for name)
    db
      .select({
        userId: choreCompletions.userId,
        name: users.name,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(choreCompletions)
      .innerJoin(chores, eq(choreCompletions.choreId, chores.id))
      .leftJoin(users, eq(choreCompletions.userId, users.id))
      .where(
        and(
          eq(chores.householdId, householdId),
          isNull(chores.deletedAt),
          gte(choreCompletions.completedAt, startDate),
          lte(choreCompletions.completedAt, endDate),
        )
      )
      .groupBy(choreCompletions.userId, users.name)
      .orderBy(sql`count(*) desc`),

    // 3. Most completed chore
    db
      .select({
        choreId: choreCompletions.choreId,
        title: chores.title,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(choreCompletions)
      .innerJoin(chores, eq(choreCompletions.choreId, chores.id))
      .where(
        and(
          eq(chores.householdId, householdId),
          isNull(chores.deletedAt),
          gte(choreCompletions.completedAt, startDate),
          lte(choreCompletions.completedAt, endDate),
        )
      )
      .groupBy(choreCompletions.choreId, chores.title)
      .orderBy(sql`count(*) desc`)
      .limit(1),

    // 4. Completions over time (daily buckets)
    db
      .select({
        date: sql<string>`to_char(date_trunc('day', ${choreCompletions.completedAt}), 'YYYY-MM-DD')`,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(choreCompletions)
      .innerJoin(chores, eq(choreCompletions.choreId, chores.id))
      .where(
        and(
          eq(chores.householdId, householdId),
          isNull(chores.deletedAt),
          gte(choreCompletions.completedAt, startDate),
          lte(choreCompletions.completedAt, endDate),
        )
      )
      .groupBy(sql`date_trunc('day', ${choreCompletions.completedAt})`)
      .orderBy(sql`date_trunc('day', ${choreCompletions.completedAt})`),

    // 5. Total points per member (from completions in range)
    db
      .select({
        userId: choreCompletions.userId,
        name: users.name,
        totalPoints: sql<number>`cast(coalesce(sum(${choreCompletions.points}), 0) as int)`,
      })
      .from(choreCompletions)
      .innerJoin(chores, eq(choreCompletions.choreId, chores.id))
      .leftJoin(users, eq(choreCompletions.userId, users.id))
      .where(
        and(
          eq(chores.householdId, householdId),
          isNull(chores.deletedAt),
          gte(choreCompletions.completedAt, startDate),
          lte(choreCompletions.completedAt, endDate),
        )
      )
      .groupBy(choreCompletions.userId, users.name)
      .orderBy(sql`sum(${choreCompletions.points}) desc`),

    // ---- EXPENSES -------------------------------------------------------------

    // 6. Total spent in range
    db
      .select({ total: sql<string>`coalesce(sum(${expenses.amount}), '0')` })
      .from(expenses)
      .where(
        and(
          eq(expenses.householdId, householdId),
          isNull(expenses.deletedAt),
          eq(expenses.isRecurringDraft, false),
          gte(expenses.createdAt, startDate),
          lte(expenses.createdAt, endDate),
        )
      ),

    // 7. Spending by category
    db
      .select({
        categoryId: expenses.categoryId,
        categoryName: expenseCategories.name,
        categoryColor: expenseCategories.color,
        total: sql<string>`coalesce(sum(${expenses.amount}), '0')`,
      })
      .from(expenses)
      .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .where(
        and(
          eq(expenses.householdId, householdId),
          isNull(expenses.deletedAt),
          eq(expenses.isRecurringDraft, false),
          gte(expenses.createdAt, startDate),
          lte(expenses.createdAt, endDate),
        )
      )
      .groupBy(expenses.categoryId, expenseCategories.name, expenseCategories.color)
      .orderBy(sql`sum(${expenses.amount}) desc`),

    // 8. Spending over time (weekly buckets)
    db
      .select({
        week: sql<string>`to_char(date_trunc('week', ${expenses.createdAt}), 'YYYY-MM-DD')`,
        total: sql<string>`coalesce(sum(${expenses.amount}), '0')`,
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.householdId, householdId),
          isNull(expenses.deletedAt),
          eq(expenses.isRecurringDraft, false),
          gte(expenses.createdAt, startDate),
          lte(expenses.createdAt, endDate),
        )
      )
      .groupBy(sql`date_trunc('week', ${expenses.createdAt})`)
      .orderBy(sql`date_trunc('week', ${expenses.createdAt})`),

    // 9. Settled vs unsettled split count
    db
      .select({
        settled: sql<number>`cast(count(*) filter (where ${expenseSplits.settled} = true) as int)`,
        unsettled: sql<number>`cast(count(*) filter (where ${expenseSplits.settled} = false) as int)`,
      })
      .from(expenseSplits)
      .innerJoin(
        expenses,
        and(
          eq(expenseSplits.expenseId, expenses.id),
          eq(expenses.householdId, householdId),
          isNull(expenses.deletedAt),
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
          eq(tasks.householdId, householdId),
          isNull(tasks.deletedAt),
          gte(tasks.createdAt, startDate),
          lte(tasks.createdAt, endDate),
        )
      ),

    // 11. Overdue tasks (current snapshot)
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(tasks)
      .where(
        and(
          eq(tasks.householdId, householdId),
          isNull(tasks.deletedAt),
          eq(tasks.completed, false),
          lt(tasks.dueDate, new Date()),
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
          eq(tasks.householdId, householdId),
          isNull(tasks.deletedAt),
          gte(tasks.createdAt, startDate),
          lte(tasks.createdAt, endDate),
        )
      )
      .groupBy(tasks.priority),

    // ---- MEALS ----------------------------------------------------------------

    // 13. Meals planned in range
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(mealPlanSlots)
      .where(
        and(
          eq(mealPlanSlots.householdId, householdId),
          gte(mealPlanSlots.slotDate, start),
          lte(mealPlanSlots.slotDate, end),
        )
      ),

    // 14. Most planned meal in range
    db
      .select({
        mealName: meals.name,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(mealPlanSlots)
      .leftJoin(meals, eq(mealPlanSlots.mealId, meals.id))
      .where(
        and(
          eq(mealPlanSlots.householdId, householdId),
          gte(mealPlanSlots.slotDate, start),
          lte(mealPlanSlots.slotDate, end),
        )
      )
      .groupBy(meals.name)
      .orderBy(sql`count(*) desc`)
      .limit(1),

    // 15. Suggestions submitted vs accepted in range
    db
      .select({
        submitted: sql<number>`cast(count(*) as int)`,
        approved: sql<number>`cast(count(*) filter (where ${mealSuggestions.status} = 'accepted') as int)`,
      })
      .from(mealSuggestions)
      .where(
        and(
          eq(mealSuggestions.householdId, householdId),
          gte(mealSuggestions.createdAt, startDate),
          lte(mealSuggestions.createdAt, endDate),
        )
      ),

    // ---- GROCERY --------------------------------------------------------------

    // 16. Items added in range
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(groceryItems)
      .where(
        and(
          eq(groceryItems.householdId, householdId),
          isNull(groceryItems.deletedAt),
          gte(groceryItems.createdAt, startDate),
          lte(groceryItems.createdAt, endDate),
        )
      ),

    // 17. Items checked off in range
    db
      .select({ count: sql<number>`cast(count(*) as int)` })
      .from(groceryItems)
      .where(
        and(
          eq(groceryItems.householdId, householdId),
          eq(groceryItems.isChecked, true),
          isNull(groceryItems.deletedAt),
          isNotNull(groceryItems.checkedAt),
          gte(groceryItems.checkedAt, startDate),
          lte(groceryItems.checkedAt, endDate),
        )
      ),

    // 18. Most added grocery item in range
    db
      .select({
        name: groceryItems.name,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(groceryItems)
      .where(
        and(
          eq(groceryItems.householdId, householdId),
          isNull(groceryItems.deletedAt),
          gte(groceryItems.createdAt, startDate),
          lte(groceryItems.createdAt, endDate),
        )
      )
      .groupBy(groceryItems.name)
      .orderBy(sql`count(*) desc`)
      .limit(1),

    // ---- ACTIVITY -------------------------------------------------------------

    // 19. Most active member in range
    db
      .select({
        userId: householdActivity.userId,
        name: users.name,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(householdActivity)
      .leftJoin(users, eq(householdActivity.userId, users.id))
      .where(
        and(
          eq(householdActivity.householdId, householdId),
          gte(householdActivity.createdAt, startDate),
          lte(householdActivity.createdAt, endDate),
        )
      )
      .groupBy(householdActivity.userId, users.name)
      .orderBy(sql`count(*) desc`)
      .limit(1),

    // 20. Activity count by type
    db
      .select({
        type: householdActivity.type,
        count: sql<number>`cast(count(*) as int)`,
      })
      .from(householdActivity)
      .where(
        and(
          eq(householdActivity.householdId, householdId),
          gte(householdActivity.createdAt, startDate),
          lte(householdActivity.createdAt, endDate),
        )
      )
      .groupBy(householdActivity.type),

    // ---- HOUSEHOLD ------------------------------------------------------------

    // 21. Members with roles and join dates
    db
      .select({
        userId: householdMembers.userId,
        role: householdMembers.role,
        joinedAt: householdMembers.createdAt,
        name: users.name,
      })
      .from(householdMembers)
      .innerJoin(users, eq(householdMembers.userId, users.id))
      .where(
        and(
          eq(householdMembers.householdId, householdId),
          isNull(householdMembers.deletedAt),
        )
      )
      .orderBy(householdMembers.createdAt),

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
    ? { name: q14_mostPlannedMeal[0].mealName ?? "Custom", count: q14_mostPlannedMeal[0].count }
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
    ? {
        userId: q19_mostActiveMember[0].userId,
        name: q19_mostActiveMember[0].name ?? "Unknown",
        count: q19_mostActiveMember[0].count,
      }
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
