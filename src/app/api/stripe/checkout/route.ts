import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { household_members, households } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { stripe, STRIPE_PRICE_ID, APP_URL } from "@/lib/utils/stripe";

export async function POST(request: NextRequest): Promise<Response> {
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
        price: STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    success_url: `${APP_URL}/settings/billing?success=true&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${APP_URL}/settings/billing?cancelled=true`,
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

  return Response.json({ url: checkoutSession.url });
}
