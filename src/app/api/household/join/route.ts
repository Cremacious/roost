import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { households, household_members } from "@/db/schema";
import { and, eq, ilike, isNull } from "drizzle-orm";
import { checkMemberLimit } from "@/lib/utils/premiumGating";

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

  // Check multi-household: if user already belongs to any household,
  // the target household must be premium
  const [currentMembership] = await db
    .select({ id: household_members.id })
    .from(household_members)
    .where(eq(household_members.user_id, session.user.id))
    .limit(1);

  if (currentMembership && household.subscription_status !== "premium") {
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
        { error: "This household has reached the 5 member limit", code: "MEMBERS_LIMIT", limit: 5 },
        { status: 403 }
      );
    }
  }

  await db.insert(household_members).values({
    household_id: household.id,
    user_id: session.user.id,
    role: "member",
  });

  return Response.json({ household: { id: household.id, name: household.name } });
}
