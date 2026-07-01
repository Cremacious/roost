import { NextResponse } from 'next/server'
import { getSession, getUserHousehold, checkMemberPermission } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { groceryLists, groceryItems, users } from '@/db/schema'
import { eq, and, isNull, asc } from 'drizzle-orm'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { id: listId } = await params

  const [list] = await db
    .select({ id: groceryLists.id, name: groceryLists.name, isDefault: groceryLists.isDefault })
    .from(groceryLists)
    .where(
      and(
        eq(groceryLists.id, listId),
        eq(groceryLists.householdId, membership.householdId),
        isNull(groceryLists.deletedAt),
      )
    )

  if (!list) return NextResponse.json({ error: 'List not found' }, { status: 404 })

  // leftJoin so an item is never dropped if its adder's users row is missing.
  const items = await db
    .select({
      id: groceryItems.id,
      name: groceryItems.name,
      quantity: groceryItems.quantity,
      isChecked: groceryItems.isChecked,
      checkedAt: groceryItems.checkedAt,
      addedByName: users.name,
      addedByAvatar: users.avatarColor,
      createdAt: groceryItems.createdAt,
    })
    .from(groceryItems)
    .leftJoin(users, eq(groceryItems.addedBy, users.id))
    .where(
      and(
        eq(groceryItems.listId, listId),
        isNull(groceryItems.deletedAt),
      )
    )
    .orderBy(asc(groceryItems.createdAt))

  return NextResponse.json({
    listId: list.id,
    listName: list.name,
    isDefault: list.isDefault,
    items: items.map(i => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      isChecked: i.isChecked,
      checkedAt: i.checkedAt?.toISOString() ?? null,
      addedBy: i.addedByName ?? 'Unknown',
      addedByAvatar: i.addedByAvatar ?? null,
      createdAt: i.createdAt.toISOString(),
    })),
  })
}

export async function POST(
  request: Request,
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

  const canAdd = await checkMemberPermission(session.user.id, membership.householdId, membership.role, 'groceryAdd')
  if (!canAdd) return NextResponse.json({ error: 'You do not have permission to add grocery items', code: 'PERMISSION_DENIED' }, { status: 403 })

  const body = await request.json()
  const name = (body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const [item] = await db
    .insert(groceryItems)
    .values({
      listId,
      householdId: membership.householdId,
      name,
      quantity: body.quantity?.trim() || null,
      addedBy: session.user.id,
    })
    .returning()

  return NextResponse.json({
    id: item.id,
    name: item.name,
    quantity: item.quantity,
    isChecked: false,
    checkedAt: null,
    addedBy: item.addedBy,
    createdAt: item.createdAt.toISOString(),
  }, { status: 201 })
}
