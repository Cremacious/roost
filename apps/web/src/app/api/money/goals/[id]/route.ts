import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { savingsGoals } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

async function getGoal(id: string, householdId: string) {
  return db
    .select()
    .from(savingsGoals)
    .where(and(eq(savingsGoals.id, id), eq(savingsGoals.householdId, householdId), isNull(savingsGoals.deletedAt)))
    .then(r => r[0] ?? null)
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const goal = await getGoal(id, householdId)
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}

  if (body.name !== undefined) updates.name = body.name.trim()
  if (body.targetAmount !== undefined) updates.targetAmount = parseFloat(body.targetAmount).toFixed(2)
  if (body.targetDate !== undefined) updates.targetDate = body.targetDate ?? null
  if (body.description !== undefined) updates.description = body.description?.trim() ?? null
  if (body.completed === true) updates.completedAt = new Date()
  if (body.completed === false) updates.completedAt = null

  if (Object.keys(updates).length === 0) return NextResponse.json({ ok: true })

  await db.update(savingsGoals).set(updates).where(eq(savingsGoals.id, id))

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const goal = await getGoal(id, householdId)
  if (!goal) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.update(savingsGoals).set({ deletedAt: new Date() }).where(eq(savingsGoals.id, id))

  return NextResponse.json({ ok: true })
}
