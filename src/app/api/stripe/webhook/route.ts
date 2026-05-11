import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { households } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { stripe } from '@/lib/utils/stripe'
import type Stripe from 'stripe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest): Promise<Response> {
  const body = await request.text()
  const sig = request.headers.get('stripe-signature')

  if (!sig) {
    return Response.json({ error: 'Missing stripe-signature header' }, { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, process.env.STRIPE_WEBHOOK_SECRET!)
  } catch (err) {
    console.error('[stripe/webhook] Signature verification failed:', err)
    return Response.json({ error: 'Invalid signature' }, { status: 400 })
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        if (session.mode !== 'subscription') break

        const customerId = session.customer as string
        const subscriptionId = session.subscription as string

        // Retrieve the subscription to get price ID
        const subscription = await stripe.subscriptions.retrieve(subscriptionId)
        const priceId = subscription.items.data[0]?.price.id ?? null

        await db
          .update(households)
          .set({
            subscription_status: 'premium',
            stripe_subscription_id: subscriptionId,
            stripe_price_id: priceId,
            subscription_upgraded_at: new Date(),
            premium_expires_at: null,
          })
          .where(eq(households.stripe_customer_id, customerId))

        break
      }

      case 'customer.subscription.updated': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        if (subscription.cancel_at_period_end) {
          // User cancelled but is still active until period ends
          const periodEnd = subscription.items.data[0]?.current_period_end
          const expiresAt = periodEnd ? new Date(periodEnd * 1000) : null

          await db
            .update(households)
            .set({ premium_expires_at: expiresAt })
            .where(eq(households.stripe_customer_id, customerId))
        } else {
          // Reactivated — clear the expiry
          await db
            .update(households)
            .set({ premium_expires_at: null })
            .where(eq(households.stripe_customer_id, customerId))
        }

        break
      }

      case 'customer.subscription.deleted': {
        const subscription = event.data.object as Stripe.Subscription
        const customerId = subscription.customer as string

        await db
          .update(households)
          .set({
            subscription_status: 'free',
            stripe_subscription_id: null,
            premium_expires_at: new Date(),
          })
          .where(eq(households.stripe_customer_id, customerId))

        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        console.warn(
          '[stripe/webhook] Payment failed for customer',
          invoice.customer,
          '— Stripe will retry. Premium not revoked.'
        )
        // Do NOT revoke premium. Stripe handles retries and fires subscription.deleted last.
        break
      }

      default:
        // Unhandled event type — not an error
        break
    }
  } catch (err) {
    console.error('[stripe/webhook] Error processing event', event.type, err)
    return Response.json({ error: 'Webhook handler error' }, { status: 500 })
  }

  return Response.json({ received: true })
}
