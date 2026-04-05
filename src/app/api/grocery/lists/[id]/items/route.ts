import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { grocery_items, grocery_lists, users } from "@/db/schema";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { logActivity } from "@/lib/utils/activity";

// ---- GET --------------------------------------------------------------------

export async function GET(
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
  const { householdId } = membership;

  const [list] = await db
    .select()
    .from(grocery_lists)
    .where(
      and(
        eq(grocery_lists.id, id),
        eq(grocery_lists.household_id, householdId),
        isNull(grocery_lists.deleted_at)
      )
    )
    .limit(1);

  if (!list) {
    return Response.json({ error: "List not found" }, { status: 404 });
  }

  const rawItems = await db
    .select()
    .from(grocery_items)
    .where(and(eq(grocery_items.list_id, id), isNull(grocery_items.deleted_at)))
    .orderBy(asc(grocery_items.checked), asc(grocery_items.created_at));

  if (rawItems.length === 0) {
    return Response.json({ items: [] });
  }

  // Fetch user data for all unique user IDs
  const userIds = [
    ...new Set([
      ...rawItems.map((i) => i.added_by),
      ...rawItems
        .filter((i) => i.checked_by != null)
        .map((i) => i.checked_by as string),
    ]),
  ];

  const userRows = await db
    .select({
      id: users.id,
      name: users.name,
      avatar_color: users.avatar_color,
    })
    .from(users)
    .where(inArray(users.id, userIds));

  const userMap = new Map(userRows.map((u) => [u.id, u]));

  const items = rawItems.map((item) => ({
    ...item,
    added_by_name: userMap.get(item.added_by)?.name ?? null,
    added_by_avatar: userMap.get(item.added_by)?.avatar_color ?? null,
    checked_by_name: item.checked_by
      ? (userMap.get(item.checked_by)?.name ?? null)
      : null,
    checked_by_avatar: item.checked_by
      ? (userMap.get(item.checked_by)?.avatar_color ?? null)
      : null,
  }));

  return Response.json({ items });
}

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
  const { householdId } = membership;

  const [list] = await db
    .select()
    .from(grocery_lists)
    .where(
      and(
        eq(grocery_lists.id, id),
        eq(grocery_lists.household_id, householdId),
        isNull(grocery_lists.deleted_at)
      )
    )
    .limit(1);

  if (!list) {
    return Response.json({ error: "List not found" }, { status: 404 });
  }

  let body: { name?: string; quantity?: string };
  try {
    body = await request.json();
  } catch (err) {
    console.error("[POST /api/grocery/lists/[id]/items] Failed to parse body:", err);
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.name?.trim()) {
    return Response.json({ error: "Name is required" }, { status: 400 });
  }

  const [item] = await db
    .insert(grocery_items)
    .values({
      list_id: id,
      household_id: householdId,
      name: body.name.trim(),
      quantity: body.quantity?.trim() || null,
      added_by: session.user.id,
    })
    .returning();

  await logActivity({
    householdId,
    userId: session.user.id,
    type: "item_added",
    description: `added ${item.name} to ${list.name}`,
    entityId: item.id,
    entityType: "grocery_item",
  });

  return Response.json({ item }, { status: 201 });
}
