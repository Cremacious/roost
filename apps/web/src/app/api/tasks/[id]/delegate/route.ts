import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { tasks, taskDelegations } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { logActivity } from '@/lib/utils/activity'

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
  const { toUserId } = body
  if (!toUserId) return NextResponse.json({ error: 'toUserId is required' }, { status: 400 })
  if (toUserId === session.user.id) {
    return NextResponse.json({ error: 'Cannot delegate to yourself' }, { status: 400 })
  }

  // Mark any existing pending delegation as declined (replace flow)
  await db
    .update(taskDelegations)
    .set({ status: 'declined', respondedAt: new Date() })
    .where(and(
      eq(taskDelegations.taskId, id),
      eq(taskDelegations.status, 'pending'),
    ))

  const [delegation] = await db
    .insert(taskDelegations)
    .values({
      taskId: id,
      householdId,
      fromUserId: session.user.id,
      toUserId,
      status: 'pending',
    })
    .returning()

  await logActivity({
    householdId,
    userId: session.user.id,
    type: 'task_delegated',
    entityId: id,
    entityType: 'task',
    description: `Delegated task "${task.title}"`,
  })

  return NextResponse.json({ delegation }, { status: 201 })
}
