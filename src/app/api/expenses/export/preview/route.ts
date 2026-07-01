import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold, checkMemberPermission } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { expenses } from '@/db/schema'
import { eq, and, isNull, gte, lte } from 'drizzle-orm'

function parseLocalDay(value: string, endOfDay: boolean): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null
  const d = new Date(`${value}T00:00:00`)
  if (isNaN(d.getTime())) return null
  if (endOfDay) d.setHours(23, 59, 59, 999)
  return d
}

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const canView = await checkMemberPermission(session.user.id, householdId, role, 'expensesView')
  if (!canView) {
    return NextResponse.json({ error: 'You do not have permission to view expenses', code: 'PERMISSION_DENIED' }, { status: 403 })
  }

  if (membership.household.subscriptionStatus !== 'premium') {
    return NextResponse.json({ error: 'Premium required', code: 'EXPORT_PREMIUM' }, { status: 403 })
  }

  const { searchParams } = new URL(req.url)
  const from = parseLocalDay(searchParams.get('from') ?? '', false)
  const to = parseLocalDay(searchParams.get('to') ?? '', true)
  if (!from || !to) {
    return NextResponse.json({ error: 'Invalid date range. Use from and to as YYYY-MM-DD.' }, { status: 400 })
  }
  if (from > to) {
    return NextResponse.json({ error: 'The start date must be before the end date.' }, { status: 400 })
  }

  const rows = await db
    .select({ amount: expenses.amount })
    .from(expenses)
    .where(
      and(
        eq(expenses.householdId, householdId),
        isNull(expenses.deletedAt),
        eq(expenses.isRecurringDraft, false),
        gte(expenses.createdAt, from),
        lte(expenses.createdAt, to),
      ),
    )

  const total = rows.reduce((sum, r) => sum + parseFloat(r.amount), 0)

  return NextResponse.json({ count: rows.length, total: Math.round(total * 100) / 100 })
}
