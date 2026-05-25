/**
 * Idempotent test-account seeder.
 *
 * Run with: npm run db:seed
 * (which runs: npx tsx --env-file=.env.local src/db/seed.ts)
 *
 * Creates a known set of fake accounts for local testing and E2E. Safe to run
 * repeatedly: every step checks for an existing row before inserting.
 *
 * Accounts (all standard passwords: RoostTest123!):
 *   admin.free@roost.test     admin of "Roost Free House"     (free)
 *   admin.premium@roost.test  admin of "Roost Premium House"  (premium)
 *   member@roost.test         member of "Roost Free House"
 *   Test Child                child of "Roost Free House", PIN 1234 (PIN login)
 *
 * The child is PIN-only (household code + PIN), matching real child accounts:
 * better-auth user with a placeholder email, no credential row, finance off.
 */
import { and, eq } from 'drizzle-orm'
import { hashPassword } from 'better-auth/crypto'
import { db } from '../lib/db'
import {
  user as authUser,
  account,
  users,
  households,
  householdMembers,
  memberPermissions,
} from './schema'

const PASSWORD = 'RoostTest123!'
const CHILD_PIN = '1234'

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

// Child-safe permissions (mirror the add-child route: no finance access).
const CHILD_PERMS = {
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
}

async function ensureHousehold(
  code: string,
  name: string,
  subscriptionStatus: 'free' | 'premium',
  createdBy: string,
): Promise<string> {
  const existing = await db
    .select({ id: households.id })
    .from(households)
    .where(eq(households.code, code))
    .limit(1)
    .then((r) => r[0])
  if (existing) {
    await db
      .update(households)
      .set({ subscription_status: subscriptionStatus, created_by: createdBy })
      .where(eq(households.id, existing.id))
    return existing.id
  }
  const id = crypto.randomUUID()
  await db.insert(households).values({
    id,
    code,
    name,
    subscription_status: subscriptionStatus,
    premium_expires_at: null,
    created_by: createdBy,
  })
  return id
}

/** Create (or reuse) an email/password account: auth user + app users + credential. */
async function ensureCredentialUser(email: string, name: string): Promise<string> {
  const now = new Date()
  let id = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, email))
    .limit(1)
    .then((r) => r[0]?.id)

  if (!id) {
    id = crypto.randomUUID()
    await db.insert(authUser).values({
      id,
      name,
      email,
      emailVerified: true,
      onboardingCompleted: true,
      createdAt: now,
      updatedAt: now,
    })
  }

  await db.insert(users).values({ id, name, email }).onConflictDoNothing()

  const hasCred = await db
    .select({ id: account.id })
    .from(account)
    .where(and(eq(account.userId, id), eq(account.providerId, 'credential')))
    .limit(1)
    .then((r) => r[0])
  if (!hasCred) {
    await db.insert(account).values({
      id: crypto.randomUUID(),
      accountId: id,
      providerId: 'credential',
      userId: id,
      password: await hashPassword(PASSWORD),
      createdAt: now,
      updatedAt: now,
    })
  }
  return id
}

/** Create (or reuse) a PIN-only child account: auth user (placeholder email) + app users + member. */
async function ensureChildUser(name: string, householdId: string): Promise<string> {
  const now = new Date()
  const existingMember = await db
    .select({ userId: householdMembers.userId })
    .from(householdMembers)
    .innerJoin(users, eq(householdMembers.userId, users.id))
    .where(
      and(
        eq(householdMembers.householdId, householdId),
        eq(householdMembers.role, 'child'),
        eq(users.name, name),
      ),
    )
    .limit(1)
    .then((r) => r[0])
  if (existingMember) return existingMember.userId

  const id = crypto.randomUUID()
  const placeholderEmail = `child_${id}@roost.internal`
  await db.insert(authUser).values({
    id,
    name,
    email: placeholderEmail,
    emailVerified: true,
    onboardingCompleted: true,
    createdAt: now,
    updatedAt: now,
  })
  await db.insert(users).values({
    id,
    name,
    email: placeholderEmail,
    isChildAccount: true,
    childOfHouseholdId: householdId,
  })
  await db.insert(householdMembers).values({
    householdId,
    userId: id,
    role: 'child',
    pin: await hashPassword(CHILD_PIN),
  })
  await db.insert(memberPermissions).values({ householdId, userId: id, ...CHILD_PERMS })
  return id
}

async function ensureMembership(
  householdId: string,
  userId: string,
  role: 'admin' | 'member',
): Promise<void> {
  const existing = await db
    .select({ id: householdMembers.id })
    .from(householdMembers)
    .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, userId)))
    .limit(1)
    .then((r) => r[0])
  if (!existing) {
    await db.insert(householdMembers).values({ householdId, userId, role })
  }

  const hasPerms = await db
    .select({ id: memberPermissions.id })
    .from(memberPermissions)
    .where(and(eq(memberPermissions.householdId, householdId), eq(memberPermissions.userId, userId)))
    .limit(1)
    .then((r) => r[0])
  if (!hasPerms) {
    await db.insert(memberPermissions).values({ householdId, userId, ...MEMBER_PERMS })
  }

  // Make sure the user's active household points at this one.
  await db.update(users).set({ activeHouseholdId: householdId }).where(eq(users.id, userId))
}

async function main() {
  console.log('Seeding test accounts...')

  const freeAdminId = await ensureCredentialUser('admin.free@roost.test', 'Free Admin')
  const premiumAdminId = await ensureCredentialUser('admin.premium@roost.test', 'Premium Admin')
  const memberId = await ensureCredentialUser('member@roost.test', 'Test Member')

  const freeHouseId = await ensureHousehold('FREEHS', 'Roost Free House', 'free', freeAdminId)
  const premiumHouseId = await ensureHousehold('PREMHS', 'Roost Premium House', 'premium', premiumAdminId)

  await ensureMembership(freeHouseId, freeAdminId, 'admin')
  await ensureMembership(premiumHouseId, premiumAdminId, 'admin')
  await ensureMembership(freeHouseId, memberId, 'member')

  const childId = await ensureChildUser('Test Child', freeHouseId)

  console.log('Done. Test accounts ready:')
  console.log(`  admin.free@roost.test     / ${PASSWORD}   (admin, Roost Free House, code FREEHS)`)
  console.log(`  admin.premium@roost.test  / ${PASSWORD}   (admin, Roost Premium House, code PREMHS)`)
  console.log(`  member@roost.test         / ${PASSWORD}   (member, Roost Free House)`)
  console.log(`  Test Child                / PIN ${CHILD_PIN}        (child, Roost Free House, code FREEHS)`)
  console.log(`  child user id: ${childId}`)
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
