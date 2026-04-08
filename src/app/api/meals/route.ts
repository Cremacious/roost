import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { meals, households } from "@/db/schema";
import { and, asc, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { checkMealBankLimit } from "@/lib/utils/premiumGating";
import { FREE_TIER_LIMITS } from "@/lib/constants/freeTierLimits";

// ---- GET --------------------------------------------------------------------

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
  const { householdId } = membership;

  const mealRows = await db
    .select()
    .from(meals)
    .where(and(eq(meals.household_id, householdId), isNull(meals.deleted_at)))
    .orderBy(asc(meals.name));

  return Response.json({ meals: mealRows });
}

// ---- POST -------------------------------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
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
  if (membership.role === "child") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const { householdId } = membership;

  // Premium check
  const [household] = await db
    .select({ subscription_status: households.subscription_status })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);
  if (household?.subscription_status !== "premium") {
    const { allowed, count } = await checkMealBankLimit(householdId);
    if (!allowed) {
      return Response.json(
        { error: "Free tier limit reached", code: "MEAL_BANK_LIMIT", limit: FREE_TIER_LIMITS.mealBank, current: count },
        { status: 403 }
      );
    }
  }

  let body: {
    name?: string;
    description?: string;
    category?: string;
    ingredients?: string[];
    prep_time?: number;
  };
  try {
    body = await request.json();
  } catch (err) {
    console.error("[POST /api/meals] Failed to parse body:", err);
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }
  if (!body.category) {
    return Response.json({ error: "Category is required" }, { status: 400 });
  }

  const ingredients = Array.isArray(body.ingredients)
    ? body.ingredients.filter((i) => i.trim())
    : [];

  const [meal] = await db
    .insert(meals)
    .values({
      household_id: householdId,
      name: body.name.trim(),
      description: body.description?.trim() || null,
      category: body.category,
      ingredients: ingredients.length > 0 ? JSON.stringify(ingredients) : null,
      prep_time: body.prep_time ?? null,
      created_by: session.user.id,
    })
    .returning();

  return Response.json({ meal }, { status: 201 });
}
