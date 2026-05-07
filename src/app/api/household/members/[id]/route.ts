import { type NextRequest } from 'next/server'
import { requireSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { householdMembers } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

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
