import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { householdMembers, households } from '@/db/schema'
import { and, eq, isNull, desc } from 'drizzle-orm'
import { stripe } from '@/lib/utils/stripe'

export async function POST(request: NextRequest): Promise<Response> {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  const [membership] = await db
    .select({ householdId: householdMembers.householdId, role: householdMembers.role })
    .from(householdMembers)
    .where(and(eq(householdMembers.userId, userId), isNull(householdMembers.deletedAt)))
    .orderBy(desc(householdMembers.createdAt))
    .limit(1)

  if (!membership) return Response.json({ error: 'No household' }, { status: 404 })
  if (membership.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 })

  const [household] = await db
    .select({ stripe_subscription_id: households.stripe_subscription_id })
    .from(households)
    .where(and(eq(households.id, membership.householdId), isNull(households.deleted_at)))
    .limit(1)

  if (!household) return Response.json({ error: 'Household not found' }, { status: 404 })
  if (!household.stripe_subscription_id) {
    return Response.json({ error: 'No Stripe subscription found' }, { status: 400 })
  }

  await stripe.subscriptions.update(household.stripe_subscription_id, {
    cancel_at_period_end: false,
  })

  return Response.json({ ok: true })
}
