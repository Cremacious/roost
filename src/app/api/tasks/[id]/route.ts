import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { tasks } from '@/db/schema'
import { eq, and } from 'drizzle-orm'

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership

  const [existing] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1)

  if (!existing || existing.householdId !== householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Children have no task access (role preset: Tasks = none).
  if (role === 'child') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const {
    title, description, assignedTo, dueDate, dueTime, priority, completed,
    projectId, recurring, frequency, repeatEndType, repeatUntil, repeatOccurrences,
  } = body

  // Field edits (anything other than a completion toggle) are restricted to the
  // task creator or an admin. Completing/unchecking stays open to any member.
  const EDIT_FIELDS = [
    'title', 'description', 'assignedTo', 'dueDate', 'dueTime', 'priority',
    'projectId', 'recurring', 'frequency', 'repeatEndType', 'repeatUntil', 'repeatOccurrences',
  ]
  const isFieldEdit = EDIT_FIELDS.some(f => body[f] !== undefined)
  const isCreatorOrAdmin = existing.createdBy === session.user.id || role === 'admin'
  if (isFieldEdit && !isCreatorOrAdmin) {
    return NextResponse.json({ error: 'Only the task creator or an admin can edit this task' }, { status: 403 })
  }

  // Recurring tasks are a premium feature.
  if (recurring === true && membership.household.subscriptionStatus !== 'premium') {
    return NextResponse.json(
      { error: 'Recurring tasks are a premium feature', code: 'RECURRING_TASKS_PREMIUM' },
      { status: 403 }
    )
  }

  const updates: Partial<typeof tasks.$inferInsert> = {
    updatedAt: new Date(),
  }

  if (title !== undefined) updates.title = title.trim()
  if (description !== undefined) updates.description = description?.trim() ?? null
  if (assignedTo !== undefined) updates.assignedTo = assignedTo ?? null
  if (dueDate !== undefined) updates.dueDate = dueDate ? new Date(dueDate) : null
  if (dueTime !== undefined) updates.dueTime = dueTime ?? null
  if (priority !== undefined) updates.priority = priority
  if (projectId !== undefined) updates.projectId = projectId ?? null
  if (recurring !== undefined) updates.recurring = recurring
  if (frequency !== undefined) updates.frequency = frequency ?? null
  if (repeatEndType !== undefined) updates.repeatEndType = repeatEndType ?? null
  if (repeatUntil !== undefined) updates.repeatUntil = repeatUntil ? new Date(repeatUntil) : null
  if (repeatOccurrences !== undefined) updates.repeatOccurrences = repeatOccurrences ?? null
  if (completed !== undefined) {
    updates.completed = completed
    updates.completedBy = completed ? session.user.id : null
    updates.completedAt = completed ? new Date() : null
  }

  const [updated] = await db
    .update(tasks)
    .set(updates)
    .where(eq(tasks.id, id))
    .returning()

  return NextResponse.json({ task: updated })
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership

  const [existing] = await db
    .select()
    .from(tasks)
    .where(eq(tasks.id, id))
    .limit(1)

  if (!existing || existing.householdId !== householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (existing.createdBy !== session.user.id && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db
    .update(tasks)
    .set({ deletedAt: new Date() })
    .where(eq(tasks.id, id))

  return NextResponse.json({ ok: true })
}
