import { type NextRequest } from 'next/server'
import { requireSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { householdMembers, memberPermissions } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

const PERMISSION_KEYS = [
  'expensesView',
  'expensesAdd',
  'choresAdd',
  'choresEdit',
  'groceryAdd',
  'groceryCreateList',
  'calendarAdd',
  'calendarEdit',
  'tasksAdd',
  'notesAdd',
  'mealsPlan',
  'mealsSuggest',
] as const

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params
  const session = await requireSession()
  const householdData = await getUserHousehold(session.user.id)

  if (!householdData) {
    return Response.json({ error: 'No household' }, { status: 403 })
  }
  if (householdData.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 })
  }

  const { householdId } = householdData

  const [target] = await db
    .select({ userId: householdMembers.userId, role: householdMembers.role })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.id, id),
        eq(householdMembers.householdId, householdId),
        isNull(householdMembers.deletedAt),
      )
    )
    .limit(1)

  if (!target) {
    return Response.json({ error: 'Member not found' }, { status: 404 })
  }

  if (target.role === 'admin') {
    return Response.json({ error: 'Admin permissions cannot be overridden here' }, { status: 400 })
  }

  const body = await request.json().catch(() => null)
  const permissions = body?.permissions

  if (!permissions || typeof permissions !== 'object') {
    return Response.json({ error: 'Invalid permissions payload' }, { status: 400 })
  }

  // Child accounts can never hold finance permissions, regardless of the admin
  // checklist. Attempting to enable either is a hard 400 (see CLAUDE.md
  // Permission Rules); the child finance block is a documented invariant.
  if (target.role === 'child' && (permissions.expensesView || permissions.expensesAdd)) {
    return Response.json(
      { error: 'Children cannot be granted expense permissions', code: 'CHILD_FINANCE_LOCKED' },
      { status: 400 },
    )
  }

  const normalized = Object.fromEntries(
    PERMISSION_KEYS.map((key) => [key, Boolean(permissions[key])])
  )

  const [existing] = await db
    .select({ id: memberPermissions.id })
    .from(memberPermissions)
    .where(
      and(
        eq(memberPermissions.householdId, householdId),
        eq(memberPermissions.userId, target.userId)
      )
    )
    .limit(1)

  if (existing) {
    await db
      .update(memberPermissions)
      .set({ ...normalized, updatedAt: new Date() })
      .where(eq(memberPermissions.id, existing.id))
  } else {
    await db.insert(memberPermissions).values({
      householdId,
      userId: target.userId,
      ...normalized,
    })
  }

  return Response.json({ ok: true })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params
  const session = await requireSession()
  const householdData = await getUserHousehold(session.user.id)

  if (!householdData) {
    return Response.json({ error: 'No household' }, { status: 403 })
  }
  if (householdData.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 })
  }

  const { householdId } = householdData

  // Find the member to delete
  const [target] = await db
    .select({ userId: householdMembers.userId, role: householdMembers.role })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.id, id),
        eq(householdMembers.householdId, householdId),
        isNull(householdMembers.deletedAt),
      )
    )
    .limit(1)

  if (!target) {
    return Response.json({ error: 'Member not found' }, { status: 404 })
  }

  // Cannot remove yourself (admin removing self)
  if (target.userId === session.user.id) {
    return Response.json({ error: 'Cannot remove yourself' }, { status: 400 })
  }

  // Cannot remove another admin
  if (target.role === 'admin') {
    return Response.json({ error: 'Cannot remove another admin' }, { status: 400 })
  }

  // Soft delete
  await db
    .update(householdMembers)
    .set({ deletedAt: new Date() })
    .where(eq(householdMembers.id, id))

  return Response.json({ ok: true })
}
