import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { notes, users } from '@/db/schema'
import { eq, and, isNull, desc, count } from 'drizzle-orm'
import { logActivity } from '@/lib/utils/activity'

const FREE_NOTES_LIMIT = 10

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership

  const rows = await db
    .select({
      id: notes.id,
      title: notes.title,
      content: notes.content,
      isRichText: notes.isRichText,
      createdBy: notes.createdBy,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
      creatorName: users.name,
      creatorAvatar: users.avatarColor,
    })
    .from(notes)
    .leftJoin(users, eq(notes.createdBy, users.id))
    .where(and(eq(notes.householdId, householdId), isNull(notes.deletedAt)))
    .orderBy(desc(notes.updatedAt))

  return NextResponse.json({ notes: rows })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership
  const isPremium = membership.household.subscriptionStatus === 'premium'

  const body = await req.json()
  const { title, content, isRichText = false } = body

  if (!content?.trim() && !title?.trim()) {
    return NextResponse.json({ error: 'Note must have a title or content' }, { status: 400 })
  }

  if (content && content.length > 50_000) {
    return NextResponse.json({ error: 'Note content is too long (50,000 character limit)' }, { status: 400 })
  }

  // Free tier note limit
  if (!isPremium) {
    const [{ cnt }] = await db
      .select({ cnt: count(notes.id) })
      .from(notes)
      .where(and(eq(notes.householdId, householdId), isNull(notes.deletedAt)))

    if (Number(cnt) >= FREE_NOTES_LIMIT) {
      return NextResponse.json(
        { error: `Free plan is limited to ${FREE_NOTES_LIMIT} notes`, code: 'NOTES_LIMIT', limit: FREE_NOTES_LIMIT, current: Number(cnt) },
        { status: 403 }
      )
    }
  }

  const [note] = await db
    .insert(notes)
    .values({
      householdId,
      title: title?.trim() ?? null,
      content: content ?? '',
      isRichText: isRichText && !!isPremium,
      createdBy: session.user.id,
    })
    .returning()

  await logActivity({
    householdId,
    userId: session.user.id,
    type: 'note_added',
    entityId: note.id,
    entityType: 'note',
    description: `Added note "${note.title ?? 'Untitled'}"`,
  })

  return NextResponse.json({ note }, { status: 201 })
}
