import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { chores } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const body = await request.json().catch(() => ({}))
  const days = Number(body.days)
  if (!days || days < 1 || days > 30) {
    return NextResponse.json({ error: 'days must be 1-30' }, { status: 400 })
  }

  const chore = await db
    .select({ id: chores.id, assignedTo: chores.assignedTo })
    .from(chores)
    .where(and(eq(chores.id, id), eq(chores.householdId, membership.householdId), isNull(chores.deletedAt)))
    .limit(1)
    .then(r => r[0] ?? null)

  if (!chore) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const snoozedUntil = new Date()
  snoozedUntil.setDate(snoozedUntil.getDate() + days)
  snoozedUntil.setHours(0, 0, 0, 0)

  await db.update(chores).set({ snoozedUntil }).where(eq(chores.id, id))

  return NextResponse.json({ ok: true, snoozedUntil: snoozedUntil.toISOString() })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  await db
    .update(chores)
    .set({ snoozedUntil: null })
    .where(and(eq(chores.id, id), eq(chores.householdId, membership.householdId)))

  return NextResponse.json({ ok: true })
}
