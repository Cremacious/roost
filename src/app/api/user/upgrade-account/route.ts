import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { user as authUser, account, users, households, householdMembers, memberPermissions } from '@/db/schema'
import { and, eq, isNull, ne } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'

// Free households allow at most this many non-child members (mirrors
// packages/constants/src/limits.ts FREE_TIER_LIMITS.members). The app does not
// import that workspace package today, so the value is duplicated here.
const FREE_MEMBER_LIMIT = 5

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Standard member permission defaults (mirror src/db/schema/members.ts).
const MEMBER_PERMS = {
  expensesView: true,
  expensesAdd: true,
  choresAdd: false,
  choresEdit: false,
  groceryAdd: true,
  groceryCreateList: false,
  calendarAdd: true,
  calendarEdit: false,
  tasksAdd: true,
  notesAdd: true,
  mealsPlan: true,
  mealsSuggest: true,
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  const body = await request.json().catch(() => ({})) as { email?: string; password?: string }
  const email = body.email?.trim().toLowerCase()
  const password = body.password

  if (!email || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Enter a valid email address' }, { status: 400 })
  }
  if (!password || password.length < 8 || !/[A-Z]/.test(password) || !/[0-9]/.test(password)) {
    return NextResponse.json(
      { error: 'Password must be 8+ characters with an uppercase letter and a number' },
      { status: 400 },
    )
  }

  // Caller must be a child account.
  const [appUser] = await db
    .select({ isChildAccount: users.isChildAccount })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  if (!appUser?.isChildAccount) {
    return NextResponse.json({ error: 'This account cannot be upgraded' }, { status: 400 })
  }

  // Membership must exist and have upgrade enabled by an admin.
  const [membership] = await db
    .select({
      id: householdMembers.id,
      householdId: householdMembers.householdId,
      upgradeAllowed: householdMembers.upgradeAllowed,
    })
    .from(householdMembers)
    .where(and(eq(householdMembers.userId, userId), isNull(householdMembers.deletedAt)))
    .limit(1)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })
  if (!membership.upgradeAllowed) {
    return NextResponse.json({ error: 'Upgrade is not enabled. Ask an admin to allow it.' }, { status: 403 })
  }

  // Email must be unique across all users.
  const [emailTaken] = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(and(eq(authUser.email, email), ne(authUser.id, userId)))
    .limit(1)
  if (emailTaken) {
    return NextResponse.json({ error: 'That email is already in use' }, { status: 409 })
  }

  // Free-tier member limit: count current non-child members in the household.
  const nonChildMembers = await db
    .select({ role: householdMembers.role })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, membership.householdId),
        isNull(householdMembers.deletedAt),
        ne(householdMembers.role, 'child'),
      )
    )
  const [hh] = await db
    .select({ status: households.subscription_status })
    .from(households)
    .where(eq(households.id, membership.householdId))
    .limit(1)
  const isFree = hh?.status !== 'premium'
  if (isFree && nonChildMembers.length >= FREE_MEMBER_LIMIT) {
    return NextResponse.json(
      { error: 'Your household is full. Upgrade to premium or remove a member to free a spot.', code: 'MEMBERS_LIMIT' },
      { status: 403 },
    )
  }

  // --- Conversion (validated above; sequential writes, Neon HTTP has no interactive tx) ---
  const now = new Date()
  const hashed = await hashPassword(password)

  // 1. Real email + verified, on both auth user and app users.
  await db.update(authUser).set({ email, emailVerified: true, updatedAt: now }).where(eq(authUser.id, userId))
  await db.update(users).set({ email, isChildAccount: false, childOfHouseholdId: null, updatedAt: now }).where(eq(users.id, userId))

  // 2. Credential account (only if one does not already exist).
  const [existingCred] = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, userId), eq(account.providerId, 'credential')))
    .limit(1)
  if (!existingCred) {
    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: userId,
      providerId: 'credential',
      userId,
      password: hashed,
      createdAt: now,
      updatedAt: now,
    })
  } else {
    await db.update(account).set({ password: hashed, updatedAt: now }).where(eq(account.id, existingCred.id))
  }

  // 3. Membership: become a member, drop PIN, clear the flag.
  await db
    .update(householdMembers)
    .set({ role: 'member', pin: null, upgradeAllowed: false })
    .where(eq(householdMembers.id, membership.id))

  // 4. Reset permissions to member defaults.
  const [perms] = await db
    .select({ id: memberPermissions.id })
    .from(memberPermissions)
    .where(and(eq(memberPermissions.userId, userId), eq(memberPermissions.householdId, membership.householdId)))
    .limit(1)
  if (perms) {
    await db.update(memberPermissions).set({ ...MEMBER_PERMS, updatedAt: now }).where(eq(memberPermissions.id, perms.id))
  } else {
    await db.insert(memberPermissions).values({ householdId: membership.householdId, userId, ...MEMBER_PERMS })
  }

  return NextResponse.json({ ok: true, email })
}
