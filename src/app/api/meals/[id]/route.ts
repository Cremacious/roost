import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { meals } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership

  const [existing] = await db.select().from(meals).where(eq(meals.id, id)).limit(1)
  if (!existing || existing.householdId !== householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (existing.createdBy !== session.user.id && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { name, category, description, prepTime, ingredients } = body

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (name !== undefined) updates.name = name.trim()
  if (category !== undefined) updates.category = category ?? null
  if (description !== undefined) updates.description = description?.trim() ?? null
  if (prepTime !== undefined) updates.prepTime = prepTime ? parseInt(prepTime, 10) : null
  if (ingredients !== undefined) updates.ingredients = JSON.stringify(ingredients)

  const [updated] = await db
    .update(meals)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    .set(updates as any)
    .where(eq(meals.id, id))
    .returning()

  return NextResponse.json({ meal: updated })
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership

  const [existing] = await db.select().from(meals).where(eq(meals.id, id)).limit(1)
  if (!existing || existing.householdId !== householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (existing.createdBy !== session.user.id && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.update(meals).set({ deletedAt: new Date() }).where(eq(meals.id, id))

  return NextResponse.json({ ok: true })
}
