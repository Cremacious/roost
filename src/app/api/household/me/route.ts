import { NextRequest } from "next/server";
import { getUserMemberships, requireCurrentMembership } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { households, member_permissions } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function GET(request: NextRequest): Promise<Response> {
  let authContext;
  try {
    authContext = await requireCurrentMembership(request);
  } catch (res) {
    return res as Response;
  }

  const {
    membership,
    user: { id: userId },
  } = authContext;

  const [household] = await db
    .select({
      id: households.id,
      name: households.name,
      code: households.code,
      subscription_status: households.subscription_status,
      stripe_customer_id: households.stripe_customer_id,
      stripe_subscription_id: households.stripe_subscription_id,
      stripe_price_id: households.stripe_price_id,
      premium_expires_at: households.premium_expires_at,
      created_by: households.created_by,
    })
    .from(households)
    .where(eq(households.id, membership.householdId))
    .limit(1);

  if (!household) {
    return Response.json({ error: "Household not found" }, { status: 404 });
  }

  const permissionRows = await db
    .select({
      permission: member_permissions.permission,
      householdId: member_permissions.household_id,
    })
    .from(member_permissions)
    .where(eq(member_permissions.user_id, userId));

  const permissions = permissionRows
    .filter(
      (permissionRow) =>
        permissionRow.permission && permissionRow.householdId === membership.householdId
    )
    .map((p) => p.permission);
  const memberships = await getUserMemberships(userId);

  return Response.json({
    household,
    role: membership.role,
    permissions,
    activeHouseholdId: membership.householdId,
    membershipCount: memberships.length,
  });
}
