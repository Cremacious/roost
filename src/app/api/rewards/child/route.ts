import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import {
  reward_rules,
  reward_payouts,
  chores,
  chore_completions,
} from "@/db/schema";
import { and, count, desc, eq, gte, isNull, lt } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { getPeriodBounds } from "@/app/api/rewards/route";
import { addDays, format } from "date-fns";

// ---- GET: Reward data for the current user (child view) ---------------------

export async function GET(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const membership = await getUserHousehold(session.user.id);
  if (!membership) {
    return Response.json({ error: "No household found" }, { status: 404 });
  }

  const userId = session.user.id;
  const { householdId } = membership;

  // Fetch enabled rules for this child
  const rules = await db
    .select()
    .from(reward_rules)
    .where(
      and(
        eq(reward_rules.household_id, householdId),
        eq(reward_rules.user_id, userId),
        eq(reward_rules.enabled, true)
      )
    )
    .orderBy(reward_rules.created_at);

  // For each rule, calculate current period progress
  const rulesWithProgress = await Promise.all(
    rules.map(async (rule) => {
      const { start, end } = getPeriodBounds(
        rule.period_type,
        rule.period_days,
        rule.starts_at
      );
      const endExclusive = addDays(end, 1);

      const [totalRow] = await db
        .select({ total: count() })
        .from(chores)
        .where(
          and(
            eq(chores.household_id, householdId),
            eq(chores.assigned_to, userId),
            isNull(chores.deleted_at)
          )
        );
      const total = totalRow?.total ?? 0;

      const [completedRow] = await db
        .select({ completed: count() })
        .from(chore_completions)
        .innerJoin(chores, eq(chores.id, chore_completions.chore_id))
        .where(
          and(
            eq(chore_completions.completed_by, userId),
            eq(chores.household_id, householdId),
            isNull(chores.deleted_at),
            gte(chore_completions.completed_at, start),
            lt(chore_completions.completed_at, endExclusive)
          )
        );
      const completed = completedRow?.completed ?? 0;

      const completionRate =
        total === 0 ? 100 : Math.round((completed / total) * 100);
      const onTrack = completionRate >= rule.threshold_percent;

      return {
        ...rule,
        currentPeriod: {
          start: format(start, "yyyy-MM-dd"),
          end: format(end, "yyyy-MM-dd"),
          total,
          completed,
          completionRate,
          onTrack,
        },
      };
    })
  );

  // Last 12 payouts
  const payouts = await db
    .select()
    .from(reward_payouts)
    .where(
      and(
        eq(reward_payouts.household_id, householdId),
        eq(reward_payouts.user_id, userId)
      )
    )
    .orderBy(desc(reward_payouts.period_start))
    .limit(12);

  return Response.json({ rules: rulesWithProgress, payouts });
}
