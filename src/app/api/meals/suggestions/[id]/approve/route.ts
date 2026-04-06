import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { meal_suggestions, meals } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

// ---- POST -------------------------------------------------------------------

export async function POST(
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
  const { householdId } = membership;

  const [suggestion] = await db
    .select()
    .from(meal_suggestions)
    .where(and(eq(meal_suggestions.id, id), eq(meal_suggestions.household_id, householdId)))
    .limit(1);

  if (!suggestion) {
    return Response.json({ error: "Suggestion not found" }, { status: 404 });
  }

  let body: { addToBank?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    // optional body
  }

  const [updated] = await db
    .update(meal_suggestions)
    .set({ status: "approved" })
    .where(eq(meal_suggestions.id, id))
    .returning();

  let meal = null;
  if (body.addToBank) {
    [meal] = await db.insert(meals).values({
      household_id: householdId,
      name: suggestion.meal_name,
      category: suggestion.category ?? "dinner",
      prep_time: suggestion.prep_time ?? null,
      ingredients: suggestion.ingredients ?? null,
      created_by: session.user.id,
    }).returning();
  }

  return Response.json({ suggestion: updated, meal });
}
