import { headers } from 'next/headers'
import { redirect } from 'next/navigation'
import { auth } from './index'
import { db } from '@/lib/db'
import { householdMembers, households } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export async function requireSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  })
  if (!session) redirect('/login')
  return session
}

export async function getSession() {
  return auth.api.getSession({ headers: await headers() })
}

export async function getUserHousehold(userId: string) {
  const row = await db
    .select({
      householdId: householdMembers.householdId,
      role: householdMembers.role,
      household: {
        name: households.name,
        subscriptionStatus: households.subscriptionStatus,
      },
    })
    .from(householdMembers)
    .innerJoin(households, eq(householdMembers.householdId, households.id))
    .where(
      and(
        eq(householdMembers.userId, userId),
        isNull(householdMembers.deletedAt),
        isNull(households.deletedAt),
      )
    )
    .orderBy(householdMembers.createdAt)
    .limit(1)
    .then(r => r[0] ?? null)

  return row
}
