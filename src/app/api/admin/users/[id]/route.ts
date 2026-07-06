import { NextRequest } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { db } from '@/lib/db'
import {
  user,
  users,
  householdMembers,
  memberPermissions,
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
    .select({ id: users.id })
    .from(users)
    .where(eq(users.id, id))
    .limit(1)

  if (!targetUser) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  // Find their (non-deleted) household membership, if any — needed for the
  // "delete user + household" path.
  const membership = await db
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.userId, id),
        isNull(householdMembers.deletedAt),
      )
    )
    .limit(1)
    .then(r => r[0] ?? null)

  if (deleteHousehold && membership?.householdId) {
    await deleteHouseholdCascade(membership.householdId)
  }

  // Anonymize the account rather than hard-deleting the users row.
  //
  // Roughly 20 content tables (household_activity, chores, expenses, tasks,
  // grocery, meals, reminders, rewards, notes, calendar, notifications,
  // promo_redemptions, ...) reference users.id with no ON DELETE rule, so a
  // hard delete throws a foreign-key violation for any user who has ever
  // created content. Anonymizing keeps the row (and every FK target) valid,
  // preserves surviving-household history as "Former Member" (per CLAUDE.md),
  // and revokes the account so it can no longer sign in.
  await anonymizeUserAccount(id)

  return Response.json({ success: true })
}

/**
 * Anonymize + deactivate a user account without deleting the users row.
 * Revokes auth, removes household memberships, and scrubs PII on both the app
 * `users` row and the better-auth `user` row (which is kept — deleting it would
 * cascade to the users row and re-introduce the FK violations we avoid here).
 */
async function anonymizeUserAccount(userId: string): Promise<void> {
  // Revoke auth: sessions + credential/oauth account rows.
  await db.delete(sessionTable).where(eq(sessionTable.userId, userId))
  await db.delete(account).where(eq(account.userId, userId))

  // Remove from every household. Nothing references these rows by their own id
  // that we need to preserve, and content FKs point at users.id (kept below).
  await db.delete(memberPermissions).where(eq(memberPermissions.userId, userId))
  await db.delete(householdMembers).where(eq(householdMembers.userId, userId))

  // Scrub the app users row but keep it so authored content stays valid.
  await db
    .update(users)
    .set({
      name: 'Former Member',
      email: null,
      avatarColor: '#9CA3AF',
      latitude: null,
      longitude: null,
      pushToken: null,
      venmoHandle: null,
      cashappHandle: null,
      activeHouseholdId: null,
      isChildAccount: false,
      childOfHouseholdId: null,
      hasSeenWelcome: true,
      deletedAt: new Date(),
    })
    .where(eq(users.id, userId))

  // Scrub the better-auth user row too. Email is unique + NOT NULL there, so a
  // per-user tombstone frees the original address for reuse.
  await db
    .update(user)
    .set({
      name: 'Former Member',
      email: `deleted+${userId}@roost.deleted`,
      emailVerified: false,
      image: null,
    })
    .where(eq(user.id, userId))
}

/**
 * Hard-delete a household and all of its content. Every table that references
 * households.id uses ON DELETE CASCADE, so a single delete removes chores,
 * expenses, grocery, calendar, meals, notes, tasks, reminders, rewards,
 * memberships, activity, and everything else in one shot.
 */
async function deleteHouseholdCascade(householdId: string): Promise<void> {
  await db.delete(households).where(eq(households.id, householdId))
}
