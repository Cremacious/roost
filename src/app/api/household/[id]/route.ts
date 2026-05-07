import { NextRequest } from "next/server";
import { requireHouseholdAdmin } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import {
  households,
  householdMembers,
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

  let body: { name?: string; statsVisibility?: Record<string, boolean> };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Build update payload — at least one field must be present
  const updates: { name?: string; stats_visibility?: string; updated_at: Date } = {
    updated_at: new Date(),
  };

  if (body.name !== undefined) {
    const name = body.name.trim();
    if (!name) {
      return Response.json({ error: "Name is required" }, { status: 400 });
    }
    updates.name = name;
  }

  if (body.statsVisibility !== undefined) {
    updates.stats_visibility = JSON.stringify(body.statsVisibility);
  }

  if (!updates.name && !updates.stats_visibility) {
    return Response.json({ error: "Nothing to update" }, { status: 400 });
  }

  const [updated] = await db
    .update(households)
    .set(updates)
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

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  try {
    await requireHouseholdAdmin(request, id);
  } catch (r) {
    return r as Response;
  }

  await deleteAllHouseholdData(id);

  // Remove all members
  await db.delete(householdMembers).where(eq(householdMembers.householdId, id));

  // Soft delete household
  await db
    .update(households)
    .set({ deleted_at: new Date(), updated_at: new Date() })
    .where(eq(households.id, id));

  return Response.json({ success: true });
}
