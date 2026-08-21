import { NextRequest, NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { households, householdMembers, users } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export async function GET(request: NextRequest): Promise<Response> {
  await requireSession()

  const code = request.nextUrl.searchParams.get('code')?.trim().toUpperCase()
  if (!code) {
    return NextResponse.json({ error: 'Code is required' }, { status: 400 })
  }

  const household = await db
    .select({ id: households.id, name: households.name })
    .from(households)
    .where(and(eq(households.code, code), isNull(households.deleted_at)))
    .limit(1)
    .then(rows => rows[0])

  if (!household) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  }

  const members = await db
    .select({ role: householdMembers.role, name: users.name })
    .from(householdMembers)
    .innerJoin(users, eq(householdMembers.userId, users.id))
    .where(
      and(
        eq(householdMembers.householdId, household.id),
        isNull(householdMembers.deletedAt),
      )
    )

  const admin = members.find(m => m.role === 'admin')

  return NextResponse.json({
    name: household.name,
    memberCount: members.length,
    adminName: admin?.name ?? 'Unknown',
  })
}
