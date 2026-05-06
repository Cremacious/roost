import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { meals } from '@/db/schema'
import { eq, and, isNull, asc } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership

  const rows = await db
    .select()
    .from(meals)
    .where(and(eq(meals.householdId, householdId), isNull(meals.deletedAt)))
    .orderBy(asc(meals.name))

  return NextResponse.json({ meals: rows })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership
  const body = await req.json()
  const { name, category, description, prepTime, ingredients } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const [meal] = await db
    .insert(meals)
    .values({
      householdId,
      name: name.trim(),
      category: category ?? null,
      description: description?.trim() ?? null,
      prepTime: prepTime ? parseInt(prepTime, 10) : null,
      ingredients: JSON.stringify(ingredients ?? []),
      createdBy: session.user.id,
    })
    .returning()

  return NextResponse.json({ meal }, { status: 201 })
}
