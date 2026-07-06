import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { promoCodes, promoRedemptions, households } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getUserHousehold } from '@/lib/auth/helpers'

export async function POST(request: NextRequest): Promise<Response> {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) {
    return Response.json({ error: 'No household found' }, { status: 400 })
  }
  const { householdId } = membership

  let body: { code?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const code = body.code?.trim().toUpperCase()
  if (!code) {
    return Response.json({ error: 'Code is required' }, { status: 400 })
  }

  // Look up the promo code
  const [promo] = await db
    .select()
    .from(promoCodes)
    .where(eq(promoCodes.code, code))
    .limit(1)

  if (!promo) {
    return Response.json({ error: 'Invalid promo code', code: 'PROMO_INVALID' }, { status: 404 })
  }
  if (promo.status !== 'active') {
    return Response.json({ error: 'This promo code is no longer active', code: 'PROMO_INACTIVE' }, { status: 400 })
  }
  if (promo.expiresAt && promo.expiresAt < new Date()) {
    return Response.json({ error: 'This promo code has expired', code: 'PROMO_EXPIRED' }, { status: 400 })
  }
  if (promo.maxRedemptions !== null && promo.redemptionCount >= promo.maxRedemptions) {
    return Response.json({ error: 'This promo code has reached its redemption limit', code: 'PROMO_EXHAUSTED' }, { status: 400 })
  }

  // Per-account redemption block: check if this household has EVER redeemed this code
  const [existingRedemption] = await db
    .select({ id: promoRedemptions.id })
    .from(promoRedemptions)
    .where(
      and(
        eq(promoRedemptions.promoCodeId, promo.id),
        eq(promoRedemptions.householdId, householdId),
      )
    )
    .limit(1)

  if (existingRedemption) {
    return Response.json({ error: 'Your household has already redeemed this code', code: 'PROMO_ALREADY_REDEEMED' }, { status: 400 })
  }

  // Determine new premium expiry
  const now = new Date()
  let premiumExpiresAt: Date | null = null

  if (!promo.isLifetime) {
    // Check if household already has a future expiry (from another promo)
    const [householdRow] = await db
      .select({
        premiumExpiresAt: households.premium_expires_at,
        subscriptionStatus: households.subscription_status,
        stripeSubId: households.stripe_subscription_id,
      })
      .from(households)
      .where(eq(households.id, householdId))
      .limit(1)

    // If they have an active Stripe subscription, promo records but doesn't change expiry
    if (householdRow?.stripeSubId && householdRow.subscriptionStatus === 'premium' && !householdRow.premiumExpiresAt) {
      // Stripe active — just record the redemption, don't touch premium_expires_at
      await db.insert(promoRedemptions).values({
        promoCodeId: promo.id,
        householdId,
        userId: session.user.id,
        premiumExpiresAt: null,
      })
      await db.update(promoCodes).set({ redemptionCount: promo.redemptionCount + 1 }).where(eq(promoCodes.id, promo.id))
      return Response.json({ success: true, message: 'Promo recorded. Your active subscription already includes premium.' })
    }

    // Extend from existing expiry if in the future, otherwise from now
    const base =
      householdRow?.premiumExpiresAt && householdRow.premiumExpiresAt > now
        ? householdRow.premiumExpiresAt
        : now

    premiumExpiresAt = new Date(base.getTime() + promo.durationDays * 24 * 60 * 60 * 1000)
  }

  // Grant premium
  await db
    .update(households)
    .set({
      subscription_status: 'premium',
      premium_expires_at: premiumExpiresAt,
      subscription_upgraded_at: now,
      updated_at: now,
    })
    .where(eq(households.id, householdId))

  // Record the redemption
  await db.insert(promoRedemptions).values({
    promoCodeId: promo.id,
    householdId,
    userId: session.user.id,
    premiumExpiresAt,
  })

  // Increment redemption count
  await db
    .update(promoCodes)
    .set({ redemptionCount: promo.redemptionCount + 1 })
    .where(eq(promoCodes.id, promo.id))

  return Response.json({
    success: true,
    isLifetime: promo.isLifetime,
    premiumExpiresAt,
  })
}
