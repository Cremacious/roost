import { NextRequest, NextResponse } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { users, household_members } from "@/db/schema";
import { hashPassword } from "better-auth/crypto";
import { getUserHousehold } from "@/app/api/chores/route";

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
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const { householdId } = membership;

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name || name.length > 32) {
    return Response.json(
      { error: "Name is required and must be 32 characters or fewer" },
      { status: 400 }
    );
  }

  try {
    // Generate random 4-digit PIN (1000-9999)
    const rawPin = String(Math.floor(Math.random() * 9000) + 1000);
    const hashedPin = await hashPassword(rawPin);

    // Generate unique user ID
    const userId = crypto.randomUUID();

    // Create the child user record (no email needed)
    await db.insert(users).values({
      id: userId,
      name,
      email: null,
      is_child_account: true,
      child_of_household_id: householdId,
      timezone: "America/New_York",
      language: "en",
      theme: "default",
      temperature_unit: "fahrenheit",
      chore_reminders_enabled: false,
      has_seen_welcome: true, // children skip welcome modal
      created_at: new Date(),
      updated_at: new Date(),
    });

    // Add as child member with hashed PIN
    await db.insert(household_members).values({
      household_id: householdId,
      user_id: userId,
      role: "child",
      pin: hashedPin,
    });

    return Response.json(
      {
        child: { id: userId, name },
        pin: rawPin,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("add-child error:", error);
    return NextResponse.json(
      { error: "Failed to create child account" },
      { status: 500 }
    );
  }
}
