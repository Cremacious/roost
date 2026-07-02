import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { expenseCategories } from '@/db/schema'
import { eq, and, isNull, or } from 'drizzle-orm'
import { seedExpenseCategories } from '@/lib/utils/seedExpenseCategories'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership

  // auto-seed defaults on first access
  await seedExpenseCategories(householdId)

  const rows = await db
    .select()
    .from(expenseCategories)
    .where(
      and(
        eq(expenseCategories.householdId, householdId),
        isNull(expenseCategories.deletedAt),
        or(
          eq(expenseCategories.status, 'active'),
          // admins also see pending suggestions
          ...(role === 'admin' ? [eq(expenseCategories.status, 'pending')] : [])
        )
      )
    )

  // Return a flat array with snake_case fields to match the shared Category
  // interface (src/components/expenses/CategoryPicker.tsx), which every consumer
  // (settings management + money BillSheet/BudgetSheet/ExpenseSheet) reads from.
  return NextResponse.json(
    rows.map((r) => ({
      id: r.id,
      name: r.name,
      icon: r.icon,
      color: r.color,
      is_default: r.isDefault,
      is_custom: r.isCustom,
      status: r.status,
    }))
  )
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  if (membership.household.subscriptionStatus !== 'premium') {
    return NextResponse.json({ error: 'Premium required', code: 'EXPENSE_CATEGORIES_PREMIUM' }, { status: 403 })
  }

  const { name, icon, color } = await req.json()
  if (!name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const id = crypto.randomUUID()
  await db.insert(expenseCategories).values({
    id,
    householdId,
    name: name.trim(),
    icon: icon ?? 'Tag',
    color: color ?? '#22C55E',
    isDefault: false,
    isCustom: true,
    status: 'active',
  })

  return NextResponse.json({ id }, { status: 201 })
}
