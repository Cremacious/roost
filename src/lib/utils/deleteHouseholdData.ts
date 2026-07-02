import { db } from "@/lib/db";
import {
  chores,
  choreCompletions,
  groceryLists,
  groceryItems,
  calendarEvents,
  eventAttendees,
  notes,
  tasks,
  expenses,
  expenseSplits,
  mealPlanSlots,
  mealSuggestions,
  mealSuggestionVotes,
  reminders,
  reminderReceipts,
  householdActivity,
} from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

/**
 * Hard-delete every piece of household *content* in FK-safe order.
 *
 * Leaves the household row, its members, member permissions, and config-level
 * rows (common items, categories, etc.) intact. Used by:
 *  - DELETE /api/household/[id]        (before soft-deleting the household)
 *  - POST   /api/household/[id]/delete-data (household stays, content wiped)
 *
 * Neon HTTP has no interactive transactions, so this runs as ordered
 * sequential deletes (children before parents).
 */
export async function deleteAllHouseholdData(householdId: string): Promise<void> {
  // Reminders
  const reminderRows = await db
    .select({ id: reminders.id })
    .from(reminders)
    .where(eq(reminders.householdId, householdId));
  if (reminderRows.length > 0) {
    const ids = reminderRows.map((r) => r.id);
    await db.delete(reminderReceipts).where(inArray(reminderReceipts.reminderId, ids));
    await db.delete(reminders).where(eq(reminders.householdId, householdId));
  }

  // Chores
  const choreRows = await db
    .select({ id: chores.id })
    .from(chores)
    .where(eq(chores.householdId, householdId));
  if (choreRows.length > 0) {
    const ids = choreRows.map((r) => r.id);
    await db.delete(choreCompletions).where(inArray(choreCompletions.choreId, ids));
    await db.delete(chores).where(eq(chores.householdId, householdId));
  }

  // Grocery
  const listRows = await db
    .select({ id: groceryLists.id })
    .from(groceryLists)
    .where(eq(groceryLists.householdId, householdId));
  if (listRows.length > 0) {
    const ids = listRows.map((r) => r.id);
    await db.delete(groceryItems).where(inArray(groceryItems.listId, ids));
    await db.delete(groceryLists).where(eq(groceryLists.householdId, householdId));
  }

  // Calendar
  const eventRows = await db
    .select({ id: calendarEvents.id })
    .from(calendarEvents)
    .where(eq(calendarEvents.householdId, householdId));
  if (eventRows.length > 0) {
    const ids = eventRows.map((r) => r.id);
    await db.delete(eventAttendees).where(inArray(eventAttendees.eventId, ids));
    await db.delete(calendarEvents).where(eq(calendarEvents.householdId, householdId));
  }

  // Notes
  await db.delete(notes).where(eq(notes.householdId, householdId));

  // Tasks
  await db.delete(tasks).where(eq(tasks.householdId, householdId));

  // Expenses
  const expenseRows = await db
    .select({ id: expenses.id })
    .from(expenses)
    .where(eq(expenses.householdId, householdId));
  if (expenseRows.length > 0) {
    const ids = expenseRows.map((r) => r.id);
    await db.delete(expenseSplits).where(inArray(expenseSplits.expenseId, ids));
    await db.delete(expenses).where(eq(expenses.householdId, householdId));
  }

  // Meals
  await db.delete(mealPlanSlots).where(eq(mealPlanSlots.householdId, householdId));
  const suggestionRows = await db
    .select({ id: mealSuggestions.id })
    .from(mealSuggestions)
    .where(eq(mealSuggestions.householdId, householdId));
  if (suggestionRows.length > 0) {
    const ids = suggestionRows.map((r) => r.id);
    await db.delete(mealSuggestionVotes).where(inArray(mealSuggestionVotes.suggestionId, ids));
    await db.delete(mealSuggestions).where(eq(mealSuggestions.householdId, householdId));
  }

  // Activity
  await db.delete(householdActivity).where(eq(householdActivity.householdId, householdId));
}
