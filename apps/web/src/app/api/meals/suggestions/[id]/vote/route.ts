import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { mealSuggestions, mealSuggestionVotes } from '@/db/schema'
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
  const { voteType } = body

  if (!['up', 'down'].includes(voteType)) {
    return NextResponse.json({ error: 'Invalid voteType' }, { status: 400 })
  }

  const [existing] = await db
    .select()
    .from(mealSuggestionVotes)
    .where(
      and(
        eq(mealSuggestionVotes.suggestionId, id),
        eq(mealSuggestionVotes.userId, session.user.id)
      )
    )
    .limit(1)

  if (existing && existing.voteType === voteType) {
    // Toggle off same vote
    await db.delete(mealSuggestionVotes).where(eq(mealSuggestionVotes.id, existing.id))
    return NextResponse.json({ toggled: 'off' })
  }

  if (existing) {
    await db
      .update(mealSuggestionVotes)
      .set({ voteType })
      .where(eq(mealSuggestionVotes.id, existing.id))
  } else {
    await db.insert(mealSuggestionVotes).values({
      suggestionId: id,
      userId: session.user.id,
      voteType,
    })
  }

  return NextResponse.json({ ok: true })
}
