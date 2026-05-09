import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { groceryLists, groceryItems } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { id: listId } = await params

  const [list] = await db
    .select({ id: groceryLists.id })
    .from(groceryLists)
    .where(
      and(
        eq(groceryLists.id, listId),
        eq(groceryLists.householdId, membership.householdId),
        isNull(groceryLists.deletedAt),
      )
    )

  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 })

  await db
    .update(groceryItems)
    .set({ deletedAt: new Date() })
    .where(
      and(
        eq(groceryItems.listId, listId),
        eq(groceryItems.isChecked, true),
        isNull(groceryItems.deletedAt),
      )
    )

  return NextResponse.json({ ok: true })
}
