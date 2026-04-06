import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  allowance_settings,
  allowance_payouts,
  chores,
  chore_completions,
  household_members,
  expenses,
  expense_splits,
  users,
} from "@/db/schema";
import { and, count, eq, gte, isNull, lt } from "drizzle-orm";
import { format, startOfWeek, endOfWeek, addDays } from "date-fns";
import { logActivity } from "@/lib/utils/activity";

// ---- GET: Vercel cron — runs every Sunday at 11pm UTC -----------------------
// Evaluates the current week's chore completion for all children with
// active allowance settings. Creates expense entries for earned allowances.

export async function GET(request: NextRequest): Promise<Response> {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Calculate the Monday that started the current week (UTC)
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 }); // Monday
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 }); // Sunday
  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndDate = addDays(weekEnd, 1); // exclusive upper bound

  // Find all active allowance settings, joined with user info
  const activeSettings = await db
    .select({
      id: allowance_settings.id,
      household_id: allowance_settings.household_id,
      user_id: allowance_settings.user_id,
      weekly_amount: allowance_settings.weekly_amount,
      threshold_percent: allowance_settings.threshold_percent,
      child_name: users.name,
    })
    .from(allowance_settings)
    .innerJoin(users, eq(users.id, allowance_settings.user_id))
    .where(eq(allowance_settings.enabled, true));

  const results: {
    userId: string;
    earned: boolean;
    completionRate: number;
  }[] = [];

  for (const setting of activeSettings) {
    // Skip if payout already exists for this week
    const [existing] = await db
      .select({ id: allowance_payouts.id })
      .from(allowance_payouts)
      .where(
        and(
          eq(allowance_payouts.household_id, setting.household_id),
          eq(allowance_payouts.user_id, setting.user_id),
          eq(allowance_payouts.week_start, weekStartStr)
        )
      )
      .limit(1);

    if (existing) continue;

    // Count total chores assigned to this child (not deleted)
    const [totalRow] = await db
      .select({ total: count() })
      .from(chores)
      .where(
        and(
          eq(chores.household_id, setting.household_id),
          eq(chores.assigned_to, setting.user_id),
          isNull(chores.deleted_at)
        )
      );

    const totalChores = totalRow?.total ?? 0;

    // Count completions by this child this week
    const [completedRow] = await db
      .select({ completed: count() })
      .from(chore_completions)
      .innerJoin(chores, eq(chores.id, chore_completions.chore_id))
      .where(
        and(
          eq(chore_completions.completed_by, setting.user_id),
          eq(chores.household_id, setting.household_id),
          isNull(chores.deleted_at),
          gte(chore_completions.completed_at, weekStart),
          lt(chore_completions.completed_at, weekEndDate)
        )
      );

    const completedChores = completedRow?.completed ?? 0;

    // Calculate completion rate (0-100)
    const completionRate =
      totalChores === 0
        ? 100
        : Math.round((completedChores / totalChores) * 100);

    const weeklyAmount = parseFloat(setting.weekly_amount);
    const earned = completionRate >= setting.threshold_percent;

    let expenseId: string | null = null;

    if (earned) {
      // Find the household admin to set as payer
      const [adminMember] = await db
        .select({ user_id: household_members.user_id })
        .from(household_members)
        .where(
          and(
            eq(household_members.household_id, setting.household_id),
            eq(household_members.role, "admin")
          )
        )
        .limit(1);

      if (adminMember) {
        const weekLabel = format(weekStart, "MMM d");

        // Create expense entry for the allowance
        const [newExpense] = await db
          .insert(expenses)
          .values({
            household_id: setting.household_id,
            title: `${setting.child_name}'s allowance - week of ${weekLabel}`,
            total_amount: String(weeklyAmount),
            paid_by: adminMember.user_id,
            category: "allowance",
          })
          .returning({ id: expenses.id });

        if (newExpense) {
          expenseId = newExpense.id;

          // Create split: child owes the weekly amount back to admin
          await db.insert(expense_splits).values({
            expense_id: newExpense.id,
            user_id: setting.user_id,
            amount: String(weeklyAmount),
            settled: false,
          });
        }
      }
    }

    // Insert payout record
    await db.insert(allowance_payouts).values({
      household_id: setting.household_id,
      user_id: setting.user_id,
      week_start: weekStartStr,
      amount: String(weeklyAmount),
      earned,
      completion_rate: completionRate,
      threshold_percent: setting.threshold_percent,
      expense_id: expenseId,
    });

    // Log activity
    const activityDesc = earned
      ? `${setting.child_name} earned their $${weeklyAmount.toFixed(2)} allowance this week (${completionRate}% of chores done)`
      : `${setting.child_name} missed their allowance this week (${completionRate}% of chores done, needed ${setting.threshold_percent}%)`;

    await logActivity({
      householdId: setting.household_id,
      userId: setting.user_id,
      type: earned ? "allowance_earned" : "allowance_missed",
      description: activityDesc,
      entityType: "allowance",
    });

    // TODO: Send Expo push notification to child:
    // Earned: "You earned your $X allowance this week!"
    // Missed: "You missed your allowance this week. You completed X% of chores."
    // Also send summary to parent admin.

    results.push({ userId: setting.user_id, earned, completionRate });
  }

  return Response.json({
    processed: results.length,
    weekStart: weekStartStr,
    payouts: results,
  });
}
