import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { expenseBudgets } from '@/db/schema'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()
  // Reset period to the start of the current month
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const result = await db
    .update(expenseBudgets)
    .set({
      periodStart,
      lastResetAt: now,
    })
    .returning({ id: expenseBudgets.id })

  return NextResponse.json({ ok: true, reset: result.length, periodStart })
}
