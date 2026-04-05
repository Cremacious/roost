import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { chores, chore_completions, chore_streaks, household_members } from "@/db/schema";
import { and, desc, eq, gte, isNull, lt } from "drizzle-orm";
import { getUserHousehold, calcNextDueAt } from "../../route";
import { startOfDay, startOfWeek, subDays, format } from "date-fns";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

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

  // Verify chore belongs to this household
  const [chore] = await db
    .select()
    .from(chores)
    .where(
      and(
        eq(chores.id, id),
        eq(chores.household_id, householdId),
        isNull(chores.deleted_at)
      )
    )
    .limit(1);

  if (!chore) {
    return Response.json({ error: "Chore not found" }, { status: 404 });
  }

  const now = new Date();

  // Insert completion record
  const [completion] = await db
    .insert(chore_completions)
    .values({
      chore_id: id,
      completed_by: session.user.id,
      completed_at: now,
    })
    .returning();

  // Update chore last_completed_at and next_due_at
  const customDays = chore.custom_days
    ? (JSON.parse(chore.custom_days) as number[])
    : null;
  const next_due_at = calcNextDueAt(chore.frequency, customDays, now);

  await db
    .update(chores)
    .set({ last_completed_at: now, next_due_at })
    .where(eq(chores.id, id));

  // ---- Streak calculation --------------------------------------------------

  // Get the two most recent completions (index 0 = just inserted, index 1 = previous)
  const recentCompletions = await db
    .select({ completed_at: chore_completions.completed_at })
    .from(chore_completions)
    .innerJoin(chores, eq(chore_completions.chore_id, chores.id))
    .where(
      and(
        eq(chore_completions.completed_by, session.user.id),
        eq(chores.household_id, householdId)
      )
    )
    .orderBy(desc(chore_completions.completed_at))
    .limit(2);

  const prevCompletion = recentCompletions[1] ?? null;

  // Current week start (Monday)
  const weekStart = startOfWeek(now, { weekStartsOn: 1 });
  const weekStartStr = format(weekStart, "yyyy-MM-dd");

  // Find existing streak record for this week
  const [existingStreak] = await db
    .select()
    .from(chore_streaks)
    .where(
      and(
        eq(chore_streaks.household_id, householdId),
        eq(chore_streaks.user_id, session.user.id),
        eq(chore_streaks.week_start, weekStartStr)
      )
    )
    .limit(1);

  const currentStreak = existingStreak?.current_streak ?? 0;
  const longestStreak = existingStreak?.longest_streak ?? 0;
  const currentPoints = existingStreak?.points ?? 0;

  let newCurrentStreak: number;
  const todayStart = startOfDay(now);
  const yesterdayStart = startOfDay(subDays(now, 1));

  if (!prevCompletion || !prevCompletion.completed_at) {
    newCurrentStreak = 1;
  } else {
    const prevDate = startOfDay(prevCompletion.completed_at);
    if (prevDate >= yesterdayStart) {
      // Completed yesterday or today — continue streak
      newCurrentStreak = currentStreak + 1;
    } else {
      // Gap > 1 day — reset
      newCurrentStreak = 1;
    }
  }

  const newLongestStreak = Math.max(longestStreak, newCurrentStreak);
  const newPoints = currentPoints + 10;

  const streakValues = {
    household_id: householdId,
    user_id: session.user.id,
    week_start: weekStartStr,
    current_streak: newCurrentStreak,
    longest_streak: newLongestStreak,
    points: newPoints,
    updated_at: now,
  };

  const [streak] = await db
    .insert(chore_streaks)
    .values(streakValues)
    .onConflictDoUpdate({
      target: [
        chore_streaks.household_id,
        chore_streaks.user_id,
        chore_streaks.week_start,
      ],
      set: {
        current_streak: newCurrentStreak,
        longest_streak: newLongestStreak,
        points: newPoints,
        updated_at: now,
      },
    })
    .returning();

  return Response.json({ completion, streak });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

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

  // Verify chore belongs to this household
  const [chore] = await db
    .select()
    .from(chores)
    .where(
      and(
        eq(chores.id, id),
        eq(chores.household_id, householdId),
        isNull(chores.deleted_at)
      )
    )
    .limit(1);

  if (!chore) {
    return Response.json({ error: "Chore not found" }, { status: 404 });
  }

  const now = new Date();
  const todayStart = startOfDay(now);
  const tomorrowStart = startOfDay(new Date(now.getTime() + 86400000));

  // Find today's completion by this user
  const [todayCompletion] = await db
    .select()
    .from(chore_completions)
    .where(
      and(
        eq(chore_completions.chore_id, id),
        eq(chore_completions.completed_by, session.user.id),
        gte(chore_completions.completed_at, todayStart),
        lt(chore_completions.completed_at, tomorrowStart)
      )
    )
    .orderBy(desc(chore_completions.completed_at))
    .limit(1);

  if (!todayCompletion) {
    return Response.json({ error: "No completion found for today" }, { status: 404 });
  }

  // Delete the completion
  await db.delete(chore_completions).where(eq(chore_completions.id, todayCompletion.id));

  // Find the previous completion (before today) to restore last_completed_at
  const [prevCompletion] = await db
    .select()
    .from(chore_completions)
    .where(
      and(
        eq(chore_completions.chore_id, id),
        lt(chore_completions.completed_at, todayStart)
      )
    )
    .orderBy(desc(chore_completions.completed_at))
    .limit(1);

  // Restore last_completed_at and recalculate next_due_at
  const restoredLastCompleted = prevCompletion?.completed_at ?? null;
  const customDays = chore.custom_days
    ? (JSON.parse(chore.custom_days) as number[])
    : null;
  const next_due_at = restoredLastCompleted
    ? calcNextDueAt(chore.frequency, customDays, restoredLastCompleted)
    : calcNextDueAt(chore.frequency, customDays, chore.created_at ?? now);

  await db
    .update(chores)
    .set({ last_completed_at: restoredLastCompleted, next_due_at })
    .where(eq(chores.id, id));

  // Subtract 10 pts from streak (min 0)
  const weekStart = format(startOfWeek(now, { weekStartsOn: 1 }), "yyyy-MM-dd");

  const [existingStreak] = await db
    .select()
    .from(chore_streaks)
    .where(
      and(
        eq(chore_streaks.household_id, householdId),
        eq(chore_streaks.user_id, session.user.id),
        eq(chore_streaks.week_start, weekStart)
      )
    )
    .limit(1);

  if (existingStreak) {
    const newPoints = Math.max(0, existingStreak.points - 10);
    // Reset current_streak to 0 since we removed today's only completion
    // (streak is rebuilt on next completion)
    await db
      .update(chore_streaks)
      .set({
        points: newPoints,
        current_streak: Math.max(0, existingStreak.current_streak - 1),
        updated_at: now,
      })
      .where(
        and(
          eq(chore_streaks.household_id, householdId),
          eq(chore_streaks.user_id, session.user.id),
          eq(chore_streaks.week_start, weekStart)
        )
      );
  }

  return Response.json({ ok: true });
}
