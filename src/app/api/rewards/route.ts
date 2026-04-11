import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import {
  reward_rules,
  household_members,
  chores,
  chore_completions,
  users,
} from "@/db/schema";
import { and, count, eq, gte, isNull, lt } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import {
  startOfWeek,
  endOfWeek,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addDays,
  format,
  parseISO,
} from "date-fns";

// ---- Helpers ----------------------------------------------------------------

export function getPeriodBounds(
  periodType: string,
  periodDays: number | null,
  startsAt: string | null
): { start: Date; end: Date } {
  const now = new Date();

  if (periodType === "week") {
    const start = startOfWeek(now, { weekStartsOn: 1 });
    const end = endOfWeek(now, { weekStartsOn: 1 });
    return { start, end };
  }

  if (periodType === "month") {
    return { start: startOfMonth(now), end: endOfMonth(now) };
  }

  if (periodType === "year") {
    return { start: startOfYear(now), end: endOfYear(now) };
  }

  // custom
  const days = periodDays ?? 7;
  const anchor = startsAt ? parseISO(startsAt) : now;
  const msSinceAnchor = now.getTime() - anchor.getTime();
  const msPerPeriod = days * 24 * 60 * 60 * 1000;
  const periodsElapsed = Math.floor(msSinceAnchor / msPerPeriod);
  const start = new Date(anchor.getTime() + periodsElapsed * msPerPeriod);
  const end = addDays(start, days - 1);
  return { start, end };
}

async function getCurrentPeriodProgress(
  householdId: string,
  userId: string,
  periodType: string,
  periodDays: number | null,
  startsAt: string | null
) {
  const { start, end } = getPeriodBounds(periodType, periodDays, startsAt);
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

  const completionRate = total === 0 ? 100 : Math.round((completed / total) * 100);

  return {
    start: format(start, "yyyy-MM-dd"),
    end: format(end, "yyyy-MM-dd"),
    total,
    completed,
    completionRate,
  };
}

// ---- GET --------------------------------------------------------------------

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
  const { householdId, role } = membership;
  const isAdmin = role === "admin";

  if (isAdmin) {
    // Return all rules for household with user info and current period progress
    const rows = await db
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
        enabled: reward_rules.enabled,
        starts_at: reward_rules.starts_at,
        created_by: reward_rules.created_by,
        created_at: reward_rules.created_at,
        updated_at: reward_rules.updated_at,
        child_name: users.name,
        child_avatar: users.avatar_color,
      })
      .from(reward_rules)
      .leftJoin(users, eq(users.id, reward_rules.user_id))
      .where(eq(reward_rules.household_id, householdId))
      .orderBy(reward_rules.created_at);

    // Attach currentPeriod progress for each rule
    const rulesWithProgress = await Promise.all(
      rows.map(async (rule) => {
        const currentPeriod = await getCurrentPeriodProgress(
          householdId,
          rule.user_id,
          rule.period_type,
          rule.period_days,
          rule.starts_at
        );
        return {
          ...rule,
          currentPeriod: {
            ...currentPeriod,
            onTrack: currentPeriod.completionRate >= rule.threshold_percent,
          },
        };
      })
    );

    return Response.json({ rules: rulesWithProgress });
  }

  // Child: return only own rules
  const rows = await db
    .select()
    .from(reward_rules)
    .where(
      and(
        eq(reward_rules.household_id, householdId),
        eq(reward_rules.user_id, session.user.id)
      )
    )
    .orderBy(reward_rules.created_at);

  return Response.json({ rules: rows });
}

// ---- POST -------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
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
    return Response.json({ error: "Admin only" }, { status: 403 });
  }
  const { householdId } = membership;

  let body: {
    user_id?: string;
    title?: string;
    reward_type?: string;
    reward_description?: string;
    reward_amount?: number;
    period_type?: string;
    period_days?: number;
    threshold_percent?: number;
    starts_at?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.user_id) {
    return Response.json({ error: "user_id is required" }, { status: 400 });
  }
  if (!body.title?.trim()) {
    return Response.json({ error: "title is required" }, { status: 400 });
  }
  if (body.title.trim().length > 60) {
    return Response.json({ error: "title must be 60 characters or fewer" }, { status: 400 });
  }

  const VALID_REWARD_TYPES = ["money", "gift", "activity", "other"];
  if (body.reward_type && !VALID_REWARD_TYPES.includes(body.reward_type)) {
    return Response.json({ error: "Invalid reward_type" }, { status: 400 });
  }

  const VALID_PERIOD_TYPES = ["week", "month", "year", "custom"];
  if (body.period_type && !VALID_PERIOD_TYPES.includes(body.period_type)) {
    return Response.json({ error: "Invalid period_type" }, { status: 400 });
  }

  if (body.period_type === "custom" && (!body.period_days || body.period_days < 3)) {
    return Response.json(
      { error: "period_days must be at least 3 for custom periods" },
      { status: 400 }
    );
  }

  const rewardType = body.reward_type ?? "money";
  if (rewardType === "money" && (!body.reward_amount || body.reward_amount <= 0)) {
    return Response.json(
      { error: "reward_amount must be greater than 0 for money rewards" },
      { status: 400 }
    );
  }

  if (
    body.threshold_percent !== undefined &&
    (body.threshold_percent < 50 || body.threshold_percent > 100)
  ) {
    return Response.json(
      { error: "threshold_percent must be between 50 and 100" },
      { status: 400 }
    );
  }

  // Verify target is a child in this household
  const [targetMember] = await db
    .select({ role: household_members.role })
    .from(household_members)
    .where(
      and(
        eq(household_members.household_id, householdId),
        eq(household_members.user_id, body.user_id)
      )
    )
    .limit(1);

  if (!targetMember) {
    return Response.json({ error: "Member not found" }, { status: 404 });
  }
  if (targetMember.role !== "child") {
    return Response.json(
      { error: "Rewards can only be set for child accounts" },
      { status: 400 }
    );
  }

  const [rule] = await db
    .insert(reward_rules)
    .values({
      household_id: householdId,
      user_id: body.user_id,
      title: body.title.trim(),
      reward_type: rewardType,
      reward_description: body.reward_description?.trim() || null,
      reward_amount: body.reward_amount != null ? String(body.reward_amount) : null,
      period_type: body.period_type ?? "week",
      period_days: body.period_days ?? null,
      threshold_percent: body.threshold_percent ?? 80,
      enabled: true,
      starts_at: body.starts_at ?? format(new Date(), "yyyy-MM-dd"),
      created_by: session.user.id,
    })
    .returning();

  return Response.json({ rule }, { status: 201 });
}
