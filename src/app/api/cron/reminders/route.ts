import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { reminders, reminderReceipts, householdMembers } from '@/db/schema'
import { eq, and, isNull, lte, or } from 'drizzle-orm'
import { calcNextRemindAt } from '@/app/api/reminders/route'

export async function GET(req: NextRequest) {
  if (req.headers.get('authorization') !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const now = new Date()

  // Find reminders that are due, not completed, and not currently snoozed
  const due = await db
    .select()
    .from(reminders)
    .where(
      and(
        isNull(reminders.deletedAt),
        eq(reminders.completed, false),
        lte(reminders.nextRemindAt, now),
        or(isNull(reminders.snoozedUntil), lte(reminders.snoozedUntil, now))
      )
    )

  let processed = 0

  for (const reminder of due) {
    try {
      // Determine which user IDs to notify
      let userIds: string[] = []

      if (reminder.notifyType === 'self') {
        userIds = [reminder.createdBy]
      } else if (reminder.notifyType === 'specific') {
        userIds = JSON.parse(reminder.notifyUserIds ?? '[]') as string[]
      } else if (reminder.notifyType === 'household') {
        const members = await db
          .select({ userId: householdMembers.userId })
          .from(householdMembers)
          .where(
            and(
              eq(householdMembers.householdId, reminder.householdId),
              isNull(householdMembers.deletedAt)
            )
          )
        userIds = members.map(m => m.userId)
      }

      // Compute the advance target before opening the transaction (no reads inside
      // the tx, which the Neon HTTP driver runs as a single batched request).
      const isOnce = !reminder.frequency || reminder.frequency === 'once'
      let nextDate: Date | null = null
      if (!isOnce) {
        // Advance next_remind_at past now to avoid re-firing in the same run
        nextDate = calcNextRemindAt(
          new Date(reminder.nextRemindAt),
          reminder.frequency,
          reminder.customDays
        )
        while (nextDate <= now) {
          nextDate = calcNextRemindAt(nextDate, reminder.frequency, reminder.customDays)
        }
      }

      // Insert every receipt and advance/complete the reminder atomically. If the
      // run dies mid-write nothing commits, so the reminder is still due next run
      // and is reprocessed cleanly (no duplicate receipts). There is intentionally
      // no unique constraint on (reminder_id, user_id) because a recurring reminder
      // legitimately re-notifies the same user on each occurrence.
      await db.transaction(async tx => {
        if (userIds.length > 0) {
          await tx.insert(reminderReceipts).values(
            userIds.map(userId => ({
              reminderId: reminder.id,
              userId,
              seen: false,
            }))
          )
        }

        if (isOnce) {
          await tx
            .update(reminders)
            .set({ completed: true })
            .where(eq(reminders.id, reminder.id))
        } else {
          await tx
            .update(reminders)
            .set({ nextRemindAt: nextDate as Date, snoozedUntil: null })
            .where(eq(reminders.id, reminder.id))
        }
      })

      processed++
    } catch (err) {
      console.error(`Failed to process reminder ${reminder.id}:`, err)
    }
  }

  return NextResponse.json({ ok: true, processed })
}
