import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { expenseBudgets } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const budget = await db
    .select()
    .from(expenseBudgets)
    .where(and(eq(expenseBudgets.id, id), eq(expenseBudgets.householdId, householdId)))
    .then(r => r[0] ?? null)

  if (!budget) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.amount !== undefined) updates.amount = parseFloat(body.amount).toFixed(2)
  if (body.warningThreshold !== undefined) updates.warningThreshold = body.warningThreshold

  await db.update(expenseBudgets).set(updates).where(eq(expenseBudgets.id, id))

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

  await db.delete(expenseBudgets).where(and(eq(expenseBudgets.id, id), eq(expenseBudgets.householdId, householdId)))

  return NextResponse.json({ ok: true })
}
