import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { joinRequests, householdMembers, memberPermissions, user } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { logActivity } from '@/lib/utils/activity'
import { checkMemberLimit } from '@/lib/utils/memberLimits'

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

  // Free-tier member cap (shared helper: counts non-child members, premium-aware).
  const memberLimitError = await checkMemberLimit(req.householdId)
  if (memberLimitError) return Response.json(memberLimitError, { status: 403 })

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
