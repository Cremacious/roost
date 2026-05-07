import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { tasks, taskComments, users } from '@/db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const rows = await db
    .select({
      id: taskComments.id,
      taskId: taskComments.taskId,
      userId: taskComments.userId,
      body: taskComments.body,
      createdAt: taskComments.createdAt,
      userName: users.name,
      userAvatar: users.avatarColor,
    })
    .from(taskComments)
    .leftJoin(users, eq(taskComments.userId, users.id))
    .where(and(
      eq(taskComments.taskId, id),
      eq(taskComments.householdId, membership.householdId),
      isNull(taskComments.deletedAt),
    ))
    .orderBy(desc(taskComments.createdAt))

  return NextResponse.json({ comments: rows })
}

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

  const [task] = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1)
  if (!task || task.householdId !== householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json()
  const { body: commentBody } = body
  if (!commentBody?.trim()) {
    return NextResponse.json({ error: 'Comment body is required' }, { status: 400 })
  }
  if (commentBody.length > 2000) {
    return NextResponse.json({ error: 'Comment too long (max 2000 chars)' }, { status: 400 })
  }

  const [comment] = await db
    .insert(taskComments)
    .values({
      taskId: id,
      householdId,
      userId: session.user.id,
      body: commentBody.trim(),
    })
    .returning()

  return NextResponse.json({ comment }, { status: 201 })
}
