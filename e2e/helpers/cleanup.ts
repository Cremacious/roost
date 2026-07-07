import { inArray, like, or } from "drizzle-orm";
import { db } from "../../src/lib/db";
import {
  account,
  calendarEvents,
  choreCompletions,
  chores,
  eventAttendees,
  expenseBudgets,
  expenseCategories,
  expenseSplits,
  expenses,
  groceryItems,
  groceryLists,
  householdActivity,
  householdInvites,
  householdMembers,
  households,
  mealPlanSlots,
  mealSuggestionVotes,
  mealSuggestions,
  meals,
  memberPermissions,
  notes,
  notificationQueue,
  promoRedemptions,
  reminders,
  reminderReceipts,
  rewardPayouts,
  rewardRules,
  session,
  tasks,
  user as authUser,
  users,
  verification,
} from "../../src/db/schema";

const TEST_EMAIL_PATTERNS = [
  "auth-%@roost.test",
  "pw-change-%@roost.test",
  "onboard-%@roost.test",
  "hh-%@roost.test",
  "email-change-%@roost.test",
  "email-changed-%@roost.test",
] as const;

function unique<T>(values: T[]): T[] {
  return [...new Set(values)];
}

async function getDynamicTestUserIds(): Promise<string[]> {
  const rows = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(or(...TEST_EMAIL_PATTERNS.map((pattern) => like(authUser.email, pattern))));

  return unique(rows.map((row) => row.id));
}

async function getUserEmails(userIds: string[]): Promise<string[]> {
  if (userIds.length === 0) {
    return [];
  }

  const rows = await db
    .select({ email: authUser.email })
    .from(authUser)
    .where(inArray(authUser.id, userIds));

  return unique(
    rows
      .map((row) => row.email)
      .filter((email): email is string => Boolean(email)),
  );
}

export async function cleanupPlaywrightTestData(): Promise<void> {
  const seedIds = await getDynamicTestUserIds();

  if (seedIds.length === 0) {
    return;
  }

  const createdHouseholds = await db
    .select({ id: households.id })
    .from(households)
    .where(inArray(households.created_by, seedIds));

  const householdIds = unique(createdHouseholds.map((row) => row.id));

  const householdMemberRows =
    householdIds.length > 0
      ? await db
          .select({ userId: householdMembers.userId })
          .from(householdMembers)
          .where(inArray(householdMembers.householdId, householdIds))
      : [];

  const allUserIds = unique([
    ...seedIds,
    ...householdMemberRows.map((row) => row.userId),
  ]);
  const allUserEmails = await getUserEmails(allUserIds);

  // Neon HTTP driver does not support transactions — run sequential deletes instead
  if (householdIds.length > 0) {
    const reminderRows = await db
      .select({ id: reminders.id })
      .from(reminders)
      .where(inArray(reminders.householdId, householdIds));
    const reminderIds = reminderRows.map((row) => row.id);

    const choreRows = await db
      .select({ id: chores.id })
      .from(chores)
      .where(inArray(chores.householdId, householdIds));
    const choreIds = choreRows.map((row) => row.id);

    const groceryListRows = await db
      .select({ id: groceryLists.id })
      .from(groceryLists)
      .where(inArray(groceryLists.householdId, householdIds));
    const groceryListIds = groceryListRows.map((row) => row.id);

    const eventRows = await db
      .select({ id: calendarEvents.id })
      .from(calendarEvents)
      .where(inArray(calendarEvents.householdId, householdIds));
    const eventIds = eventRows.map((row) => row.id);

    const expenseRows = await db
      .select({ id: expenses.id })
      .from(expenses)
      .where(inArray(expenses.householdId, householdIds));
    const expenseIds = expenseRows.map((row) => row.id);

    const categoryRows = await db
      .select({ id: expenseCategories.id })
      .from(expenseCategories)
      .where(inArray(expenseCategories.householdId, householdIds));
    const expenseCategoryIds = categoryRows.map((row) => row.id);

    const rewardRuleRows = await db
      .select({ id: rewardRules.id })
      .from(rewardRules)
      .where(inArray(rewardRules.householdId, householdIds));
    const rewardRuleIds = rewardRuleRows.map((row) => row.id);

    const mealSuggestionRows = await db
      .select({ id: mealSuggestions.id })
      .from(mealSuggestions)
      .where(inArray(mealSuggestions.householdId, householdIds));
    const mealSuggestionIds = mealSuggestionRows.map((row) => row.id);

    if (reminderIds.length > 0) {
      await db
        .delete(reminderReceipts)
        .where(inArray(reminderReceipts.reminderId, reminderIds));
    }

    if (choreIds.length > 0) {
      await db
        .delete(choreCompletions)
        .where(inArray(choreCompletions.choreId, choreIds));
    }

    if (groceryListIds.length > 0) {
      await db
        .delete(groceryItems)
        .where(inArray(groceryItems.listId, groceryListIds));
    }

    if (eventIds.length > 0) {
      await db
        .delete(eventAttendees)
        .where(inArray(eventAttendees.eventId, eventIds));
    }

    if (expenseIds.length > 0) {
      await db
        .delete(rewardPayouts)
        .where(inArray(rewardPayouts.expenseId, expenseIds));
      await db
        .delete(expenseSplits)
        .where(inArray(expenseSplits.expenseId, expenseIds));
    }

    if (expenseCategoryIds.length > 0) {
      await db
        .delete(expenseBudgets)
        .where(inArray(expenseBudgets.categoryId, expenseCategoryIds));
    }

    if (rewardRuleIds.length > 0) {
      await db
        .delete(rewardPayouts)
        .where(inArray(rewardPayouts.ruleId, rewardRuleIds));
    }

    if (mealSuggestionIds.length > 0) {
      await db
        .delete(mealSuggestionVotes)
        .where(inArray(mealSuggestionVotes.suggestionId, mealSuggestionIds));
    }

    await db.delete(promoRedemptions).where(inArray(promoRedemptions.householdId, householdIds));
    await db.delete(householdInvites).where(inArray(householdInvites.householdId, householdIds));
    await db.delete(reminders).where(inArray(reminders.householdId, householdIds));
    await db.delete(chores).where(inArray(chores.householdId, householdIds));
    await db.delete(groceryItems).where(inArray(groceryItems.householdId, householdIds));
    await db.delete(groceryLists).where(inArray(groceryLists.householdId, householdIds));
    await db.delete(calendarEvents).where(inArray(calendarEvents.householdId, householdIds));
    await db.delete(notes).where(inArray(notes.householdId, householdIds));
    await db.delete(tasks).where(inArray(tasks.householdId, householdIds));
    await db.delete(expenses).where(inArray(expenses.householdId, householdIds));
    await db.delete(expenseBudgets).where(inArray(expenseBudgets.householdId, householdIds));
    await db.delete(expenseCategories).where(inArray(expenseCategories.householdId, householdIds));
    await db.delete(mealSuggestions).where(inArray(mealSuggestions.householdId, householdIds));
    await db.delete(mealPlanSlots).where(inArray(mealPlanSlots.householdId, householdIds));
    await db.delete(meals).where(inArray(meals.householdId, householdIds));
    await db.delete(householdActivity).where(inArray(householdActivity.householdId, householdIds));
    await db.delete(rewardPayouts).where(inArray(rewardPayouts.householdId, householdIds));
    await db.delete(rewardRules).where(inArray(rewardRules.householdId, householdIds));
    await db.delete(memberPermissions).where(inArray(memberPermissions.householdId, householdIds));
    await db.delete(householdMembers).where(inArray(householdMembers.householdId, householdIds));
    // Null out active_household_id on users before deleting the household rows (FK constraint)
    await db
      .update(users)
      .set({ activeHouseholdId: null })
      .where(inArray(users.activeHouseholdId, householdIds));
    await db.delete(households).where(inArray(households.id, householdIds));
  }

  if (allUserIds.length > 0) {
    await db.delete(memberPermissions).where(inArray(memberPermissions.userId, allUserIds));
    await db.delete(householdMembers).where(inArray(householdMembers.userId, allUserIds));
    await db.delete(notificationQueue).where(inArray(notificationQueue.userId, allUserIds));
    await db.delete(session).where(inArray(session.userId, allUserIds));
    await db.delete(account).where(inArray(account.userId, allUserIds));
    if (allUserEmails.length > 0) {
      await db
        .delete(verification)
        .where(
          or(
            inArray(verification.identifier, allUserEmails),
            inArray(verification.value, allUserEmails),
          ),
        );
    }
    await db.delete(users).where(inArray(users.id, allUserIds));
    await db.delete(authUser).where(inArray(authUser.id, allUserIds));
  }
}
