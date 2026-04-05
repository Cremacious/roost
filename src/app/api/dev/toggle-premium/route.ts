import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { household_members, households } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

export async function POST(request: NextRequest): Promise<Response> {
  if (process.env.NODE_ENV !== "development") {
    return Response.json({ error: "Not available in production" }, { status: 403 });
  }

  let session;
  try {
    session = await requireSession(request);
  } catch (res) {
    return res as Response;
  }

  // Get the user's most recently joined household
  const [membership] = await db
    .select({ householdId: household_members.household_id })
    .from(household_members)
    .where(eq(household_members.user_id, session.user.id))
    .orderBy(desc(household_members.joined_at))
    .limit(1);

  if (!membership) {
    return Response.json({ error: "No household found" }, { status: 404 });
  }

  const [household] = await db
    .select({ subscription_status: households.subscription_status })
    .from(households)
    .where(eq(households.id, membership.householdId))
    .limit(1);

  if (!household) {
    return Response.json({ error: "Household not found" }, { status: 404 });
  }

  const newStatus = household.subscription_status === "premium" ? "free" : "premium";

  await db
    .update(households)
    .set({ subscription_status: newStatus, updated_at: new Date() })
    .where(eq(households.id, membership.householdId));

  return Response.json({ subscription_status: newStatus });
}
