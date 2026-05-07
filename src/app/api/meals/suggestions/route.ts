import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { mealSuggestions, mealSuggestionVotes, users } from '@/db/schema'
import { eq, and, inArray, sql } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership

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

  return NextResponse.json({ suggestions })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership
  const body = await req.json()
  const { name, ingredients, note, prepTime, targetSlotDate, targetSlotType } = body

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
      suggestedBy: session.user.id,
    })
    .returning()

  return NextResponse.json({ suggestion }, { status: 201 })
}
