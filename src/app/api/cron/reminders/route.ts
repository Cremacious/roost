import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { reminders, reminder_receipts, household_members } from "@/db/schema";
import { and, eq, isNull, lte } from "drizzle-orm";
import { calcNextRemindAt } from "@/app/api/reminders/route";

// ---- GET: Vercel cron job — runs every 15 minutes ---------------------------
// Processes due reminders, creates receipts, advances recurring schedules

export async function GET(request: NextRequest): Promise<Response> {
  // Verify cron secret
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const now = new Date();

  // Find all due reminders (next_remind_at <= now, not deleted, not completed)
  const dueReminders = await db
    .select()
    .from(reminders)
    .where(
      and(
        isNull(reminders.deleted_at),
        eq(reminders.completed, false),
        lte(reminders.next_remind_at, now)
      )
    );

  let processed = 0;

  for (const reminder of dueReminders) {
    // Get all household member ids for 'household' notify type
    const memberRows = await db
      .select({ user_id: household_members.user_id })
      .from(household_members)
      .where(eq(household_members.household_id, reminder.household_id));
    const allMemberIds = memberRows.map((m) => m.user_id);

    // Resolve notified user ids
    let notifiedIds: string[] = [];
    if (reminder.notify_type === "household") {
      notifiedIds = allMemberIds;
    } else if (reminder.notify_type === "specific") {
      try {
        notifiedIds = JSON.parse(reminder.notify_user_ids ?? "[]") as string[];
      } catch {
        notifiedIds = [];
      }
    } else {
      notifiedIds = [reminder.created_by];
    }

    // Create receipts for notified users (seen = false)
    if (notifiedIds.length > 0) {
      await db
        .insert(reminder_receipts)
        .values(notifiedIds.map((uid) => ({ reminder_id: reminder.id, user_id: uid })))
        .onConflictDoNothing();
    }

    if (reminder.frequency === "once") {
      // One-time: mark completed after firing
      await db
        .update(reminders)
        .set({ completed: true, completed_at: now, last_sent_at: now, updated_at: now })
        .where(eq(reminders.id, reminder.id));
    } else {
      // Recurring: advance next_remind_at
      const customDays = reminder.custom_days ? (JSON.parse(reminder.custom_days) as number[]) : null;
      const nextRemindAt = calcNextRemindAt(reminder.frequency, customDays, reminder.next_remind_at ?? now);

      await db
        .update(reminders)
        .set({ last_sent_at: now, next_remind_at: nextRemindAt, updated_at: now })
        .where(eq(reminders.id, reminder.id));
    }

    // TODO: when Expo app is built, fire push notifications here for each notified user.
    // Fetch user.push_token from users table and call Expo Push API:
    //   POST https://exp.host/--/api/v2/push/send
    //   body: { to: pushToken, title: reminder.title, body: reminder.note ?? "" }

    processed++;
  }

  return Response.json({ processed });
}
