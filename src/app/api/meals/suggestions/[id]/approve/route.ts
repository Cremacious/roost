import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { mealSuggestions, meals, mealPlanSlots, mealSuggestionVotes, households } from '@/db/schema'
import { eq, and, sql } from 'drizzle-orm'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  const isAdmin = role === 'admin'

  // Fetch the suggestion
  const [suggestion] = await db
    .select()
    .from(mealSuggestions)
    .where(eq(mealSuggestions.id, id))
    .limit(1)

  if (!suggestion || suggestion.householdId !== householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Fetch household approval mode default
  const [household] = await db
    .select({ meal_approval_mode: households.meal_approval_mode })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1)

  const householdApprovalMode = household?.meal_approval_mode ?? 'admin_only'
  const effectiveMode = suggestion.approvalMode ?? householdApprovalMode

  // Permission check
  if (effectiveMode === 'admin_only') {
    // Only admins allowed
    if (!isAdmin) {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 })
    }
  } else {
    // open_vote: admin always allowed; others need upvotes > downvotes
    if (!isAdmin) {
      const [votes] = await db
        .select({
          upvotes: sql<number>`count(case when ${mealSuggestionVotes.voteType} = 'up' then 1 end)::int`,
          downvotes: sql<number>`count(case when ${mealSuggestionVotes.voteType} = 'down' then 1 end)::int`,
        })
        .from(mealSuggestionVotes)
        .where(eq(mealSuggestionVotes.suggestionId, id))

      const upvotes = votes?.upvotes ?? 0
      const downvotes = votes?.downvotes ?? 0

      if (upvotes <= downvotes) {
        return NextResponse.json(
          { error: 'Majority not reached. More upvotes needed to approve this suggestion.' },
          { status: 403 }
        )
      }
    }
  }

  const body = await req.json()
  const { destination } = body // 'bank' | 'reject' | 'planner'

  if (destination === 'reject') {
    await db
      .update(mealSuggestions)
      .set({ status: 'rejected', respondedBy: session.user.id, respondedAt: new Date() })
      .where(eq(mealSuggestions.id, id))
    return NextResponse.json({ ok: true })
  }

  if (destination === 'bank') {
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
    const existing = await db
      .select({ id: mealPlanSlots.id })
      .from(mealPlanSlots)
      .where(
        and(
          eq(mealPlanSlots.householdId, householdId),
          eq(mealPlanSlots.slotDate, suggestion.targetSlotDate),
          eq(mealPlanSlots.slotType, suggestion.targetSlotType)
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
