import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { expense_categories } from "@/db/schema";
import { and, asc, eq, isNull, or } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { seedDefaultCategories } from "@/lib/utils/seedCategories";

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
  const { householdId, role } = membership;
  const isAdmin = role === "admin";

  // Auto-seed defaults for households that have none yet
  const existing = await db
    .select({ id: expense_categories.id })
    .from(expense_categories)
    .where(eq(expense_categories.household_id, householdId))
    .limit(1);

  if (existing.length === 0) {
    await seedDefaultCategories(householdId);
  }

  // Fetch all active categories (defaults first, then custom)
  const categories = await db
    .select()
    .from(expense_categories)
    .where(
      and(
        eq(expense_categories.household_id, householdId),
        or(
          eq(expense_categories.status, "active"),
          // Admins also see pending suggestions inline
          ...(isAdmin ? [eq(expense_categories.status, "pending")] : [])
        )
      )
    )
    .orderBy(
      // defaults first: is_default DESC, then by name
      asc(expense_categories.is_custom),
      asc(expense_categories.created_at)
    );

  const active = categories.filter((c) => c.status === "active");
  const pendingSuggestions = isAdmin ? categories.filter((c) => c.status === "pending") : undefined;

  return Response.json({ categories: active, pendingSuggestions });
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
  if (membership.role !== "admin") {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }
  const { householdId } = membership;

  let body: { name?: string; icon?: string; color?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.name?.trim()) return Response.json({ error: "Name is required" }, { status: 400 });
  if (!body.icon?.trim()) return Response.json({ error: "Icon is required" }, { status: 400 });
  if (!body.color?.trim()) return Response.json({ error: "Color is required" }, { status: 400 });

  const [category] = await db
    .insert(expense_categories)
    .values({
      household_id: householdId,
      name: body.name.trim(),
      icon: body.icon.trim(),
      color: body.color.trim(),
      is_default: false,
      is_custom: true,
      status: "active",
    })
    .returning();

  return Response.json({ category }, { status: 201 });
}
