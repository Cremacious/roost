import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { getUserHousehold } from "@/app/api/chores/route";
import { db } from "@/lib/db";
import { promo_codes, promo_redemptions, households } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { logActivity } from "@/lib/utils/activity";

export async function POST(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (res) {
    return res as Response;
  }

  const membership = await getUserHousehold(session.user.id);
  if (!membership) {
    return Response.json({ error: "No household found" }, { status: 404 });
  }

  let body: { code: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const code = body.code?.trim().toUpperCase();
  if (!code) {
    return Response.json({ error: "Promo code is required" }, { status: 400 });
  }

  // Find the promo code
  const [promo] = await db
    .select()
    .from(promo_codes)
    .where(eq(promo_codes.code, code))
    .limit(1);

  if (!promo) {
    return Response.json(
      { error: "Invalid or expired promo code" },
      { status: 404 }
    );
  }

  // Check status
  if (promo.status !== "active") {
    return Response.json(
      { error: "Invalid or expired promo code" },
      { status: 400 }
    );
  }

  // Check code expiry
  if (promo.expires_at && new Date(promo.expires_at) <= new Date()) {
    return Response.json(
      { error: "Invalid or expired promo code" },
      { status: 400 }
    );
  }

  // Check max redemptions
  if (
    promo.max_redemptions !== null &&
    promo.redemption_count >= promo.max_redemptions
  ) {
    return Response.json(
      { error: "This code has reached its redemption limit" },
      { status: 400 }
    );
  }

  // Check if household already redeemed this code
  const [existingRedemption] = await db
    .select({ id: promo_redemptions.id })
    .from(promo_redemptions)
    .where(
      and(
        eq(promo_redemptions.promo_code_id, promo.id),
        eq(promo_redemptions.household_id, membership.householdId)
      )
    )
    .limit(1);

  if (existingRedemption) {
    return Response.json(
      { error: "This promo code has already been used on your account." },
      { status: 400 }
    );
  }

  // Fetch household state
  const [household] = await db
    .select({
      premium_expires_at: households.premium_expires_at,
      subscription_status: households.subscription_status,
      stripe_subscription_id: households.stripe_subscription_id,
    })
    .from(households)
    .where(eq(households.id, membership.householdId))
    .limit(1);

  const isLifetime = promo.is_lifetime === true;
  const now = new Date();

  // If household has an active Stripe subscription (no expiry), the promo still records
  // but premium_expires_at stays null (Stripe takes precedence)
  const hasActiveStripe =
    household?.stripe_subscription_id &&
    household.subscription_status === "premium" &&
    !household.premium_expires_at;

  let newExpiresAt: Date | null = null;

  if (isLifetime) {
    // Lifetime: premium_expires_at = null means never expires
    newExpiresAt = null;
  } else {
    // Time-limited: calculate expiry from now or existing future expiry
    let baseDate = now;
    if (
      household &&
      household.premium_expires_at &&
      new Date(household.premium_expires_at) > now
    ) {
      baseDate = new Date(household.premium_expires_at);
    }
    newExpiresAt = new Date(baseDate);
    newExpiresAt.setDate(newExpiresAt.getDate() + promo.duration_days);
  }

  // Update household premium status
  await db
    .update(households)
    .set({
      subscription_status: "premium",
      premium_expires_at: hasActiveStripe && !isLifetime ? null : newExpiresAt,
      subscription_upgraded_at: household?.subscription_status !== "premium"
        ? new Date()
        : undefined,
      updated_at: new Date(),
    })
    .where(eq(households.id, membership.householdId));

  // Increment redemption count
  await db
    .update(promo_codes)
    .set({ redemption_count: promo.redemption_count + 1 })
    .where(eq(promo_codes.id, promo.id));

  // Create redemption record
  await db.insert(promo_redemptions).values({
    promo_code_id: promo.id,
    household_id: membership.householdId,
    user_id: session.user.id,
    premium_expires_at: newExpiresAt,
  });

  const durationLabel = isLifetime
    ? "lifetime premium"
    : `${promo.duration_days} days of premium`;

  await logActivity({
    householdId: membership.householdId,
    userId: session.user.id,
    type: "promo_redeemed",
    description: `Redeemed promo code ${promo.code} for ${durationLabel}`,
  });

  const effectiveExpiry = hasActiveStripe && !isLifetime ? null : newExpiresAt;

  return Response.json({
    success: true,
    premiumExpiresAt: effectiveExpiry?.toISOString() ?? null,
    durationDays: promo.duration_days,
    isLifetime,
    message: isLifetime
      ? "Lifetime premium activated. Your household will never lose access."
      : hasActiveStripe
        ? "Promo code applied. Your Stripe subscription is active, so premium continues without interruption."
        : `Premium activated for ${promo.duration_days} days.`,
  });
}
