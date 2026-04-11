import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { household_members, households } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { stripe, STRIPE_PRICE_ID } from "@/lib/utils/stripe";
import { logActivity } from "@/lib/utils/activity";
import { log } from "@/lib/utils/logger";

export async function GET(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (res) {
    return res as Response;
  }

  const sessionId = request.nextUrl.searchParams.get("session_id");
  if (!sessionId) {
    return Response.json({ error: "session_id is required" }, { status: 400 });
  }

  const [membership] = await db
    .select({
      householdId: household_members.household_id,
      role: household_members.role,
    })
    .from(household_members)
    .where(eq(household_members.user_id, session.user.id))
    .orderBy(desc(household_members.joined_at))
    .limit(1);

  if (!membership) {
    return Response.json({ error: "No household found" }, { status: 404 });
  }

  if (membership.role !== "admin") {
    return Response.json(
      { error: "Only the household admin can manage billing" },
      { status: 403 }
    );
  }

  const checkoutSession = await stripe.checkout.sessions.retrieve(sessionId);
  const householdId = checkoutSession.metadata?.householdId;

  if (!householdId || householdId !== membership.householdId) {
    return Response.json({ error: "Checkout session does not match household" }, { status: 403 });
  }

  if (checkoutSession.mode !== "subscription" || checkoutSession.status !== "complete") {
    return Response.json({ verified: false, status: checkoutSession.status ?? "open" });
  }

  const subscriptionId =
    typeof checkoutSession.subscription === "string"
      ? checkoutSession.subscription
      : checkoutSession.subscription?.id;

  if (!subscriptionId) {
    log.warn("stripe.checkout_status.no_subscription", { sessionId, householdId });
    return Response.json({ verified: false, status: "missing_subscription" });
  }

  const subscription = await stripe.subscriptions.retrieve(subscriptionId);
  if (!["active", "trialing"].includes(subscription.status)) {
    return Response.json({ verified: false, status: subscription.status });
  }

  const [existing] = await db
    .select({ subscription_upgraded_at: households.subscription_upgraded_at })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);

  await db
    .update(households)
    .set({
      subscription_status: "premium",
      stripe_subscription_id: subscription.id,
      stripe_price_id: STRIPE_PRICE_ID,
      premium_expires_at: null,
      subscription_upgraded_at: existing?.subscription_upgraded_at ?? new Date(),
      updated_at: new Date(),
    })
    .where(eq(households.id, householdId));

  if (!existing?.subscription_upgraded_at) {
    await logActivity({
      householdId,
      userId: session.user.id,
      type: "subscription_started",
      description: "Household upgraded to Premium",
    });
  }

  log.info("stripe.checkout_status.verified", { sessionId, householdId, subscriptionId });

  return Response.json({ verified: true, status: subscription.status });
}
