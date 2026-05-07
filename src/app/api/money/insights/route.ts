import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { expenses, expenseCategories, users } from '@/db/schema'
import { eq, and, isNull, sum, count, gte, lte, desc, sql } from 'drizzle-orm'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  if (membership.role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  if (membership.household.subscriptionStatus !== 'premium') {
    return NextResponse.json({ error: 'Premium required', code: 'INSIGHTS_PREMIUM' }, { status: 403 })
  }

  const { householdId } = membership
  const { searchParams } = new URL(req.url)

  const fromParam = searchParams.get('from')
  const toParam = searchParams.get('to')

  const fromDate = fromParam ? new Date(`${fromParam}T00:00:00`) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
  const toDate = toParam ? new Date(`${toParam}T23:59:59`) : new Date()

  const baseCondition = and(
    eq(expenses.householdId, householdId),
    isNull(expenses.deletedAt),
    eq(expenses.isRecurringDraft, false),
    gte(expenses.createdAt, fromDate),
    lte(expenses.createdAt, toDate)
  )

  const [spendingOverTime, byCategory, byMember, largestExpenses] = await Promise.all([
    // Daily spending grouped by date
    db
      .select({
        date: sql<string>`DATE(${expenses.createdAt})`.as('date'),
        total: sum(expenses.amount),
        count: count(),
      })
      .from(expenses)
      .where(baseCondition)
      .groupBy(sql`DATE(${expenses.createdAt})`)
      .orderBy(sql`DATE(${expenses.createdAt})`),

    // Spending by category
    db
      .select({
        categoryId: expenses.categoryId,
        categoryName: expenseCategories.name,
        categoryColor: expenseCategories.color,
        total: sum(expenses.amount),
        count: count(),
      })
      .from(expenses)
      .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .where(baseCondition)
      .groupBy(expenses.categoryId, expenseCategories.name, expenseCategories.color)
      .orderBy(desc(sum(expenses.amount))),

    // Spending by member (paidBy)
    db
      .select({
        userId: expenses.paidBy,
        userName: users.name,
        total: sum(expenses.amount),
        count: count(),
      })
      .from(expenses)
      .leftJoin(users, eq(expenses.paidBy, users.id))
      .where(baseCondition)
      .groupBy(expenses.paidBy, users.name)
      .orderBy(desc(sum(expenses.amount))),

    // Largest individual expenses
    db
      .select({
        id: expenses.id,
        title: expenses.title,
        amount: expenses.amount,
        paidBy: expenses.paidBy,
        paidByName: users.name,
        createdAt: expenses.createdAt,
        categoryName: expenseCategories.name,
      })
      .from(expenses)
      .leftJoin(users, eq(expenses.paidBy, users.id))
      .leftJoin(expenseCategories, eq(expenses.categoryId, expenseCategories.id))
      .where(baseCondition)
      .orderBy(desc(expenses.amount))
      .limit(10),
  ])

  const grandTotal = byMember.reduce((s, m) => s + parseFloat(m.total ?? '0'), 0)

  return NextResponse.json({
    period: { from: fromDate.toISOString(), to: toDate.toISOString() },
    grandTotal: Math.round(grandTotal * 100) / 100,
    spendingOverTime: spendingOverTime.map(r => ({
      date: r.date,
      total: Math.round(parseFloat(r.total ?? '0') * 100) / 100,
      count: r.count,
    })),
    byCategory: byCategory.map(r => ({
      categoryId: r.categoryId,
      categoryName: r.categoryName ?? 'Uncategorized',
      categoryColor: r.categoryColor ?? '#9CA3AF',
      total: Math.round(parseFloat(r.total ?? '0') * 100) / 100,
      count: r.count,
      percent: grandTotal > 0 ? Math.round((parseFloat(r.total ?? '0') / grandTotal) * 100) : 0,
    })),
    byMember: byMember.map(r => ({
      userId: r.userId,
      userName: r.userName ?? 'Unknown',
      total: Math.round(parseFloat(r.total ?? '0') * 100) / 100,
      count: r.count,
      percent: grandTotal > 0 ? Math.round((parseFloat(r.total ?? '0') / grandTotal) * 100) : 0,
    })),
    largestExpenses: largestExpenses.map(e => ({
      id: e.id,
      title: e.title,
      amount: parseFloat(e.amount),
      paidBy: e.paidBy,
      paidByName: e.paidByName ?? 'Unknown',
      createdAt: e.createdAt,
      categoryName: e.categoryName ?? 'Uncategorized',
    })),
  })
}
