import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { expenses, expenseSplits, recurringExpenses, savingsGoals, goalContributions, users, expenseBudgets, expenseCategories } from '@/db/schema'
import { eq, and, isNull, sum, desc, lte, gte, inArray } from 'drizzle-orm'
import { simplifyDebts } from '@/lib/utils/debtSimplification'

function getBillStatus(dueDay: number | null, hasDraftPosted: boolean): 'paid' | 'due_soon' | 'overdue' | 'upcoming' {
  if (hasDraftPosted) return 'paid'
  if (!dueDay) return 'upcoming'
  const currentDay = new Date().getDate()
  const daysUntil = dueDay - currentDay
  if (daysUntil < 0) return 'overdue'
  if (daysUntil <= 7) return 'due_soon'
  return 'upcoming'
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  if (membership.role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { householdId } = membership
  const isPremium = membership.household.subscriptionStatus === 'premium'

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [
    allExpenses,
    allSplits,
    billTemplates,
    postedThisMonthRows,
    activeGoals,
    recentExpenses,
    budgets,
  ] = await Promise.all([
    db
      .select()
      .from(expenses)
      .where(and(eq(expenses.householdId, householdId), isNull(expenses.deletedAt), eq(expenses.isRecurringDraft, false))),

    db
      .select()
      .from(expenseSplits)
      .where(and(eq(expenseSplits.householdId, householdId))),

    isPremium
      ? db
          .select()
          .from(recurringExpenses)
          .where(and(eq(recurringExpenses.householdId, householdId), eq(recurringExpenses.isBill, true), isNull(recurringExpenses.deletedAt)))
      : Promise.resolve([]),

    isPremium
      ? db
          .select({ recurringTemplateId: expenses.recurringTemplateId })
          .from(expenses)
          .where(and(eq(expenses.householdId, householdId), eq(expenses.isRecurringDraft, false), isNull(expenses.deletedAt), gte(expenses.createdAt, monthStart)))
      : Promise.resolve([]),

    isPremium
      ? db
          .select({
            id: savingsGoals.id,
            name: savingsGoals.name,
            targetAmount: savingsGoals.targetAmount,
            targetDate: savingsGoals.targetDate,
          })
          .from(savingsGoals)
          .where(and(eq(savingsGoals.householdId, householdId), isNull(savingsGoals.deletedAt), isNull(savingsGoals.completedAt)))
          .orderBy(savingsGoals.targetDate)
          .limit(1)
      : Promise.resolve([]),

    db
      .select({
        id: expenses.id,
        title: expenses.title,
        amount: expenses.amount,
        paidBy: expenses.paidBy,
        paidByName: users.name,
        createdAt: expenses.createdAt,
        categoryId: expenses.categoryId,
      })
      .from(expenses)
      .leftJoin(users, eq(expenses.paidBy, users.id))
      .where(and(eq(expenses.householdId, householdId), isNull(expenses.deletedAt), eq(expenses.isRecurringDraft, false)))
      .orderBy(desc(expenses.createdAt))
      .limit(5),

    isPremium
      ? db
          .select({
            id: expenseBudgets.id,
            categoryId: expenseBudgets.categoryId,
            amount: expenseBudgets.amount,
            warningThreshold: expenseBudgets.warningThreshold,
          })
          .from(expenseBudgets)
          .where(eq(expenseBudgets.householdId, householdId))
      : Promise.resolve([]),
  ])

  // Balances
  const rawSplits = allSplits.map(s => ({
    splitId: s.id,
    creditorId: s.expenseId
      ? (allExpenses.find(e => e.id === s.expenseId)?.paidBy ?? '')
      : '',
    debtorId: s.userId,
    amount: parseFloat(s.amount),
    settled: s.settled ?? false,
    settledByPayer: s.settledByPayer ?? false,
    settledByPayee: s.settledByPayee ?? false,
    settlementDisputed: s.settlementDisputed ?? false,
    settlementLastRemindedAt: null,
    settledAt: null,
  })).filter(s => s.creditorId && s.creditorId !== s.debtorId)

  const debts = simplifyDebts(rawSplits)
  const myDebts = debts.filter(d => d.from === session.user.id || d.to === session.user.id)
  const totalOwed = myDebts.filter(d => d.to === session.user.id).reduce((s, d) => s + d.amount, 0)
  const totalOwe = myDebts.filter(d => d.from === session.user.id).reduce((s, d) => s + d.amount, 0)

  const thisMonthExpenses = allExpenses.filter(e => new Date(e.createdAt) >= monthStart)
  const totalSpentThisMonth = thisMonthExpenses.reduce((s, e) => s + parseFloat(e.amount), 0)

  // Bills (up to 4, premium only)
  const postedThisMonth = new Set(
    postedThisMonthRows.filter(e => e.recurringTemplateId).map(e => e.recurringTemplateId!)
  )
  const bills = (billTemplates as typeof billTemplates)
    .map(t => ({
      id: t.id,
      title: t.title,
      amount: t.totalAmount,
      dueDay: t.dueDay,
      status: getBillStatus(t.dueDay, postedThisMonth.has(t.id)),
    }))
    .sort((a, b) => (a.dueDay ?? 32) - (b.dueDay ?? 32))
    .slice(0, 4)

  // Active goal (most urgent — nearest target date)
  const activeGoal = activeGoals[0] ?? null
  let goalSaved = 0
  if (activeGoal) {
    const contributions = await db
      .select({ total: sum(goalContributions.amount) })
      .from(goalContributions)
      .where(eq(goalContributions.goalId, activeGoal.id))
    goalSaved = parseFloat(contributions[0]?.total ?? '0')
  }

  // Budget summary (premium only)
  let budgetSummary = null
  if (budgets.length > 0) {
    const categoryIds = budgets.map(b => b.categoryId).filter(Boolean) as string[]
    const spendByCategory = await db
      .select({
        categoryId: expenses.categoryId,
        total: sum(expenses.amount),
      })
      .from(expenses)
      .where(
        and(
          eq(expenses.householdId, householdId),
          isNull(expenses.deletedAt),
          gte(expenses.createdAt, monthStart),
          inArray(expenses.categoryId, categoryIds)
        )
      )
      .groupBy(expenses.categoryId)

    const spendMap = new Map(spendByCategory.map(r => [r.categoryId, parseFloat(r.total ?? '0')]))
    const totalCap = budgets.reduce((s, b) => s + parseFloat(b.amount), 0)
    const totalSpent = budgets.reduce((s, b) => s + (spendMap.get(b.categoryId ?? '') ?? 0), 0)
    const overBudgetCount = budgets.filter(b => {
      const spent = spendMap.get(b.categoryId ?? '') ?? 0
      return spent > parseFloat(b.amount)
    }).length

    budgetSummary = {
      totalCap: Math.round(totalCap * 100) / 100,
      totalSpent: Math.round(totalSpent * 100) / 100,
      remaining: Math.round((totalCap - totalSpent) * 100) / 100,
      overBudgetCount,
      budgetCount: budgets.length,
    }
  }

  return NextResponse.json({
    balances: {
      totalOwed: Math.round(totalOwed * 100) / 100,
      totalOwe: Math.round(totalOwe * 100) / 100,
      netBalance: Math.round((totalOwed - totalOwe) * 100) / 100,
      totalSpentThisMonth: Math.round(totalSpentThisMonth * 100) / 100,
    },
    bills,
    budgetSummary,
    activeGoal: activeGoal
      ? {
          id: activeGoal.id,
          name: activeGoal.name,
          targetAmount: parseFloat(activeGoal.targetAmount),
          targetDate: activeGoal.targetDate,
          savedAmount: Math.round(goalSaved * 100) / 100,
          progressPercent: Math.min(100, Math.round((goalSaved / parseFloat(activeGoal.targetAmount)) * 100)),
        }
      : null,
    recentExpenses: recentExpenses.map(e => ({
      id: e.id,
      title: e.title,
      amount: parseFloat(e.amount),
      paidBy: e.paidBy,
      paidByName: e.paidByName ?? 'Unknown',
      createdAt: e.createdAt,
    })),
    isPremium,
  })
}
