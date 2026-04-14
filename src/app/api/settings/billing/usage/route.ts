import { NextRequest } from "next/server";
import { and, count, eq, isNull } from "drizzle-orm";
import { requireCurrentMembership } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import {
  chores,
  grocery_lists,
  household_members,
  reminders,
} from "@/db/schema";
export async function GET(request: NextRequest): Promise<Response> {
  let authContext;
  try {
    authContext = await requireCurrentMembership(request);
  } catch (response) {
    return response as Response;
  }

  const {
    membership: { householdId },
    user: { id: userId },
  } = authContext;

  const [choresResult, membersResult, groceryListsResult, reminderRows] =
    await Promise.all([
      db
        .select({ total: count(chores.id) })
        .from(chores)
        .where(
          and(eq(chores.household_id, householdId), isNull(chores.deleted_at))
        )
        .then((rows) => rows[0] ?? { total: 0 }),
      db
        .select({ total: count(household_members.id) })
        .from(household_members)
        .where(eq(household_members.household_id, householdId))
        .then((rows) => rows[0] ?? { total: 0 }),
      db
        .select({ total: count(grocery_lists.id) })
        .from(grocery_lists)
        .where(
          and(
            eq(grocery_lists.household_id, householdId),
            isNull(grocery_lists.deleted_at)
          )
        )
        .then((rows) => rows[0] ?? { total: 0 }),
      db
        .select({
          notify_type: reminders.notify_type,
          notify_user_ids: reminders.notify_user_ids,
          created_by: reminders.created_by,
        })
        .from(reminders)
        .where(
          and(
            eq(reminders.household_id, householdId),
            isNull(reminders.deleted_at),
            eq(reminders.completed, false)
          )
        ),
    ]);

  const remindersCount = reminderRows.filter((reminder) => {
    if (reminder.notify_type === "household") return true;
    if (reminder.notify_type === "self") return reminder.created_by === userId;
    if (reminder.notify_type === "specific") {
      try {
        const ids = JSON.parse(reminder.notify_user_ids ?? "[]") as string[];
        return ids.includes(userId);
      } catch {
        return false;
      }
    }
    return false;
  }).length;

  return Response.json({
    choresCount: choresResult.total,
    membersCount: membersResult.total,
    groceryListsCount: groceryListsResult.total,
    remindersCount,
  });
}
