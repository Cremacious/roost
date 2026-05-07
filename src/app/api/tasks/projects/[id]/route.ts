import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { projects, tasks } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

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

  const [existing] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
  if (!existing || existing.householdId !== householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  if (existing.createdBy !== session.user.id && role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await req.json()
  const updates: Partial<typeof projects.$inferInsert> = {}
  if (body.name !== undefined) updates.name = body.name.trim()
  if (body.color !== undefined) updates.color = body.color
  if (body.archived !== undefined) updates.archived = body.archived

  const [updated] = await db.update(projects).set(updates).where(eq(projects.id, id)).returning()
  return NextResponse.json({ project: updated })
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

  if (role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [existing] = await db.select().from(projects).where(eq(projects.id, id)).limit(1)
  if (!existing || existing.householdId !== householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Unlink tasks from project before deleting
  await db.update(tasks).set({ projectId: null }).where(eq(tasks.projectId, id))
  await db.update(projects).set({ deletedAt: new Date() }).where(eq(projects.id, id))

  return NextResponse.json({ ok: true })
}
