import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { households, householdMembers, user } from '@/db/schema'
import { eq } from 'drizzle-orm'

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
    .where(eq(households.inviteCode, inviteCode))
    .limit(1)
  while (existing.length > 0) {
    inviteCode = generateInviteCode()
    existing = await db
      .select({ id: households.id })
      .from(households)
      .where(eq(households.inviteCode, inviteCode))
      .limit(1)
  }

  const householdId = crypto.randomUUID()

  await db.insert(households).values({
    id: householdId,
    name: name.trim(),
    inviteCode,
    adminId: session.user.id,
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

  return NextResponse.json({ householdId, inviteCode, name: name.trim() })
}
