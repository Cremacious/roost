import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { expenses } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const expense = await db
    .select()
    .from(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.householdId, householdId), isNull(expenses.deletedAt)))
    .then(r => r[0] ?? null)

  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isCreator = expense.paidBy === session.user.id
  const isAdmin = role === 'admin'
  if (!isCreator && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const body = await req.json()
  const updates: Partial<typeof expense> = {}

  if (body.title !== undefined) updates.title = body.title.trim()
  if (body.categoryId !== undefined) updates.categoryId = body.categoryId ?? null
  if (body.notes !== undefined) updates.notes = body.notes ?? null

  if (!Object.keys(updates).length) return NextResponse.json({ ok: true })

  await db
    .update(expenses)
    .set({ ...updates, updatedAt: new Date() })
    .where(eq(expenses.id, id))

  return NextResponse.json({ ok: true })
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const expense = await db
    .select({ id: expenses.id, paidBy: expenses.paidBy })
    .from(expenses)
    .where(and(eq(expenses.id, id), eq(expenses.householdId, householdId), isNull(expenses.deletedAt)))
    .then(r => r[0] ?? null)

  if (!expense) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const isCreator = expense.paidBy === session.user.id
  const isAdmin = role === 'admin'
  if (!isCreator && !isAdmin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  await db.update(expenses).set({ deletedAt: new Date() }).where(eq(expenses.id, id))

  return NextResponse.json({ ok: true })
}
