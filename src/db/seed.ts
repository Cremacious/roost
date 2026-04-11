/**
 * Seed script: creates fixed reusable E2E test accounts.
 * Idempotent — safe to run multiple times.
 *
 * Usage:
 *   npx tsx --env-file=.env.local src/db/seed.ts
 *
 * The dev server does NOT need to be running. All writes go directly
 * to Neon via Drizzle. Passwords are hashed using better-auth's exact
 * scrypt implementation (hashPassword from better-auth/crypto).
 */

import { db } from "@/lib/db";
import {
  households,
  household_members,
  member_permissions,
} from "@/db/schema";
import { users } from "@/db/schema/users";
import { user as authUser, account } from "@/db/schema/auth";
import { and, eq } from "drizzle-orm";
import { hashPassword } from "better-auth/crypto";
import { randomUUID } from "crypto";

// ---------------------------------------------------------------------------
// Fixed test account definitions
// ---------------------------------------------------------------------------

export const SEED_ACCOUNTS = {
  freeAdmin: {
    email: "admin.free@roost.test",
    password: "RoostTest123!",
    name: "Free Admin",
  },
  premiumAdmin: {
    email: "admin.premium@roost.test",
    password: "RoostTest123!",
    name: "Premium Admin",
  },
  member: {
    email: "member@roost.test",
    password: "RoostTest123!",
    name: "Test Member",
  },
};

export const SEED_CHILD = { name: "Test Child", pin: "1234" };

// Stable household codes so tests can reference them if needed
const FREE_HOUSEHOLD_CODE = "RSTFRE";
const PREMIUM_HOUSEHOLD_CODE = "RSTPRM";

// All 12 member permissions
const ALL_PERMISSIONS = [
  "expenses.view",
  "expenses.add",
  "chores.add",
  "chores.edit",
  "grocery.add",
  "grocery.create_list",
  "calendar.add",
  "calendar.edit",
  "tasks.add",
  "notes.add",
  "meals.plan",
  "meals.suggest",
];

// Permissions that are always disabled for the child role
const CHILD_LOCKED = new Set(["expenses.view", "expenses.add"]);

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getUserIdByEmail(email: string): Promise<string | null> {
  const rows = await db
    .select({ id: authUser.id })
    .from(authUser)
    .where(eq(authUser.email, email))
    .limit(1);
  return rows[0]?.id ?? null;
}

async function createAuthUser(
  email: string,
  password: string,
  name: string
): Promise<string> {
  const id = randomUUID();
  const now = new Date();
  const hashed = await hashPassword(password);

  // Insert into better-auth "user" table
  await db.insert(authUser).values({
    id,
    name,
    email,
    emailVerified: true,
    createdAt: now,
    updatedAt: now,
  });

  // Insert credential row into better-auth "account" table
  await db.insert(account).values({
    id: randomUUID(),
    accountId: email,
    providerId: "credential",
    userId: id,
    password: hashed,
    createdAt: now,
    updatedAt: now,
  });

  // Mirror into app "users" table (normally done by the databaseHook)
  await db
    .insert(users)
    .values({
      id,
      email,
      name,
      timezone: "America/New_York",
      language: "en",
    })
    .onConflictDoNothing();

  return id;
}

async function ensureUser(
  email: string,
  password: string,
  name: string
): Promise<string> {
  const existing = await getUserIdByEmail(email);
  if (existing) {
    console.log(`  ↩ Skipped: ${email}`);
    return existing;
  }
  const id = await createAuthUser(email, password, name);
  console.log(`  ✓ Created: ${email}`);
  return id;
}

async function ensureHousehold(
  name: string,
  code: string,
  createdBy: string,
  premium: boolean
): Promise<string> {
  const existing = await db
    .select({ id: households.id })
    .from(households)
    .where(eq(households.code, code))
    .limit(1);

  if (existing[0]) {
    console.log(`  ↩ Skipped household: ${name}`);
    return existing[0].id;
  }

  const [h] = await db
    .insert(households)
    .values({
      name,
      code,
      created_by: createdBy,
      subscription_status: premium ? "premium" : "free",
      subscription_upgraded_at: premium ? new Date() : undefined,
    })
    .returning({ id: households.id });

  console.log(`  ✓ Created household: ${name}`);
  return h.id;
}

async function ensureMembership(
  householdId: string,
  userId: string,
  role: string,
  memberName: string,
  householdName: string,
  pin?: string
): Promise<void> {
  const existing = await db
    .select({ id: household_members.id })
    .from(household_members)
    .where(
      and(
        eq(household_members.household_id, householdId),
        eq(household_members.user_id, userId)
      )
    )
    .limit(1);

  if (existing[0]) {
    console.log(`  ↩ Skipped: ${memberName} → ${householdName}`);
    return;
  }

  const pinHash = pin ? await hashPassword(pin) : undefined;

  await db.insert(household_members).values({
    household_id: householdId,
    user_id: userId,
    role,
    pin: pinHash,
  });

  const isChild = role === "child";
  const perms = ALL_PERMISSIONS.map((p) => ({
    household_id: householdId,
    user_id: userId,
    permission: p,
    enabled: isChild ? !CHILD_LOCKED.has(p) : true,
  }));

  await db.insert(member_permissions).values(perms).onConflictDoNothing();
  console.log(`  ✓ ${memberName} → ${householdName} (${role})`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function seed() {
  console.log("Seeding test accounts...\n");

  // --- Users ---
  console.log("Users:");
  const freeAdminId = await ensureUser(
    SEED_ACCOUNTS.freeAdmin.email,
    SEED_ACCOUNTS.freeAdmin.password,
    SEED_ACCOUNTS.freeAdmin.name
  );
  const premiumAdminId = await ensureUser(
    SEED_ACCOUNTS.premiumAdmin.email,
    SEED_ACCOUNTS.premiumAdmin.password,
    SEED_ACCOUNTS.premiumAdmin.name
  );
  const memberId = await ensureUser(
    SEED_ACCOUNTS.member.email,
    SEED_ACCOUNTS.member.password,
    SEED_ACCOUNTS.member.name
  );

  // Child account — needs a row in BOTH better-auth "user" table AND app "users" table.
  // internalAdapter.createSession(childId) sets a FK to "user".id, so the auth row
  // must exist first. Placeholder email: child_${id}@roost.internal.
  let childId: string;
  const existingChild = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.name, SEED_CHILD.name))
    .limit(1);

  if (existingChild[0]) {
    console.log(`  ↩ Skipped: ${SEED_CHILD.name} (child)`);
    childId = existingChild[0].id;
    // Back-fill the auth "user" row if it was missing from an older seed run
    await db.insert(authUser).values({
      id: childId,
      name: SEED_CHILD.name,
      email: `child_${childId}@roost.internal`,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).onConflictDoNothing();
  } else {
    childId = randomUUID();
    const now = new Date();
    // Insert into better-auth "user" table FIRST (FK requirement for session creation)
    await db.insert(authUser).values({
      id: childId,
      name: SEED_CHILD.name,
      email: `child_${childId}@roost.internal`,
      emailVerified: false,
      createdAt: now,
      updatedAt: now,
    });
    // Then mirror into app "users" table
    await db.insert(users).values({
      id: childId,
      name: SEED_CHILD.name,
      timezone: "America/New_York",
      language: "en",
      is_child_account: true,
    });
    console.log(`  ✓ Created: ${SEED_CHILD.name} (child, PIN-only)`);
  }

  // --- Households ---
  console.log("\nHouseholds:");
  const freeHouseholdId = await ensureHousehold(
    "Roost Free House",
    FREE_HOUSEHOLD_CODE,
    freeAdminId,
    false
  );
  const premiumHouseholdId = await ensureHousehold(
    "Roost Premium House",
    PREMIUM_HOUSEHOLD_CODE,
    premiumAdminId,
    true
  );

  // --- Memberships ---
  console.log("\nMemberships:");
  await ensureMembership(freeHouseholdId, freeAdminId, "admin", SEED_ACCOUNTS.freeAdmin.name, "Roost Free House");
  await ensureMembership(freeHouseholdId, memberId, "member", SEED_ACCOUNTS.member.name, "Roost Free House");
  await ensureMembership(freeHouseholdId, childId, "child", SEED_CHILD.name, "Roost Free House", SEED_CHILD.pin);
  await ensureMembership(premiumHouseholdId, premiumAdminId, "admin", SEED_ACCOUNTS.premiumAdmin.name, "Roost Premium House");

  console.log("\nSeed complete.");
}

seed()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Seed failed:", err);
    process.exit(1);
  });
