import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { joinRequests, householdMembers, memberPermissions, user, households } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { logActivity } from '@/lib/utils/activity'

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
    .select()
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

  // Check free-tier member limit (5 members max)
  const memberCount = await db
    .select({ id: householdMembers.id })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, req.householdId),
        isNull(householdMembers.deletedAt),
      )
    )

  const [hh] = await db
    .select({ subscription_status: households.subscription_status })
    .from(households)
    .where(eq(households.id, req.householdId))
    .limit(1)

  if (hh?.subscription_status !== 'premium' && memberCount.length >= 5) {
    return Response.json(
      { error: 'Member limit reached for free tier', code: 'MEMBERS_LIMIT' },
      { status: 403 }
    )
  }

  await db.insert(householdMembers).values({
    householdId: req.householdId,
    userId: req.userId,
    role: 'member',
  })

  await db.insert(memberPermissions).values({
    householdId: req.householdId,
    userId: req.userId,
  })

  await db.update(user)
    .set({ onboardingCompleted: true, updatedAt: new Date() })
    .where(eq(user.id, req.userId))

  await db.delete(joinRequests).where(eq(joinRequests.id, id))

  await logActivity({
    householdId: req.householdId,
    userId: req.userId,
    type: 'member_joined',
    entityType: 'member',
    entityId: req.userId,
    description: 'joined the household',
  })

  return Response.json({ success: true })
}
