import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { reward_rules, reward_payouts } from "@/db/schema";
import { and, count, eq } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { format } from "date-fns";

// ---- PATCH ------------------------------------------------------------------

export async function PATCH(
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
  if (membership.role !== "admin") {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }
  const { householdId } = membership;

  // Verify rule belongs to this household
  const [existing] = await db
    .select()
    .from(reward_rules)
    .where(and(eq(reward_rules.id, id), eq(reward_rules.household_id, householdId)))
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Rule not found" }, { status: 404 });
  }

  let body: {
    title?: string;
    reward_type?: string;
    reward_description?: string;
    reward_amount?: number;
    period_type?: string;
    period_days?: number;
    threshold_percent?: number;
    starts_at?: string;
    enabled?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.title !== undefined) {
    if (!body.title.trim()) {
      return Response.json({ error: "title cannot be empty" }, { status: 400 });
    }
    if (body.title.trim().length > 60) {
      return Response.json({ error: "title must be 60 characters or fewer" }, { status: 400 });
    }
  }

  const VALID_REWARD_TYPES = ["money", "gift", "activity", "other"];
  if (body.reward_type && !VALID_REWARD_TYPES.includes(body.reward_type)) {
    return Response.json({ error: "Invalid reward_type" }, { status: 400 });
  }

  const VALID_PERIOD_TYPES = ["week", "month", "year", "custom"];
  if (body.period_type && !VALID_PERIOD_TYPES.includes(body.period_type)) {
    return Response.json({ error: "Invalid period_type" }, { status: 400 });
  }

  const effectivePeriodType = body.period_type ?? existing.period_type;
  if (
    effectivePeriodType === "custom" &&
    body.period_days !== undefined &&
    body.period_days < 3
  ) {
    return Response.json(
      { error: "period_days must be at least 3 for custom periods" },
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

  const updates: Partial<typeof reward_rules.$inferInsert> = {
    updated_at: new Date(),
  };

  if (body.title !== undefined) updates.title = body.title.trim();
  if (body.reward_type !== undefined) updates.reward_type = body.reward_type;
  if (body.reward_description !== undefined)
    updates.reward_description = body.reward_description?.trim() || null;
  if (body.reward_amount !== undefined)
    updates.reward_amount = body.reward_amount != null ? String(body.reward_amount) : null;
  if (body.period_type !== undefined) updates.period_type = body.period_type;
  if (body.period_days !== undefined) updates.period_days = body.period_days;
  if (body.threshold_percent !== undefined) updates.threshold_percent = body.threshold_percent;
  if (body.starts_at !== undefined) updates.starts_at = body.starts_at;
  if (body.enabled !== undefined) updates.enabled = body.enabled;

  const [rule] = await db
    .update(reward_rules)
    .set(updates)
    .where(and(eq(reward_rules.id, id), eq(reward_rules.household_id, householdId)))
    .returning();

  return Response.json({ rule });
}

// ---- DELETE -----------------------------------------------------------------

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
  if (membership.role !== "admin") {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }
  const { householdId } = membership;

  const [existing] = await db
    .select({ id: reward_rules.id })
    .from(reward_rules)
    .where(and(eq(reward_rules.id, id), eq(reward_rules.household_id, householdId)))
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Rule not found" }, { status: 404 });
  }

  // Check if any payouts reference this rule
  const [payoutCount] = await db
    .select({ total: count() })
    .from(reward_payouts)
    .where(eq(reward_payouts.rule_id, id));

  if ((payoutCount?.total ?? 0) > 0) {
    // Soft disable rather than hard delete to preserve payout history
    await db
      .update(reward_rules)
      .set({ enabled: false, updated_at: new Date() })
      .where(eq(reward_rules.id, id));
  } else {
    await db
      .delete(reward_rules)
      .where(and(eq(reward_rules.id, id), eq(reward_rules.household_id, householdId)));
  }

  return Response.json({ success: true });
}
