import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { allowance_payouts, users } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

// ---- GET: Allowance payout history for the household ------------------------
// Optional query param: ?userId=xxx to filter to a specific child

export async function GET(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const membership = await getUserHousehold(session.user.id);
  if (!membership) {
    return Response.json({ error: "No household found" }, { status: 404 });
  }

  const { searchParams } = new URL(request.url);
  const filterUserId = searchParams.get("userId");

  const conditions = [eq(allowance_payouts.household_id, membership.householdId)];
  if (filterUserId) {
    conditions.push(eq(allowance_payouts.user_id, filterUserId));
  }

  const payouts = await db
    .select({
      id: allowance_payouts.id,
      user_id: allowance_payouts.user_id,
      week_start: allowance_payouts.week_start,
      amount: allowance_payouts.amount,
      earned: allowance_payouts.earned,
      completion_rate: allowance_payouts.completion_rate,
      threshold_percent: allowance_payouts.threshold_percent,
      expense_id: allowance_payouts.expense_id,
      created_at: allowance_payouts.created_at,
      child_name: users.name,
      child_avatar: users.avatar_color,
    })
    .from(allowance_payouts)
    .innerJoin(users, eq(users.id, allowance_payouts.user_id))
    .where(and(...conditions))
    .orderBy(desc(allowance_payouts.week_start));

  return Response.json({ payouts });
}
