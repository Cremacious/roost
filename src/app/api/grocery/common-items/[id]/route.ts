import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold, checkMemberPermission } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { commonItems } from '@/db/schema'
import { and, eq, isNull, ne, sql } from 'drizzle-orm'

const MAX_NAME_LEN = 60

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const canAdd = await checkMemberPermission(session.user.id, householdId, role, 'groceryAdd')
  if (!canAdd) {
    return NextResponse.json(
      { error: 'You do not have permission to manage common items', code: 'PERMISSION_DENIED' },
      { status: 403 },
    )
  }

  const body = await request.json().catch(() => ({})) as { name?: string }
  const name = body.name?.trim()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (name.length > MAX_NAME_LEN) {
    return NextResponse.json({ error: `Name must be ${MAX_NAME_LEN} characters or fewer` }, { status: 400 })
  }

  // Confirm the target exists in the caller's household and is not soft-deleted.
  const [target] = await db
    .select({ id: commonItems.id })
    .from(commonItems)
    .where(
      and(
        eq(commonItems.id, id),
        eq(commonItems.householdId, householdId),
        isNull(commonItems.deletedAt),
      ),
    )
    .limit(1)
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Case-insensitive uniqueness excluding self.
  const [dup] = await db
    .select({ id: commonItems.id })
    .from(commonItems)
    .where(
      and(
        eq(commonItems.householdId, householdId),
        isNull(commonItems.deletedAt),
        ne(commonItems.id, id),
        sql`lower(${commonItems.name}) = lower(${name})`,
      ),
    )
    .limit(1)
  if (dup) {
    return NextResponse.json(
      { error: 'Already in your common items', code: 'DUPLICATE' },
      { status: 409 },
    )
  }

  await db.update(commonItems).set({ name }).where(eq(commonItems.id, id))
  return NextResponse.json({ id, name })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const canAdd = await checkMemberPermission(session.user.id, householdId, role, 'groceryAdd')
  if (!canAdd) {
    return NextResponse.json(
      { error: 'You do not have permission to manage common items', code: 'PERMISSION_DENIED' },
      { status: 403 },
    )
  }

  const [target] = await db
    .select({ id: commonItems.id })
    .from(commonItems)
    .where(
      and(
        eq(commonItems.id, id),
        eq(commonItems.householdId, householdId),
        isNull(commonItems.deletedAt),
      ),
    )
    .limit(1)
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.update(commonItems).set({ deletedAt: new Date() }).where(eq(commonItems.id, id))
  return NextResponse.json({ ok: true })
}
