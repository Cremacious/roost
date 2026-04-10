import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import {
  allowance_settings,
  chores,
  chore_completions,
  household_members,
  users,
} from "@/db/schema";
import { and, count, eq, gte, isNull, lt } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { startOfWeek, endOfWeek, addDays } from "date-fns";

// ---- GET: Current week progress for a child (admin-callable with ?userId=) ----

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
  if (membership.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { householdId } = membership;
  const url = new URL(request.url);
  const userId = url.searchParams.get("userId");
  if (!userId) {
    return Response.json({ error: "userId is required" }, { status: 400 });
  }

  // Verify the target user is a child in this household
  const [member] = await db
    .select({ role: household_members.role })
    .from(household_members)
    .where(
      and(
        eq(household_members.household_id, householdId),
        eq(household_members.user_id, userId)
      )
    )
    .limit(1);

  if (!member || member.role !== "child") {
    return Response.json({ error: "Child member not found" }, { status: 404 });
  }

  // Fetch allowance settings
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

  // Calculate current week progress
  const now = new Date();
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 });
  const weekEndExclusive = addDays(weekEnd, 1);

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
        gte(chore_completions.completed_at, weekStart),
        lt(chore_completions.completed_at, weekEndExclusive)
      )
    );
  const completed = completedRow?.completed ?? 0;
  const completionRate = total === 0 ? 100 : Math.round((completed / total) * 100);
  const threshold = setting?.threshold_percent ?? 80;
  const onTrack = completionRate >= threshold;
  const weeklyAmount = setting ? parseFloat(setting.weekly_amount) : 0;

  return Response.json({
    settings: setting ?? null,
    currentWeek: {
      total,
      completed,
      completionRate,
      onTrack,
      projectedAmount: onTrack ? weeklyAmount : 0,
    },
  });
}
