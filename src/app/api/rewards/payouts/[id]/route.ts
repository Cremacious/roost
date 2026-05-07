import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { rewardPayouts } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function PATCH(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const payout = await db
    .select()
    .from(rewardPayouts)
    .where(
      and(
        eq(rewardPayouts.id, id),
        eq(rewardPayouts.householdId, membership.householdId),
        eq(rewardPayouts.userId, session.user.id),
      )
    )
    .limit(1)
    .then(r => r[0] ?? null)

  if (!payout) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (!payout.earned) return NextResponse.json({ error: 'Reward was not earned' }, { status: 400 })

  await db
    .update(rewardPayouts)
    .set({ acknowledged: true })
    .where(eq(rewardPayouts.id, id))

  return NextResponse.json({ ok: true })
}
