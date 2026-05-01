import { NextRequest } from "next/server";
import { getUserMemberships, requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { households, users } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

export async function GET(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (response) {
    return response as Response;
  }

  const memberships = await getUserMemberships(session.user.id);
  if (memberships.length === 0) {
    return Response.json({ households: [], activeHouseholdId: null });
  }

  const [userRow] = await db
    .select({ activeHouseholdId: users.active_household_id })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  const householdRows = await db
    .select({
      id: households.id,
      name: households.name,
      code: households.code,
      subscriptionStatus: households.subscription_status,
      premiumExpiresAt: households.premium_expires_at,
    })
    .from(households)
    .where(inArray(households.id, memberships.map((membership) => membership.householdId)));

  const householdMap = new Map(householdRows.map((household) => [household.id, household]));
  const activeHouseholdId =
    memberships.find((membership) => membership.householdId === userRow?.activeHouseholdId)?.householdId ??
    memberships[0]?.householdId ??
    null;

  return Response.json({
    activeHouseholdId,
    households: memberships
      .map((membership) => {
        const household = householdMap.get(membership.householdId);
        if (!household) {
          return null;
        }

        const isPremium =
          household.subscriptionStatus === "premium" &&
          (household.premiumExpiresAt === null ||
            new Date(household.premiumExpiresAt) > new Date());

        return {
          id: household.id,
          name: household.name,
          code: household.code,
          role: membership.role,
          joinedAt: membership.joinedAt,
          isActive: household.id === activeHouseholdId,
          isPremium,
          subscriptionStatus: household.subscriptionStatus,
        };
      })
      .filter(Boolean),
  });
}
