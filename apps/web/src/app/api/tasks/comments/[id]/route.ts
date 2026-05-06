import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { taskComments } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const [comment] = await db.select().from(taskComments).where(eq(taskComments.id, id)).limit(1)
  if (!comment || comment.householdId !== membership.householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (comment.userId !== session.user.id && membership.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.update(taskComments).set({ deletedAt: new Date() }).where(eq(taskComments.id, id))
  return NextResponse.json({ ok: true })
}
