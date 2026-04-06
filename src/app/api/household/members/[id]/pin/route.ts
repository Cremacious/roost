import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { household_members } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";
import { hashPassword } from "better-auth/crypto";

export async function PATCH(
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
  if (membership.role !== "admin") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  let body: { pin?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.pin || !/^\d{4}$/.test(body.pin)) {
    return Response.json({ error: "PIN must be exactly 4 digits" }, { status: 400 });
  }

  const [target] = await db
    .select({ id: household_members.id, role: household_members.role })
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

  if (target.role !== "child") {
    return Response.json({ error: "PIN can only be set for child accounts" }, { status: 400 });
  }

  const hashedPin = await hashPassword(body.pin);

  await db
    .update(household_members)
    .set({ pin: hashedPin })
    .where(eq(household_members.id, id));

  return Response.json({ success: true });
}
