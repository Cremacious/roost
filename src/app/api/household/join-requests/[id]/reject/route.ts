import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { joinRequests, householdMembers } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params
  const session = await requireSession()

  const [callerMembership] = await db
    .select({ householdId: householdMembers.householdId, role: householdMembers.role })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.userId, session.user.id),
        isNull(householdMembers.deletedAt),
      )
    )
    .limit(1)

  if (!callerMembership || callerMembership.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const [req] = await db
    .select({ id: joinRequests.id })
    .from(joinRequests)
    .where(
      and(
        eq(joinRequests.id, id),
        eq(joinRequests.householdId, callerMembership.householdId),
      )
    )
    .limit(1)

  if (!req) {
    return Response.json({ error: 'Request not found' }, { status: 404 })
  }

  await db.delete(joinRequests).where(eq(joinRequests.id, id))

  return Response.json({ success: true })
}
