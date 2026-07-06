import { type NextRequest } from 'next/server'
import { requireSession, getUserHousehold, isHouseholdPremium } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { user as authUser } from '@/db/schema/auth'
import { users, householdMembers, memberPermissions } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'

export async function POST(_request: NextRequest): Promise<Response> {
  const session = await requireSession()
  const householdData = await getUserHousehold(session.user.id)

  if (!householdData) {
    return Response.json({ error: 'No household found' }, { status: 403 })
  }
  if (householdData.role !== 'admin') {
    return Response.json({ error: 'Admin only' }, { status: 403 })
  }

  const { householdId } = householdData

  const body = await _request.json()
  const { name, pin } = body

  if (!name || typeof name !== 'string' || name.trim().length === 0) {
    return Response.json({ error: 'Name is required' }, { status: 400 })
  }
  if (!pin || !/^\d{4}$/.test(pin)) {
    return Response.json({ error: 'PIN must be exactly 4 digits' }, { status: 400 })
  }

  // Free tier: max 1 child (expiry-aware premium check)
  if (!(await isHouseholdPremium(householdId))) {
    const existingChildren = await db
      .select({ id: householdMembers.id })
      .from(householdMembers)
      .where(
        and(
          eq(householdMembers.householdId, householdId),
          eq(householdMembers.role, 'child'),
          isNull(householdMembers.deletedAt),
        )
      )

    if (existingChildren.length >= 1) {
      return Response.json(
        { error: 'Free plan includes 1 child account. Upgrade for more.', code: 'CHILDREN_LIMIT' },
        { status: 403 }
      )
    }
  }

  const childId = crypto.randomUUID()
  const hashedPin = await hashPassword(pin)
  const now = new Date()
  const placeholderEmail = `child_${childId}@roost.internal`

  // 1. Insert into better-auth user table FIRST (FK constraint)
  await db.insert(authUser).values({
    id: childId,
    name: name.trim(),
    email: placeholderEmail,
    emailVerified: true,
    onboardingCompleted: true,
    createdAt: now,
    updatedAt: now,
  })

  // 2. Insert into app users table
  await db.insert(users).values({
    id: childId,
    name: name.trim(),
    email: placeholderEmail,
    isChildAccount: true,
    childOfHouseholdId: householdId,
  })

  // 3. Insert household member with hashed PIN
  await db.insert(householdMembers).values({
    householdId,
    userId: childId,
    role: 'child',
    pin: hashedPin,
  })

  // 4. Insert child-safe permissions (no finance access)
  await db.insert(memberPermissions).values({
    householdId,
    userId: childId,
    expensesView: false,
    expensesAdd: false,
    choresAdd: false,
    choresEdit: false,
    groceryAdd: true,
    groceryCreateList: false,
    calendarAdd: false,
    calendarEdit: false,
    tasksAdd: false,
    notesAdd: false,
    mealsPlan: false,
    mealsSuggest: true,
  })

  return Response.json({
    child: { id: childId, name: name.trim() },
    pin,
  })
}
