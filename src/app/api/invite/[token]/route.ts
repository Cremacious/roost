import { NextRequest } from "next/server";
import {
  getUserMemberships,
  requireSession,
  setUserActiveHousehold,
  userHasPremiumHousehold,
} from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { household_invites, household_members, households, user, users } from "@/db/schema";
import { and, count, eq, isNull } from "drizzle-orm";
import { logActivity } from "@/lib/utils/activity";
import { format } from "date-fns";
import { checkMemberLimit } from "@/lib/utils/premiumGating";
import { FREE_TIER_LIMITS } from "@/lib/constants/freeTierLimits";

// Default guest permissions: all 12 permission keys
const GUEST_PERMISSIONS: { permission: string; enabled: boolean }[] = [
  { permission: "expenses.view", enabled: true },
  { permission: "expenses.add", enabled: true },
  { permission: "chores.add", enabled: false },
  { permission: "chores.edit", enabled: false },
  { permission: "grocery.add", enabled: true },
  { permission: "grocery.create_list", enabled: false },
  { permission: "calendar.add", enabled: true },
  { permission: "calendar.edit", enabled: false },
  { permission: "tasks.add", enabled: true },
  { permission: "notes.add", enabled: false },
  { permission: "meals.plan", enabled: false },
  { permission: "meals.suggest", enabled: true },
];

// ---- Shared lookup ----------------------------------------------------------

async function findValidInvite(token: string) {
  const [invite] = await db
    .select()
    .from(household_invites)
    .where(
      and(
        eq(household_invites.token, token),
        isNull(household_invites.deleted_at),
        isNull(household_invites.accepted_at)
      )
    )
    .limit(1);
  return invite ?? null;
}

// ---- GET: Preview the invite ------------------------------------------------

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<Response> {
  const { token } = await params;

  const invite = await findValidInvite(token);

  if (!invite) {
    return Response.json(
      { error: "Invite not found or already used", code: "INVITE_NOT_FOUND" },
      { status: 404 }
    );
  }

  if (invite.link_expires_at < new Date()) {
    return Response.json(
      { error: "This invite link has expired", code: "INVITE_EXPIRED" },
      { status: 410 }
    );
  }

  const [household] = await db
    .select({ name: households.name })
    .from(households)
    .where(eq(households.id, invite.household_id))
    .limit(1);

  return Response.json({
    valid: true,
    household_name: household?.name ?? "Unknown household",
    invite_type: invite.is_guest ? "guest" : "member",
    expires_at: invite.expires_at.toISOString(),
    link_expires_at: invite.link_expires_at.toISOString(),
    email: invite.email,
  });
}

// ---- POST: Redeem the invite ------------------------------------------------

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<Response> {
  const { token } = await params;

  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const invite = await findValidInvite(token);

  if (!invite) {
    return Response.json(
      { error: "Invite not found or already used", code: "INVITE_NOT_FOUND" },
      { status: 404 }
    );
  }

  if (invite.link_expires_at < new Date()) {
    return Response.json(
      { error: "This invite link has expired", code: "INVITE_EXPIRED" },
      { status: 410 }
    );
  }

  const [household] = await db
    .select({
      id: households.id,
      name: households.name,
      subscriptionStatus: households.subscription_status,
    })
    .from(households)
    .where(eq(households.id, invite.household_id))
    .limit(1);

  if (!household) {
    return Response.json({ error: "Household not found" }, { status: 404 });
  }

  // Check already a member
  const [existing] = await db
    .select({ id: household_members.id })
    .from(household_members)
    .where(
      and(
        eq(household_members.household_id, invite.household_id),
        eq(household_members.user_id, session.user.id)
      )
    )
    .limit(1);

  if (existing) {
    return Response.json(
      { error: "You are already a member of this household" },
      { status: 409 }
    );
  }

  // Sanity cap: no household should have more than 50 members
  const [countRow] = await db
    .select({ count: count() })
    .from(household_members)
    .where(eq(household_members.household_id, invite.household_id));

  if (countRow && countRow.count >= 50) {
    return Response.json({ error: "Household is at capacity" }, { status: 403 });
  }

  const memberships = await getUserMemberships(session.user.id);
  const hasPremiumAccess = await userHasPremiumHousehold(session.user.id);
  if (
    memberships.length > 0 &&
    household.subscriptionStatus !== "premium" &&
    !hasPremiumAccess
  ) {
    return Response.json(
      { error: "Upgrade to premium to join multiple households" },
      { status: 403 }
    );
  }

  if (!invite.is_guest && household.subscriptionStatus !== "premium") {
    const { allowed } = await checkMemberLimit(household.id);
    if (!allowed) {
      return Response.json(
        {
          error: `This household has reached the ${FREE_TIER_LIMITS.members} member limit`,
          code: "MEMBERS_LIMIT",
          limit: FREE_TIER_LIMITS.members,
        },
        { status: 403 }
      );
    }
  }

  await db.insert(household_members).values({
    household_id: invite.household_id,
    user_id: session.user.id,
    role: invite.is_guest ? "guest" : "member",
    expires_at: invite.is_guest ? invite.expires_at : null,
  });

  // Set default guest permissions
  if (invite.is_guest) {
    await db
      .insert(
        // member_permissions table
        (await import("@/db/schema")).member_permissions
      )
      .values(
        GUEST_PERMISSIONS.map((p) => ({
          household_id: invite.household_id,
          user_id: session.user.id,
          permission: p.permission,
          enabled: p.enabled,
        }))
      )
      .onConflictDoNothing();
  }

  // Mark invite as accepted
  await db
    .update(household_invites)
    .set({
      accepted_at: new Date(),
      accepted_by_user_id: session.user.id,
    })
    .where(eq(household_invites.id, invite.id));

  await setUserActiveHousehold(session.user.id, invite.household_id);

  await Promise.all([
    db.update(user).set({ onboarding_completed: true }).where(eq(user.id, session.user.id)),
    db.update(users).set({ onboarding_completed: true }).where(eq(users.id, session.user.id)),
  ]);

  // Log activity
  const [userRow] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);
  const name = userRow?.name ?? session.user.name ?? "Someone";
  await logActivity({
    householdId: invite.household_id,
    userId: session.user.id,
    type: invite.is_guest ? "guest_joined" : "member_joined",
    description: invite.is_guest
      ? `${name} joined as a guest (access until ${format(invite.expires_at, "MMM d, yyyy")})`
      : `${name} joined the household`,
    entityId: invite.id,
    entityType: "household_invite",
  });

  return Response.json({
    success: true,
    household_id: invite.household_id,
    invite_type: invite.is_guest ? "guest" : "member",
  });
}
