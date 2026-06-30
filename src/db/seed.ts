/**
 * Idempotent QA test-account + data seeder.
 *
 * Run with: npm run db:seed
 * (which runs: npx tsx --env-file=.env.local src/db/seed.ts)
 *
 * Creates a known set of fake accounts AND rich cross-feature data so the
 * GitHub QA checklists (issues #24-#43, #62, plus functional bugs #53-#60) can
 * be exercised by hand without first building everything through the UI.
 *
 * Safe to run repeatedly: account/household steps check for an existing row
 * before inserting; each content block only seeds when that table is empty for
 * the household, so re-running never duplicates rows.
 *
 * ── Accounts (all email/password accounts use password: RoostTest123!) ──
 *
 *   ROOST PREMIUM HOUSE  (code PREMHS, premium)  ← main QA playground
 *     admin.premium@roost.test   Premium Admin   admin
 *     jordan@roost.test          Jordan Lee      member
 *     taylor@roost.test          Taylor Kim      member
 *     riley.guest@roost.test     Riley Guest     guest (expires in 14 days)
 *     Premium Kid                child, PIN 5678 (household code + PIN login)
 *
 *   ROOST FREE HOUSE  (code FREEHS, free)  ← free-tier limit testing
 *     admin.free@roost.test      Free Admin      admin
 *     member@roost.test          Test Member     member
 *     Test Child                 child, PIN 1234
 *
 *   ROOST SECOND HOUSE  (code SECND2, premium)  ← multi-household switcher
 *     admin.premium@roost.test   Premium Admin   admin (same user, 2nd household)
 *
 * Promo codes for redemption QA are seeded too (see PROMO_CODES below).
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
  choreCategories,
  chores,
  choreCompletions,
  expenseCategories,
  expenses,
  expenseSplits,
  recurringExpenses,
  expenseBudgets,
  savingsGoals,
  goalContributions,
  calendarEvents,
  eventAttendees,
  groceryLists,
  groceryItems,
  tasks,
  projects,
  taskComments,
  taskDelegations,
  notes,
  reminders,
  reminderReceipts,
  meals,
  mealPlanSlots,
  mealSuggestions,
  mealSuggestionVotes,
  rewardRules,
  rewardPayouts,
  householdActivity,
  promoCodes,
} from './schema'
import { seedCommonItems } from '../lib/utils/seedCommonItems'
import { seedExpenseCategories } from '../lib/utils/seedExpenseCategories'

const PASSWORD = 'RoostTest123!'

// ── date helpers ───────────────────────────────────────────────────────────
const NOW = new Date()
function days(n: number): Date {
  const d = new Date(NOW)
  d.setDate(d.getDate() + n)
  return d
}
function hours(n: number): Date {
  const d = new Date(NOW)
  d.setHours(d.getHours() + n)
  return d
}
function ymd(d: Date): string {
  return d.toISOString().slice(0, 10)
}
/** Monday (YYYY-MM-DD) of the week containing d — matches chore_streaks/week_start. */
function mondayOf(d: Date): string {
  const x = new Date(d)
  const dow = x.getDay() // 0 Sun .. 6 Sat
  x.setDate(x.getDate() + (dow === 0 ? -6 : 1 - dow))
  return ymd(x)
}

// ── permission presets ───────────────────────────────────────────────────────
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

// Guest defaults mirror the invite-accept route (CLAUDE.md household guest rules).
const GUEST_PERMS = {
  expensesView: true,
  expensesAdd: true,
  choresAdd: false,
  choresEdit: false,
  groceryAdd: true,
  groceryCreateList: false,
  calendarAdd: true,
  calendarEdit: false,
  tasksAdd: true,
  notesAdd: false,
  mealsPlan: false,
  mealsSuggest: true,
}

// ── low-level helpers ────────────────────────────────────────────────────────
async function isEmpty(
  table: { householdId: unknown; id: unknown },
  householdId: string,
): Promise<boolean> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const t = table as any
  const rows = await db.select({ id: t.id }).from(t).where(eq(t.householdId, householdId)).limit(1)
  return rows.length === 0
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

/** Create (or reuse) an email/password account, set a distinct avatar color. */
async function ensureCredentialUser(
  email: string,
  name: string,
  avatarColor: string,
): Promise<string> {
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

  await db.insert(users).values({ id, name, email, avatarColor }).onConflictDoNothing()
  await db.update(users).set({ name, avatarColor }).where(eq(users.id, id))

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

/** Create (or reuse) a PIN-only child: auth user (placeholder email) + app users + member + perms. */
async function ensureChildUser(
  name: string,
  householdId: string,
  pin: string,
  avatarColor: string,
): Promise<string> {
  const now = new Date()
  const existing = await db
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
  if (existing) return existing.userId

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
    avatarColor,
    isChildAccount: true,
    childOfHouseholdId: householdId,
    activeHouseholdId: householdId,
  })
  await db.insert(householdMembers).values({
    householdId,
    userId: id,
    role: 'child',
    pin: await hashPassword(pin),
  })
  await db.insert(memberPermissions).values({ householdId, userId: id, ...CHILD_PERMS })
  return id
}

async function ensureMembership(
  householdId: string,
  userId: string,
  role: 'admin' | 'member' | 'guest',
  perms: typeof MEMBER_PERMS,
  expiresAt: Date | null = null,
): Promise<void> {
  const existing = await db
    .select({ id: householdMembers.id })
    .from(householdMembers)
    .where(and(eq(householdMembers.householdId, householdId), eq(householdMembers.userId, userId)))
    .limit(1)
    .then((r) => r[0])
  if (!existing) {
    await db.insert(householdMembers).values({ householdId, userId, role, expiresAt })
  }

  const hasPerms = await db
    .select({ id: memberPermissions.id })
    .from(memberPermissions)
    .where(and(eq(memberPermissions.householdId, householdId), eq(memberPermissions.userId, userId)))
    .limit(1)
    .then((r) => r[0])
  if (!hasPerms) {
    await db.insert(memberPermissions).values({ householdId, userId, ...perms })
  }
}

// ── default category seeders ─────────────────────────────────────────────────
const CHORE_CATEGORY_DEFAULTS = [
  { name: 'Kitchen', icon: 'Utensils' },
  { name: 'Bathroom', icon: 'ShowerHead' },
  { name: 'Bedroom', icon: 'BedDouble' },
  { name: 'Outdoor', icon: 'Trees' },
  { name: 'Laundry', icon: 'Shirt' },
  { name: 'Pet Care', icon: 'PawPrint' },
  { name: 'Errands', icon: 'ShoppingBag' },
  { name: 'Other', icon: 'Home' },
]

async function seedChoreCategories(householdId: string): Promise<Record<string, string>> {
  const existing = await db
    .select({ id: choreCategories.id, name: choreCategories.name })
    .from(choreCategories)
    .where(eq(choreCategories.householdId, householdId))
  const byName: Record<string, string> = {}
  for (const c of existing) byName[c.name] = c.id
  for (const def of CHORE_CATEGORY_DEFAULTS) {
    if (byName[def.name]) continue
    const id = crypto.randomUUID()
    await db.insert(choreCategories).values({
      id,
      householdId,
      name: def.name,
      icon: def.icon,
      isDefault: 'true',
      isCustom: 'false',
      status: 'active',
    })
    byName[def.name] = id
  }
  return byName
}

async function getExpenseCategoryMap(householdId: string): Promise<Record<string, string>> {
  const rows = await db
    .select({ id: expenseCategories.id, name: expenseCategories.name })
    .from(expenseCategories)
    .where(eq(expenseCategories.householdId, householdId))
  const map: Record<string, string> = {}
  for (const r of rows) map[r.name] = r.id
  return map
}

async function logActivity(
  householdId: string,
  userId: string | null,
  type: string,
  description: string,
  createdAt: Date,
  entityType?: string,
): Promise<void> {
  await db.insert(householdActivity).values({
    householdId,
    userId,
    type,
    description,
    entityType: entityType ?? null,
    createdAt,
  })
}

// ── premium-house rich content ───────────────────────────────────────────────
type Members = {
  admin: string
  jordan: string
  taylor: string
  kid: string
}

async function seedPremiumContent(householdId: string, m: Members): Promise<void> {
  const choreCats = await seedChoreCategories(householdId)
  await seedExpenseCategories(householdId)
  await seedCommonItems(householdId)
  const expCats = await getExpenseCategoryMap(householdId)
  const thisWeek = mondayOf(NOW)
  const lastWeek = mondayOf(days(-7))

  // ── Chores (assigned to specific members → exercises #60) ──
  if (await isEmpty(chores, householdId)) {
    const choreRows = [
      { title: 'Take out the trash', assignedTo: m.jordan, frequency: 'daily', cat: 'Kitchen', nextDueAt: days(-1) },
      { title: 'Vacuum living room', assignedTo: m.taylor, frequency: 'weekly', cat: 'Bedroom', nextDueAt: days(0) },
      { title: 'Wash the dishes', assignedTo: m.admin, frequency: 'daily', cat: 'Kitchen', nextDueAt: days(1) },
      { title: 'Mow the lawn', assignedTo: m.jordan, frequency: 'weekly', cat: 'Outdoor', nextDueAt: days(0) },
      { title: 'Clean the bathroom', assignedTo: null, frequency: 'weekly', cat: 'Bathroom', nextDueAt: days(2) },
      { title: 'Feed the dog', assignedTo: m.kid, frequency: 'daily', cat: 'Pet Care', nextDueAt: days(0) },
    ]
    const choreIds: Record<string, string> = {}
    for (const c of choreRows) {
      const id = crypto.randomUUID()
      choreIds[c.title] = id
      await db.insert(chores).values({
        id,
        householdId,
        title: c.title,
        assignedTo: c.assignedTo,
        categoryId: choreCats[c.cat] ?? null,
        frequency: c.frequency as 'daily' | 'weekly',
        nextDueAt: c.nextDueAt,
        createdBy: m.admin,
      })
    }

    // Completions across this + last week → leaderboard, streaks, history, stats.
    const completions: Array<{ chore: string; user: string; at: Date; week: string }> = [
      { chore: 'Take out the trash', user: m.jordan, at: days(-1), week: thisWeek },
      { chore: 'Take out the trash', user: m.jordan, at: days(-2), week: thisWeek },
      { chore: 'Vacuum living room', user: m.taylor, at: days(-3), week: thisWeek },
      { chore: 'Feed the dog', user: m.kid, at: days(-1), week: thisWeek },
      { chore: 'Feed the dog', user: m.kid, at: days(-2), week: thisWeek },
      { chore: 'Feed the dog', user: m.kid, at: days(-8), week: lastWeek },
      { chore: 'Mow the lawn', user: m.jordan, at: days(-9), week: lastWeek },
    ]
    for (const c of completions) {
      await db.insert(choreCompletions).values({
        householdId,
        choreId: choreIds[c.chore],
        userId: c.user,
        completedAt: c.at,
        points: 10,
        weekStart: c.week,
      })
      await logActivity(householdId, c.user, 'chore_completed', `completed "${c.chore}"`, c.at, 'chore')
    }
  }

  // ── Expenses + splits (real unsettled + pending-claim balances → #53/#54/#59) ──
  if (await isEmpty(expenses, householdId)) {
    // E1: Costco run $120 paid by Admin, split 3 ways. Jordan + Taylor owe Admin $40 each.
    const e1 = crypto.randomUUID()
    await db.insert(expenses).values({
      id: e1, householdId, title: 'Costco run', amount: '120.00',
      categoryId: expCats['Groceries'] ?? null, paidBy: m.admin, createdAt: days(-4),
    })
    await db.insert(expenseSplits).values([
      { expenseId: e1, householdId, userId: m.admin, amount: '40.00', settled: true, settledAt: days(-4) },
      { expenseId: e1, householdId, userId: m.jordan, amount: '40.00', settled: false },
      { expenseId: e1, householdId, userId: m.taylor, amount: '40.00', settled: false },
    ])
    await logActivity(householdId, m.admin, 'expense_added', 'added "Costco run" ($120.00)', days(-4), 'expense')

    // E2: Electric bill $90 paid by Jordan, split 3 ways. Admin + Taylor owe Jordan $30 each.
    const e2 = crypto.randomUUID()
    await db.insert(expenses).values({
      id: e2, householdId, title: 'Electric bill', amount: '90.00',
      categoryId: expCats['Utilities'] ?? null, paidBy: m.jordan, createdAt: days(-3),
    })
    await db.insert(expenseSplits).values([
      { expenseId: e2, householdId, userId: m.jordan, amount: '30.00', settled: true, settledAt: days(-3) },
      { expenseId: e2, householdId, userId: m.admin, amount: '30.00', settled: false },
      { expenseId: e2, householdId, userId: m.taylor, amount: '30.00', settled: false },
    ])
    await logActivity(householdId, m.jordan, 'expense_added', 'added "Electric bill" ($90.00)', days(-3), 'expense')

    // E3: Dinner out $54 paid by Taylor. Admin's share is mid-settlement (claimed, awaiting confirm).
    const e3 = crypto.randomUUID()
    await db.insert(expenses).values({
      id: e3, householdId, title: 'Dinner out', amount: '54.00',
      categoryId: expCats['Dining'] ?? null, paidBy: m.taylor, createdAt: days(-2),
    })
    await db.insert(expenseSplits).values([
      { expenseId: e3, householdId, userId: m.taylor, amount: '27.00', settled: true, settledAt: days(-2) },
      { expenseId: e3, householdId, userId: m.admin, amount: '27.00', settled: false, settledByPayer: true },
    ])
    await logActivity(householdId, m.taylor, 'expense_added', 'added "Dinner out" ($54.00)', days(-2), 'expense')
  }

  // ── Budget + savings goal + recurring/bill templates (#33) ──
  if (await isEmpty(expenseBudgets, householdId) && expCats['Groceries']) {
    await db.insert(expenseBudgets).values({
      householdId, categoryId: expCats['Groceries'], amount: '300.00', warningThreshold: 70,
    })
  }
  if (await isEmpty(savingsGoals, householdId)) {
    const goalId = crypto.randomUUID()
    await db.insert(savingsGoals).values({
      id: goalId, householdId, name: 'Summer vacation', targetAmount: '1000.00',
      targetDate: ymd(days(120)), description: 'Beach trip fund', createdBy: m.admin,
    })
    await db.insert(goalContributions).values([
      { goalId, householdId, userId: m.admin, amount: '200.00', note: 'Initial deposit', createdAt: days(-10) },
      { goalId, householdId, userId: m.jordan, amount: '150.00', createdAt: days(-3) },
    ])
  }
  if (await isEmpty(recurringExpenses, householdId)) {
    await db.insert(recurringExpenses).values([
      {
        householdId, title: 'Netflix', categoryId: expCats['Entertainment'] ?? null,
        totalAmount: '15.49', frequency: 'monthly', nextDueDate: days(12), paused: false,
        isBill: false, createdBy: m.admin,
        splits: JSON.stringify([
          { userId: m.admin, amount: 5.16 }, { userId: m.jordan, amount: 5.16 }, { userId: m.taylor, amount: 5.17 },
        ]),
      },
      {
        householdId, title: 'Rent', categoryId: expCats['Rent'] ?? null,
        totalAmount: '1800.00', frequency: 'monthly', nextDueDate: days(8), paused: false,
        isBill: true, dueDay: 1, createdBy: m.admin,
        splits: JSON.stringify([
          { userId: m.admin, amount: 600 }, { userId: m.jordan, amount: 600 }, { userId: m.taylor, amount: 600 },
        ]),
      },
    ])
  }

  // ── Calendar (upcoming Next Event → #58, recurring, RSVP) ──
  if (await isEmpty(calendarEvents, householdId)) {
    const dinner = new Date(days(1)); dinner.setHours(18, 0, 0, 0)
    const dinnerEnd = new Date(dinner); dinnerEnd.setHours(19, 30, 0, 0)
    const dentist = new Date(days(3)); dentist.setHours(10, 0, 0, 0)
    const dentistEnd = new Date(dentist); dentistEnd.setHours(11, 0, 0, 0)
    const meeting = new Date(NOW); meeting.setHours(NOW.getHours() + 5, 0, 0, 0)
    const meetingEnd = new Date(meeting); meetingEnd.setHours(meeting.getHours() + 1, 0, 0, 0)
    const trash = new Date(days(2)); trash.setHours(7, 0, 0, 0)
    const trashEnd = new Date(trash); trashEnd.setHours(7, 30, 0, 0)

    await db.insert(calendarEvents).values({
      id: crypto.randomUUID(), householdId, title: 'Family dinner',
      startTime: dinner, endTime: dinnerEnd, category: 'meals', createdBy: m.admin,
    })
    await db.insert(calendarEvents).values({
      id: crypto.randomUUID(), householdId, title: 'Dentist appointment',
      startTime: dentist, endTime: dentistEnd, location: 'Downtown Dental', createdBy: m.taylor,
    })
    const meetingId = crypto.randomUUID()
    await db.insert(calendarEvents).values({
      id: meetingId, householdId, title: 'House meeting',
      startTime: meeting, endTime: meetingEnd, rsvpEnabled: true,
      notifyMemberIds: JSON.stringify([m.jordan, m.taylor]), createdBy: m.admin,
    })
    await db.insert(eventAttendees).values([
      { eventId: meetingId, userId: m.jordan, rsvpStatus: 'going' },
      { eventId: meetingId, userId: m.taylor, rsvpStatus: null },
    ])
    await db.insert(calendarEvents).values({
      id: crypto.randomUUID(), householdId, title: 'Trash day',
      startTime: trash, endTime: trashEnd, recurring: true, frequency: 'weekly',
      repeatEndType: 'forever', createdBy: m.admin,
    })
  }

  // ── Grocery: default list (mixed checked) + premium 2nd list (#27/#56) ──
  if (await isEmpty(groceryLists, householdId)) {
    const mainId = crypto.randomUUID()
    await db.insert(groceryLists).values({ id: mainId, householdId, name: 'Shopping List', isDefault: true, createdBy: m.admin })
    await db.insert(groceryItems).values([
      { listId: mainId, householdId, name: 'Milk', quantity: '1 gal', addedBy: m.jordan, createdAt: days(-1) },
      { listId: mainId, householdId, name: 'Eggs', quantity: '2 dozen', addedBy: m.taylor, isChecked: true, checkedBy: m.admin, checkedAt: hours(-3), createdAt: days(-1) },
      { listId: mainId, householdId, name: 'Bread', addedBy: m.admin, createdAt: hours(-6) },
      { listId: mainId, householdId, name: 'Bananas', addedBy: m.jordan, createdAt: hours(-5) },
      { listId: mainId, householdId, name: 'Chicken breast', quantity: '2 lb', addedBy: m.taylor, createdAt: hours(-4) },
    ])
    await logActivity(householdId, m.jordan, 'item_added', 'added "Milk" to Shopping List', days(-1), 'grocery_item')

    const costcoId = crypto.randomUUID()
    await db.insert(groceryLists).values({ id: costcoId, householdId, name: 'Costco Run', isDefault: false, createdBy: m.admin })
    await db.insert(groceryItems).values([
      { listId: costcoId, householdId, name: 'Paper towels', addedBy: m.admin, createdAt: hours(-2) },
      { listId: costcoId, householdId, name: 'Olive oil', addedBy: m.admin, createdAt: hours(-2) },
    ])
  }

  // ── Tasks + project + subtask + comment + delegation (#28) ──
  if (await isEmpty(tasks, householdId)) {
    const projId = crypto.randomUUID()
    await db.insert(projects).values({ id: projId, householdId, name: 'Home reno', color: '#EC4899', createdBy: m.admin })

    const faucet = crypto.randomUUID()
    await db.insert(tasks).values({
      id: faucet, householdId, title: 'Fix leaky faucet', description: 'Master bath',
      assignedTo: m.jordan, dueDate: days(-1), priority: 'high', projectId: projId, createdBy: m.admin,
    })
    await db.insert(tasks).values({
      id: crypto.randomUUID(), householdId, title: 'Replace tile grout',
      parentTaskId: faucet, priority: 'medium', createdBy: m.admin,
    })
    await db.insert(tasks).values({
      id: crypto.randomUUID(), householdId, title: 'Buy birthday gift',
      assignedTo: m.taylor, dueDate: days(2), priority: 'medium', createdBy: m.admin,
    })
    await db.insert(tasks).values({
      id: crypto.randomUUID(), householdId, title: 'Call the landlord', priority: 'low', createdBy: m.jordan,
    })
    await db.insert(tasks).values({
      id: crypto.randomUUID(), householdId, title: 'Renew car registration',
      priority: 'medium', completed: true, completedBy: m.admin, completedAt: days(-2), createdBy: m.admin,
    })
    await db.insert(taskComments).values({
      taskId: faucet, householdId, userId: m.jordan, body: 'Need a new washer, picking one up tomorrow.', createdAt: hours(-8),
    })
    await db.insert(taskDelegations).values({
      taskId: faucet, householdId, fromUserId: m.jordan, toUserId: m.taylor, status: 'pending',
    })
  }

  // ── Notes: plain + rich text (#30) ──
  if (await isEmpty(notes, householdId)) {
    await db.insert(notes).values([
      { householdId, title: 'WiFi password', content: 'Network: Roost5G  Password: home-sorted-2026', isRichText: false, createdBy: m.admin },
      {
        householdId, title: 'House rules',
        content: '<h2>House rules</h2><ul><li>Quiet hours after 10pm</li><li>Dishes done same day</li><li>Label your food</li></ul>',
        isRichText: true, createdBy: m.taylor,
      },
    ])
  }

  // ── Reminders: one-time, recurring, and one due now (banner → #31) ──
  if (await isEmpty(reminders, householdId)) {
    const dueNow = crypto.randomUUID()
    await db.insert(reminders).values({
      id: dueNow, householdId, title: 'Take out recycling', note: 'Blue bin, curb by 8am',
      remindAt: hours(-1), nextRemindAt: hours(-1), frequency: 'once', notifyType: 'household',
      notifyUserIds: JSON.stringify([m.admin, m.jordan, m.taylor]), createdBy: m.admin,
    })
    await db.insert(reminderReceipts).values([
      { reminderId: dueNow, userId: m.admin, seen: false },
      { reminderId: dueNow, userId: m.jordan, seen: false },
      { reminderId: dueNow, userId: m.taylor, seen: false },
    ])
    await db.insert(reminders).values({
      householdId, title: 'Water the plants', remindAt: days(1), nextRemindAt: days(1),
      frequency: 'weekly', notifyType: 'self', notifyUserIds: JSON.stringify([m.admin]), createdBy: m.admin,
    })
    await db.insert(reminders).values({
      householdId, title: 'Pay credit card', remindAt: days(5), nextRemindAt: days(5),
      frequency: 'once', notifyType: 'specific', notifyUserIds: JSON.stringify([m.jordan]), createdBy: m.admin,
    })
  }

  // ── Meals: bank + planner (tonight dinner → /today) + suggestion w/ votes (#32) ──
  if (await isEmpty(meals, householdId)) {
    const spaghetti = crypto.randomUUID()
    const pancakes = crypto.randomUUID()
    const salad = crypto.randomUUID()
    const tacos = crypto.randomUUID()
    await db.insert(meals).values([
      { id: spaghetti, householdId, name: 'Spaghetti Bolognese', category: 'dinner', prepTime: 40, createdBy: m.admin, ingredients: JSON.stringify(['Spaghetti', 'Ground beef', 'Tomato sauce', 'Onion', 'Garlic']) },
      { id: pancakes, householdId, name: 'Pancakes', category: 'breakfast', prepTime: 20, createdBy: m.taylor, ingredients: JSON.stringify(['Flour', 'Eggs', 'Milk', 'Maple syrup']) },
      { id: salad, householdId, name: 'Caesar Salad', category: 'lunch', prepTime: 15, createdBy: m.jordan, ingredients: JSON.stringify(['Romaine', 'Croutons', 'Parmesan', 'Caesar dressing']) },
      { id: tacos, householdId, name: 'Chicken Tacos', category: 'dinner', prepTime: 30, createdBy: m.admin, ingredients: JSON.stringify(['Tortillas', 'Chicken breast', 'Salsa', 'Cheese', 'Lettuce']) },
    ])
    await db.insert(mealPlanSlots).values([
      { householdId, mealId: spaghetti, slotDate: ymd(NOW), slotType: 'dinner', createdBy: m.admin },
      { householdId, mealId: pancakes, slotDate: ymd(days(1)), slotType: 'breakfast', createdBy: m.taylor },
    ]).onConflictDoNothing()

    const sugg = crypto.randomUUID()
    await db.insert(mealSuggestions).values({
      id: sugg, householdId, name: 'Veggie Stir Fry', note: 'Healthy weeknight option',
      ingredients: JSON.stringify(['Broccoli', 'Bell pepper', 'Soy sauce', 'Rice']),
      targetSlotDate: ymd(days(2)), targetSlotType: 'dinner', status: 'suggested', suggestedBy: m.jordan,
    })
    await db.insert(mealSuggestionVotes).values([
      { suggestionId: sugg, userId: m.taylor, voteType: 'up' },
      { suggestionId: sugg, userId: m.admin, voteType: 'up' },
    ])
  }

  // ── Reward rule + unacknowledged payout for the child (#26 claim card) ──
  if (await isEmpty(rewardRules, householdId)) {
    const ruleId = crypto.randomUUID()
    await db.insert(rewardRules).values({
      id: ruleId, householdId, userId: m.kid, title: 'Weekly allowance',
      periodType: 'week', thresholdPercent: 80, rewardType: 'money', rewardDetail: '$5.00',
      enabled: true, createdBy: m.admin, startsAt: days(-14),
    })
    await db.insert(rewardPayouts).values({
      householdId, userId: m.kid, ruleId, periodStart: days(-14), periodEnd: days(-7),
      earned: true, completionRate: 100, rewardDetail: '$5.00', acknowledged: false,
    })
    await logActivity(householdId, m.kid, 'allowance_earned', 'earned the "Weekly allowance" reward', days(-7), 'reward')
  }
}

// ── free-house light content (kept under free-tier limits) ───────────────────
async function seedFreeContent(householdId: string, adminId: string, memberId: string, kidId: string): Promise<void> {
  const cats = await seedChoreCategories(householdId)
  await seedExpenseCategories(householdId)
  await seedCommonItems(householdId)

  if (await isEmpty(chores, householdId)) {
    await db.insert(chores).values([
      { householdId, title: 'Take out the trash', assignedTo: memberId, categoryId: cats['Kitchen'] ?? null, frequency: 'daily', nextDueAt: days(0), createdBy: adminId },
      { householdId, title: 'Vacuum the house', assignedTo: memberId, categoryId: cats['Bedroom'] ?? null, frequency: 'weekly', nextDueAt: days(1), createdBy: adminId },
      { householdId, title: 'Feed the cat', assignedTo: kidId, categoryId: cats['Pet Care'] ?? null, frequency: 'daily', nextDueAt: days(0), createdBy: adminId },
    ])
  }
  if (await isEmpty(groceryLists, householdId)) {
    const listId = crypto.randomUUID()
    await db.insert(groceryLists).values({ id: listId, householdId, name: 'Shopping List', isDefault: true, createdBy: adminId })
    await db.insert(groceryItems).values([
      { listId, householdId, name: 'Coffee', addedBy: adminId, createdAt: hours(-2) },
      { listId, householdId, name: 'Apples', addedBy: memberId, isChecked: true, checkedBy: memberId, checkedAt: hours(-1), createdAt: hours(-3) },
    ])
  }
  if (await isEmpty(tasks, householdId)) {
    await db.insert(tasks).values([
      { householdId, title: 'Return library books', assignedTo: memberId, dueDate: days(3), priority: 'low', createdBy: adminId },
      { householdId, title: 'Schedule dentist', priority: 'medium', createdBy: adminId },
    ])
  }
  if (await isEmpty(notes, householdId)) {
    await db.insert(notes).values({ householdId, title: 'Garage code', content: '4821', isRichText: false, createdBy: adminId })
  }
  if (await isEmpty(reminders, householdId)) {
    await db.insert(reminders).values({
      householdId, title: 'Trash night', remindAt: days(1), nextRemindAt: days(1),
      frequency: 'weekly', notifyType: 'self', notifyUserIds: JSON.stringify([adminId]), createdBy: adminId,
    })
  }
  if (await isEmpty(meals, householdId)) {
    const stew = crypto.randomUUID()
    await db.insert(meals).values([
      { id: stew, householdId, name: 'Beef Stew', category: 'dinner', prepTime: 60, createdBy: adminId, ingredients: JSON.stringify(['Beef', 'Carrots', 'Potatoes', 'Broth']) },
      { householdId, name: 'Oatmeal', category: 'breakfast', prepTime: 10, createdBy: memberId, ingredients: JSON.stringify(['Oats', 'Milk', 'Honey']) },
    ])
    await db.insert(mealPlanSlots).values({ householdId, mealId: stew, slotDate: ymd(NOW), slotType: 'dinner', createdBy: adminId }).onConflictDoNothing()
  }
}

// ── promo codes for redemption QA (#36/#37/#38) ──────────────────────────────
const PROMO_CODES = [
  { code: 'ROOSTFREE30', durationDays: 30, isLifetime: false, status: 'active' as const, maxRedemptions: null, redemptionCount: 0, expiresAt: null },
  { code: 'ROOSTLIFE', durationDays: 0, isLifetime: true, status: 'active' as const, maxRedemptions: null, redemptionCount: 0, expiresAt: null },
  { code: 'PAUSEDCODE', durationDays: 60, isLifetime: false, status: 'paused' as const, maxRedemptions: null, redemptionCount: 0, expiresAt: null },
  { code: 'DEADCODE', durationDays: 90, isLifetime: false, status: 'deactivated' as const, maxRedemptions: null, redemptionCount: 0, expiresAt: null },
  { code: 'MAXEDOUT', durationDays: 30, isLifetime: false, status: 'active' as const, maxRedemptions: 1, redemptionCount: 1, expiresAt: null },
  { code: 'EXPIREDPROMO', durationDays: 30, isLifetime: false, status: 'active' as const, maxRedemptions: null, redemptionCount: 0, expiresAt: days(-1) },
]

async function seedPromoCodes(): Promise<void> {
  for (const p of PROMO_CODES) {
    const existing = await db.select({ id: promoCodes.id }).from(promoCodes).where(eq(promoCodes.code, p.code)).limit(1)
    if (existing.length) continue
    await db.insert(promoCodes).values(p)
  }
}

async function main() {
  console.log('Seeding QA test accounts + data...')

  // Accounts
  const freeAdminId = await ensureCredentialUser('admin.free@roost.test', 'Free Admin', '#EF4444')
  const premiumAdminId = await ensureCredentialUser('admin.premium@roost.test', 'Premium Admin', '#3B82F6')
  const freeMemberId = await ensureCredentialUser('member@roost.test', 'Test Member', '#22C55E')
  const jordanId = await ensureCredentialUser('jordan@roost.test', 'Jordan Lee', '#F59E0B')
  const taylorId = await ensureCredentialUser('taylor@roost.test', 'Taylor Kim', '#A855F7')
  const guestId = await ensureCredentialUser('riley.guest@roost.test', 'Riley Guest', '#06B6D4')

  // Households
  const freeHouseId = await ensureHousehold('FREEHS', 'Roost Free House', 'free', freeAdminId)
  const premiumHouseId = await ensureHousehold('PREMHS', 'Roost Premium House', 'premium', premiumAdminId)
  const secondHouseId = await ensureHousehold('SECND2', 'Roost Second House', 'premium', premiumAdminId)

  // Memberships
  await ensureMembership(freeHouseId, freeAdminId, 'admin', MEMBER_PERMS)
  await ensureMembership(freeHouseId, freeMemberId, 'member', MEMBER_PERMS)
  await ensureMembership(premiumHouseId, premiumAdminId, 'admin', MEMBER_PERMS)
  await ensureMembership(premiumHouseId, jordanId, 'member', MEMBER_PERMS)
  await ensureMembership(premiumHouseId, taylorId, 'member', MEMBER_PERMS)
  await ensureMembership(premiumHouseId, guestId, 'guest', GUEST_PERMS, days(14))
  await ensureMembership(secondHouseId, premiumAdminId, 'admin', MEMBER_PERMS)

  // Children (PIN login)
  const freeKidId = await ensureChildUser('Test Child', freeHouseId, '1234', '#EC4899')
  const premiumKidId = await ensureChildUser('Premium Kid', premiumHouseId, '5678', '#F97316')

  // admin.premium belongs to two households. Both /api/household/me and
  // /api/household/members resolve the "current" household as the MOST-RECENTLY-JOINED
  // one (ORDER BY created_at DESC), not activeHouseholdId. Pin the Premium House
  // membership as the newest so it is the default view (with all 5 members), and age
  // the Second House membership so it still exists for the multi-household switcher
  // without hijacking the default landing household.
  await db
    .update(householdMembers)
    .set({ createdAt: days(-30) })
    .where(and(eq(householdMembers.householdId, secondHouseId), eq(householdMembers.userId, premiumAdminId)))
  await db
    .update(householdMembers)
    .set({ createdAt: NOW })
    .where(and(eq(householdMembers.householdId, premiumHouseId), eq(householdMembers.userId, premiumAdminId)))

  // Pin each user's active household so the app opens on the right place.
  await db.update(users).set({ activeHouseholdId: freeHouseId }).where(eq(users.id, freeAdminId))
  await db.update(users).set({ activeHouseholdId: freeHouseId }).where(eq(users.id, freeMemberId))
  await db.update(users).set({ activeHouseholdId: premiumHouseId }).where(eq(users.id, premiumAdminId))
  await db.update(users).set({ activeHouseholdId: premiumHouseId }).where(eq(users.id, jordanId))
  await db.update(users).set({ activeHouseholdId: premiumHouseId }).where(eq(users.id, taylorId))
  await db.update(users).set({ activeHouseholdId: premiumHouseId }).where(eq(users.id, guestId))

  // Content
  await seedPremiumContent(premiumHouseId, {
    admin: premiumAdminId, jordan: jordanId, taylor: taylorId, kid: premiumKidId,
  })
  await seedFreeContent(freeHouseId, freeAdminId, freeMemberId, freeKidId)
  await seedPromoCodes()

  console.log('\nDone. Test accounts ready:\n')
  console.log('  ROOST PREMIUM HOUSE  (code PREMHS, premium)')
  console.log(`    admin.premium@roost.test  / ${PASSWORD}   admin`)
  console.log(`    jordan@roost.test         / ${PASSWORD}   member`)
  console.log(`    taylor@roost.test         / ${PASSWORD}   member`)
  console.log(`    riley.guest@roost.test    / ${PASSWORD}   guest (expires in 14 days)`)
  console.log('    Premium Kid               / PIN 5678      child (code PREMHS)')
  console.log('\n  ROOST FREE HOUSE  (code FREEHS, free)')
  console.log(`    admin.free@roost.test     / ${PASSWORD}   admin`)
  console.log(`    member@roost.test         / ${PASSWORD}   member`)
  console.log('    Test Child                / PIN 1234      child (code FREEHS)')
  console.log('\n  ROOST SECOND HOUSE  (code SECND2, premium)  — Premium Admin is also admin here')
  console.log('\n  Promo codes: ROOSTFREE30, ROOSTLIFE, PAUSEDCODE, DEADCODE, MAXEDOUT, EXPIREDPROMO')
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error('Seed failed:', err)
    process.exit(1)
  })
