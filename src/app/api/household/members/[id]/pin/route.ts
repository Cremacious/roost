import { type NextRequest } from 'next/server'
import { requireSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { householdMembers, session as sessionTable } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'

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

  const body = await request.json()
  const { pin } = body

  if (!pin || !/^\d{4}$/.test(pin)) {
    return Response.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
  }

  // Find the child member
  const [target] = await db
    .select({ role: householdMembers.role, userId: householdMembers.userId })
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
  if (target.role !== 'child') {
    return Response.json({ error: 'Only child accounts have PINs' }, { status: 400 })
  }

  const hashedPin = await hashPassword(pin)

  await db
    .update(householdMembers)
    .set({ pin: hashedPin })
    .where(eq(householdMembers.id, id))

  await db.delete(sessionTable).where(eq(sessionTable.userId, target.userId))

  return Response.json({ ok: true })
}
