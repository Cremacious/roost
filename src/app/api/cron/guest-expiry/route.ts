import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { householdMembers, memberPermissions } from '@/db/schema'
import { eq, and, isNull, lte, isNotNull } from 'drizzle-orm'
import { logActivity } from '@/lib/utils/activity'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Find expired guest members
  const expired = await db
    .select()
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.role, 'guest'),
        isNotNull(householdMembers.expiresAt),
        lte(householdMembers.expiresAt, now),
        isNull(householdMembers.deletedAt)
      )
    )

  let removed = 0

  for (const member of expired) {
    try {
      // Hard-delete their permissions first (FK)
      await db
        .delete(memberPermissions)
        .where(
          and(
            eq(memberPermissions.householdId, member.householdId),
            eq(memberPermissions.userId, member.userId)
          )
        )

      // Soft-delete the membership
      await db
        .update(householdMembers)
        .set({ deletedAt: now })
        .where(eq(householdMembers.id, member.id))

      // Log the expiry
      await logActivity({
        householdId: member.householdId,
        userId: member.userId,
        type: 'guest_expired',
        entityId: member.id,
        entityType: 'member',
        description: 'Guest membership expired',
      })

      removed++
    } catch (err) {
      console.error(`Failed to expire guest member ${member.id}:`, err)
    }
  }

  return NextResponse.json({ ok: true, removed })
}
