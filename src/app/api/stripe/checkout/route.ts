import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { householdMembers, households } from '@/db/schema'
import { and, eq, isNull, desc } from 'drizzle-orm'
import { stripe, STRIPE_PRICE_ID, APP_URL } from '@/lib/utils/stripe'

export async function POST(request: NextRequest): Promise<Response> {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  // Get household membership — most recently joined
  const [membership] = await db
    .select({ householdId: householdMembers.householdId, role: householdMembers.role })
    .from(householdMembers)
    .where(and(eq(householdMembers.userId, userId), isNull(householdMembers.deletedAt)))
    .orderBy(desc(householdMembers.createdAt))
    .limit(1)

  if (!membership) return Response.json({ error: 'No household' }, { status: 404 })
  if (membership.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 })

  const [household] = await db
    .select({
      id: households.id,
      name: households.name,
      stripe_customer_id: households.stripe_customer_id,
    })
    .from(households)
    .where(and(eq(households.id, membership.householdId), isNull(households.deleted_at)))
    .limit(1)

  if (!household) return Response.json({ error: 'Household not found' }, { status: 404 })

  let customerId = household.stripe_customer_id

  // Create a Stripe customer if one doesn't exist yet
  if (!customerId) {
    const customer = await stripe.customers.create({
      email: session.user.email,
      name: household.name,
      metadata: {
        householdId: household.id,
        userId,
      },
    })
    customerId = customer.id

    // Save customer ID immediately before creating Checkout session
    await db
      .update(households)
      .set({ stripe_customer_id: customerId })
      .where(eq(households.id, household.id))
  }

  const checkoutSession = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: 'subscription',
    line_items: [
      {
        price: STRIPE_PRICE_ID,
        quantity: 1,
      },
    ],
    success_url: `${APP_URL}/settings/billing?success=true`,
    cancel_url: `${APP_URL}/settings/billing`,
    metadata: {
      householdId: household.id,
    },
  })

  return Response.json({ url: checkoutSession.url })
}
