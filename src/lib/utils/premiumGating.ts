import { db } from "@/lib/db";
import { chores, tasks, notes, calendar_events, reminders, meals, household_members } from "@/db/schema";
import { and, count, eq, gte, isNull, lt, sql as drizzleSql } from "drizzle-orm";
import { FREE_TIER_LIMITS } from "@/lib/constants/freeTierLimits";

// ---- Chores -----------------------------------------------------------------

export async function checkChoreLimit(
  householdId: string
): Promise<{ allowed: boolean; count: number }> {
  const [row] = await db
    .select({ count: count(chores.id) })
    .from(chores)
    .where(and(eq(chores.household_id, householdId), isNull(chores.deleted_at)));
  const n = Number(row?.count ?? 0);
  return { count: n, allowed: n < FREE_TIER_LIMITS.chores };
}

// ---- Tasks ------------------------------------------------------------------

export async function checkTaskLimit(
  householdId: string
): Promise<{ allowed: boolean; count: number }> {
  const [row] = await db
    .select({ count: count(tasks.id) })
    .from(tasks)
    .where(and(eq(tasks.household_id, householdId), isNull(tasks.deleted_at), eq(tasks.completed, false)));
  const n = Number(row?.count ?? 0);
  return { count: n, allowed: n < FREE_TIER_LIMITS.tasks };
}

// ---- Notes ------------------------------------------------------------------

export async function checkNoteLimit(
  householdId: string
): Promise<{ allowed: boolean; count: number }> {
  const [row] = await db
    .select({ count: count(notes.id) })
    .from(notes)
    .where(and(eq(notes.household_id, householdId), isNull(notes.deleted_at)));
  const n = Number(row?.count ?? 0);
  return { count: n, allowed: n < FREE_TIER_LIMITS.notes };
}

// ---- Calendar ---------------------------------------------------------------

export async function checkCalendarEventLimit(
  householdId: string,
  month: number,
  year: number
): Promise<{ allowed: boolean; count: number }> {
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 1);
  const [row] = await db
    .select({ count: count(calendar_events.id) })
    .from(calendar_events)
    .where(
      and(
        eq(calendar_events.household_id, householdId),
        isNull(calendar_events.deleted_at),
        gte(calendar_events.start_time, monthStart),
        lt(calendar_events.start_time, monthEnd)
      )
    );
  const n = Number(row?.count ?? 0);
  return { count: n, allowed: n < FREE_TIER_LIMITS.calendarEventsPerMonth };
}

// ---- Reminders --------------------------------------------------------------

export async function checkReminderLimit(
  householdId: string,
  userId: string
): Promise<{ allowed: boolean; count: number }> {
  // Count active (non-completed, non-recurring) reminders created by this user
  const rows = await db
    .select({
      id: reminders.id,
      frequency: reminders.frequency,
      completed: reminders.completed,
      created_by: reminders.created_by,
    })
    .from(reminders)
    .where(
      and(
        eq(reminders.household_id, householdId),
        isNull(reminders.deleted_at),
        eq(reminders.completed, false),
        eq(reminders.created_by, userId)
      )
    );
  // Only count "once" (single) reminders — recurring are already blocked separately
  const n = rows.filter((r) => r.frequency === "once").length;
  return { count: n, allowed: n < FREE_TIER_LIMITS.activeSingleReminders };
}

// ---- Meal bank --------------------------------------------------------------

export async function checkMealBankLimit(
  householdId: string
): Promise<{ allowed: boolean; count: number }> {
  const [row] = await db
    .select({ count: count(meals.id) })
    .from(meals)
    .where(and(eq(meals.household_id, householdId), isNull(meals.deleted_at)));
  const n = Number(row?.count ?? 0);
  return { count: n, allowed: n < FREE_TIER_LIMITS.mealBank };
}

// ---- Members ----------------------------------------------------------------

export async function checkMemberLimit(
  householdId: string
): Promise<{ allowed: boolean; count: number }> {
  const [row] = await db
    .select({ count: count(household_members.id) })
    .from(household_members)
    .where(eq(household_members.household_id, householdId));
  const n = Number(row?.count ?? 0);
  return { count: n, allowed: n < FREE_TIER_LIMITS.members };
}
