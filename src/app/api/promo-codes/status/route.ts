import { NextRequest } from 'next/server'
import { getSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { promoRedemptions, promoCodes } from '@/db/schema'
import { eq, or, isNull, gt, and } from 'drizzle-orm'
import { getUserHousehold } from '@/lib/auth/helpers'

export async function GET(_request: NextRequest): Promise<Response> {
  const session = await getSession()
  if (!session) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return Response.json({ redemptions: [] })

  const { householdId } = membership
  const now = new Date()

  // Return active or lifetime redemptions for this household
  const redemptions = await db
    .select({
      id: promoRedemptions.id,
      code: promoCodes.code,
      isLifetime: promoCodes.isLifetime,
      premiumExpiresAt: promoRedemptions.premiumExpiresAt,
      redeemedAt: promoRedemptions.redeemedAt,
    })
    .from(promoRedemptions)
    .innerJoin(promoCodes, eq(promoRedemptions.promoCodeId, promoCodes.id))
    .where(
      and(
        eq(promoRedemptions.householdId, householdId),
        // lifetime (null expiry) OR still active (expiry in future)
        or(
          isNull(promoRedemptions.premiumExpiresAt),
          gt(promoRedemptions.premiumExpiresAt, now),
        )
      )
    )

  return Response.json({ redemptions })
}
