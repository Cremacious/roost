import { NextRequest } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import {
  user,
  users,
  householdMembers,
  households,
  session as sessionTable,
  account,
} from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const unauth = await requireAdminSession(request)
  if (unauth) return unauth

  const { id } = await params
  const { searchParams } = new URL(request.url)
  const deleteHousehold = searchParams.get('deleteHousehold') === 'true'

  // Verify user exists
  const [targetUser] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  if (!targetUser) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  // Find their household membership (if any) and role
  const membership = await db
    .select({
      householdId: householdMembers.householdId,
      role: householdMembers.role,
      householdName: households.name,
      memberCount: sql<number>`(
        SELECT COUNT(*) FROM household_members
        WHERE household_id = household_members.household_id
          AND deleted_at IS NULL
      )`.as('memberCount'),
    })
    .from(householdMembers)
    .leftJoin(households, eq(householdMembers.householdId, households.id))
    .where(
      and(
        eq(householdMembers.userId, id),
        isNull(householdMembers.deletedAt),
      )
    )
    .limit(1)
    .then(r => r[0] ?? null)

  // If they're an admin of a household with other members and we're not deleting the household,
  // still proceed — household becomes orphaned (by design per approved spec)

  if (deleteHousehold && membership?.householdId) {
    // Hard delete all household data then the household itself
    await deleteHouseholdCascade(membership.householdId)
  }

  // Delete user sessions and accounts (better-auth tables)
  await db.delete(sessionTable).where(eq(sessionTable.userId, id))
  await db.delete(account).where(eq(account.userId, id))

  // Delete household membership rows
  await db.delete(householdMembers).where(eq(householdMembers.userId, id))

  // Delete app user row (cascade from better-auth user via FK)
  await db.delete(users).where(eq(users.id, id))

  // Delete better-auth user row (this cascades sessions/accounts too via DB FK)
  await db.delete(user).where(eq(user.id, id))

  return Response.json({ success: true })
}

/** Hard-delete all content in a household then the household row itself. */
async function deleteHouseholdCascade(householdId: string): Promise<void> {
  // Use raw SQL with cascade to avoid ordering issues
  await db.execute(sql.raw(`
    DELETE FROM reminder_receipts WHERE reminder_id IN (
      SELECT id FROM reminders WHERE household_id = '${householdId}'
    );
    DELETE FROM reminders WHERE household_id = '${householdId}';
    DELETE FROM chore_completions WHERE chore_id IN (
      SELECT id FROM chores WHERE household_id = '${householdId}'
    );
    DELETE FROM chores WHERE household_id = '${householdId}';
    DELETE FROM grocery_items WHERE list_id IN (
      SELECT id FROM grocery_lists WHERE household_id = '${householdId}'
    );
    DELETE FROM grocery_lists WHERE household_id = '${householdId}';
    DELETE FROM event_attendees WHERE event_id IN (
      SELECT id FROM calendar_events WHERE household_id = '${householdId}'
    );
    DELETE FROM calendar_events WHERE household_id = '${householdId}';
    DELETE FROM notes WHERE household_id = '${householdId}';
    DELETE FROM tasks WHERE household_id = '${householdId}';
    DELETE FROM expense_splits WHERE expense_id IN (
      SELECT id FROM expenses WHERE household_id = '${householdId}'
    );
    DELETE FROM expenses WHERE household_id = '${householdId}';
    DELETE FROM meal_plan_slots WHERE household_id = '${householdId}';
    DELETE FROM meal_suggestion_votes WHERE suggestion_id IN (
      SELECT id FROM meal_suggestions WHERE household_id = '${householdId}'
    );
    DELETE FROM meal_suggestions WHERE household_id = '${householdId}';
    DELETE FROM household_activity WHERE household_id = '${householdId}';
    DELETE FROM member_permissions WHERE household_id = '${householdId}';
    DELETE FROM household_members WHERE household_id = '${householdId}';
    DELETE FROM households WHERE id = '${householdId}';
  `))
}
