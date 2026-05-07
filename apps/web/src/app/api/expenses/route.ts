import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import {
  expenses,
  expenseSplits,
  expenseCategories,
  users,
  householdMembers,
} from '@/db/schema'
import { eq, and, isNull, desc, inArray } from 'drizzle-orm'
import { simplifyDebts, type RawSplit } from '@/lib/utils/debtSimplification'

export async function GET(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const isPremium = membership.household.subscriptionStatus === 'premium'

  const [expenseRows, splitRows, categoryRows, memberRows] = await Promise.all([
    db
      .select({
        id: expenses.id,
        title: expenses.title,
        amount: expenses.amount,
        categoryId: expenses.categoryId,
        paidBy: expenses.paidBy,
        notes: expenses.notes,
        receiptData: expenses.receiptData,
        isRecurringDraft: expenses.isRecurringDraft,
        recurringTemplateId: expenses.recurringTemplateId,
        createdAt: expenses.createdAt,
        updatedAt: expenses.updatedAt,
        paidByName: users.name,
        paidByColor: users.avatarColor,
      })
      .from(expenses)
      .leftJoin(users, eq(expenses.paidBy, users.id))
      .where(and(eq(expenses.householdId, householdId), isNull(expenses.deletedAt)))
      .orderBy(desc(expenses.createdAt)),

    db
      .select()
      .from(expenseSplits)
      .where(eq(expenseSplits.householdId, householdId)),

    db
      .select({ id: expenseCategories.id, name: expenseCategories.name, icon: expenseCategories.icon, color: expenseCategories.color })
      .from(expenseCategories)
      .where(and(eq(expenseCategories.householdId, householdId), isNull(expenseCategories.deletedAt))),

    db
      .select({ userId: householdMembers.userId, name: users.name, avatarColor: users.avatarColor, venmoHandle: users.venmoHandle, cashappHandle: users.cashappHandle })
      .from(householdMembers)
      .leftJoin(users, eq(householdMembers.userId, users.id))
      .where(and(eq(householdMembers.householdId, householdId), isNull(householdMembers.deletedAt))),
  ])

  const categoryMap = new Map(categoryRows.map(c => [c.id, c]))
  const splitsByExpense = new Map<string, typeof splitRows>()
  for (const s of splitRows) {
    const arr = splitsByExpense.get(s.expenseId) ?? []
    arr.push(s)
    splitsByExpense.set(s.expenseId, arr)
  }

  const myUserId = session.user.id

  const regularExpenses = expenseRows.filter(e => !e.isRecurringDraft)
  const recurringDrafts = expenseRows.filter(e => e.isRecurringDraft)

  const expensesWithSplits = regularExpenses.map(e => {
    const splits = splitsByExpense.get(e.id) ?? []
    const mySplit = splits.find(s => s.userId === myUserId)
    const myShare = mySplit ? parseFloat(mySplit.amount) : 0
    const iMade = e.paidBy === myUserId
    const settled = !mySplit || mySplit.settled

    let myPosition: 'owed_back' | 'you_owe' | 'settled' | null = null
    if (splits.length > 0) {
      if (settled) myPosition = 'settled'
      else if (iMade) myPosition = 'owed_back'
      else myPosition = 'you_owe'
    }

    return {
      ...e,
      amount: e.amount,
      category: e.categoryId ? categoryMap.get(e.categoryId) ?? null : null,
      splits: splits.map(s => ({
        id: s.id,
        userId: s.userId,
        amount: s.amount,
        settled: s.settled,
        settledByPayer: s.settledByPayer,
        settledByPayee: s.settledByPayee,
        settlementDisputed: s.settlementDisputed,
        settlementLastRemindedAt: s.settlementLastRemindedAt,
        settledAt: s.settledAt,
      })),
      myPosition,
      myShare: iMade ? null : myShare,
    }
  })

  // build raw splits for debt simplification
  const rawSplits: RawSplit[] = []
  for (const e of regularExpenses) {
    const splits = splitsByExpense.get(e.id) ?? []
    for (const s of splits) {
      if (s.userId === e.paidBy) continue // payer split, skip
      rawSplits.push({
        creditorId: e.paidBy,
        debtorId: s.userId,
        amount: parseFloat(s.amount),
        splitId: s.id,
        settled: s.settled,
        settledByPayer: s.settledByPayer,
        settledByPayee: s.settledByPayee,
        settlementDisputed: s.settlementDisputed,
        settlementLastRemindedAt: s.settlementLastRemindedAt,
        settledAt: s.settledAt,
      })
    }
  }

  const debts = simplifyDebts(rawSplits)

  // my balance
  const owedToMe = debts.filter(d => d.to === myUserId).reduce((s, d) => s + d.amount, 0)
  const iOwe = debts.filter(d => d.from === myUserId).reduce((s, d) => s + d.amount, 0)

  // total spent this month
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const totalSpentThisMonth = regularExpenses
    .filter(e => new Date(e.createdAt) >= monthStart)
    .reduce((s, e) => s + parseFloat(e.amount), 0)

  const memberMap = new Map(memberRows.map(m => [m.userId, { name: m.name, avatarColor: m.avatarColor, venmoHandle: m.venmoHandle, cashappHandle: m.cashappHandle }]))

  const enrichedDebts = debts.map(d => ({
    ...d,
    fromName: memberMap.get(d.from)?.name ?? 'Unknown',
    fromColor: memberMap.get(d.from)?.avatarColor ?? null,
    toName: memberMap.get(d.to)?.name ?? 'Unknown',
    toColor: memberMap.get(d.to)?.avatarColor ?? null,
    toVenmoHandle: memberMap.get(d.to)?.venmoHandle ?? null,
    toCashappHandle: memberMap.get(d.to)?.cashappHandle ?? null,
  }))

  return NextResponse.json({
    expenses: expensesWithSplits,
    recurringDrafts,
    debts: enrichedDebts,
    members: memberRows,
    myBalance: { owedToMe: Math.round(owedToMe * 100) / 100, iOwe: Math.round(iOwe * 100) / 100 },
    totalSpentThisMonth: Math.round(totalSpentThisMonth * 100) / 100,
    isPremium,
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  if (membership.household.subscriptionStatus !== 'premium') {
    return NextResponse.json({ error: 'Premium required', code: 'EXPENSES_PREMIUM' }, { status: 403 })
  }

  const body = await req.json()
  const { title, amount, categoryId, paidBy, notes, receiptData, splits } = body

  if (!title?.trim()) return NextResponse.json({ error: 'Title required' }, { status: 400 })
  if (!amount || isNaN(parseFloat(amount))) return NextResponse.json({ error: 'Invalid amount' }, { status: 400 })
  if (!paidBy) return NextResponse.json({ error: 'Paid by required' }, { status: 400 })
  if (!splits?.length) return NextResponse.json({ error: 'Splits required' }, { status: 400 })

  const invalidSplit = (splits as { userId: string; amount: string }[]).find(sp => !sp.userId)
  if (invalidSplit) {
    return NextResponse.json({ error: 'Invalid split: missing user ID' }, { status: 400 })
  }

  const totalSplit = splits.reduce((s: number, sp: { amount: string }) => s + parseFloat(sp.amount), 0)
  if (Math.abs(totalSplit - parseFloat(amount)) > 0.02) {
    return NextResponse.json({ error: 'Splits must sum to total amount' }, { status: 400 })
  }

  const expenseId = crypto.randomUUID()

  await db.insert(expenses).values({
    id: expenseId,
    householdId,
    title: title.trim(),
    amount: parseFloat(amount).toFixed(2),
    categoryId: categoryId ?? null,
    paidBy,
    notes: notes ?? null,
    receiptData: receiptData ?? null,
  })

  if (splits.length > 0) {
    await db.insert(expenseSplits).values(
      splits.map((sp: { userId: string; amount: string }) => ({
        id: crypto.randomUUID(),
        expenseId,
        householdId,
        userId: sp.userId,
        amount: parseFloat(sp.amount).toFixed(2),
      }))
    )
  }

  return NextResponse.json({ id: expenseId }, { status: 201 })
}
