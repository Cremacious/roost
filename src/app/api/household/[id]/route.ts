import { NextRequest } from "next/server";
import { requireSession, requireHouseholdAdmin } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import {
  households,
  household_members,
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
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

// ---- PATCH: rename household -------------------------------------------------

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  try {
    await requireHouseholdAdmin(request, id);
  } catch (r) {
    return r as Response;
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const [updated] = await db
    .update(households)
    .set({ name, updated_at: new Date() })
    .where(eq(households.id, id))
    .returning();

  return Response.json({ household: updated });
}

// ---- DELETE: delete household ------------------------------------------------

async function deleteAllHouseholdData(householdId: string) {
  // Reminders
  const reminderRows = await db
    .select({ id: reminders.id })
    .from(reminders)
    .where(eq(reminders.household_id, householdId));
  if (reminderRows.length > 0) {
    const ids = reminderRows.map((r) => r.id);
    await db.delete(reminder_receipts).where(inArray(reminder_receipts.reminder_id, ids));
    await db.delete(reminders).where(eq(reminders.household_id, householdId));
  }

  // Chores
  const choreRows = await db
    .select({ id: chores.id })
    .from(chores)
    .where(eq(chores.household_id, householdId));
  if (choreRows.length > 0) {
    const ids = choreRows.map((r) => r.id);
    await db.delete(chore_completions).where(inArray(chore_completions.chore_id, ids));
    await db.delete(chores).where(eq(chores.household_id, householdId));
  }
  await db.delete(chore_streaks).where(eq(chore_streaks.household_id, householdId));

  // Grocery
  const listRows = await db
    .select({ id: grocery_lists.id })
    .from(grocery_lists)
    .where(eq(grocery_lists.household_id, householdId));
  if (listRows.length > 0) {
    const ids = listRows.map((r) => r.id);
    await db.delete(grocery_items).where(inArray(grocery_items.list_id, ids));
    await db.delete(grocery_lists).where(eq(grocery_lists.household_id, householdId));
  }

  // Calendar
  const eventRows = await db
    .select({ id: calendar_events.id })
    .from(calendar_events)
    .where(eq(calendar_events.household_id, householdId));
  if (eventRows.length > 0) {
    const ids = eventRows.map((r) => r.id);
    await db.delete(event_attendees).where(inArray(event_attendees.event_id, ids));
    await db.delete(calendar_events).where(eq(calendar_events.household_id, householdId));
  }

  // Notes
  await db.delete(notes).where(eq(notes.household_id, householdId));

  // Tasks
  await db.delete(tasks).where(eq(tasks.household_id, householdId));

  // Expenses
  const expenseRows = await db
    .select({ id: expenses.id })
    .from(expenses)
    .where(eq(expenses.household_id, householdId));
  if (expenseRows.length > 0) {
    const ids = expenseRows.map((r) => r.id);
    await db.delete(expense_splits).where(inArray(expense_splits.expense_id, ids));
    await db.delete(expenses).where(eq(expenses.household_id, householdId));
  }

  // Meals
  await db.delete(meal_plan_slots).where(eq(meal_plan_slots.household_id, householdId));
  const suggestionRows = await db
    .select({ id: meal_suggestions.id })
    .from(meal_suggestions)
    .where(eq(meal_suggestions.household_id, householdId));
  if (suggestionRows.length > 0) {
    const ids = suggestionRows.map((r) => r.id);
    await db.delete(meal_suggestion_votes).where(inArray(meal_suggestion_votes.suggestion_id, ids));
    await db.delete(meal_suggestions).where(eq(meal_suggestions.household_id, householdId));
  }

  // Activity
  await db.delete(household_activity).where(eq(household_activity.household_id, householdId));
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  let session;
  try {
    session = await requireHouseholdAdmin(request, id);
  } catch (r) {
    return r as Response;
  }

  await deleteAllHouseholdData(id);

  // Remove all members
  await db.delete(household_members).where(eq(household_members.household_id, id));

  // Soft delete household
  await db
    .update(households)
    .set({ deleted_at: new Date(), updated_at: new Date() })
    .where(eq(households.id, id));

  void session; // used for auth check
  return Response.json({ success: true });
}
