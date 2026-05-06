import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { expenseCategories } from '@/db/schema'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

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
    suggestedBy: session.user.id,
    status: 'pending',
  })

  return NextResponse.json({ id }, { status: 201 })
}
