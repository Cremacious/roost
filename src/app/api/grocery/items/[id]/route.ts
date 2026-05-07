import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { groceryItems } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { id } = await params
  const body = await request.json()

  const updates: Partial<typeof groceryItems.$inferInsert> = {}

  if (typeof body.isChecked === 'boolean') {
    updates.isChecked = body.isChecked
    updates.checkedBy = body.isChecked ? session.user.id : null
    updates.checkedAt = body.isChecked ? new Date() : null
  }

  if (body.name !== undefined) {
    const name = body.name.trim()
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    updates.name = name
  }

  const [updated] = await db
    .update(groceryItems)
    .set(updates)
    .where(
      and(
        eq(groceryItems.id, id),
        eq(groceryItems.householdId, membership.householdId),
      )
    )
    .returning()

  if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { id } = await params

  await db
    .update(groceryItems)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(groceryItems.id, id),
        eq(groceryItems.householdId, membership.householdId),
      )
    )

  return NextResponse.json({ ok: true })
}
