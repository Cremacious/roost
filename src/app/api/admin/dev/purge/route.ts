import { NextRequest } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function POST(request: NextRequest): Promise<Response> {
  // Dev only — hard block in any other environment
  if (process.env.NODE_ENV !== 'development') {
    return Response.json({ error: 'This endpoint is only available in development' }, { status: 403 })
  }

  const unauth = await requireAdminSession(request)
  if (unauth) return unauth

  // TRUNCATE CASCADE handles all FK ordering automatically.
  // We list every table; Postgres figures out the safe order.
  await db.execute(sql`
    TRUNCATE TABLE
      reminder_receipts,
      reminders,
      chore_completions,
      chore_streaks,
      chores,
      chore_categories,
      grocery_items,
      grocery_lists,
      event_attendees,
      calendar_events,
      notes,
      tasks,
      expense_splits,
      expense_budgets,
      expenses,
      expense_categories,
      recurring_expense_templates,
      meal_suggestion_votes,
      meal_suggestions,
      meal_plan_slots,
      meals,
      reward_payouts,
      reward_rules,
      household_activity,
      household_invites,
      member_permissions,
      household_members,
      households,
      promo_redemptions,
      promo_codes,
      users,
      verification,
      account,
      session,
      "user"
    RESTART IDENTITY CASCADE
  `)

  return Response.json({ success: true })
}
