import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { mealPlanSlots, meals, users } from '@/db/schema'
import { eq, and, gte, lt } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership
  const url = new URL(req.url)
  const weekStart = url.searchParams.get('weekStart') ?? new Date().toISOString().slice(0, 10)

  // Compute week end (7 days)
  const startDate = new Date(`${weekStart}T00:00:00`)
  const endDate = new Date(startDate)
  endDate.setDate(endDate.getDate() + 7)

  const slots = await db
    .select({
      id: mealPlanSlots.id,
      slotDate: mealPlanSlots.slotDate,
      slotType: mealPlanSlots.slotType,
      createdBy: mealPlanSlots.createdBy,
      mealId: meals.id,
      mealName: meals.name,
      mealCategory: meals.category,
      mealDescription: meals.description,
      mealPrepTime: meals.prepTime,
      mealIngredients: meals.ingredients,
      plannedByName: users.name,
    })
    .from(mealPlanSlots)
    .innerJoin(meals, eq(mealPlanSlots.mealId, meals.id))
    .leftJoin(users, eq(mealPlanSlots.createdBy, users.id))
    .where(
      and(
        eq(mealPlanSlots.householdId, householdId),
        gte(mealPlanSlots.slotDate, weekStart),
        lt(mealPlanSlots.slotDate, endDate.toISOString().slice(0, 10))
      )
    )

  return NextResponse.json({ slots })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership
  const body = await req.json()
  const { mealId, slotDate, slotType } = body

  if (!mealId || !slotDate || !slotType) {
    return NextResponse.json({ error: 'mealId, slotDate, and slotType are required' }, { status: 400 })
  }

  // Delete existing slot for same day+type (upsert behavior)
  const existing = await db
    .select({ id: mealPlanSlots.id })
    .from(mealPlanSlots)
    .where(
      and(
        eq(mealPlanSlots.householdId, householdId),
        eq(mealPlanSlots.slotDate, slotDate),
        eq(mealPlanSlots.slotType, slotType)
      )
    )
    .limit(1)

  if (existing.length > 0) {
    await db.delete(mealPlanSlots).where(eq(mealPlanSlots.id, existing[0].id))
  }

  const [slot] = await db
    .insert(mealPlanSlots)
    .values({
      householdId,
      mealId,
      slotDate,
      slotType,
      createdBy: session.user.id,
    })
    .returning()

  return NextResponse.json({ slot }, { status: 201 })
}
