import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { recurringExpenses, expenses } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const template = await db
    .select()
    .from(recurringExpenses)
    .where(and(eq(recurringExpenses.id, id), eq(recurringExpenses.householdId, householdId), isNull(recurringExpenses.deletedAt)))
    .then(r => r[0] ?? null)

  if (!template) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const updates: Record<string, unknown> = { updatedAt: new Date() }

  if (body.title !== undefined) updates.title = body.title.trim()
  if (body.totalAmount !== undefined) updates.totalAmount = parseFloat(body.totalAmount).toFixed(2)
  if (body.frequency !== undefined) updates.frequency = body.frequency
  if (body.nextDueDate !== undefined) updates.nextDueDate = new Date(body.nextDueDate)
  if (body.categoryId !== undefined) updates.categoryId = body.categoryId ?? null
  if (body.notes !== undefined) updates.notes = body.notes ?? null
  if (body.splits !== undefined) updates.splits = JSON.stringify(body.splits)
  if (body.paused !== undefined) updates.paused = body.paused
  if (body.isBill !== undefined) updates.isBill = body.isBill
  if (body.dueDay !== undefined) updates.dueDay = body.dueDay ?? null

  await db.update(recurringExpenses).set(updates).where(eq(recurringExpenses.id, id))

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

  // unlink expenses but keep history
  await db
    .update(expenses)
    .set({ recurringTemplateId: null })
    .where(eq(expenses.recurringTemplateId, id))

  await db
    .update(recurringExpenses)
    .set({ deletedAt: new Date() })
    .where(and(eq(recurringExpenses.id, id), eq(recurringExpenses.householdId, householdId)))

  return NextResponse.json({ ok: true })
}
