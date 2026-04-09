import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { chore_categories, households } from "@/db/schema";
import { and, asc, eq, or } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { seedChoreCategories } from "@/lib/utils/seedChoreCategories";

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
  await seedChoreCategories(householdId);

  // Fetch active categories (defaults first, then custom); admins also see pending
  const categories = await db
    .select()
    .from(chore_categories)
    .where(
      and(
        eq(chore_categories.household_id, householdId),
        or(
          eq(chore_categories.status, "active"),
          ...(isAdmin ? [eq(chore_categories.status, "pending")] : [])
        )
      )
    )
    .orderBy(asc(chore_categories.is_custom), asc(chore_categories.created_at));

  const active = categories.filter((c) => c.status === "active");
  const pendingSuggestions = isAdmin
    ? categories.filter((c) => c.status === "pending")
    : undefined;

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

  // Premium check
  const [household] = await db
    .select({ subscription_status: households.subscription_status })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);
  if (household?.subscription_status !== "premium") {
    return Response.json(
      { error: "Custom chore categories require premium", code: "CHORE_CATEGORIES_PREMIUM" },
      { status: 403 }
    );
  }

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
    .insert(chore_categories)
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
