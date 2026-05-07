import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { splitTemplates } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 404 })

  const [template] = await db
    .select({ createdBy: splitTemplates.createdBy, householdId: splitTemplates.householdId })
    .from(splitTemplates)
    .where(eq(splitTemplates.id, id))
    .limit(1)

  if (!template || template.householdId !== membership.householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const isCreator = template.createdBy === session.user.id
  const isAdmin = membership.role === 'admin'
  if (!isCreator && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.delete(splitTemplates).where(eq(splitTemplates.id, id))
  return NextResponse.json({ ok: true })
}
