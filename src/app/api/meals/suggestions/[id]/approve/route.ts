import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { mealSuggestions, meals, mealPlanSlots } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  if (membership.role !== 'admin') {
    return NextResponse.json({ error: 'Admin only' }, { status: 403 })
  }

  const { householdId } = membership

  const [suggestion] = await db
    .select()
    .from(mealSuggestions)
    .where(eq(mealSuggestions.id, id))
    .limit(1)

  if (!suggestion || suggestion.householdId !== householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { destination } = body // 'bank' | 'reject'

  if (destination === 'reject') {
    await db
      .update(mealSuggestions)
      .set({ status: 'rejected', respondedBy: session.user.id, respondedAt: new Date() })
      .where(eq(mealSuggestions.id, id))
    return NextResponse.json({ ok: true })
  }

  if (destination === 'bank') {
    // Create a meal bank entry from the suggestion
    const [meal] = await db
      .insert(meals)
      .values({
        householdId,
        name: suggestion.name,
        ingredients: suggestion.ingredients,
        description: suggestion.note ?? undefined,
        prepTime: suggestion.prepTime ?? undefined,
        createdBy: session.user.id,
      })
      .returning()

    await db
      .update(mealSuggestions)
      .set({
        status: 'in_bank',
        respondedBy: session.user.id,
        respondedAt: new Date(),
        acceptedMealId: meal.id,
      })
      .where(eq(mealSuggestions.id, id))

    return NextResponse.json({ meal })
  }

  if (destination === 'planner') {
    if (!suggestion.targetSlotDate || !suggestion.targetSlotType) {
      return NextResponse.json({ error: 'No target slot on suggestion' }, { status: 400 })
    }

    const [meal] = await db
      .insert(meals)
      .values({
        householdId,
        name: suggestion.name,
        ingredients: suggestion.ingredients,
        description: suggestion.note ?? undefined,
        prepTime: suggestion.prepTime ?? undefined,
        createdBy: session.user.id,
      })
      .returning()

    // Delete any existing slot in the same position before inserting
    const existing = await db.select({ id: mealPlanSlots.id }).from(mealPlanSlots).where(
      and(
        eq(mealPlanSlots.householdId, householdId),
        eq(mealPlanSlots.slotDate, suggestion.targetSlotDate),
        eq(mealPlanSlots.slotType, suggestion.targetSlotType)
      )
    ).limit(1)
    if (existing.length > 0) await db.delete(mealPlanSlots).where(eq(mealPlanSlots.id, existing[0].id))

    const [slot] = await db
      .insert(mealPlanSlots)
      .values({
        householdId,
        mealId: meal.id,
        slotDate: suggestion.targetSlotDate,
        slotType: suggestion.targetSlotType,
        createdBy: session.user.id,
      })
      .returning()

    await db
      .update(mealSuggestions)
      .set({
        status: 'accepted',
        respondedBy: session.user.id,
        respondedAt: new Date(),
        acceptedMealId: meal.id,
        acceptedSlotId: slot.id,
      })
      .where(eq(mealSuggestions.id, id))

    return NextResponse.json({ meal, slot })
  }

  return NextResponse.json({ error: 'Invalid destination' }, { status: 400 })
}
