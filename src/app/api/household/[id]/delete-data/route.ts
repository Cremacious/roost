import { NextRequest } from "next/server";
import { requireHouseholdAdmin } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import {
  chores,
  chore_completions,
  chore_streaks,
  grocery_lists,
  grocery_items,
  calendar_events,
  event_attendees,
  notes,
  tasks,
  expenses,
  expense_splits,
  meal_plan_slots,
  meal_suggestions,
  meal_suggestion_votes,
  reminders,
  reminder_receipts,
  household_activity,
  household_join_requests,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  try {
    await requireHouseholdAdmin(request, id);
  } catch (r) {
    return r as Response;
  }

  // Reminders
  const reminderRows = await db
    .select({ id: reminders.id })
    .from(reminders)
    .where(eq(reminders.household_id, id));
  if (reminderRows.length > 0) {
    const ids = reminderRows.map((r) => r.id);
    await db.delete(reminder_receipts).where(inArray(reminder_receipts.reminder_id, ids));
    await db.delete(reminders).where(eq(reminders.household_id, id));
  }

  // Chores
  const choreRows = await db
    .select({ id: chores.id })
    .from(chores)
    .where(eq(chores.household_id, id));
  if (choreRows.length > 0) {
    const ids = choreRows.map((r) => r.id);
    await db.delete(chore_completions).where(inArray(chore_completions.chore_id, ids));
    await db.delete(chores).where(eq(chores.household_id, id));
  }
  await db.delete(chore_streaks).where(eq(chore_streaks.household_id, id));

  // Grocery
  const listRows = await db
    .select({ id: grocery_lists.id })
    .from(grocery_lists)
    .where(eq(grocery_lists.household_id, id));
  if (listRows.length > 0) {
    const ids = listRows.map((r) => r.id);
    await db.delete(grocery_items).where(inArray(grocery_items.list_id, ids));
    await db.delete(grocery_lists).where(eq(grocery_lists.household_id, id));
  }

  // Calendar
  const eventRows = await db
    .select({ id: calendar_events.id })
    .from(calendar_events)
    .where(eq(calendar_events.household_id, id));
  if (eventRows.length > 0) {
    const ids = eventRows.map((r) => r.id);
    await db.delete(event_attendees).where(inArray(event_attendees.event_id, ids));
    await db.delete(calendar_events).where(eq(calendar_events.household_id, id));
  }

  // Notes + tasks
  await db.delete(notes).where(eq(notes.household_id, id));
  await db.delete(tasks).where(eq(tasks.household_id, id));

  // Expenses
  const expenseRows = await db
    .select({ id: expenses.id })
    .from(expenses)
    .where(eq(expenses.household_id, id));
  if (expenseRows.length > 0) {
    const ids = expenseRows.map((r) => r.id);
    await db.delete(expense_splits).where(inArray(expense_splits.expense_id, ids));
    await db.delete(expenses).where(eq(expenses.household_id, id));
  }

  // Meals
  await db.delete(meal_plan_slots).where(eq(meal_plan_slots.household_id, id));
  const suggestionRows = await db
    .select({ id: meal_suggestions.id })
    .from(meal_suggestions)
    .where(eq(meal_suggestions.household_id, id));
  if (suggestionRows.length > 0) {
    const ids = suggestionRows.map((r) => r.id);
    await db.delete(meal_suggestion_votes).where(inArray(meal_suggestion_votes.suggestion_id, ids));
    await db.delete(meal_suggestions).where(eq(meal_suggestions.household_id, id));
  }

  // Activity
  await db.delete(household_activity).where(eq(household_activity.household_id, id));
  await db
    .delete(household_join_requests)
    .where(eq(household_join_requests.household_id, id));

  return Response.json({ success: true });
}
