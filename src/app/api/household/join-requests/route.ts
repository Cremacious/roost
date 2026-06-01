import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { joinRequests, householdMembers, users } from '@/db/schema'
import { and, eq, isNull, desc } from 'drizzle-orm'

export async function GET(request: NextRequest): Promise<Response> {
  const session = await requireSession()

  const [membership] = await db
    .select({
      householdId: householdMembers.householdId,
      role: householdMembers.role,
    })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.userId, session.user.id),
        isNull(householdMembers.deletedAt),
      )
    )
    .limit(1)

  if (!membership) {
    return Response.json({ error: 'No household found' }, { status: 404 })
  }

  if (membership.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const requests = await db
    .select({
      id: joinRequests.id,
      type: joinRequests.type,
      createdAt: joinRequests.createdAt,
      userId: joinRequests.userId,
      name: users.name,
      avatarColor: users.avatarColor,
    })
    .from(joinRequests)
    .innerJoin(users, eq(joinRequests.userId, users.id))
    .where(eq(joinRequests.householdId, membership.householdId))
    .orderBy(desc(joinRequests.createdAt))

  return Response.json({ requests })
}
