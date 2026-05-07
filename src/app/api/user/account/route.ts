import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { users, householdMembers, user as authUser } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export async function DELETE() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  // Find all households where this user is the sole admin
  const memberships = await db
    .select({ householdId: householdMembers.householdId, role: householdMembers.role })
    .from(householdMembers)
    .where(and(eq(householdMembers.userId, userId), isNull(householdMembers.deletedAt)))

  for (const m of memberships) {
    if (m.role !== 'admin') continue

    // Count other admins in this household
    const otherAdmins = await db
      .select({ userId: householdMembers.userId })
      .from(householdMembers)
      .where(
        and(
          eq(householdMembers.householdId, m.householdId),
          eq(householdMembers.role, 'admin'),
          isNull(householdMembers.deletedAt),
        )
      )

    const isOnlyAdmin = otherAdmins.every(a => a.userId === userId)
    if (isOnlyAdmin) {
      const otherMembers = await db
        .select({ userId: householdMembers.userId })
        .from(householdMembers)
        .where(
          and(
            eq(householdMembers.householdId, m.householdId),
            isNull(householdMembers.deletedAt),
          )
        )

      const hasOtherMembers = otherMembers.some(m2 => m2.userId !== userId)
      if (hasOtherMembers) {
        return NextResponse.json(
          {
            error:
              'You are the sole admin of a household with other members. Transfer admin or delete the household before deleting your account.',
          },
          { status: 400 }
        )
      }
    }
  }

  // Soft-delete membership rows
  await db
    .update(householdMembers)
    .set({ deletedAt: new Date() })
    .where(and(eq(householdMembers.userId, userId), isNull(householdMembers.deletedAt)))

  // Soft-delete app user row
  await db.update(users).set({ deletedAt: new Date() }).where(eq(users.id, userId))

  // Hard-delete better-auth user (cascades sessions, accounts)
  await db.delete(authUser).where(eq(authUser.id, userId))

  return NextResponse.json({ ok: true })
}
