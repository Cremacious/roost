import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { households } from '@/db/schema'
import { eq, and, isNull, lt, isNotNull } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Expire premium households whose promotion/trial period has ended
  // Only reverts households with a non-null premium_expires_at that is in the past.
  // premium_expires_at=null means permanent premium (active Stripe sub or lifetime promo) — never touch those.
  const result = await db
    .update(households)
    .set({ subscription_status: 'free', premium_expires_at: null })
    .where(
      and(
        eq(households.subscription_status, 'premium'),
        isNotNull(households.premium_expires_at),
        lt(households.premium_expires_at, now),
        isNull(households.deleted_at)
      )
    )
    .returning({ id: households.id })

  return NextResponse.json({ ok: true, expired: result.length })
}
