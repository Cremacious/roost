import { NextRequest } from "next/server";
import { and, eq } from "drizzle-orm";
import {
  getUserMemberships,
  requireHouseholdAdmin,
  userHasPremiumHousehold,
} from "@/lib/auth/helpers";
import { FREE_TIER_LIMITS } from "@/lib/constants/freeTierLimits";
import { db } from "@/lib/db";
import { checkMemberLimit } from "@/lib/utils/premiumGating";
import {
  household_join_requests,
  household_members,
  households,
  user,
  users,
} from "@/db/schema";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params;

  let body: { action?: "approve" | "reject" };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (body.action !== "approve" && body.action !== "reject") {
    return Response.json({ error: "Invalid action" }, { status: 400 });
  }

  const [joinRequest] = await db
    .select({
      id: household_join_requests.id,
      householdId: household_join_requests.household_id,
      requesterUserId: household_join_requests.requester_user_id,
      status: household_join_requests.status,
    })
    .from(household_join_requests)
    .where(eq(household_join_requests.id, id))
    .limit(1);

  if (!joinRequest) {
    return Response.json({ error: "Request not found" }, { status: 404 });
  }

  if (joinRequest.status !== "pending") {
    return Response.json(
      { error: "This request has already been handled" },
      { status: 409 },
    );
  }

  let adminContext;
  try {
    adminContext = await requireHouseholdAdmin(request, joinRequest.householdId);
  } catch (response) {
    return response as Response;
  }

  if (body.action === "reject") {
    await db
      .update(household_join_requests)
      .set({
        status: "rejected",
        resolved_at: new Date(),
        resolved_by_user_id: adminContext.user.id,
      })
      .where(eq(household_join_requests.id, joinRequest.id));

    return Response.json({ success: true });
  }

  const [household] = await db
    .select({
      id: households.id,
      name: households.name,
      subscriptionStatus: households.subscription_status,
    })
    .from(households)
    .where(eq(households.id, joinRequest.householdId))
    .limit(1);

  if (!household) {
    return Response.json({ error: "Household not found" }, { status: 404 });
  }

  const [existingMember] = await db
    .select({ id: household_members.id })
    .from(household_members)
    .where(
      and(
        eq(household_members.household_id, joinRequest.householdId),
        eq(household_members.user_id, joinRequest.requesterUserId),
      ),
    )
    .limit(1);

  if (!existingMember) {
    const memberships = await getUserMemberships(joinRequest.requesterUserId);
    const hasPremiumAccess = await userHasPremiumHousehold(
      joinRequest.requesterUserId,
    );

    if (
      memberships.length > 0 &&
      household.subscriptionStatus !== "premium" &&
      !hasPremiumAccess
    ) {
      return Response.json(
        { error: "That user needs premium to join multiple households" },
        { status: 403 },
      );
    }

    if (household.subscriptionStatus !== "premium") {
      const { allowed } = await checkMemberLimit(joinRequest.householdId);
      if (!allowed) {
        return Response.json(
          {
            error: `This household has reached the ${FREE_TIER_LIMITS.members} member limit`,
          },
          { status: 403 },
        );
      }
    }
  }

  const [requesterUser] = await db
    .select({
      id: user.id,
      name: user.name,
      email: user.email,
    })
    .from(user)
    .where(eq(user.id, joinRequest.requesterUserId))
    .limit(1);

  if (!existingMember) {
    await db
      .insert(household_members)
      .values({
        household_id: joinRequest.householdId,
        user_id: joinRequest.requesterUserId,
        role: "member",
      })
      .onConflictDoNothing();
  }

  await db
    .update(household_join_requests)
    .set({
      status: "approved",
      resolved_at: new Date(),
      resolved_by_user_id: adminContext.user.id,
    })
    .where(eq(household_join_requests.id, joinRequest.id));

  await db
    .update(user)
    .set({ onboarding_completed: true })
    .where(eq(user.id, joinRequest.requesterUserId));

  await db
    .update(users)
    .set({ onboarding_completed: true, updated_at: new Date() })
    .where(eq(users.id, joinRequest.requesterUserId));

  return Response.json({
    success: true,
    household: { id: household.id, name: household.name },
    requester: requesterUser
      ? {
          id: requesterUser.id,
          name: requesterUser.name,
          email: requesterUser.email,
        }
      : null,
  });
}
