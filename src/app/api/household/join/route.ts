import { NextRequest } from "next/server";
import {
  getUserMemberships,
  requireSession,
  setUserActiveHousehold,
  userHasPremiumHousehold,
} from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { households, household_members, user, users } from "@/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { checkMemberLimit } from "@/lib/utils/premiumGating";
import { FREE_TIER_LIMITS } from "@/lib/constants/freeTierLimits";

export async function POST(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (res) {
    return res as Response;
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
    .select()
    .from(households)
    .where(and(ilike(households.code, code), isNull(households.deleted_at)))
    .limit(1);

  if (!household) {
    return Response.json({ error: "Household not found" }, { status: 404 });
  }

  // Check if already a member
  const [existing] = await db
    .select({ id: household_members.id })
    .from(household_members)
    .where(
      and(
        eq(household_members.household_id, household.id),
        eq(household_members.user_id, session.user.id)
      )
    )
    .limit(1);

  if (existing) {
    return Response.json({ error: "You are already a member of this household" }, { status: 400 });
  }

  const memberships = await getUserMemberships(session.user.id);
  const hasPremiumAccess = await userHasPremiumHousehold(session.user.id);

  if (
    memberships.length > 0 &&
    household.subscription_status !== "premium" &&
    !hasPremiumAccess
  ) {
    return Response.json(
      { error: "Upgrade to premium to join multiple households" },
      { status: 403 }
    );
  }

  // Check member limit for free tier
  if (household.subscription_status !== "premium") {
    const { allowed } = await checkMemberLimit(household.id);
    if (!allowed) {
      return Response.json(
        { error: `This household has reached the ${FREE_TIER_LIMITS.members} member limit`, code: "MEMBERS_LIMIT", limit: FREE_TIER_LIMITS.members },
        { status: 403 }
      );
    }
  }

  await db.insert(household_members).values({
    household_id: household.id,
    user_id: session.user.id,
    role: "member",
  });

  await setUserActiveHousehold(session.user.id, household.id);

  // Mark onboarding complete on both the better-auth user table (session-visible)
  // and the app users table (app-visible).
  await Promise.all([
    db.update(user).set({ onboarding_completed: true }).where(eq(user.id, session.user.id)),
    db.update(users).set({ onboarding_completed: true }).where(eq(users.id, session.user.id)),
  ]);

  return Response.json({ household: { id: household.id, name: household.name } });
}
