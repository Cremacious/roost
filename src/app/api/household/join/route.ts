import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { households, householdMembers, memberPermissions, user } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

async function checkMultiHouseholdLimit(userId: string): Promise<Response | null> {
  const existingMemberships = await db
    .select({ id: householdMembers.id })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.userId, userId),
        isNull(householdMembers.deletedAt),
      )
    )

  if (existingMemberships.length >= 1) {
    const currentMembership = await db
      .select({ subscriptionStatus: households.subscription_status })
      .from(householdMembers)
      .innerJoin(households, eq(householdMembers.householdId, households.id))
      .where(
        and(
          eq(householdMembers.userId, userId),
          isNull(householdMembers.deletedAt),
        )
      )
      .limit(1)
      .then(r => r[0])

    if (!currentMembership || currentMembership.subscriptionStatus !== 'premium') {
      return NextResponse.json(
        { error: 'Multiple households require a premium subscription', code: 'MULTIPLE_HOUSEHOLDS_PREMIUM' },
        { status: 403 }
      )
    }
  }
  return null
}

export async function POST(request: Request) {
  const session = await requireSession()
  const body = await request.json().catch(() => ({}))
  const { code } = body

  if (!code?.trim()) {
    return NextResponse.json({ error: 'Invite code is required' }, { status: 400 })
  }

  const household = await db
    .select()
    .from(households)
    .where(and(eq(households.code, code.toUpperCase().trim()), isNull(households.deleted_at)))
    .limit(1)
    .then(r => r[0])

  if (!household) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  }

  // Check not already a member
  const existing = await db
    .select({ id: householdMembers.id })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, household.id),
        eq(householdMembers.userId, session.user.id),
        isNull(householdMembers.deletedAt),
      )
    )
    .limit(1)

  if (existing.length > 0) {
    return NextResponse.json({ error: 'Already a member of this household' }, { status: 409 })
  }

  // Free-tier: max 1 household
  const limitError = await checkMultiHouseholdLimit(session.user.id)
  if (limitError) return limitError

  await db.insert(householdMembers).values({
    householdId: household.id,
    userId: session.user.id,
    role: 'member',
  })

  await db.insert(memberPermissions).values({
    householdId: household.id,
    userId: session.user.id,
  })

  // Mark onboarding complete in better-auth user table
  await db.update(user)
    .set({ onboardingCompleted: true, updatedAt: new Date() })
    .where(eq(user.id, session.user.id))

  return NextResponse.json({ householdId: household.id, name: household.name })
}
