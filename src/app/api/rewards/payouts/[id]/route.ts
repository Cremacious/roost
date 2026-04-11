import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { reward_payouts, users } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { logActivity } from "@/lib/utils/activity";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const { id } = await params;
  const userId = session.user.id;

  const membership = await getUserHousehold(userId);
  if (!membership) {
    return Response.json({ error: "No household found" }, { status: 404 });
  }

  // Fetch payout — must belong to current user
  const [payout] = await db
    .select()
    .from(reward_payouts)
    .where(
      and(
        eq(reward_payouts.id, id),
        eq(reward_payouts.user_id, userId),
        eq(reward_payouts.household_id, membership.householdId)
      )
    )
    .limit(1);

  if (!payout) {
    return Response.json({ error: "Payout not found" }, { status: 404 });
  }

  if (payout.acknowledged) {
    return Response.json({ success: true });
  }

  await db
    .update(reward_payouts)
    .set({ acknowledged: true })
    .where(eq(reward_payouts.id, id));

  // Build description for activity log
  const [userRow] = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const childName = userRow?.name ?? "Child";
  const rewardDesc =
    payout.reward_type === "money" && payout.reward_amount
      ? `$${parseFloat(String(payout.reward_amount)).toFixed(2)}`
      : payout.reward_description ?? "reward";

  await logActivity({
    householdId: membership.householdId,
    userId,
    type: "allowance_earned",
    description: `${childName} claimed their reward: ${rewardDesc}`,
    entityType: "allowance",
  });

  return Response.json({ success: true });
}
