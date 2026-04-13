import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { getUserHousehold } from "@/app/api/chores/route";
import { db } from "@/lib/db";
import { promo_codes, promo_redemptions } from "@/db/schema";
import { and, desc, eq, gt } from "drizzle-orm";

export async function GET(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (res) {
    return res as Response;
  }

  const membership = await getUserHousehold(session.user.id);
  if (!membership) {
    return Response.json({ error: "No household found" }, { status: 404 });
  }

  // Find active promo redemptions for this household (expiry in the future)
  const redemptions = await db
    .select({
      id: promo_redemptions.id,
      code: promo_codes.code,
      durationDays: promo_codes.duration_days,
      redeemedAt: promo_redemptions.redeemed_at,
      premiumExpiresAt: promo_redemptions.premium_expires_at,
    })
    .from(promo_redemptions)
    .innerJoin(promo_codes, eq(promo_redemptions.promo_code_id, promo_codes.id))
    .where(
      and(
        eq(promo_redemptions.household_id, membership.householdId),
        gt(promo_redemptions.premium_expires_at, new Date())
      )
    )
    .orderBy(desc(promo_redemptions.redeemed_at))
    .limit(5);

  return Response.json({ redemptions });
}
