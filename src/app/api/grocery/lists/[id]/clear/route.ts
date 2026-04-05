import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { grocery_items, grocery_lists } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

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

  if (membership.role === "child") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

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

  const cleared = await db
    .update(grocery_items)
    .set({ deleted_at: new Date() })
    .where(
      and(
        eq(grocery_items.list_id, id),
        eq(grocery_items.household_id, householdId),
        eq(grocery_items.checked, true),
        isNull(grocery_items.deleted_at)
      )
    )
    .returning({ id: grocery_items.id });

  return Response.json({ cleared: cleared.length });
}
