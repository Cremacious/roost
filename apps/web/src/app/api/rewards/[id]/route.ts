import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { rewardRules, rewardPayouts } from '@/db/schema'
import { eq, and, isNull, count } from 'drizzle-orm'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const rule = await db
    .select()
    .from(rewardRules)
    .where(and(eq(rewardRules.id, id), eq(rewardRules.householdId, householdId), isNull(rewardRules.deletedAt)))
    .limit(1)
    .then(r => r[0] ?? null)

  if (!rule) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await request.json().catch(() => ({}))
  const updates: Record<string, unknown> = { updatedAt: new Date() }

  if (body.title !== undefined) updates.title = body.title.trim()
  if (body.periodType !== undefined) updates.periodType = body.periodType
  if (body.periodDays !== undefined) updates.periodDays = body.periodDays
  if (body.thresholdPercent !== undefined) updates.thresholdPercent = body.thresholdPercent
  if (body.rewardType !== undefined) updates.rewardType = body.rewardType
  if (body.rewardDetail !== undefined) updates.rewardDetail = body.rewardDetail.trim()
  if (body.enabled !== undefined) updates.enabled = body.enabled
  if (body.startsAt !== undefined) updates.startsAt = new Date(body.startsAt)

  await db.update(rewardRules).set(updates).where(eq(rewardRules.id, id))

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const [payoutCount] = await db
    .select({ c: count() })
    .from(rewardPayouts)
    .where(eq(rewardPayouts.ruleId, id))

  if (Number(payoutCount?.c ?? 0) > 0) {
    // Soft delete so history is preserved
    await db
      .update(rewardRules)
      .set({ deletedAt: new Date(), enabled: false })
      .where(and(eq(rewardRules.id, id), eq(rewardRules.householdId, householdId)))
  } else {
    await db
      .delete(rewardRules)
      .where(and(eq(rewardRules.id, id), eq(rewardRules.householdId, householdId)))
  }

  return NextResponse.json({ ok: true })
}
