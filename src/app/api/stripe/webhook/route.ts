// STRIPE WEBHOOK SETUP:
// 1. Install Stripe CLI for local testing:
//    stripe listen --forward-to localhost:3000/api/stripe/webhook
// 2. In production add webhook in Stripe dashboard:
//    https://yourapp.vercel.app/api/stripe/webhook
// 3. Required events:
//    checkout.session.completed
//    customer.subscription.updated
//    customer.subscription.deleted
//    invoice.payment_succeeded
//    invoice.payment_failed
// 4. Copy webhook signing secret to
//    STRIPE_WEBHOOK_SECRET in .env.local

import { NextRequest } from "next/server";
import Stripe from "stripe";
import { stripe, STRIPE_PRICE_ID } from "@/lib/utils/stripe";
import { db } from "@/lib/db";
import { households } from "@/db/schema";
import { eq } from "drizzle-orm";
import { logActivity } from "@/lib/utils/activity";

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      sig!,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return Response.json({ error: "Invalid signature" }, { status: 400 });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const checkoutSession = event.data.object as Stripe.Checkout.Session;
      const householdId = checkoutSession.metadata?.householdId;

      if (!householdId || checkoutSession.mode !== "subscription") break;

      const subscription = await stripe.subscriptions.retrieve(
        checkoutSession.subscription as string
      );

      await db
        .update(households)
        .set({
          subscription_status: "premium",
          stripe_subscription_id: subscription.id,
          stripe_price_id: STRIPE_PRICE_ID,
          premium_expires_at: null,
          updated_at: new Date(),
        })
        .where(eq(households.id, householdId));

      await logActivity({
        householdId,
        userId: checkoutSession.metadata?.userId ?? "system",
        type: "subscription_started",
        description: "Household upgraded to Premium",
      });
      break;
    }

    case "customer.subscription.updated": {
      const sub = event.data.object as Stripe.Subscription;
      const householdId = sub.metadata?.householdId;

      if (!householdId) break;

      if (sub.cancel_at_period_end) {
        const periodEnd = sub.items.data[0]?.current_period_end;
        const expiresAt = periodEnd ? new Date(periodEnd * 1000) : null;
        await db
          .update(households)
          .set({
            premium_expires_at: expiresAt,
            updated_at: new Date(),
          })
          .where(eq(households.id, householdId));

        await logActivity({
          householdId,
          userId: "system",
          type: "subscription_cancelling",
          description: expiresAt
            ? `Premium will end on ${expiresAt.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`
            : "Premium subscription is set to cancel",
        });
      } else {
        // User reactivated
        await db
          .update(households)
          .set({
            premium_expires_at: null,
            updated_at: new Date(),
          })
          .where(eq(households.id, householdId));

        await logActivity({
          householdId,
          userId: "system",
          type: "subscription_reactivated",
          description: "Premium subscription reactivated",
        });
      }
      break;
    }

    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      const householdId = sub.metadata?.householdId;

      if (!householdId) break;

      await db
        .update(households)
        .set({
          subscription_status: "free",
          stripe_subscription_id: null,
          stripe_price_id: null,
          premium_expires_at: null,
          updated_at: new Date(),
        })
        .where(eq(households.id, householdId));

      await logActivity({
        householdId,
        userId: "system",
        type: "subscription_ended",
        description: "Premium subscription ended",
      });
      break;
    }

    case "invoice.payment_succeeded": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        invoice.parent?.type === "subscription_details"
          ? (invoice.parent.subscription_details?.subscription as string | undefined)
          : null;
      const sub = subscriptionId
        ? await stripe.subscriptions.retrieve(subscriptionId)
        : null;
      const householdId = sub?.metadata?.householdId;

      if (!householdId) break;

      // Renewal: ensure status is premium and expiry is cleared
      await db
        .update(households)
        .set({
          subscription_status: "premium",
          premium_expires_at: null,
          updated_at: new Date(),
        })
        .where(eq(households.id, householdId));

      await logActivity({
        householdId,
        userId: "system",
        type: "subscription_renewed",
        description: "Premium renewed for another month",
      });
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      const subscriptionId =
        invoice.parent?.type === "subscription_details"
          ? (invoice.parent.subscription_details?.subscription as string | undefined)
          : null;
      const sub = subscriptionId
        ? await stripe.subscriptions.retrieve(subscriptionId)
        : null;
      const householdId = sub?.metadata?.householdId;

      if (!householdId) break;

      // Do NOT revoke premium — Stripe will retry and send subscription.deleted if all retries fail
      await logActivity({
        householdId,
        userId: "system",
        type: "payment_failed",
        description: "Premium payment failed. Please update payment method.",
      });
      break;
    }
  }

  return Response.json({ received: true });
}
