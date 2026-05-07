import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { groceryLists, groceryItems } from '@/db/schema'
import { eq, and, isNull, asc } from 'drizzle-orm'

async function getOrCreateDefaultList(householdId: string, userId: string) {
  const existing = await db
    .select({ id: groceryLists.id, name: groceryLists.name })
    .from(groceryLists)
    .where(
      and(
        eq(groceryLists.householdId, householdId),
        eq(groceryLists.isDefault, true),
        isNull(groceryLists.deletedAt),
      )
    )
    .limit(1)
    .then(r => r[0] ?? null)

  if (existing) return existing

  const [created] = await db
    .insert(groceryLists)
    .values({ householdId, name: 'Shopping List', isDefault: true, createdBy: userId })
    .returning({ id: groceryLists.id, name: groceryLists.name })

  return created
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const list = await getOrCreateDefaultList(membership.householdId, session.user.id)

  const items = await db
    .select({
      id: groceryItems.id,
      name: groceryItems.name,
      quantity: groceryItems.quantity,
      isChecked: groceryItems.isChecked,
      checkedAt: groceryItems.checkedAt,
      addedBy: groceryItems.addedBy,
      createdAt: groceryItems.createdAt,
    })
    .from(groceryItems)
    .where(
      and(
        eq(groceryItems.listId, list.id),
        isNull(groceryItems.deletedAt),
      )
    )
    .orderBy(asc(groceryItems.createdAt))

  return NextResponse.json({
    listId: list.id,
    listName: list.name,
    items: items.map(i => ({
      id: i.id,
      name: i.name,
      quantity: i.quantity,
      isChecked: i.isChecked,
      checkedAt: i.checkedAt?.toISOString() ?? null,
      addedBy: i.addedBy,
      createdAt: i.createdAt.toISOString(),
    })),
  })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const body = await request.json()
  const name = (body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const list = await getOrCreateDefaultList(membership.householdId, session.user.id)

  const [item] = await db
    .insert(groceryItems)
    .values({
      listId: list.id,
      householdId: membership.householdId,
      name,
      quantity: body.quantity?.trim() || null,
      addedBy: session.user.id,
    })
    .returning()

  return NextResponse.json({ id: item.id, name: item.name, quantity: item.quantity, isChecked: false, checkedAt: null, addedBy: item.addedBy, createdAt: item.createdAt.toISOString() }, { status: 201 })
}
