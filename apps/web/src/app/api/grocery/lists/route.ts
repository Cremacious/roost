import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { groceryLists, groceryItems } from '@/db/schema'
import { eq, and, isNull, sql } from 'drizzle-orm'

async function getOrCreateDefaultList(householdId: string, userId: string) {
  const existing = await db
    .select({ id: groceryLists.id })
    .from(groceryLists)
    .where(and(eq(groceryLists.householdId, householdId), isNull(groceryLists.deletedAt)))
    .limit(1)
    .then(r => r[0] ?? null)

  if (existing) return

  await db.insert(groceryLists).values({
    householdId,
    name: 'Shopping List',
    isDefault: true,
    createdBy: userId,
  })
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  await getOrCreateDefaultList(membership.householdId, session.user.id)

  const lists = await db
    .select({
      id: groceryLists.id,
      name: groceryLists.name,
      isDefault: groceryLists.isDefault,
      createdAt: groceryLists.createdAt,
      itemCount: sql<number>`count(${groceryItems.id}) filter (where ${groceryItems.deletedAt} is null)`.mapWith(Number),
    })
    .from(groceryLists)
    .leftJoin(
      groceryItems,
      and(eq(groceryItems.listId, groceryLists.id), isNull(groceryItems.deletedAt))
    )
    .where(
      and(
        eq(groceryLists.householdId, membership.householdId),
        isNull(groceryLists.deletedAt),
      )
    )
    .groupBy(groceryLists.id)
    .orderBy(groceryLists.createdAt)

  return NextResponse.json({ lists })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const body = await request.json()
  const name = (body.name ?? '').trim()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const [list] = await db
    .insert(groceryLists)
    .values({
      householdId: membership.householdId,
      name,
      isDefault: false,
      createdBy: session.user.id,
    })
    .returning()

  return NextResponse.json({ id: list.id, name: list.name, isDefault: list.isDefault }, { status: 201 })
}
