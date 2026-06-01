import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { joinRequests, householdMembers, households } from '@/db/schema'
import { and, eq, isNull, desc } from 'drizzle-orm'

export async function GET(_request: NextRequest): Promise<Response> {
  const session = await requireSession()

  const [membership] = await db
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.userId, session.user.id),
        isNull(householdMembers.deletedAt),
      )
    )
    .limit(1)

  if (membership) {
    return Response.json({ status: 'approved', householdId: membership.householdId })
  }

  const [pendingRequest] = await db
    .select({
      id: joinRequests.id,
      householdId: joinRequests.householdId,
    })
    .from(joinRequests)
    .where(eq(joinRequests.userId, session.user.id))
    .orderBy(desc(joinRequests.createdAt))
    .limit(1)

  if (pendingRequest) {
    const [household] = await db
      .select({ name: households.name })
      .from(households)
      .where(eq(households.id, pendingRequest.householdId))
      .limit(1)

    return Response.json({ status: 'pending', householdName: household?.name ?? '' })
  }

  return Response.json({ status: 'not_found' })
}
