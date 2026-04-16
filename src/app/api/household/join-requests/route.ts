import { NextRequest } from "next/server";
import { and, desc, eq, ilike, isNull } from "drizzle-orm";
import {
  getCurrentMembership,
  getUserMemberships,
  requireSession,
  userHasPremiumHousehold,
} from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import {
  household_join_requests,
  household_members,
  households,
  user,
} from "@/db/schema";

export async function GET(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (response) {
    return response as Response;
  }

  const currentMembership = await getCurrentMembership(request);
  const isAdmin = currentMembership?.role === "admin";

  const [incomingRows, outgoingRows] = await Promise.all([
    isAdmin
      ? db
          .select({
            id: household_join_requests.id,
            householdId: households.id,
            householdName: households.name,
            requesterUserId: household_join_requests.requester_user_id,
            requesterName: user.name,
            requesterEmail: user.email,
            createdAt: household_join_requests.created_at,
          })
          .from(household_join_requests)
          .innerJoin(
            households,
            eq(household_join_requests.household_id, households.id),
          )
          .innerJoin(
            user,
            eq(household_join_requests.requester_user_id, user.id),
          )
          .where(
            and(
              eq(household_join_requests.household_id, currentMembership!.householdId),
              eq(household_join_requests.status, "pending"),
              isNull(households.deleted_at),
            ),
          )
          .orderBy(desc(household_join_requests.created_at))
      : Promise.resolve([]),
    db
      .select({
        id: household_join_requests.id,
        householdId: households.id,
        householdName: households.name,
        createdAt: household_join_requests.created_at,
      })
      .from(household_join_requests)
      .innerJoin(households, eq(household_join_requests.household_id, households.id))
      .where(
        and(
          eq(household_join_requests.requester_user_id, session.user.id),
          eq(household_join_requests.status, "pending"),
          isNull(households.deleted_at),
        ),
      )
      .orderBy(desc(household_join_requests.created_at)),
  ]);

  return Response.json({
    isAdmin,
    incoming: incomingRows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
    outgoing: outgoingRows.map((row) => ({
      ...row,
      createdAt: row.createdAt.toISOString(),
    })),
  });
}

export async function POST(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (response) {
    return response as Response;
  }

  const currentMembership = await getCurrentMembership(request);
  if (currentMembership?.role === "child") {
    return Response.json(
      { error: "Child accounts cannot request to join another household" },
      { status: 403 },
    );
  }

  let body: { code?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const code = body.code?.trim().toUpperCase();
  if (!code) {
    return Response.json({ error: "Household code is required" }, { status: 400 });
  }

  const [household] = await db
    .select({
      id: households.id,
      name: households.name,
      subscriptionStatus: households.subscription_status,
    })
    .from(households)
    .where(and(ilike(households.code, code), isNull(households.deleted_at)))
    .limit(1);

  if (!household) {
    return Response.json({ error: "Household not found" }, { status: 404 });
  }

  const [existingMember] = await db
    .select({ id: household_members.id })
    .from(household_members)
    .where(
      and(
        eq(household_members.household_id, household.id),
        eq(household_members.user_id, session.user.id),
      ),
    )
    .limit(1);

  if (existingMember) {
    return Response.json(
      { error: "You are already a member of this household" },
      { status: 400 },
    );
  }

  const [existingPending] = await db
    .select({ id: household_join_requests.id })
    .from(household_join_requests)
    .where(
      and(
        eq(household_join_requests.household_id, household.id),
        eq(household_join_requests.requester_user_id, session.user.id),
        eq(household_join_requests.status, "pending"),
      ),
    )
    .limit(1);

  if (existingPending) {
    return Response.json(
      { error: "You already have a pending request for this household" },
      { status: 409 },
    );
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
      { status: 403 },
    );
  }

  const [joinRequest] = await db
    .insert(household_join_requests)
    .values({
      household_id: household.id,
      requester_user_id: session.user.id,
    })
    .returning({
      id: household_join_requests.id,
      createdAt: household_join_requests.created_at,
    });

  return Response.json({
    request: {
      id: joinRequest.id,
      householdId: household.id,
      householdName: household.name,
      createdAt: joinRequest.createdAt.toISOString(),
    },
  });
}
