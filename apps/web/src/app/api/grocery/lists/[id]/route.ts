import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { groceryLists } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

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
  const name = (body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const [updated] = await db
    .update(groceryLists)
    .set({ name })
    .where(
      and(
        eq(groceryLists.id, id),
        eq(groceryLists.householdId, membership.householdId),
        isNull(groceryLists.deletedAt),
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

  const [list] = await db
    .select({ isDefault: groceryLists.isDefault })
    .from(groceryLists)
    .where(
      and(
        eq(groceryLists.id, id),
        eq(groceryLists.householdId, membership.householdId),
        isNull(groceryLists.deletedAt),
      )
    )

  if (!list) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  if (list.isDefault) return NextResponse.json({ error: 'Cannot delete the default list' }, { status: 400 })

  await db
    .update(groceryLists)
    .set({ deletedAt: new Date() })
    .where(eq(groceryLists.id, id))

  return NextResponse.json({ ok: true })
}
