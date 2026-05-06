import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { households, householdMembers, user } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

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

  await db.insert(householdMembers).values({
    householdId: household.id,
    userId: session.user.id,
    role: 'member',
  })

  // Mark onboarding complete in better-auth user table
  await db.update(user)
    .set({ onboardingCompleted: true, updatedAt: new Date() })
    .where(eq(user.id, session.user.id))

  return NextResponse.json({ householdId: household.id, name: household.name })
}
