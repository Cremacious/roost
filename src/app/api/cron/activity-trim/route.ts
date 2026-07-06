import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { householdActivity } from '@/db/schema'
import { lt } from 'drizzle-orm'

// Runs weekly. Deletes household_activity rows older than 90 days.
// household_activity is consumed only by Stats, the admin panel, and user data
// export (there is no /activity page in v2), so rows older than 90 days have zero
// user-visible value but accumulate fast at scale (every chore, grocery check,
// expense, etc. writes a row).
export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - 90)

  const result = await db
    .delete(householdActivity)
    .where(lt(householdActivity.createdAt, cutoff))
    .returning({ id: householdActivity.id })

  const deleted = result.length

  console.log(`[activity-trim] Deleted ${deleted} activity rows older than 90 days`)

  return NextResponse.json({ ok: true, deleted, cutoff: cutoff.toISOString() })
}
