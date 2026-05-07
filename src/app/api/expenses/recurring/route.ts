import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { recurringExpenses } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export function advanceRecurringDate(from: Date, frequency: string): Date {
  const next = new Date(from)
  switch (frequency) {
    case 'weekly':   next.setDate(next.getDate() + 7); break
    case 'biweekly': next.setDate(next.getDate() + 14); break
    case 'monthly':  next.setMonth(next.getMonth() + 1); break
    case 'yearly':   next.setFullYear(next.getFullYear() + 1); break
    default:         next.setMonth(next.getMonth() + 1)
  }
  return next
}

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership

  if (membership.household.subscriptionStatus !== 'premium') {
    return NextResponse.json({ error: 'Premium required', code: 'RECURRING_EXPENSES_PREMIUM' }, { status: 403 })
  }

  const rows = await db
    .select()
    .from(recurringExpenses)
    .where(and(eq(recurringExpenses.householdId, householdId), isNull(recurringExpenses.deletedAt)))

  return NextResponse.json(rows)
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role !== 'admin') return NextResponse.json({ error: 'Admin only' }, { status: 403 })

  if (membership.household.subscriptionStatus !== 'premium') {
    return NextResponse.json({ error: 'Premium required', code: 'RECURRING_EXPENSES_PREMIUM' }, { status: 403 })
  }

  const body = await req.json()
  const { title, totalAmount, frequency, nextDueDate, categoryId, notes, splits, isBill, dueDay } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  if (!totalAmount || isNaN(parseFloat(totalAmount))) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  if (!frequency) return NextResponse.json({ error: 'Frequency required' }, { status: 400 })
  if (!nextDueDate) return NextResponse.json({ error: 'Next due date required' }, { status: 400 })

  const id = crypto.randomUUID()
  await db.insert(recurringExpenses).values({
    id,
    householdId,
    title: title.trim(),
    totalAmount: parseFloat(totalAmount).toFixed(2),
    frequency,
    nextDueDate: new Date(nextDueDate),
    categoryId: categoryId ?? null,
    notes: notes ?? null,
    splits: splits ? JSON.stringify(splits) : '[]',
    isBill: isBill ?? false,
    dueDay: dueDay ?? null,
    createdBy: session.user.id,
  })

  return NextResponse.json({ id }, { status: 201 })
}
