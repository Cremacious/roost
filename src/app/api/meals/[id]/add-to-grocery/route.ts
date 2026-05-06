import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { meals, grocery_lists, grocery_items, households } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { logActivity } from "@/lib/utils/activity";
import { parseIngredients } from "@/lib/utils/parseIngredients";

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

  // Premium check
  const [household] = await db
    .select({ subscription_status: households.subscription_status })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);
  if (household?.subscription_status !== "premium") {
    return Response.json(
      { error: "Grocery integration requires premium", code: "MEAL_GROCERY_INTEGRATION_PREMIUM" },
      { status: 403 }
    );
  }

  const [meal] = await db
    .select()
    .from(meals)
    .where(and(eq(meals.id, id), eq(meals.household_id, householdId), isNull(meals.deleted_at)))
    .limit(1);

  if (!meal) {
    return Response.json({ error: "Meal not found" }, { status: 404 });
  }

  // Parse optional body: { listId?, ingredientNames? }
  let listId: string | undefined;
  let ingredientNames: string[] | undefined;
  try {
    const body = await request.json();
    listId = body.listId;
    ingredientNames = Array.isArray(body.ingredientNames) ? body.ingredientNames : undefined;
  } catch {
    // body is optional
  }

  // Resolve ingredient names to push (defaults to all meal ingredients)
  let namesToPush: string[];
  if (ingredientNames && ingredientNames.length > 0) {
    namesToPush = ingredientNames.filter((n) => typeof n === "string" && n.trim());
  } else {
    const items = parseIngredients(meal.ingredients ?? "");
    namesToPush = items.map((item) => item.name).filter(Boolean);
  }

  if (namesToPush.length === 0) {
    return Response.json({ error: "This meal has no ingredients to add" }, { status: 400 });
  }

  // Resolve target list (use provided listId or fall back to default list)
  let targetListId: string;
  if (listId) {
    const [specified] = await db
      .select({ id: grocery_lists.id })
      .from(grocery_lists)
      .where(
        and(
          eq(grocery_lists.id, listId),
          eq(grocery_lists.household_id, householdId),
          isNull(grocery_lists.deleted_at)
        )
      )
      .limit(1);
    if (!specified) {
      return Response.json({ error: "Grocery list not found" }, { status: 404 });
    }
    targetListId = specified.id;
  } else {
    const [defaultList] = await db
      .select({ id: grocery_lists.id })
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
    targetListId = defaultList.id;
  }

  await db.insert(grocery_items).values(
    namesToPush.map((name) => ({
      list_id: targetListId,
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

  return Response.json({ added: namesToPush.length });
}
