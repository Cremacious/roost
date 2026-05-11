import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from './index'
import { db } from '@/lib/db'
import { householdMembers, households, users } from '@/db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
import type { NextRequest } from 'next/server'

/**
 * Server-side premium gate.
 *
 * Throws a 403 Response if the household is not premium.
 * Performs lazy cleanup: if premium_expires_at is in the past, reverts the
 * household to free before throwing. This is the single source of truth for
 * premium checks — every premium-only API route should call this.
 *
 * Rules (from CLAUDE.md):
 * - subscription_status = 'premium' AND premium_expires_at IS NULL  → permanent premium (Stripe active or lifetime promo)
 * - subscription_status = 'premium' AND premium_expires_at > now()   → time-limited promo, still valid
 * - subscription_status = 'premium' AND premium_expires_at <= now()  → expired, lazy-revert to free
 * - subscription_status = 'free'                                      → not premium
 */
export async function requirePremium(householdId: string): Promise<void> {
  const [row] = await db
    .select({
      status: households.subscription_status,
      expiresAt: households.premium_expires_at,
    })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1)

  if (!row) {
    throw Response.json({ error: 'Household not found' }, { status: 404 })
  }

  const now = new Date()
  const isExpired =
    row.status === 'premium' &&
    row.expiresAt !== null &&
    row.expiresAt <= now

  if (isExpired) {
    // Lazy cleanup: Stripe/cron may not have fired yet — revert here.
    await db
      .update(households)
      .set({ subscription_status: 'free', premium_expires_at: null })
      .where(eq(households.id, householdId))
    throw Response.json({ error: 'Premium required', code: 'PREMIUM_REQUIRED' }, { status: 403 })
  }

  const isPremium =
    row.status === 'premium' &&
    (row.expiresAt === null || row.expiresAt > now)

  if (!isPremium) {
    throw Response.json({ error: 'Premium required', code: 'PREMIUM_REQUIRED' }, { status: 403 })
  }
}

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

export async function requireSession() {
  const session = await getSession()
  if (!session) redirect('/login')
  return session
}

export async function getUserHousehold(userId: string) {
  // 1. Read the user's active_household_id preference
  const [userRow] = await db
    .select({ activeHouseholdId: users.activeHouseholdId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const activeHouseholdId = userRow?.activeHouseholdId ?? null

  const selectFields = {
    householdId: householdMembers.householdId,
    role: householdMembers.role,
    household: {
      name: households.name,
      subscriptionStatus: households.subscription_status,
    },
  }

  // 2. If set, try to load that specific household membership
  if (activeHouseholdId) {
    const row = await db
      .select(selectFields)
      .from(householdMembers)
      .innerJoin(households, eq(householdMembers.householdId, households.id))
      .where(
        and(
          eq(householdMembers.userId, userId),
          eq(householdMembers.householdId, activeHouseholdId),
          isNull(householdMembers.deletedAt),
          isNull(households.deleted_at),
        )
      )
      .limit(1)
      .then(r => r[0] ?? null)

    if (row) return row
    // Membership no longer valid — fall through to most-recent
  }

  // 3. Fall back to most recently joined household
  return db
    .select(selectFields)
    .from(householdMembers)
    .innerJoin(households, eq(householdMembers.householdId, households.id))
    .where(
      and(
        eq(householdMembers.userId, userId),
        isNull(householdMembers.deletedAt),
        isNull(households.deleted_at),
      )
    )
    .orderBy(desc(householdMembers.createdAt))
    .limit(1)
    .then(r => r[0] ?? null)
}

export async function requireHouseholdAdmin(
  _request: NextRequest,
  householdId: string,
): Promise<{ userId: string }> {
  const session = await getSession()
  if (!session) {
    throw Response.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = session.user.id
  const [membership] = await db
    .select({ role: householdMembers.role })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.userId, userId),
        eq(householdMembers.householdId, householdId),
        isNull(householdMembers.deletedAt),
      )
    )
    .limit(1)

  if (!membership) {
    throw Response.json({ error: 'Not a member' }, { status: 403 })
  }
  if (membership.role !== 'admin') {
    throw Response.json({ error: 'Admin only' }, { status: 403 })
  }
  return { userId }
}
