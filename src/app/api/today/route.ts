import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import {
  chores,
  groceryLists,
  groceryItems,
  expenseSplits,
  expenses,
  mealPlanSlots,
  meals,
  reminders,
} from '@/db/schema'
import { eq, and, isNull, lt, gte, lte, not } from 'drizzle-orm'

function todayStart() {
  const d = new Date()
  d.setHours(0, 0, 0, 0)
  return d
}

function todayEnd() {
  const d = new Date()
  d.setHours(23, 59, 59, 999)
  return d
}

function todayDateStr() {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership
  const userId = session.user.id
  const start = todayStart()
  const end = todayEnd()
  const todayStr = todayDateStr()

  const [
    overdueChores,
    dueTodayChores,
    tonightSlot,
    myUnsettledSplits,
    defaultList,
    activeReminder,
  ] = await Promise.all([
    // Overdue chores assigned to current user
    db
      .select({ id: chores.id, title: chores.title, nextDueAt: chores.nextDueAt })
      .from(chores)
      .where(
        and(
          eq(chores.householdId, householdId),
          eq(chores.assignedTo, userId),
          isNull(chores.deletedAt),
          lt(chores.nextDueAt, start),
        )
      )
      .limit(10),

    // Due-today chores assigned to current user
    db
      .select({ id: chores.id, title: chores.title, nextDueAt: chores.nextDueAt })
      .from(chores)
      .where(
        and(
          eq(chores.householdId, householdId),
          eq(chores.assignedTo, userId),
          isNull(chores.deletedAt),
          gte(chores.nextDueAt, start),
          lte(chores.nextDueAt, end),
        )
      )
      .limit(10),

    // Tonight's dinner slot
    db
      .select({ mealName: meals.name })
      .from(mealPlanSlots)
      .innerJoin(meals, eq(mealPlanSlots.mealId, meals.id))
      .where(
        and(
          eq(mealPlanSlots.householdId, householdId),
          eq(mealPlanSlots.slotDate, todayStr),
          eq(mealPlanSlots.slotType, 'dinner'),
        )
      )
      .limit(1),

    // My unsettled expense splits (to compute balance)
    db
      .select({
        amount: expenseSplits.amount,
        paidBy: expenses.paidBy,
        userId: expenseSplits.userId,
      })
      .from(expenseSplits)
      .innerJoin(expenses, eq(expenseSplits.expenseId, expenses.id))
      .where(
        and(
          eq(expenseSplits.householdId, householdId),
          eq(expenseSplits.settled, false),
          isNull(expenses.deletedAt),
        )
      ),

    // Default grocery list
    db
      .select({ id: groceryLists.id })
      .from(groceryLists)
      .where(
        and(
          eq(groceryLists.householdId, householdId),
          eq(groceryLists.isDefault, true),
          isNull(groceryLists.deletedAt),
        )
      )
      .limit(1),

    // Active reminder due today for current user
    db
      .select({ id: reminders.id, title: reminders.title, nextRemindAt: reminders.nextRemindAt })
      .from(reminders)
      .where(
        and(
          eq(reminders.householdId, householdId),
          eq(reminders.createdBy, userId),
          eq(reminders.completed, false),
          isNull(reminders.deletedAt),
          isNull(reminders.snoozedUntil),
          lte(reminders.nextRemindAt, end),
        )
      )
      .limit(1),
  ])

  // Grocery count
  let groceryCount = 0
  if (defaultList[0]) {
    const unchecked = await db
      .select({ id: groceryItems.id })
      .from(groceryItems)
      .where(
        and(
          eq(groceryItems.listId, defaultList[0].id),
          eq(groceryItems.isChecked, false),
          isNull(groceryItems.deletedAt),
        )
      )
    groceryCount = unchecked.length
  }

  // Compute money balance from current user's perspective
  let balance = 0
  let moneyLabel: 'owed' | 'owing' | 'clear' = 'clear'
  for (const split of myUnsettledSplits) {
    const amt = parseFloat(split.amount as string)
    if (split.paidBy === userId && split.userId !== userId) {
      // Others owe me
      balance += amt
    } else if (split.userId === userId && split.paidBy !== userId) {
      // I owe someone
      balance -= amt
    }
  }
  if (balance > 0.005) moneyLabel = 'owed'
  else if (balance < -0.005) moneyLabel = 'owing'

  // Build chores list (overdue + due today)
  const allChores = [
    ...overdueChores.map(c => ({
      id: c.id,
      title: c.title,
      nextDueAt: c.nextDueAt?.toISOString() ?? null,
      overdue: true,
    })),
    ...dueTodayChores.map(c => ({
      id: c.id,
      title: c.title,
      nextDueAt: c.nextDueAt?.toISOString() ?? null,
      overdue: false,
    })),
  ]

  // Hero priority
  type HeroType = 'overdue_chore' | 'due_chore' | 'reminder' | 'all_clear'
  let heroType: HeroType = 'all_clear'
  let heroItem: object | null = null

  if (overdueChores.length > 0) {
    heroType = 'overdue_chore'
    const c = overdueChores[0]
    heroItem = { id: c.id, title: c.title, nextDueAt: c.nextDueAt?.toISOString() ?? null, overdue: true }
  } else if (dueTodayChores.length > 0) {
    heroType = 'due_chore'
    const c = dueTodayChores[0]
    heroItem = { id: c.id, title: c.title, nextDueAt: c.nextDueAt?.toISOString() ?? null, overdue: false }
  } else if (activeReminder[0]) {
    heroType = 'reminder'
    const r = activeReminder[0]
    heroItem = { id: r.id, title: r.title, nextRemindAt: r.nextRemindAt.toISOString() }
  }

  return NextResponse.json({
    hero: { type: heroType, item: heroItem },
    chores: allChores,
    snapshot: {
      meal: tonightSlot[0] ? { name: tonightSlot[0].mealName } : null,
      money: { balance: Math.abs(balance), label: moneyLabel },
      event: null,
      grocery: { count: groceryCount },
    },
  })
}
