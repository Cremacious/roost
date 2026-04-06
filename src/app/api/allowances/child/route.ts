import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import {
  allowance_settings,
  allowance_payouts,
  chores,
  chore_completions,
} from "@/db/schema";
import { and, count, desc, eq, gte, isNull, lt } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { startOfWeek, endOfWeek, addDays } from "date-fns";

// ---- GET: Allowance data for the current user (child view) ------------------

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

  // Fetch allowance settings for this child
  const [setting] = await db
    .select()
    .from(allowance_settings)
    .where(
      and(
        eq(allowance_settings.household_id, householdId),
        eq(allowance_settings.user_id, userId)
      )
    )
    .limit(1);

  if (!setting || !setting.enabled) {
    return Response.json({ settings: null, payouts: [], currentWeek: null });
  }

  // Fetch last 8 weeks of payouts
  const payouts = await db
    .select()
    .from(allowance_payouts)
    .where(
      and(
        eq(allowance_payouts.household_id, householdId),
        eq(allowance_payouts.user_id, userId)
      )
    )
    .orderBy(desc(allowance_payouts.week_start))
    .limit(8);

  // Calculate current week progress
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekEndExclusive = addDays(weekEnd, 1);

  // Total chores assigned
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

  // Completed chores this week
  const [completedRow] = await db
    .select({ completed: count() })
    .from(chore_completions)
    .innerJoin(chores, eq(chores.id, chore_completions.chore_id))
    .where(
      and(
        eq(chore_completions.completed_by, userId),
        eq(chores.household_id, householdId),
        isNull(chores.deleted_at),
        gte(chore_completions.completed_at, weekStart),
        lt(chore_completions.completed_at, weekEndExclusive)
      )
    );
  const completed = completedRow?.completed ?? 0;

  const completionRate = total === 0 ? 100 : Math.round((completed / total) * 100);
  const threshold = setting.threshold_percent;
  const onTrack = completionRate >= threshold;
  const weeklyAmount = parseFloat(setting.weekly_amount);

  return Response.json({
    settings: setting,
    payouts,
    currentWeek: {
      total,
      completed,
      completionRate,
      onTrack,
      projectedAmount: onTrack ? weeklyAmount : 0,
    },
  });
}
