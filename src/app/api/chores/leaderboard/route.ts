import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { chore_streaks, household_members, households, users } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getUserHousehold } from "../route";
import { startOfWeek, format } from "date-fns";

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
      { error: "The leaderboard requires premium", code: "LEADERBOARD_PREMIUM" },
      { status: 403 }
    );
  }

  const weekStart = format(
    startOfWeek(new Date(), { weekStartsOn: 1 }),
    "yyyy-MM-dd"
  );

  const entries = await db
    .select({
      userId: chore_streaks.user_id,
      currentStreak: chore_streaks.current_streak,
      longestStreak: chore_streaks.longest_streak,
      points: chore_streaks.points,
      name: users.name,
      avatarColor: users.avatar_color,
    })
    .from(chore_streaks)
    .innerJoin(users, eq(chore_streaks.user_id, users.id))
    .where(
      and(
        eq(chore_streaks.household_id, householdId),
        eq(chore_streaks.week_start, weekStart)
      )
    )
    .orderBy(desc(chore_streaks.points));

  // Include members with zero points this week who haven't started yet
  const allMembers = await db
    .select({
      userId: household_members.user_id,
      name: users.name,
      avatarColor: users.avatar_color,
    })
    .from(household_members)
    .innerJoin(users, eq(household_members.user_id, users.id))
    .where(eq(household_members.household_id, householdId));

  const entryUserIds = new Set(entries.map((e) => e.userId));
  const zeroes = allMembers
    .filter((m) => !entryUserIds.has(m.userId))
    .map((m) => ({
      userId: m.userId,
      currentStreak: 0,
      longestStreak: 0,
      points: 0,
      name: m.name,
      avatarColor: m.avatarColor,
    }));

  const leaderboard = [...entries, ...zeroes];

  return Response.json({ leaderboard, weekStart, currentUserId: session.user.id });
}
