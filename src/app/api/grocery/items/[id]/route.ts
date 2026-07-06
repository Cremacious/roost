import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { groceryItems } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { logActivity } from '@/lib/utils/activity'

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

  // Read the current row so we can detect a genuine unchecked -> checked
  // transition (activity is logged only on that positive transition).
  const [current] = await db
    .select({ isChecked: groceryItems.isChecked, name: groceryItems.name })
    .from(groceryItems)
    .where(and(eq(groceryItems.id, id), eq(groceryItems.householdId, membership.householdId)))

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

  if (body.quantity !== undefined) {
    updates.quantity =
      typeof body.quantity === 'string' && body.quantity.trim()
        ? body.quantity.trim()
        : null
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

  // Log only when an item goes from unchecked to checked, not on uncheck.
  if (body.isChecked === true && current && !current.isChecked) {
    await logActivity({
      householdId: membership.householdId,
      userId: session.user.id,
      type: 'item_checked',
      entityId: id,
      entityType: 'grocery_item',
      description: `checked off "${updated.name}"`,
    })
  }

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
