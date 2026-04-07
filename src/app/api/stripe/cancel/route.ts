import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { household_members, households } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import { stripe } from "@/lib/utils/stripe";

export async function POST(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (res) {
    return res as Response;
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

  const [household] = await db
    .select()
    .from(households)
    .where(eq(households.id, membership.householdId))
    .limit(1);

  if (!household?.stripe_subscription_id) {
    return Response.json(
      { error: "No active subscription found" },
      { status: 400 }
    );
  }

  await stripe.subscriptions.update(household.stripe_subscription_id, {
    cancel_at_period_end: true,
  });

  // The customer.subscription.updated webhook will set premium_expires_at
  return Response.json({ success: true });
}
