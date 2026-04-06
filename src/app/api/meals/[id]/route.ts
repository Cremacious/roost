import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { meals } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

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
    ingredients?: string[];
    prep_time?: number | null;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const ingredients = Array.isArray(body.ingredients)
    ? body.ingredients.filter((i) => i.trim())
    : undefined;

  const [meal] = await db
    .update(meals)
    .set({
      name: body.name?.trim() ?? existing.name,
      description: body.description !== undefined ? body.description?.trim() || null : existing.description,
      category: body.category ?? existing.category,
      ingredients: ingredients !== undefined
        ? (ingredients.length > 0 ? JSON.stringify(ingredients) : null)
        : existing.ingredients,
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
