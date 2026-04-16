import { NextRequest } from "next/server";
import {
  getUserMemberships,
  requireSession,
  setUserActiveHousehold,
} from "@/lib/auth/helpers";

export async function POST(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (response) {
    return response as Response;
  }

  let body: { householdId?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const householdId = body.householdId?.trim();
  if (!householdId) {
    return Response.json({ error: "householdId is required" }, { status: 400 });
  }

  const memberships = await getUserMemberships(session.user.id);
  const membership = memberships.find((row) => row.householdId === householdId);
  if (!membership) {
    return Response.json({ error: "You are not a member of that household" }, { status: 403 });
  }

  await setUserActiveHousehold(session.user.id, householdId);

  return Response.json({
    ok: true,
    activeHouseholdId: householdId,
  });
}
