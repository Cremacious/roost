import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { households, householdMembers, user } from '@/db/schema'
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

function generateInviteCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

export async function POST(request: Request) {
  const session = await requireSession()
  const body = await request.json().catch(() => ({}))
  const { name } = body

  if (!name?.trim()) {
    return NextResponse.json({ error: 'Household name is required' }, { status: 400 })
  }

  // Ensure unique invite code
  let inviteCode = generateInviteCode()
  let existing = await db
    .select({ id: households.id })
    .from(households)
    .where(eq(households.code, inviteCode))
    .limit(1)
  while (existing.length > 0) {
    inviteCode = generateInviteCode()
    existing = await db
      .select({ id: households.id })
      .from(households)
      .where(eq(households.code, inviteCode))
      .limit(1)
  }

  // Free-tier: max 1 household
  const limitError = await checkMultiHouseholdLimit(session.user.id)
  if (limitError) return limitError

  const householdId = crypto.randomUUID()

  await db.insert(households).values({
    id: householdId,
    name: name.trim(),
    code: inviteCode,
  })

  await db.insert(householdMembers).values({
    householdId,
    userId: session.user.id,
    role: 'admin',
  })

  // Mark onboarding complete in better-auth user table
  await db.update(user)
    .set({ onboardingCompleted: true, updatedAt: new Date() })
    .where(eq(user.id, session.user.id))

  return NextResponse.json({ householdId, code: inviteCode, name: name.trim() })
}
