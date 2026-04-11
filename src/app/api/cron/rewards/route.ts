import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import {
  reward_rules,
  reward_payouts,
  chores,
  chore_completions,
  household_members,
  expenses,
  expense_splits,
  users,
} from "@/db/schema";
import { and, count, eq, gte, isNull, lt } from "drizzle-orm";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addDays,
  subDays,
  format,
  parseISO,
  isBefore,
} from "date-fns";
import { logActivity } from "@/lib/utils/activity";

// ---- Helpers ----------------------------------------------------------------

function getCompletedPeriodBounds(
  periodType: string,
  periodDays: number | null,
  startsAt: string | null,
  now: Date
): { start: Date; end: Date } | null {
  if (periodType === "week") {
    // Last completed week = previous Mon-Sun
    const thisWeekStart = startOfWeek(now, { weekStartsOn: 1 });
    const lastWeekStart = subDays(thisWeekStart, 7);
    const lastWeekEnd = subDays(thisWeekStart, 1);
    // Only evaluate if now is past Sunday (i.e. it's Monday or later in UTC)
    if (now >= thisWeekStart) {
      return { start: lastWeekStart, end: lastWeekEnd };
    }
    return null;
  }

  if (periodType === "month") {
    const thisMonthStart = startOfMonth(now);
    if (now.getDate() === 1) {
      // First day of month: evaluate last month
      const lastMonthEnd = subDays(thisMonthStart, 1);
      const lastMonthStart = startOfMonth(lastMonthEnd);
      return { start: lastMonthStart, end: lastMonthEnd };
    }
    return null;
  }

  if (periodType === "year") {
    const thisYearStart = startOfYear(now);
    if (now.getMonth() === 0 && now.getDate() === 1) {
      // Jan 1: evaluate last year
      const lastYearEnd = subDays(thisYearStart, 1);
      const lastYearStart = startOfYear(lastYearEnd);
      return { start: lastYearStart, end: lastYearEnd };
    }
    return null;
  }

  // custom
  const days = periodDays ?? 7;
  const anchor = startsAt ? parseISO(startsAt) : now;
  const msSinceAnchor = now.getTime() - anchor.getTime();
  const msPerPeriod = days * 24 * 60 * 60 * 1000;
  const periodsElapsed = Math.floor(msSinceAnchor / msPerPeriod);
  if (periodsElapsed < 1) return null;

  const lastPeriodStartMs = anchor.getTime() + (periodsElapsed - 1) * msPerPeriod;
  const lastPeriodEndMs = lastPeriodStartMs + msPerPeriod - 1;
  const start = new Date(lastPeriodStartMs);
  const end = new Date(lastPeriodEndMs);
  return { start, end };
}

// ---- GET: Vercel cron — runs nightly at 11pm UTC ----------------------------

export async function GET(request: NextRequest): Promise<Response> {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Fetch all enabled rules with child name
  const activeRules = await db
    .select({
      id: reward_rules.id,
      household_id: reward_rules.household_id,
      user_id: reward_rules.user_id,
      title: reward_rules.title,
      reward_type: reward_rules.reward_type,
      reward_description: reward_rules.reward_description,
      reward_amount: reward_rules.reward_amount,
      period_type: reward_rules.period_type,
      period_days: reward_rules.period_days,
      threshold_percent: reward_rules.threshold_percent,
      starts_at: reward_rules.starts_at,
      child_name: users.name,
    })
    .from(reward_rules)
    .innerJoin(users, eq(users.id, reward_rules.user_id))
    .where(eq(reward_rules.enabled, true));

  const results: {
    ruleId: string;
    userId: string;
    earned: boolean;
    completionRate: number;
  }[] = [];

  for (const rule of activeRules) {
    const bounds = getCompletedPeriodBounds(
      rule.period_type,
      rule.period_days,
      rule.starts_at,
      now
    );

    // No completed period to evaluate yet
    if (!bounds) continue;

    const { start, end } = bounds;
    const periodStartStr = format(start, "yyyy-MM-dd");
    const periodEndStr = format(end, "yyyy-MM-dd");
    const endExclusive = addDays(end, 1);

    // Skip if payout already exists for this rule+period
    const [existing] = await db
      .select({ id: reward_payouts.id })
      .from(reward_payouts)
      .where(
        and(
          eq(reward_payouts.household_id, rule.household_id),
          eq(reward_payouts.user_id, rule.user_id),
          eq(reward_payouts.rule_id, rule.id),
          eq(reward_payouts.period_start, periodStartStr)
        )
      )
      .limit(1);

    if (existing) continue;

    // Count assigned chores
    const [totalRow] = await db
      .select({ total: count() })
      .from(chores)
      .where(
        and(
          eq(chores.household_id, rule.household_id),
          eq(chores.assigned_to, rule.user_id),
          isNull(chores.deleted_at)
        )
      );
    const totalChores = totalRow?.total ?? 0;

    // Count completions in period
    const [completedRow] = await db
      .select({ completed: count() })
      .from(chore_completions)
      .innerJoin(chores, eq(chores.id, chore_completions.chore_id))
      .where(
        and(
          eq(chore_completions.completed_by, rule.user_id),
          eq(chores.household_id, rule.household_id),
          isNull(chores.deleted_at),
          gte(chore_completions.completed_at, start),
          lt(chore_completions.completed_at, endExclusive)
        )
      );
    const completedChores = completedRow?.completed ?? 0;

    const completionRate =
      totalChores === 0
        ? 100
        : Math.round((completedChores / totalChores) * 100);

    const earned = completionRate >= rule.threshold_percent;
    let expenseId: string | null = null;

    if (earned && rule.reward_type === "money" && rule.reward_amount) {
      const amount = parseFloat(String(rule.reward_amount));

      // Find household admin
      const [adminMember] = await db
        .select({ user_id: household_members.user_id })
        .from(household_members)
        .where(
          and(
            eq(household_members.household_id, rule.household_id),
            eq(household_members.role, "admin")
          )
        )
        .limit(1);

      if (adminMember) {
        const periodLabel = format(start, "MMM d");
        const [newExpense] = await db
          .insert(expenses)
          .values({
            household_id: rule.household_id,
            title: `${rule.child_name}'s reward - ${rule.title} (${periodLabel})`,
            total_amount: String(amount),
            paid_by: adminMember.user_id,
            category: "allowance",
          })
          .returning({ id: expenses.id });

        if (newExpense) {
          expenseId = newExpense.id;
          await db.insert(expense_splits).values({
            expense_id: newExpense.id,
            user_id: rule.user_id,
            amount: String(amount),
            settled: false,
          });
        }
      }
    }

    // Insert payout record
    await db.insert(reward_payouts).values({
      household_id: rule.household_id,
      user_id: rule.user_id,
      rule_id: rule.id,
      period_start: periodStartStr,
      period_end: periodEndStr,
      reward_type: rule.reward_type,
      reward_description: rule.reward_description,
      reward_amount: rule.reward_amount,
      earned,
      completion_rate: completionRate,
      threshold_percent: rule.threshold_percent,
      expense_id: expenseId,
      acknowledged: false,
    });

    // Describe the reward for the activity log
    const rewardDesc =
      rule.reward_type === "money" && rule.reward_amount
        ? `$${parseFloat(String(rule.reward_amount)).toFixed(2)}`
        : rule.reward_description ?? rule.title;

    const periodDesc =
      rule.period_type === "custom"
        ? `${rule.period_days}-day`
        : rule.period_type;

    const activityDesc = earned
      ? `${rule.child_name} earned their ${periodDesc} reward: ${rewardDesc} (${completionRate}% of chores)`
      : `${rule.child_name} missed their ${periodDesc} reward (${completionRate}% of chores, needed ${rule.threshold_percent}%)`;

    await logActivity({
      householdId: rule.household_id,
      userId: rule.user_id,
      type: earned ? "allowance_earned" : "allowance_missed",
      description: activityDesc,
      entityType: "allowance",
    });

    // TODO: Push notification to child (Expo push token)
    // Earned: "You earned your [period] reward: [desc]"
    // Missed: "You missed your reward this period. [rate]% of chores done."
    // Also notify parent admin.

    results.push({
      ruleId: rule.id,
      userId: rule.user_id,
      earned,
      completionRate,
    });
  }

  return Response.json({
    processed: results.length,
    payouts: results,
  });
}
