import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin/requireAdmin";
import { db } from "@/lib/db";
import { households } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { logActivity } from "@/lib/utils/activity";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const authError = await requireAdminSession(request);
  if (authError) return authError;

  const { id } = await params;

  let body: { subscription_status?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { subscription_status } = body;
  if (subscription_status !== "premium" && subscription_status !== "free") {
    return Response.json(
      { error: "subscription_status must be 'premium' or 'free'" },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select({ id: households.id, subscription_upgraded_at: households.subscription_upgraded_at })
    .from(households)
    .where(eq(households.id, id))
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Household not found" }, { status: 404 });
  }

  let updated;
  if (subscription_status === "premium") {
    [updated] = await db
      .update(households)
      .set({
        subscription_status: "premium",
        // Only set subscription_upgraded_at if it hasn't been set before
        subscription_upgraded_at: existing.subscription_upgraded_at ?? new Date(),
        premium_expires_at: null,
        updated_at: new Date(),
      })
      .where(eq(households.id, id))
      .returning();
  } else {
    [updated] = await db
      .update(households)
      .set({
        subscription_status: "free",
        stripe_subscription_id: null,
        premium_expires_at: null,
        updated_at: new Date(),
        // Note: stripe_customer_id intentionally preserved
      })
      .where(eq(households.id, id))
      .returning();
  }

  await logActivity({
    householdId: id,
    userId: "admin",
    type: "subscription_override",
    description: `Subscription manually set to ${subscription_status} by Roost admin`,
  });

  return Response.json({ household: updated });
}
