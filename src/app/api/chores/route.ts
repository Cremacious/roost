import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { chores, chore_categories, chore_completions, household_members, households, users } from "@/db/schema";
import { and, desc, eq, gte, isNull } from "drizzle-orm";
import { addDays, addMonths, startOfDay } from "date-fns";
import { checkChoreLimit } from "@/lib/utils/premiumGating";
import { FREE_TIER_LIMITS } from "@/lib/constants/freeTierLimits";

// ---- Shared helpers ---------------------------------------------------------

export async function getUserHousehold(userId: string) {
  const [m] = await db
    .select({
      householdId: household_members.household_id,
      role: household_members.role,
      expiresAt: household_members.expires_at,
    })
    .from(household_members)
    .where(eq(household_members.user_id, userId))
    .orderBy(desc(household_members.joined_at))
    .limit(1);

  if (!m) return null;

  // Expired guests are treated as non-members; cron handles cleanup
  if (m.role === "guest" && m.expiresAt && m.expiresAt < new Date()) {
    return null;
  }

  return m;
}

export function calcNextDueAt(
  frequency: string,
  customDays: number[] | null,
  from: Date = new Date()
): Date {
  switch (frequency) {
    case "weekly":
      return addDays(from, 7);
    case "monthly":
      return addMonths(from, 1);
    case "custom": {
      if (!customDays || customDays.length === 0) return addDays(from, 1);
      for (let i = 1; i <= 7; i++) {
        const candidate = addDays(from, i);
        if (customDays.includes(candidate.getDay())) return candidate;
      }
      return addDays(from, 1);
    }
    default: // daily
      return addDays(from, 1);
  }
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
  const { householdId } = membership;

  const choreRows = await db
    .select({
      id: chores.id,
      title: chores.title,
      description: chores.description,
      frequency: chores.frequency,
      custom_days: chores.custom_days,
      next_due_at: chores.next_due_at,
      last_completed_at: chores.last_completed_at,
      assigned_to: chores.assigned_to,
      created_by: chores.created_by,
      household_id: chores.household_id,
      created_at: chores.created_at,
      category_id: chores.category_id,
      assignee_name: users.name,
      assignee_avatar: users.avatar_color,
      category_name: chore_categories.name,
      category_icon: chore_categories.icon,
      category_color: chore_categories.color,
    })
    .from(chores)
    .leftJoin(users, eq(chores.assigned_to, users.id))
    .leftJoin(chore_categories, eq(chores.category_id, chore_categories.id))
    .where(and(eq(chores.household_id, householdId), isNull(chores.deleted_at)));

  if (choreRows.length === 0) {
    return Response.json({ chores: [], householdId });
  }

  // Fetch today's completions for all chores in this household
  const todayStart = startOfDay(new Date());

  const todayCompletions = await db
    .select({
      chore_id: chore_completions.chore_id,
      completed_by: chore_completions.completed_by,
      completed_at: chore_completions.completed_at,
    })
    .from(chore_completions)
    .innerJoin(chores, eq(chore_completions.chore_id, chores.id))
    .where(
      and(
        eq(chores.household_id, householdId),
        gte(chore_completions.completed_at, todayStart)
      )
    )
    .orderBy(desc(chore_completions.completed_at));

  const completedTodayByMe = new Set<string>();
  const completedTodayByAnyone = new Set<string>();
  const latestCompletionMap = new Map<
    string,
    { completedAt: Date | null; completedBy: string }
  >();

  for (const c of todayCompletions) {
    completedTodayByAnyone.add(c.chore_id);
    if (c.completed_by === session.user.id) {
      completedTodayByMe.add(c.chore_id);
    }
    if (!latestCompletionMap.has(c.chore_id)) {
      latestCompletionMap.set(c.chore_id, {
        completedAt: c.completed_at,
        completedBy: c.completed_by,
      });
    }
  }

  const result = choreRows.map((c) => ({
    ...c,
    category: c.category_id
      ? { id: c.category_id, name: c.category_name, icon: c.category_icon, color: c.category_color }
      : null,
    is_complete_today: completedTodayByAnyone.has(c.id),
    completed_today_by_me: completedTodayByMe.has(c.id),
    latest_completion: latestCompletionMap.get(c.id) ?? null,
  }));

  result.sort((a, b) => {
    if (a.is_complete_today !== b.is_complete_today) {
      return a.is_complete_today ? 1 : -1;
    }
    return a.title.localeCompare(b.title);
  });

  return Response.json({ chores: result, householdId });
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
  if (membership.role === "child") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    title?: string;
    description?: string;
    assigned_to?: string;
    frequency?: string;
    custom_days?: number[];
    category_id?: string | null;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.title?.trim()) {
    return Response.json({ error: "Title is required" }, { status: 400 });
  }
  if (!body.frequency) {
    return Response.json({ error: "Frequency is required" }, { status: 400 });
  }

  // Premium checks
  const [household] = await db
    .select({ subscription_status: households.subscription_status })
    .from(households)
    .where(eq(households.id, membership.householdId))
    .limit(1);
  const isPremium = household?.subscription_status === "premium";

  if (!isPremium) {
    if (body.frequency !== "daily") {
      return Response.json(
        { error: "Recurring chores require premium", code: "RECURRING_CHORES_PREMIUM" },
        { status: 403 }
      );
    }
    const { allowed, count } = await checkChoreLimit(membership.householdId);
    if (!allowed) {
      return Response.json(
        { error: "Free tier limit reached", code: "CHORES_LIMIT", limit: FREE_TIER_LIMITS.chores, current: count },
        { status: 403 }
      );
    }
  }

  const next_due_at = calcNextDueAt(body.frequency, body.custom_days ?? null);

  const [chore] = await db
    .insert(chores)
    .values({
      household_id: membership.householdId,
      title: body.title.trim(),
      description: body.description?.trim() || null,
      assigned_to: body.assigned_to || null,
      frequency: body.frequency,
      custom_days: body.custom_days ? JSON.stringify(body.custom_days) : null,
      category_id: body.category_id ?? null,
      next_due_at,
      created_by: session.user.id,
    })
    .returning();

  return Response.json({ chore }, { status: 201 });
}
