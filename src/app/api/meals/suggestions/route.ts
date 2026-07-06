import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold, checkMemberPermission } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { mealSuggestions, mealSuggestionVotes, users, households } from '@/db/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'
import { logActivity } from '@/lib/utils/activity'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership

  // Get household approval mode default
  const [household] = await db
    .select({ meal_approval_mode: households.meal_approval_mode })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1)

  const householdApprovalMode = household?.meal_approval_mode ?? 'admin_only'

  const rows = await db
    .select({
      id: mealSuggestions.id,
      name: mealSuggestions.name,
      ingredients: mealSuggestions.ingredients,
      note: mealSuggestions.note,
      prepTime: mealSuggestions.prepTime,
      targetSlotDate: mealSuggestions.targetSlotDate,
      targetSlotType: mealSuggestions.targetSlotType,
      status: mealSuggestions.status,
      approvalMode: mealSuggestions.approvalMode,
      suggestedBy: mealSuggestions.suggestedBy,
      createdAt: mealSuggestions.createdAt,
      suggesterName: users.name,
      upvotes: sql<number>`count(case when ${mealSuggestionVotes.voteType} = 'up' then 1 end)::int`,
      downvotes: sql<number>`count(case when ${mealSuggestionVotes.voteType} = 'down' then 1 end)::int`,
    })
    .from(mealSuggestions)
    .leftJoin(users, eq(mealSuggestions.suggestedBy, users.id))
    .leftJoin(mealSuggestionVotes, eq(mealSuggestionVotes.suggestionId, mealSuggestions.id))
    .where(
      and(
        eq(mealSuggestions.householdId, householdId),
        inArray(mealSuggestions.status, ['suggested', 'in_bank'])
      )
    )
    .groupBy(mealSuggestions.id, users.name)
    .orderBy(sql`count(case when ${mealSuggestionVotes.voteType} = 'up' then 1 end) desc`)

  // Get user's votes
  const myVotes = await db
    .select({ suggestionId: mealSuggestionVotes.suggestionId, voteType: mealSuggestionVotes.voteType })
    .from(mealSuggestionVotes)
    .where(eq(mealSuggestionVotes.userId, session.user.id))

  const voteMap = new Map(myVotes.map(v => [v.suggestionId, v.voteType]))

  const suggestions = rows.map(r => ({ ...r, userVote: voteMap.get(r.id) ?? null }))

  return NextResponse.json({ suggestions, householdApprovalMode })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership

  const canSuggest = await checkMemberPermission(session.user.id, householdId, role, 'mealsSuggest')
  if (!canSuggest) return NextResponse.json({ error: 'You do not have permission to suggest meals', code: 'PERMISSION_DENIED' }, { status: 403 })

  const body = await req.json()
  const { name, ingredients, note, prepTime, targetSlotDate, targetSlotType, approvalMode } = body

  if (!name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 })

  const [suggestion] = await db
    .insert(mealSuggestions)
    .values({
      householdId,
      name: name.trim(),
      ingredients: JSON.stringify(ingredients ?? []),
      note: note?.trim() ?? null,
      prepTime: prepTime ? parseInt(prepTime, 10) : null,
      targetSlotDate: targetSlotDate ?? null,
      targetSlotType: targetSlotType ?? null,
      approvalMode: approvalMode ?? null, // null = use household default
      suggestedBy: session.user.id,
    })
    .returning()

  await logActivity({
    householdId,
    userId: session.user.id,
    type: 'meal_suggested',
    entityId: suggestion.id,
    entityType: 'meal',
    description: `suggested "${suggestion.name}"`,
  })

  return NextResponse.json({ suggestion }, { status: 201 })
}
