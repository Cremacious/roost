import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { meals } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import type { IngredientItem } from "@/lib/utils/parseIngredients";

// ---- PATCH ------------------------------------------------------------------

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
  const membership = await getUserHousehold(session.user.id);
  if (!membership) {
    return Response.json({ error: "No household found" }, { status: 404 });
  }
  if (membership.role === "child") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const { householdId, role } = membership;

  const [existing] = await db
    .select()
    .from(meals)
    .where(and(eq(meals.id, id), eq(meals.household_id, householdId), isNull(meals.deleted_at)))
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Meal not found" }, { status: 404 });
  }
  if (existing.created_by !== session.user.id && role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: {
    name?: string;
    description?: string;
    category?: string;
    ingredients?: (string | IngredientItem)[];
    instructions?: string[];
    prep_time?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  // Normalize ingredients to IngredientItem[]
  let ingredientsJson: string | null | undefined = undefined;
  if (Array.isArray(body.ingredients)) {
    const normalized: IngredientItem[] = body.ingredients
      .map((item) => {
        if (typeof item === "string") return item.trim() ? { name: item.trim() } : null;
        if (typeof item === "object" && item !== null && typeof (item as IngredientItem).name === "string") {
          const i = item as IngredientItem;
          return i.name.trim() ? { name: i.name.trim(), quantity: i.quantity, unit: i.unit } : null;
        }
        return null;
      })
      .filter((i): i is IngredientItem => i !== null);
    ingredientsJson = normalized.length > 0 ? JSON.stringify(normalized) : null;
  }

  // Normalize steps
  let instructionsJson: string | null | undefined = undefined;
  if (Array.isArray(body.instructions)) {
    const steps = body.instructions.filter((s) => typeof s === "string" && s.trim());
    instructionsJson = steps.length > 0 ? JSON.stringify(steps) : null;
  }

  const [meal] = await db
    .update(meals)
    .set({
      name: body.name?.trim() ?? existing.name,
      description: body.description !== undefined ? body.description?.trim() || null : existing.description,
      category: body.category ?? existing.category,
      ingredients: ingredientsJson !== undefined ? ingredientsJson : existing.ingredients,
      instructions: instructionsJson !== undefined ? instructionsJson : existing.instructions,
      prep_time: body.prep_time !== undefined ? body.prep_time : existing.prep_time,
      updated_at: new Date(),
    })
    .where(eq(meals.id, id))
    .returning();

  return Response.json({ meal });
}

// ---- DELETE -----------------------------------------------------------------

export async function DELETE(
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
  if (membership.role === "child") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  const { householdId, role } = membership;

  const [existing] = await db
    .select()
    .from(meals)
    .where(and(eq(meals.id, id), eq(meals.household_id, householdId), isNull(meals.deleted_at)))
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Meal not found" }, { status: 404 });
  }
  if (existing.created_by !== session.user.id && role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.update(meals).set({ deleted_at: new Date() }).where(eq(meals.id, id));

  return Response.json({ ok: true });
}
