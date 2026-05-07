import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { tasks, taskDelegations } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const [delegation] = await db
    .select()
    .from(taskDelegations)
    .where(eq(taskDelegations.id, id))
    .limit(1)

  if (!delegation || delegation.householdId !== membership.householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (delegation.toUserId !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const { status } = body
  if (status !== 'accepted' && status !== 'declined') {
    return NextResponse.json({ error: 'status must be accepted or declined' }, { status: 400 })
  }

  await db
    .update(taskDelegations)
    .set({ status, respondedAt: new Date() })
    .where(eq(taskDelegations.id, id))

  if (status === 'accepted') {
    await db
      .update(tasks)
      .set({ assignedTo: delegation.toUserId, updatedAt: new Date() })
      .where(eq(tasks.id, delegation.taskId))
  }

  return NextResponse.json({ ok: true })
}
