import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { household_members, allowance_settings } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

// ---- GET --------------------------------------------------------------------

export async function GET(
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
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const [target] = await db
    .select({ user_id: household_members.user_id })
    .from(household_members)
    .where(
      and(
        eq(household_members.id, id),
        eq(household_members.household_id, membership.householdId)
      )
    )
    .limit(1);

  if (!target) {
    return Response.json({ error: "Member not found" }, { status: 404 });
  }

  const [allowance] = await db
    .select()
    .from(allowance_settings)
    .where(
      and(
        eq(allowance_settings.household_id, membership.householdId),
        eq(allowance_settings.user_id, target.user_id)
      )
    )
    .limit(1);

  return Response.json({ allowance: allowance ?? null });
}

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
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { enabled?: boolean; weeklyAmount?: number; thresholdPercent?: number };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.enabled && (body.weeklyAmount === undefined || body.weeklyAmount <= 0)) {
    return Response.json({ error: "Weekly amount must be greater than 0 when enabled" }, { status: 400 });
  }

  if (
    body.thresholdPercent !== undefined &&
    (body.thresholdPercent < 50 || body.thresholdPercent > 100)
  ) {
    return Response.json({ error: "Threshold must be between 50 and 100" }, { status: 400 });
  }

  const [target] = await db
    .select({ user_id: household_members.user_id, role: household_members.role })
    .from(household_members)
    .where(
      and(
        eq(household_members.id, id),
        eq(household_members.household_id, membership.householdId)
      )
    )
    .limit(1);

  if (!target) {
    return Response.json({ error: "Member not found" }, { status: 404 });
  }

  if (target.role !== "child") {
    return Response.json({ error: "Allowance can only be set for child accounts" }, { status: 400 });
  }

  const [result] = await db
    .insert(allowance_settings)
    .values({
      household_id: membership.householdId,
      user_id: target.user_id,
      enabled: body.enabled ?? false,
      weekly_amount: String(body.weeklyAmount ?? 0),
      threshold_percent: body.thresholdPercent ?? 80,
      created_by: session.user.id,
    })
    .onConflictDoUpdate({
      target: [allowance_settings.household_id, allowance_settings.user_id],
      set: {
        enabled: body.enabled ?? false,
        weekly_amount: String(body.weeklyAmount ?? 0),
        threshold_percent: body.thresholdPercent ?? 80,
        updated_at: new Date(),
      },
    })
    .returning();

  return Response.json({ allowance: result });
}
