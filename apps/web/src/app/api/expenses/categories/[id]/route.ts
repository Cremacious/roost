import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { expenseCategories, expenses } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  const cat = await db
    .select()
    .from(expenseCategories)
    .where(and(eq(expenseCategories.id, id), eq(expenseCategories.householdId, householdId), isNull(expenseCategories.deletedAt)))
    .then(r => r[0] ?? null)

  if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const body = await req.json()
  const updates: Record<string, unknown> = {}

  if (body.name !== undefined) updates.name = body.name.trim()
  if (body.icon !== undefined) updates.icon = body.icon
  if (body.color !== undefined) updates.color = body.color
  if (body.status !== undefined) updates.status = body.status  // approve/reject

  await db.update(expenseCategories).set(updates).where(eq(expenseCategories.id, id))

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

  const cat = await db
    .select({ isDefault: expenseCategories.isDefault })
    .from(expenseCategories)
    .where(and(eq(expenseCategories.id, id), eq(expenseCategories.householdId, householdId), isNull(expenseCategories.deletedAt)))
    .then(r => r[0] ?? null)

  if (!cat) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (cat.isDefault) return NextResponse.json({ error: 'Cannot delete default categories' }, { status: 400 })

  // unlink expenses that use this category
  await db.update(expenses).set({ categoryId: null }).where(eq(expenses.categoryId, id))

  await db.update(expenseCategories).set({ deletedAt: new Date() }).where(eq(expenseCategories.id, id))

  return NextResponse.json({ ok: true })
}
