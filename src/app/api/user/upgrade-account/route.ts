import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { user as authUser, account, users, householdMembers, memberPermissions } from '@/db/schema'
import { and, eq, isNull, ne } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'
import { checkMemberLimit } from '@/lib/utils/memberLimits'

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

  // Membership must exist and have upgrade enabled by an admin. `upgradeAllowed`
  // is the single source of truth and is retry-safe: the allow-upgrade endpoint
  // only ever sets it on child members, so it both guarantees child-only access
  // and lets a partially-completed conversion be retried (it is cleared last).
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

  // Free-tier member cap. The upgrading child is still role 'child' at this point,
  // so the shared helper (which counts non-child members) blocks the conversion
  // only when the household's member seats are already full.
  const memberLimitError = await checkMemberLimit(membership.householdId)
  if (memberLimitError) return NextResponse.json(memberLimitError, { status: 403 })

  // --- Conversion (no interactive tx on Neon HTTP). Every write below is
  // idempotent and safe to re-run; `upgradeAllowed` is cleared LAST as the single
  // commit point, so any partial failure can be retried (the guard above still
  // passes until that final write lands). ---
  const now = new Date()
  const hashed = await hashPassword(password)

  // 1. Real email + verified on the better-auth user, and convert the app user.
  await db.update(authUser).set({ email, emailVerified: true, updatedAt: now }).where(eq(authUser.id, userId))
  await db.update(users).set({ email, isChildAccount: false, childOfHouseholdId: null, updatedAt: now }).where(eq(users.id, userId))

  // 2. Credential account (insert if missing, else update the password).
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

  // 3. Membership becomes a standard member and drops the PIN. upgradeAllowed is
  //    intentionally left set here; it is cleared last (step 5) as the commit point.
  await db
    .update(householdMembers)
    .set({ role: 'member', pin: null })
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

  // 5. Commit point: clear the upgrade flag last. Until this lands the whole
  //    operation is retryable.
  await db.update(householdMembers).set({ upgradeAllowed: false }).where(eq(householdMembers.id, membership.id))

  return NextResponse.json({ ok: true, email })
}
