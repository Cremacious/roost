import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { reminders } from '@/db/schema'
import { eq } from 'drizzle-orm'

// Snooze a reminder from the Today hero: push its next fire out by 24 hours so
// it clears from today's hero and resurfaces tomorrow. We intentionally bump
// next_remind_at rather than setting snoozed_until: the Today route filters on
// isNull(snoozed_until), so a set snoozed_until would hide the reminder from the
// hero permanently even after the snooze window passes.
export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId } = membership

  const [existing] = await db.select().from(reminders).where(eq(reminders.id, id)).limit(1)
  if (!existing || existing.householdId !== householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const next = new Date(Date.now() + 24 * 60 * 60 * 1000)

  const [updated] = await db
    .update(reminders)
    .set({ nextRemindAt: next, updatedAt: new Date() })
    .where(eq(reminders.id, id))
    .returning()

  return NextResponse.json({ reminder: updated })
}
