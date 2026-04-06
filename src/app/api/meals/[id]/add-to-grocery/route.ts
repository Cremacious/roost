import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { meals, grocery_lists, grocery_items } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { logActivity } from "@/lib/utils/activity";

// ---- POST -------------------------------------------------------------------

export async function POST(
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
  const membership = await getUserHousehold(session.user.id);
  if (!membership) {
    return Response.json({ error: "No household found" }, { status: 404 });
  }
  const { householdId } = membership;

  const [meal] = await db
    .select()
    .from(meals)
    .where(and(eq(meals.id, id), eq(meals.household_id, householdId), isNull(meals.deleted_at)))
    .limit(1);

  if (!meal) {
    return Response.json({ error: "Meal not found" }, { status: 404 });
  }

  let ingredients: string[] = [];
  try {
    ingredients = meal.ingredients ? (JSON.parse(meal.ingredients) as string[]) : [];
  } catch {
    ingredients = [];
  }

  if (ingredients.length === 0) {
    return Response.json({ error: "This meal has no ingredients to add" }, { status: 400 });
  }

  const [defaultList] = await db
    .select()
    .from(grocery_lists)
    .where(
      and(
        eq(grocery_lists.household_id, householdId),
        eq(grocery_lists.is_default, true),
        isNull(grocery_lists.deleted_at)
      )
    )
    .limit(1);

  if (!defaultList) {
    return Response.json({ error: "No default grocery list found" }, { status: 404 });
  }

  await db.insert(grocery_items).values(
    ingredients.map((name) => ({
      list_id: defaultList.id,
      household_id: householdId,
      name,
      added_by: session.user.id,
    }))
  );

  await logActivity({
    householdId,
    userId: session.user.id,
    type: "item_added",
    description: `added ingredients for ${meal.name} to the grocery list`,
    entityId: meal.id,
    entityType: "meal",
  });

  return Response.json({ added: ingredients.length });
}
