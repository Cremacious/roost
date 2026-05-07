import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { expenseSplits } from '@/db/schema'
import { eq, and, inArray } from 'drizzle-orm'

// Debtor sends reminder to creditor (rate-limited: 1 per 24h per split)
export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { splitIds } = await req.json()
  if (!splitIds?.length) return NextResponse.json({ error: 'splitIds required' }, { status: 400 })

  const splits = await db
    .select({ id: expenseSplits.id, userId: expenseSplits.userId, settlementLastRemindedAt: expenseSplits.settlementLastRemindedAt })
    .from(expenseSplits)
    .where(and(eq(expenseSplits.householdId, householdId), inArray(expenseSplits.id, splitIds)))

  const invalid = splits.some(s => s.userId !== session.user.id)
  if (invalid) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // rate limit: 1 per 24h
  const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000)
  const tooSoon = splits.some(s => s.settlementLastRemindedAt && s.settlementLastRemindedAt > cutoff)
  if (tooSoon) {
    return NextResponse.json({ error: 'Rate limited. Wait 24 hours between reminders.', code: 'REMIND_RATE_LIMITED' }, { status: 429 })
  }

  await db
    .update(expenseSplits)
    .set({ settlementLastRemindedAt: new Date() })
    .where(inArray(expenseSplits.id, splitIds))

  return NextResponse.json({ ok: true })
}
