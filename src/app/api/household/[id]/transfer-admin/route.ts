import { NextRequest } from "next/server";
import { requireHouseholdAdmin } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { household_members } from "@/db/schema";
import { and, eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  let session;
  try {
    session = await requireHouseholdAdmin(request, id);
  } catch (r) {
    return r as Response;
  }

  let body: { newAdminUserId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { newAdminUserId } = body;
  if (!newAdminUserId) {
    return Response.json({ error: "newAdminUserId is required" }, { status: 400 });
  }

  if (newAdminUserId === session.user.id) {
    return Response.json({ error: "You are already the admin" }, { status: 400 });
  }

  // Verify target is a member and not a child
  const [targetMember] = await db
    .select()
    .from(household_members)
    .where(
      and(
        eq(household_members.household_id, id),
        eq(household_members.user_id, newAdminUserId)
      )
    )
    .limit(1);

  if (!targetMember) {
    return Response.json({ error: "Member not found" }, { status: 404 });
  }

  if (targetMember.role === "child") {
    return Response.json({ error: "Cannot transfer admin to a child account" }, { status: 400 });
  }

  // Demote current admin to member
  await db
    .update(household_members)
    .set({ role: "member" })
    .where(
      and(
        eq(household_members.household_id, id),
        eq(household_members.user_id, session.user.id)
      )
    );

  // Promote new admin
  await db
    .update(household_members)
    .set({ role: "admin" })
    .where(
      and(
        eq(household_members.household_id, id),
        eq(household_members.user_id, newAdminUserId)
      )
    );

  return Response.json({ success: true });
}
