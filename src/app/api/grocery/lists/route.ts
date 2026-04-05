import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { grocery_lists, grocery_items, households } from "@/db/schema";
import { and, count, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

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

  const [household] = await db
    .select({ subscription_status: households.subscription_status })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);

  const isPremium = household?.subscription_status === "premium";
  const isAdmin = membership.role === "admin";

  const listsRaw = await db
    .select({
      id: grocery_lists.id,
      name: grocery_lists.name,
      is_default: grocery_lists.is_default,
      created_at: grocery_lists.created_at,
    })
    .from(grocery_lists)
    .where(
      and(
        eq(grocery_lists.household_id, householdId),
        isNull(grocery_lists.deleted_at)
      )
    );

  const itemCounts = await db
    .select({
      list_id: grocery_items.list_id,
      item_count: count(grocery_items.id),
    })
    .from(grocery_items)
    .where(
      and(
        eq(grocery_items.household_id, householdId),
        isNull(grocery_items.deleted_at)
      )
    )
    .groupBy(grocery_items.list_id);

  const countMap = new Map(itemCounts.map((c) => [c.list_id, Number(c.item_count)]));

  const lists = listsRaw
    .map((list) => ({
      ...list,
      item_count: countMap.get(list.id) ?? 0,
    }))
    .sort((a, b) => {
      if (a.is_default !== b.is_default) return a.is_default ? -1 : 1;
      return a.name.localeCompare(b.name);
    });

  return Response.json({ lists, isPremium, isAdmin });
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
  const { householdId } = membership;

  if (membership.role === "child") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const [household] = await db
    .select({ subscription_status: households.subscription_status })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);

  if (!household) {
    return Response.json({ error: "Household not found" }, { status: 404 });
  }

  if (household.subscription_status !== "premium") {
    const [existing] = await db
      .select({ count: count(grocery_lists.id) })
      .from(grocery_lists)
      .where(
        and(
          eq(grocery_lists.household_id, householdId),
          isNull(grocery_lists.deleted_at)
        )
      );
    if (Number(existing?.count ?? 0) >= 1) {
      return Response.json(
        { error: "Multiple lists require a premium household" },
        { status: 403 }
      );
    }
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const [list] = await db
    .insert(grocery_lists)
    .values({
      household_id: householdId,
      name: body.name.trim(),
      is_default: false,
      created_by: session.user.id,
    })
    .returning();

  return Response.json({ list }, { status: 201 });
}
