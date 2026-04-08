import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import {
  chore_completions,
  chores,
  chore_streaks,
  households,
  users,
} from "@/db/schema";
import { and, count, desc, eq, gte, isNull, lte, sql } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { format, startOfWeek } from "date-fns";

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
  const { householdId } = membership;

  // Premium check
  const [household] = await db
    .select({ subscription_status: households.subscription_status })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);

  if (household?.subscription_status !== "premium") {
    return Response.json(
      { error: "Premium required", code: "HISTORY_PREMIUM" },
      { status: 403 }
    );
  }

  const url = new URL(request.url);
  const memberFilter = url.searchParams.get("member") ?? "all";
  const fromStr = url.searchParams.get("from");
  const toStr = url.searchParams.get("to");
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "50", 10)));
  const offset = Math.max(0, parseInt(url.searchParams.get("offset") ?? "0", 10));

  // Build where conditions
  const toDate = toStr ? new Date(toStr) : null;
  if (toDate) toDate.setHours(23, 59, 59, 999);

  const baseConditions = [
    eq(chores.household_id, householdId),
    isNull(chores.deleted_at),
    fromStr ? gte(chore_completions.completed_at, new Date(fromStr)) : undefined,
    toDate ? lte(chore_completions.completed_at, toDate) : undefined,
  ];

  const filteredConditions = [
    ...baseConditions,
    memberFilter !== "all" ? eq(chore_completions.completed_by, memberFilter) : undefined,
  ];

  const whereClause = and(...filteredConditions);
  const statsWhereClause = and(...baseConditions);

  // Total count (with member filter)
  const [totalResult] = await db
    .select({ total: count() })
    .from(chore_completions)
    .innerJoin(chores, eq(chore_completions.chore_id, chores.id))
    .where(whereClause);
  const total = totalResult?.total ?? 0;

  // Main completions query
  const rows = await db
    .select({
      id: chore_completions.id,
      choreTitle: chores.title,
      completedAt: chore_completions.completed_at,
      memberId: chore_completions.completed_by,
      memberName: users.name,
      memberAvatarColor: users.avatar_color,
    })
    .from(chore_completions)
    .innerJoin(chores, eq(chore_completions.chore_id, chores.id))
    .innerJoin(users, eq(chore_completions.completed_by, users.id))
    .where(whereClause)
    .orderBy(desc(chore_completions.completed_at))
    .limit(limit)
    .offset(offset);

  // Most active member (across all members in date range, ignoring member filter)
  const memberCounts = await db
    .select({
      name: users.name,
      completionCount: sql<number>`cast(count(*) as int)`,
    })
    .from(chore_completions)
    .innerJoin(chores, eq(chore_completions.chore_id, chores.id))
    .innerJoin(users, eq(chore_completions.completed_by, users.id))
    .where(statsWhereClause)
    .groupBy(chore_completions.completed_by, users.name)
    .orderBy(desc(sql`count(*)`))
    .limit(1);

  // Streak leader (current week)
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), "yyyy-MM-dd");
  const streakRows = await db
    .select({
      name: users.name,
      currentStreak: chore_streaks.current_streak,
    })
    .from(chore_streaks)
    .innerJoin(users, eq(chore_streaks.user_id, users.id))
    .where(
      and(
        eq(chore_streaks.household_id, householdId),
        eq(chore_streaks.week_start, weekStart)
      )
    )
    .orderBy(desc(chore_streaks.current_streak))
    .limit(1);

  const completions = rows.map((r) => ({
    id: r.id,
    choreTitle: r.choreTitle,
    completedAt: r.completedAt?.toISOString() ?? "",
    member: {
      id: r.memberId,
      name: r.memberName,
      avatarColor: r.memberAvatarColor,
    },
    pointsEarned: 10,
  }));

  return Response.json({
    completions,
    total,
    hasMore: offset + rows.length < total,
    stats: {
      mostActiveMember: memberCounts[0] ?? null,
      streakLeader: streakRows[0] ?? null,
    },
  });
}
