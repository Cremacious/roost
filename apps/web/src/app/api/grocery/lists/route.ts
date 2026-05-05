import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { groceryLists, groceryItems } from '@/db/schema'
import { eq, and, isNull, sql } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

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
