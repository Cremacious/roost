import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { notes, users } from '@/db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'

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
  const body = await req.json()
  const { title, content } = body

  if (!content?.trim() && !title?.trim()) {
    return NextResponse.json({ error: 'Note must have a title or content' }, { status: 400 })
  }

  const [note] = await db
    .insert(notes)
    .values({
      householdId,
      title: title?.trim() ?? null,
      content: content ?? '',
      createdBy: session.user.id,
    })
    .returning()

  return NextResponse.json({ note }, { status: 201 })
}
