import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold, isHouseholdPremium, checkMemberPermission } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { meals } from '@/db/schema'
import { eq, and, isNull, asc, count } from 'drizzle-orm'

const FREE_MEAL_BANK_LIMIT = 5

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership

  const rows = await db
    .select()
    .from(meals)
    .where(and(eq(meals.householdId, householdId), isNull(meals.deletedAt), eq(meals.inBank, true)))
    .orderBy(asc(meals.name))

  return NextResponse.json({ meals: rows })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership

  // Children can suggest meals but never create bank/planner meals directly.
  if (role === 'child') {
    return NextResponse.json({ error: 'Children cannot add meals', code: 'PERMISSION_DENIED' }, { status: 403 })
  }
  const canManageMeals = await checkMemberPermission(session.user.id, householdId, role, 'mealsPlan')
  if (!canManageMeals) {
    return NextResponse.json({ error: 'You do not have permission to add meals', code: 'PERMISSION_DENIED' }, { status: 403 })
  }

  const body = await req.json()
  const { name, category, description, prepTime, ingredients, inBank } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  // Free-tier meal-bank limit. Only applies when the meal is actually saved to
  // the bank (inBank !== false). Quick-add-to-planner meals (inBank: false) are
  // scratch entries and never count against the limit.
  const willBeInBank = inBank !== false
  if (willBeInBank) {
    const premium = await isHouseholdPremium(householdId)
    if (!premium) {
      const [{ cnt }] = await db
        .select({ cnt: count(meals.id) })
        .from(meals)
        .where(and(eq(meals.householdId, householdId), isNull(meals.deletedAt), eq(meals.inBank, true)))

      if (Number(cnt) >= FREE_MEAL_BANK_LIMIT) {
        return NextResponse.json(
          { error: `Free plan is limited to ${FREE_MEAL_BANK_LIMIT} saved meals`, code: 'MEAL_BANK_LIMIT', limit: FREE_MEAL_BANK_LIMIT, current: Number(cnt) },
          { status: 403 }
        )
      }
    }
  }

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
      inBank: inBank !== false, // default true unless explicitly false
    })
    .returning()

  return NextResponse.json({ meal }, { status: 201 })
}
