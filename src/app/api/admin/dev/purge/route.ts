import { NextRequest } from "next/server";
import { sql } from "drizzle-orm";
import { requireAdminSession } from "@/lib/admin/requireAdmin";
import { isLocalAdminDevRequest } from "@/lib/admin/devAccess";
import { db } from "@/lib/db";

const PURGE_ALL_DATA_SQL = sql.raw(`
TRUNCATE TABLE
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
  household_members,
  households,
  meal_plan_slots,
  meal_suggestion_votes,
  meal_suggestions,
  meals,
  member_permissions,
  notes,
  notification_queue,
  promo_codes,
  promo_redemptions,
  recurring_expense_templates,
  reminder_receipts,
  reminders,
  reward_payouts,
  reward_rules,
  session,
  tasks,
  "user",
  users,
  verification
CASCADE;
`);

export async function POST(request: NextRequest): Promise<Response> {
  if (!isLocalAdminDevRequest(request)) {
    return new Response("Not Found", { status: 404 });
  }

  const authError = await requireAdminSession(request);
  if (authError) return authError;

  await db.execute(PURGE_ALL_DATA_SQL);

  return Response.json({
    success: true,
  });
}
