import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { householdMembers } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { isHouseholdPremium } from '@/lib/auth/helpers'

/**
 * Multi-household gate — the single source of truth for whether a user may
 * belong to more than one household.
 *
 * Semantics: a user may have multiple households if ANY of their non-deleted
 * memberships belongs to a PREMIUM household. This is evaluated deterministically
 * across every membership (not a single arbitrary row), so a user in one free plus
 * one premium household always gets a consistent answer.
 *
 * Premium is determined via the shared, expiry-aware isHouseholdPremium helper
 * (subscription_status = 'premium' AND premium_expires_at is null or in the future),
 * so an expired premium household never wrongly grants the multi-household right.
 *
 * Returns the 403 payload when the user already has a household and none of them
 * are premium, otherwise null (first household, or at least one premium household).
 */
export async function checkMultiHouseholdLimit(userId: string): Promise<Response | null> {
  const memberships = await db
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.userId, userId),
        isNull(householdMembers.deletedAt),
      ),
    )

  // First household is always allowed regardless of tier.
  if (memberships.length === 0) return null

  const premiumChecks = await Promise.all(
    memberships.map((m) => isHouseholdPremium(m.householdId)),
  )
  const hasPremiumHousehold = premiumChecks.some(Boolean)

  if (!hasPremiumHousehold) {
    return NextResponse.json(
      { error: 'Multiple households require a premium subscription', code: 'MULTIPLE_HOUSEHOLDS_PREMIUM' },
      { status: 403 },
    )
  }
  return null
}
