import { NextResponse } from 'next/server'
import { getSession, getUserHousehold, checkMemberPermission } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { commonItems } from '@/db/schema'
import { and, eq, isNull, asc, sql } from 'drizzle-orm'
import { seedCommonItems } from '@/lib/utils/seedCommonItems'

const MAX_NAME_LEN = 60

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Lazy-seed defaults for pre-existing households that have never had a row.
  await seedCommonItems(householdId)

  const items = await db
    .select({ id: commonItems.id, name: commonItems.name })
    .from(commonItems)
    .where(and(eq(commonItems.householdId, householdId), isNull(commonItems.deletedAt)))
    .orderBy(asc(commonItems.createdAt))

  return NextResponse.json({ items })
}

export async function POST(request: Request) {
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

  // Case-insensitive uniqueness within the household, excluding soft-deleted rows.
  const [dup] = await db
    .select({ id: commonItems.id })
    .from(commonItems)
    .where(
      and(
        eq(commonItems.householdId, householdId),
        isNull(commonItems.deletedAt),
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

  const id = crypto.randomUUID()
  await db.insert(commonItems).values({ id, householdId, name })
  return NextResponse.json({ id, name }, { status: 201 })
}
