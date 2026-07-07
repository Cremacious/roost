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
  calendarEvents,
} from '@/db/schema'
import { eq, and, isNull, lt, gte, lte, asc } from 'drizzle-orm'
import { expandRecurring } from '@/lib/utils/recurrence'

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

// `YYYY-MM-DD` string for today + N days, used for bounding the upcoming-meal
// lookup window.
function dateStrPlusDays(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// Slots have no time-of-day, only a discrete type. Order them as a household
// would eat through the day so "next upcoming" within a date is sensible.
const SLOT_ORDER: Record<string, number> = {
  breakfast: 1,
  lunch: 2,
  dinner: 3,
  snack: 4,
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
  // "Now" for the next-upcoming-event lookup, plus a 90-day window over which
  // recurring templates are expanded to find their next occurrence.
  const now = new Date()
  const eventWindowEnd = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000)
  // Lookup window for the next upcoming meal. 7 days is generous enough that
  // any reasonably planned week is covered; if nothing falls in this window we
  // treat it as truly empty.
  const upcomingMealEnd = dateStrPlusDays(7)

  const [
    overdueChores,
    dueTodayChores,
    upcomingMealSlots,
    myUnsettledSplits,
    defaultList,
    dueReminders,
    nextNonRecurringEvent,
    recurringEventTemplates,
  ] = await Promise.all([
    // Overdue chores assigned to current user
    db
      .select({ id: chores.id, title: chores.title, nextDueAt: chores.nextDueAt, frequency: chores.frequency })
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
      .select({ id: chores.id, title: chores.title, nextDueAt: chores.nextDueAt, frequency: chores.frequency })
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

    // Next upcoming meal: any planned slot from today through the next 7 days.
    // Sorted in JS afterwards because slot_type is an enum-style string with no
    // natural lexical order matching the meal-of-day progression we want.
    db
      .select({
        mealName: meals.name,
        slotDate: mealPlanSlots.slotDate,
        slotType: mealPlanSlots.slotType,
      })
      .from(mealPlanSlots)
      .innerJoin(meals, eq(mealPlanSlots.mealId, meals.id))
      .where(
        and(
          eq(mealPlanSlots.householdId, householdId),
          gte(mealPlanSlots.slotDate, todayStr),
          lte(mealPlanSlots.slotDate, upcomingMealEnd),
        )
      ),

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

    // Active reminders due today for the household. Relevance to the current
    // user (self / specific / household) is resolved in JS below to mirror the
    // canonical filter in GET /api/reminders, so a reminder someone else set
    // that notifies this user still surfaces in the hero.
    db
      .select({
        id: reminders.id,
        title: reminders.title,
        nextRemindAt: reminders.nextRemindAt,
        frequency: reminders.frequency,
        notifyType: reminders.notifyType,
        notifyUserIds: reminders.notifyUserIds,
        createdBy: reminders.createdBy,
      })
      .from(reminders)
      .where(
        and(
          eq(reminders.householdId, householdId),
          eq(reminders.completed, false),
          isNull(reminders.deletedAt),
          isNull(reminders.snoozedUntil),
          lte(reminders.nextRemindAt, end),
        )
      )
      .orderBy(asc(reminders.nextRemindAt)),

    // Soonest non-recurring upcoming event (start time at or after now)
    db
      .select({ title: calendarEvents.title, startTime: calendarEvents.startTime })
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.householdId, householdId),
          isNull(calendarEvents.deletedAt),
          eq(calendarEvents.recurring, false),
          gte(calendarEvents.startTime, now),
        )
      )
      .orderBy(asc(calendarEvents.startTime))
      .limit(1),

    // All recurring templates; expanded in JS below to find the next occurrence
    db
      .select({
        title: calendarEvents.title,
        startTime: calendarEvents.startTime,
        endTime: calendarEvents.endTime,
        frequency: calendarEvents.frequency,
        repeatEndType: calendarEvents.repeatEndType,
        repeatUntil: calendarEvents.repeatUntil,
        repeatOccurrences: calendarEvents.repeatOccurrences,
      })
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.householdId, householdId),
          isNull(calendarEvents.deletedAt),
          eq(calendarEvents.recurring, true),
        )
      ),
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
      frequency: c.frequency,
      overdue: true,
    })),
    ...dueTodayChores.map(c => ({
      id: c.id,
      title: c.title,
      nextDueAt: c.nextDueAt?.toISOString() ?? null,
      frequency: c.frequency,
      overdue: false,
    })),
  ]

  // Hero priority
  type HeroType = 'overdue_chore' | 'due_chore' | 'reminder' | 'all_clear'
  let heroType: HeroType = 'all_clear'
  let heroItem: object | null = null

  // Every due reminder actually relevant to this user, mirroring the canonical
  // filter in GET /api/reminders (self / specific / household). We keep the whole
  // set (not just the first) so due reminders can appear in the unified
  // "needs attention" list and are never buried behind a chore.
  const relevantReminders = dueReminders.filter(r => {
    if (r.notifyType === 'household') return true
    if (r.notifyType === 'self') return r.createdBy === userId
    if (r.notifyType === 'specific') {
      const ids = JSON.parse(r.notifyUserIds ?? '[]') as string[]
      return r.createdBy === userId || ids.includes(userId)
    }
    return r.createdBy === userId
  })

  // Shape the reminders the UI needs (id + title for display, nextRemindAt for
  // sorting, frequency so the row knows one-time vs recurring, notifyType +
  // ownedByUser for the "set by you / a housemate" caption).
  const reminderItems = relevantReminders.map(r => ({
    id: r.id,
    title: r.title,
    nextRemindAt: r.nextRemindAt.toISOString(),
    frequency: r.frequency ?? 'once',
    notifyType: r.notifyType,
    ownedByUser: r.createdBy === userId,
  }))

  const relevantReminder = relevantReminders[0] ?? null

  // Total number of things needing attention: overdue + due-today chores plus
  // every relevant due reminder. Drives the "+N more need attention" count and
  // gates the all-clear state.
  const attentionCount = allChores.length + reminderItems.length

  if (overdueChores.length > 0) {
    heroType = 'overdue_chore'
    const c = overdueChores[0]
    heroItem = { id: c.id, title: c.title, nextDueAt: c.nextDueAt?.toISOString() ?? null, frequency: c.frequency, overdue: true }
  } else if (dueTodayChores.length > 0) {
    heroType = 'due_chore'
    const c = dueTodayChores[0]
    heroItem = { id: c.id, title: c.title, nextDueAt: c.nextDueAt?.toISOString() ?? null, frequency: c.frequency, overdue: false }
  } else if (relevantReminder) {
    heroType = 'reminder'
    heroItem = {
      id: relevantReminder.id,
      title: relevantReminder.title,
      nextRemindAt: relevantReminder.nextRemindAt.toISOString(),
      ownedByUser: relevantReminder.createdBy === userId,
    }
  }

  // Pick the next upcoming meal by sorting on (slotDate, slotType ordinal). The
  // earliest planned slot wins, regardless of type — so if there's no dinner
  // today but lunch IS planned today, lunch surfaces; if today is empty but
  // tomorrow has a meal, that surfaces; the card only goes empty when nothing
  // is planned in the 7-day window.
  const sortedUpcoming = [...upcomingMealSlots].sort((a, b) => {
    if (a.slotDate !== b.slotDate) return a.slotDate < b.slotDate ? -1 : 1
    return (SLOT_ORDER[a.slotType] ?? 99) - (SLOT_ORDER[b.slotType] ?? 99)
  })
  const nextMeal = sortedUpcoming[0] ?? null

  // Next upcoming event: the soonest of the next non-recurring event and the
  // earliest expanded occurrence of any recurring template within the window.
  const candidateEvents: Array<{ title: string; startTime: Date }> = []
  if (nextNonRecurringEvent[0]) {
    candidateEvents.push(nextNonRecurringEvent[0])
  }
  for (const template of recurringEventTemplates) {
    const occurrences = expandRecurring(template, now, eventWindowEnd)
    if (occurrences[0]) {
      candidateEvents.push({ title: occurrences[0].title, startTime: occurrences[0].startTime })
    }
  }
  candidateEvents.sort((a, b) => a.startTime.getTime() - b.startTime.getTime())
  const nextEvent = candidateEvents[0]
    ? { title: candidateEvents[0].title, startsAt: candidateEvents[0].startTime.toISOString() }
    : null

  return NextResponse.json({
    hero: { type: heroType, item: heroItem },
    chores: allChores,
    reminders: reminderItems,
    attentionCount,
    snapshot: {
      meal: nextMeal
        ? { name: nextMeal.mealName, slotDate: nextMeal.slotDate, slotType: nextMeal.slotType }
        : null,
      money: { balance: Math.abs(balance), label: moneyLabel },
      event: nextEvent,
      grocery: { count: groceryCount },
    },
  })
}
