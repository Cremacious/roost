import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { meal_plan_slots } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

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
  const { householdId, role } = membership;

  const [slot] = await db
    .select()
    .from(meal_plan_slots)
    .where(and(eq(meal_plan_slots.id, id), eq(meal_plan_slots.household_id, householdId)))
    .limit(1);

  if (!slot) {
    return Response.json({ error: "Slot not found" }, { status: 404 });
  }
  if (slot.assigned_by !== session.user.id && role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  await db.delete(meal_plan_slots).where(eq(meal_plan_slots.id, id));

  return Response.json({ ok: true });
}
