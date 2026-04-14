import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { household_members, households } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { isStripeConfigured } from "@/lib/env";
import { getStripe, getStripeAppUrl, getStripePrice } from "@/lib/utils/stripe";
import { log } from "@/lib/utils/logger";

export async function POST(request: NextRequest): Promise<Response> {
  if (!isStripeConfigured()) {
    return Response.json({ error: "Billing is not configured" }, { status: 503 });
  }

  const stripe = getStripe();
  const stripePriceId = getStripePrice();
  const appUrl = getStripeAppUrl();

  let session;
  try {
    session = await requireSession(request);
  } catch (res) {
    return res as Response;
  }

  // Get the user's household
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

  const [household] = await db
    .select()
    .from(households)
    .where(eq(households.id, membership.householdId))
    .limit(1);

  if (!household) {
    return Response.json({ error: "Household not found" }, { status: 404 });
  }

  // Get or create Stripe customer
  let stripeCustomerId = household.stripe_customer_id;

  if (!stripeCustomerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      metadata: {
        householdId: household.id,
        userId: session.user.id,
      },
    });
    stripeCustomerId = customer.id;

    await db
      .update(households)
      .set({ stripe_customer_id: stripeCustomerId })
      .where(eq(households.id, household.id));
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: stripeCustomerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [
      {
        price: stripePriceId,
        quantity: 1,
      },
    ],
    success_url: `${appUrl}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${appUrl}/settings/billing?cancelled=true`,
    metadata: {
      householdId: household.id,
      userId: session.user.id,
    },
    subscription_data: {
      metadata: {
        householdId: household.id,
      },
    },
    allow_promotion_codes: true,
  });

  log.info("analytics.checkout_started", { householdId: household.id, isNewCustomer: !household.stripe_customer_id });
  return Response.json({ url: checkoutSession.url });
}
