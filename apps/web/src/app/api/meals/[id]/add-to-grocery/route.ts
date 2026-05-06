import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { meals, groceryLists, groceryItems } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const meal = await db
    .select({ ingredients: meals.ingredients })
    .from(meals)
    .where(and(eq(meals.id, id), eq(meals.householdId, membership.householdId), isNull(meals.deletedAt)))
    .then(r => r[0] ?? null)

  if (!meal) return NextResponse.json({ error: 'Meal not found' }, { status: 404 })

  let ingredients: { name: string; quantity?: string; unit?: string }[] = []
  try {
    const raw = JSON.parse(meal.ingredients ?? '[]')
    if (Array.isArray(raw)) {
      ingredients = raw.map((item: unknown) => {
        if (typeof item === 'string') return { name: item }
        return item as { name: string; quantity?: string; unit?: string }
      }).filter(i => i.name?.trim())
    }
  } catch { /* noop */ }

  if (ingredients.length === 0) {
    return NextResponse.json({ error: 'No ingredients to add' }, { status: 400 })
  }

  // Get or create default grocery list
  let list = await db
    .select({ id: groceryLists.id })
    .from(groceryLists)
    .where(and(eq(groceryLists.householdId, membership.householdId), isNull(groceryLists.deletedAt)))
    .limit(1)
    .then(r => r[0] ?? null)

  if (!list) {
    const [newList] = await db.insert(groceryLists).values({
      householdId: membership.householdId,
      name: 'Shopping List',
      isDefault: true,
      createdBy: session.user.id,
    }).returning({ id: groceryLists.id })
    list = newList
  }

  const rows = ingredients.map(ing => {
    const qty = ing.quantity ? `${ing.quantity}${ing.unit ? ' ' + ing.unit : ''} ` : ''
    return {
      listId: list!.id,
      householdId: membership.householdId,
      name: `${qty}${ing.name}`.trim(),
      addedBy: session.user.id,
    }
  })

  await db.insert(groceryItems).values(rows)

  return NextResponse.json({ added: rows.length })
}
