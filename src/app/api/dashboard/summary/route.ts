import { NextRequest } from "next/server";
import { addHours, format } from "date-fns";
import { and, desc, eq, isNull, lte, ne, sql } from "drizzle-orm";
import { requireCurrentMembership } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import {
  expense_splits,
  expenses,
  household_activity,
  households,
  meal_plan_slots,
  meals,
  reminders,
  users,
} from "@/db/schema";
export async function GET(request: NextRequest): Promise<Response> {
  let authContext;
  try {
    authContext = await requireCurrentMembership(request);
  } catch (response) {
    return response as Response;
  }

  const {
    membership: { householdId, role },
    user: { id: userId },
  } = authContext;
  const now = new Date();
  const in24h = addHours(now, 24);
  const today = format(now, "yyyy-MM-dd");

  const [
    household,
    userProfile,
    owedToMeRow,
    iOweRow,
    tonightSlot,
    activityRows,
    reminderRows,
  ] = await Promise.all([
    db
      .select({
        id: households.id,
        name: households.name,
        subscription_status: households.subscription_status,
        premium_expires_at: households.premium_expires_at,
      })
      .from(households)
      .where(eq(households.id, householdId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({ has_seen_welcome: users.has_seen_welcome })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        total: sql<number>`coalesce(sum(${expense_splits.amount}), 0)`,
      })
      .from(expense_splits)
      .innerJoin(expenses, eq(expense_splits.expense_id, expenses.id))
      .where(
        and(
          eq(expenses.household_id, householdId),
          isNull(expenses.deleted_at),
          eq(expenses.paid_by, userId),
          eq(expense_splits.settled, false),
          ne(expense_splits.user_id, userId)
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        total: sql<number>`coalesce(sum(${expense_splits.amount}), 0)`,
      })
      .from(expense_splits)
      .innerJoin(expenses, eq(expense_splits.expense_id, expenses.id))
      .where(
        and(
          eq(expenses.household_id, householdId),
          isNull(expenses.deleted_at),
          eq(expense_splits.settled, false),
          eq(expense_splits.user_id, userId),
          ne(expenses.paid_by, userId)
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        meal_name: meals.name,
        custom_meal_name: meal_plan_slots.custom_meal_name,
      })
      .from(meal_plan_slots)
      .leftJoin(meals, eq(meal_plan_slots.meal_id, meals.id))
      .where(
        and(
          eq(meal_plan_slots.household_id, householdId),
          eq(meal_plan_slots.slot_date, today),
          eq(meal_plan_slots.slot_type, "dinner")
        )
      )
      .limit(1)
      .then((rows) => rows[0] ?? null),
    db
      .select({
        id: household_activity.id,
        type: household_activity.type,
        description: household_activity.description,
        created_at: household_activity.created_at,
        user_name: users.name,
      })
      .from(household_activity)
      .innerJoin(users, eq(household_activity.user_id, users.id))
      .where(eq(household_activity.household_id, householdId))
      .orderBy(desc(household_activity.created_at))
      .limit(6),
    db
      .select({
        notify_type: reminders.notify_type,
        notify_user_ids: reminders.notify_user_ids,
        created_by: reminders.created_by,
      })
      .from(reminders)
      .where(
        and(
          eq(reminders.household_id, householdId),
          isNull(reminders.deleted_at),
          eq(reminders.completed, false),
          lte(reminders.next_remind_at, in24h)
        )
      ),
  ]);

  const isPremium = Boolean(
    household &&
      household.subscription_status === "premium" &&
      (!household.premium_expires_at || new Date(household.premium_expires_at) > now)
  );

  const dueReminderCount = reminderRows.filter((reminder) => {
    if (reminder.notify_type === "household") return true;
    if (reminder.notify_type === "self") return reminder.created_by === userId;
    if (reminder.notify_type === "specific") {
      try {
        const ids = JSON.parse(reminder.notify_user_ids ?? "[]") as string[];
        return ids.includes(userId);
      } catch {
        return false;
      }
    }
    return false;
  }).length;

  const owedToMe = Number(owedToMeRow?.total ?? 0);
  const iOwe = Number(iOweRow?.total ?? 0);

  return Response.json({
    household: household ? { id: household.id, name: household.name } : null,
    role,
    isPremium,
    hasSeenWelcome: userProfile?.has_seen_welcome ?? true,
    myBalance: Math.round((owedToMe - iOwe) * 100) / 100,
    dueReminderCount,
    tonightMealName: tonightSlot?.meal_name ?? tonightSlot?.custom_meal_name ?? null,
    activity: activityRows.slice(0, 5),
    activityHasMore: activityRows.length > 5,
  });
}
