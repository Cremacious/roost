import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { expenseBudgets, expenseCategories, expenses } from '@/db/schema'
import { eq, and, gte } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership

  if (membership.household.subscriptionStatus !== 'premium') {
    return NextResponse.json({ error: 'Premium required', code: 'BUDGET_PREMIUM' }, { status: 403 })
  }

  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)

  const [budgetRows, expenseRows] = await Promise.all([
    db
      .select({
        id: expenseBudgets.id,
        categoryId: expenseBudgets.categoryId,
        amount: expenseBudgets.amount,
        warningThreshold: expenseBudgets.warningThreshold,
        categoryName: expenseCategories.name,
        categoryIcon: expenseCategories.icon,
        categoryColor: expenseCategories.color,
      })
      .from(expenseBudgets)
      .leftJoin(expenseCategories, eq(expenseBudgets.categoryId, expenseCategories.id))
      .where(eq(expenseBudgets.householdId, householdId)),

    db
      .select({ categoryId: expenses.categoryId, amount: expenses.amount })
      .from(expenses)
      .where(
        and(
          eq(expenses.householdId, householdId),
          gte(expenses.createdAt, monthStart)
        )
      ),
  ])

  // sum spending per category this month
  const spendByCategory = new Map<string, number>()
  for (const e of expenseRows) {
    if (!e.categoryId) continue
    spendByCategory.set(e.categoryId, (spendByCategory.get(e.categoryId) ?? 0) + parseFloat(e.amount))
  }

  const budgets = budgetRows.map(b => {
    const spent = spendByCategory.get(b.categoryId) ?? 0
    const cap = parseFloat(b.amount)
    const pct = cap > 0 ? Math.round((spent / cap) * 100) : 0
    return {
      ...b,
      spent: Math.round(spent * 100) / 100,
      pct,
      status: pct >= 100 ? 'over' : pct >= (b.warningThreshold ?? 70) ? 'warning' : 'ok',
    }
  })

  const totalCap = budgets.reduce((s, b) => s + parseFloat(b.amount), 0)
  const totalSpent = budgets.reduce((s, b) => s + b.spent, 0)

  return NextResponse.json({ budgets, totalCap: Math.round(totalCap * 100) / 100, totalSpent: Math.round(totalSpent * 100) / 100 })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  if (membership.household.subscriptionStatus !== 'premium') {
    return NextResponse.json({ error: 'Premium required', code: 'BUDGET_PREMIUM' }, { status: 403 })
  }

  const { categoryId, amount, warningThreshold } = await req.json()
  if (!categoryId) return NextResponse.json({ error: 'categoryId required' }, { status: 400 })
  if (!amount || isNaN(parseFloat(amount))) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })

  const id = crypto.randomUUID()
  await db.insert(expenseBudgets).values({
    id,
    householdId,
    categoryId,
    amount: parseFloat(amount).toFixed(2),
    warningThreshold: warningThreshold ?? 70,
  })

  return NextResponse.json({ id }, { status: 201 })
}
