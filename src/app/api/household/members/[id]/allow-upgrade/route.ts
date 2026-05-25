import { type NextRequest } from 'next/server'
import { requireSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { householdMembers } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

// Admin sets whether a child member is allowed to self-upgrade to a full account.
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params
  const session = await requireSession()
  const householdData = await getUserHousehold(session.user.id)

  if (!householdData) return Response.json({ error: 'No household' }, { status: 403 })
  if (householdData.role !== 'admin') return Response.json({ error: 'Admin only' }, { status: 403 })

  const { householdId } = householdData

  const body = await request.json().catch(() => null)
  if (!body || typeof body.allowed !== 'boolean') {
    return Response.json({ error: 'Body must include boolean "allowed"' }, { status: 400 })
  }

  const [target] = await db
    .select({ id: householdMembers.id, role: householdMembers.role })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.id, id),
        eq(householdMembers.householdId, householdId),
        isNull(householdMembers.deletedAt),
      )
    )
    .limit(1)

  if (!target) return Response.json({ error: 'Member not found' }, { status: 404 })
  if (target.role !== 'child') {
    return Response.json({ error: 'Only child accounts can be allowed to upgrade' }, { status: 400 })
  }

  await db
    .update(householdMembers)
    .set({ upgradeAllowed: body.allowed })
    .where(eq(householdMembers.id, id))

  return Response.json({ ok: true, upgradeAllowed: body.allowed })
}
