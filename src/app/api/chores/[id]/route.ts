import { NextResponse } from 'next/server'
import { getSession, getUserHousehold, checkMemberPermission } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { chores } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { calcNextDueAt, parseDateInput } from '../route'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: choreId } = await params

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership

  const chore = await db
    .select()
    .from(chores)
    .where(and(eq(chores.id, choreId), eq(chores.householdId, householdId), isNull(chores.deletedAt)))
    .limit(1)
    .then(r => r[0] ?? null)

  if (!chore) return NextResponse.json({ error: 'Chore not found' }, { status: 404 })
  if (role !== 'admin' && chore.createdBy !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const canEdit = await checkMemberPermission(session.user.id, householdId, role, 'choresEdit')
  if (!canEdit) return NextResponse.json({ error: 'You do not have permission to edit chores', code: 'PERMISSION_DENIED' }, { status: 403 })

  const body = await request.json().catch(() => ({}))

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.title !== undefined) updates.title = body.title.trim()
  if (body.description !== undefined) updates.description = body.description?.trim() || null
  if (body.assignedTo !== undefined) updates.assignedTo = body.assignedTo || null
  if (body.frequency !== undefined) updates.frequency = body.frequency
  if (body.customDays !== undefined) updates.customDays = body.customDays || null

  // Recompute the schedule when the frequency, chosen day, or start date changes,
  // anchoring the first occurrence to the chosen day on/after the start date.
  if (body.frequency !== undefined || body.customDays !== undefined || body.startDate !== undefined) {
    const freq = body.frequency !== undefined ? body.frequency : chore.frequency
    const customDays = body.customDays !== undefined ? (body.customDays || null) : (chore.customDays ?? null)
    const from = body.startDate ? parseDateInput(body.startDate) : new Date()
    updates.nextDueAt = calcNextDueAt(freq, customDays, from)
  }

  await db.update(chores).set(updates).where(eq(chores.id, choreId))

  return NextResponse.json({ ok: true })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: choreId } = await params

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership

  const chore = await db
    .select()
    .from(chores)
    .where(and(eq(chores.id, choreId), eq(chores.householdId, householdId), isNull(chores.deletedAt)))
    .limit(1)
    .then(r => r[0] ?? null)

  if (!chore) return NextResponse.json({ error: 'Chore not found' }, { status: 404 })
  if (role !== 'admin' && chore.createdBy !== session.user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.update(chores).set({ deletedAt: new Date() }).where(eq(chores.id, choreId))

  return NextResponse.json({ ok: true })
}
