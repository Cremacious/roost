import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { meal_suggestions } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

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
  if (membership.role !== "admin") {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }

  const [suggestion] = await db
    .select()
    .from(meal_suggestions)
    .where(
      and(
        eq(meal_suggestions.id, id),
        eq(meal_suggestions.household_id, membership.householdId)
      )
    )
    .limit(1);

  if (!suggestion) {
    return Response.json({ error: "Suggestion not found" }, { status: 404 });
  }
  if (suggestion.status !== "suggested") {
    return Response.json({ error: "Suggestion has already been processed" }, { status: 409 });
  }

  const [updated] = await db
    .update(meal_suggestions)
    .set({
      status: "rejected",
      responded_by: session.user.id,
      responded_at: new Date(),
      updated_at: new Date(),
    })
    .where(eq(meal_suggestions.id, id))
    .returning();

  return Response.json({ suggestion: updated });
}
