import { inArray, like, or } from "drizzle-orm";
import { db } from "../../src/lib/db";
import {
  account,
  allowance_payouts,
  allowance_settings,
  calendar_events,
  chore_categories,
  chore_completions,
  chore_streaks,
  chores,
  event_attendees,
  expense_budgets,
  expense_categories,
  expense_splits,
  expenses,
  grocery_items,
  grocery_lists,
  household_activity,
  household_invites,
  household_join_requests,
  household_members,
  households,
  meal_plan_slots,
  meal_suggestion_votes,
  meal_suggestions,
  meals,
  member_permissions,
  notes,
  notification_queue,
  promo_redemptions,
  recurring_expense_templates,
  reminders,
  reminder_receipts,
  reward_payouts,
  reward_rules,
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
          .select({ userId: household_members.user_id })
          .from(household_members)
          .where(inArray(household_members.household_id, householdIds))
      : [];

  const allUserIds = unique([
    ...seedIds,
    ...householdMemberRows.map((row) => row.userId),
  ]);
  const allUserEmails = await getUserEmails(allUserIds);

  await db.transaction(async (tx) => {
    if (householdIds.length > 0) {
      const reminderRows = await tx
        .select({ id: reminders.id })
        .from(reminders)
        .where(inArray(reminders.household_id, householdIds));
      const reminderIds = reminderRows.map((row) => row.id);

      const choreRows = await tx
        .select({ id: chores.id })
        .from(chores)
        .where(inArray(chores.household_id, householdIds));
      const choreIds = choreRows.map((row) => row.id);

      const groceryListRows = await tx
        .select({ id: grocery_lists.id })
        .from(grocery_lists)
        .where(inArray(grocery_lists.household_id, householdIds));
      const groceryListIds = groceryListRows.map((row) => row.id);

      const eventRows = await tx
        .select({ id: calendar_events.id })
        .from(calendar_events)
        .where(inArray(calendar_events.household_id, householdIds));
      const eventIds = eventRows.map((row) => row.id);

      const expenseRows = await tx
        .select({ id: expenses.id })
        .from(expenses)
        .where(inArray(expenses.household_id, householdIds));
      const expenseIds = expenseRows.map((row) => row.id);

      const categoryRows = await tx
        .select({ id: expense_categories.id })
        .from(expense_categories)
        .where(inArray(expense_categories.household_id, householdIds));
      const expenseCategoryIds = categoryRows.map((row) => row.id);

      const rewardRuleRows = await tx
        .select({ id: reward_rules.id })
        .from(reward_rules)
        .where(inArray(reward_rules.household_id, householdIds));
      const rewardRuleIds = rewardRuleRows.map((row) => row.id);

      const mealSuggestionRows = await tx
        .select({ id: meal_suggestions.id })
        .from(meal_suggestions)
        .where(inArray(meal_suggestions.household_id, householdIds));
      const mealSuggestionIds = mealSuggestionRows.map((row) => row.id);

      if (reminderIds.length > 0) {
        await tx
          .delete(reminder_receipts)
          .where(inArray(reminder_receipts.reminder_id, reminderIds));
      }

      if (choreIds.length > 0) {
        await tx
          .delete(chore_completions)
          .where(inArray(chore_completions.chore_id, choreIds));
      }

      if (groceryListIds.length > 0) {
        await tx
          .delete(grocery_items)
          .where(inArray(grocery_items.list_id, groceryListIds));
      }

      if (eventIds.length > 0) {
        await tx
          .delete(event_attendees)
          .where(inArray(event_attendees.event_id, eventIds));
      }

      if (expenseIds.length > 0) {
        await tx
          .delete(reward_payouts)
          .where(inArray(reward_payouts.expense_id, expenseIds));
        await tx
          .delete(allowance_payouts)
          .where(inArray(allowance_payouts.expense_id, expenseIds));
        await tx
          .delete(expense_splits)
          .where(inArray(expense_splits.expense_id, expenseIds));
      }

      if (expenseCategoryIds.length > 0) {
        await tx
          .delete(expense_budgets)
          .where(inArray(expense_budgets.category_id, expenseCategoryIds));
      }

      if (rewardRuleIds.length > 0) {
        await tx
          .delete(reward_payouts)
          .where(inArray(reward_payouts.rule_id, rewardRuleIds));
      }

      if (mealSuggestionIds.length > 0) {
        await tx
          .delete(meal_suggestion_votes)
          .where(inArray(meal_suggestion_votes.suggestion_id, mealSuggestionIds));
      }

      await tx.delete(promo_redemptions).where(inArray(promo_redemptions.household_id, householdIds));
      await tx.delete(household_invites).where(inArray(household_invites.household_id, householdIds));
      await tx
        .delete(household_join_requests)
        .where(inArray(household_join_requests.household_id, householdIds));
      await tx.delete(reminders).where(inArray(reminders.household_id, householdIds));
      await tx.delete(chore_streaks).where(inArray(chore_streaks.household_id, householdIds));
      await tx.delete(chores).where(inArray(chores.household_id, householdIds));
      await tx.delete(chore_categories).where(inArray(chore_categories.household_id, householdIds));
      await tx.delete(grocery_items).where(inArray(grocery_items.household_id, householdIds));
      await tx.delete(grocery_lists).where(inArray(grocery_lists.household_id, householdIds));
      await tx.delete(calendar_events).where(inArray(calendar_events.household_id, householdIds));
      await tx.delete(notes).where(inArray(notes.household_id, householdIds));
      await tx.delete(tasks).where(inArray(tasks.household_id, householdIds));
      await tx
        .delete(recurring_expense_templates)
        .where(inArray(recurring_expense_templates.household_id, householdIds));
      await tx.delete(expenses).where(inArray(expenses.household_id, householdIds));
      await tx.delete(expense_budgets).where(inArray(expense_budgets.household_id, householdIds));
      await tx.delete(expense_categories).where(inArray(expense_categories.household_id, householdIds));
      await tx.delete(meal_suggestions).where(inArray(meal_suggestions.household_id, householdIds));
      await tx.delete(meal_plan_slots).where(inArray(meal_plan_slots.household_id, householdIds));
      await tx.delete(meals).where(inArray(meals.household_id, householdIds));
      await tx.delete(household_activity).where(inArray(household_activity.household_id, householdIds));
      await tx.delete(reward_payouts).where(inArray(reward_payouts.household_id, householdIds));
      await tx.delete(reward_rules).where(inArray(reward_rules.household_id, householdIds));
      await tx.delete(allowance_payouts).where(inArray(allowance_payouts.household_id, householdIds));
      await tx.delete(allowance_settings).where(inArray(allowance_settings.household_id, householdIds));
      await tx.delete(member_permissions).where(inArray(member_permissions.household_id, householdIds));
      await tx.delete(household_members).where(inArray(household_members.household_id, householdIds));
      await tx.delete(households).where(inArray(households.id, householdIds));
    }

    if (allUserIds.length > 0) {
      await tx.delete(member_permissions).where(inArray(member_permissions.user_id, allUserIds));
      await tx.delete(household_members).where(inArray(household_members.user_id, allUserIds));
      await tx.delete(notification_queue).where(inArray(notification_queue.user_id, allUserIds));
      await tx
        .delete(household_join_requests)
        .where(inArray(household_join_requests.requester_user_id, allUserIds));
      await tx.delete(session).where(inArray(session.userId, allUserIds));
      await tx.delete(account).where(inArray(account.userId, allUserIds));
      if (allUserEmails.length > 0) {
        await tx
          .delete(verification)
          .where(
            or(
              inArray(verification.identifier, allUserEmails),
              inArray(verification.value, allUserEmails),
            ),
          );
      }
      await tx.delete(users).where(inArray(users.id, allUserIds));
      await tx.delete(authUser).where(inArray(authUser.id, allUserIds));
    }
  });
}
