import { NextRequest } from "next/server";
import {
  getUserMemberships,
  requireSession,
  setUserActiveHousehold,
  userHasPremiumHousehold,
} from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { households, household_members, user, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { seedDefaultCategories } from "@/lib/utils/seedCategories";
import { seedChoreCategories } from "@/lib/utils/seedChoreCategories";
import { log } from "@/lib/utils/logger";

function randomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = randomCode();
    const [existing] = await db
      .select({ id: households.id })
      .from(households)
      .where(eq(households.code, code))
      .limit(1);
    if (!existing) return code;
  }
  throw new Error("Failed to generate unique code");
}

export async function POST(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (res) {
    return res as Response;
  }

  let body: { name?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = body.name?.trim();
  if (!name) {
    return Response.json({ error: "Household name is required" }, { status: 400 });
  }

  const memberships = await getUserMemberships(session.user.id);
  const hasPremiumAccess = await userHasPremiumHousehold(session.user.id);
  if (memberships.length > 0 && !hasPremiumAccess) {
    return Response.json(
      { error: "Upgrade to premium to create an additional household" },
      { status: 403 }
    );
  }

  const code = await uniqueCode();

  const [household] = await db
    .insert(households)
    .values({
      name,
      code,
      created_by: session.user.id,
    })
    .returning();

  await db.insert(household_members).values({
    household_id: household.id,
    user_id: session.user.id,
    role: "admin",
  });

  await setUserActiveHousehold(session.user.id, household.id);

  // Seed default expense categories for every new household
  try {
    await seedDefaultCategories(household.id);
  } catch (err) {
    console.error("[household/create] Failed to seed expense categories:", err);
    // Non-fatal — categories will be auto-seeded on first GET /api/expenses/categories
  }

  // Seed default chore categories for every new household
  try {
    await seedChoreCategories(household.id);
  } catch (err) {
    console.error("[household/create] Failed to seed chore categories:", err);
    // Non-fatal — categories will be auto-seeded on first GET /api/chore-categories
  }

  // Mark onboarding complete on both the better-auth user table (session-visible)
  // and the app users table (app-visible).
  await Promise.all([
    db.update(user).set({ onboarding_completed: true }).where(eq(user.id, session.user.id)),
    db.update(users).set({ onboarding_completed: true }).where(eq(users.id, session.user.id)),
  ]);

  log.info("analytics.household_created", { householdId: household.id, userId: session.user.id });
  return Response.json({ household: { id: household.id, name: household.name, code: household.code } });
}
