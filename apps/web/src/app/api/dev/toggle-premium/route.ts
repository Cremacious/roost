import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { households } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST() {
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json({ error: 'Dev only' }, { status: 403 })
  }

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const current = membership.household.subscriptionStatus
  const next = current === 'premium' ? 'free' : 'premium'

  await db
    .update(households)
    .set({ subscriptionStatus: next })
    .where(eq(households.id, membership.householdId))

  return NextResponse.json({ subscriptionStatus: next })
}
