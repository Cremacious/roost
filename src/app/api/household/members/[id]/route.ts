import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { household_members } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params; // household_members.id

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
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const [target] = await db
    .select()
    .from(household_members)
    .where(
      and(
        eq(household_members.id, id),
        eq(household_members.household_id, membership.householdId)
      )
    )
    .limit(1);

  if (!target) {
    return Response.json({ error: "Member not found" }, { status: 404 });
  }

  if (target.role === "admin") {
    return Response.json(
      { error: "Transfer admin before removing yourself" },
      { status: 400 }
    );
  }

  if (target.user_id === session.user.id) {
    return Response.json({ error: "Cannot remove yourself" }, { status: 400 });
  }

  await db.delete(household_members).where(eq(household_members.id, id));

  return Response.json({ success: true });
}
