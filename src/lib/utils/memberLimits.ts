import { db } from '@/lib/db'
import { householdMembers } from '@/db/schema'
import { and, eq, isNull, ne } from 'drizzle-orm'
import { PLAN_LIMITS } from '@/lib/constants/planLimits'
import { isHouseholdPremium } from '@/lib/auth/helpers'

/**
 * The 403 payload shape returned when a free household is at its member cap.
 * Matches the shared limit-error convention: { error, code, limit, current }.
 */
export interface MemberLimitError {
  error: string
  code: 'MEMBERS_LIMIT'
  limit: number
  current: number
}

/**
 * Free-tier member cap check — the single source of truth for the 5-member limit.
 *
 * Counts NON-CHILD members only. Children have their own separate `children`
 * limit (see PLAN_LIMITS), so counting them here would double-limit. Every join
 * path (invite code, approval, child-account upgrade) must call this so the cap
 * can't be bypassed on any one route.
 *
 * Returns the 403 payload when the household is free and already at the cap,
 * otherwise null (premium households are always allowed).
 */
export async function checkMemberLimit(householdId: string): Promise<MemberLimitError | null> {
  if (await isHouseholdPremium(householdId)) return null

  const rows = await db
    .select({ id: householdMembers.id })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, householdId),
        isNull(householdMembers.deletedAt),
        ne(householdMembers.role, 'child'),
      ),
    )

  const limit = PLAN_LIMITS.free.members
  const current = rows.length
  if (current >= limit) {
    return {
      error: 'Your household is full. Upgrade to premium or remove a member to free a spot.',
      code: 'MEMBERS_LIMIT',
      limit,
      current,
    }
  }
  return null
}
