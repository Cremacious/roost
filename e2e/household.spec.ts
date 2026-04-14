/**
 * Household management tests — API-level coverage for state-changing admin operations.
 *
 * Strategy:
 * - Auth and validation contracts use seeded sessions (free-admin, member) for speed.
 * - Tests that create, mutate, or delete real household data use FRESH signups so
 *   seeded test accounts (Roost Free House, Roost Premium House) are never touched.
 * - Each isolated describe block runs a beforeAll that creates a fresh host household;
 *   tests within the block use page.request with their own fresh session.
 * - Destructive tests (delete household data, delete household) are self-contained:
 *   they create a fresh household and destroy only that household.
 *
 * Flows covered:
 *   Create household — response shape, validation
 *   Join household   — valid join, invalid code, already-member, multi-household gate
 *   Add child        — happy path (201 + PIN), name validation
 *   Remove member    — full flow (admin adds child, gets membership ID, removes)
 *   Delete data      — cascade (content gone, household row stays, non-admin blocked)
 *   Delete household — full delete (admin removes everything; non-admin blocked)
 *   Rename household — admin renames, non-admin blocked
 */

import { test, expect } from "@playwright/test";
import { signUp, createHousehold } from "./helpers/auth";

// ---------------------------------------------------------------------------
// Helper — create an isolated fresh user for each test that modifies data
// ---------------------------------------------------------------------------

function freshUser(label: string) {
  const ts = Date.now() + Math.floor(Math.random() * 10000);
  return {
    name: `HH ${label}`,
    email: `hh-${label}-${ts}@roost.test`,
    password: "RoostTest123!",
  };
}

// Stable paths for storageState files written by beforeAll blocks
const JOIN_HOST_STATE = "e2e/.auth/hh-join-host.json";

// ---------------------------------------------------------------------------
// Auth contracts — unauthenticated calls
// ---------------------------------------------------------------------------

test.describe("Household API — auth contracts", () => {
  test("POST /api/household/create without session → 401", async ({ page }) => {
    const res = await page.request.post("/api/household/create", {
      data: { name: "Ghost House" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/household/join without session → 401", async ({ page }) => {
    const res = await page.request.post("/api/household/join", {
      data: { code: "RSTFRE" },
    });
    expect(res.status()).toBe(401);
  });

  test("POST /api/household/members/add-child without session → 401", async ({
    page,
  }) => {
    const res = await page.request.post("/api/household/members/add-child", {
      data: { name: "Nobody", pin: "1234" },
    });
    expect(res.status()).toBe(401);
  });
});

// ---------------------------------------------------------------------------
// Create household
// ---------------------------------------------------------------------------

test.describe("Household creation", () => {
  test("valid name → 200 with id, name, and 6-char code", async ({ page }) => {
    await signUp(page, freshUser("create"));
    const res = await page.request.post("/api/household/create", {
      data: { name: "Fresh Test Household" },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      household: { id: string; name: string; code: string };
    };
    expect(typeof body.household.id).toBe("string");
    expect(body.household.name).toBe("Fresh Test Household");
    // Code is 6 uppercase alphanumeric characters
    expect(body.household.code).toMatch(/^[A-Z0-9]{6}$/);
  });

  test("empty name → 400", async ({ page }) => {
    await signUp(page, freshUser("create-empty"));
    const res = await page.request.post("/api/household/create", {
      data: { name: "" },
    });
    expect(res.status()).toBe(400);
  });

  test("missing name field → 400", async ({ page }) => {
    await signUp(page, freshUser("create-noname"));
    const res = await page.request.post("/api/household/create", {
      data: {},
    });
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Join household
// ---------------------------------------------------------------------------

test.describe("Household joining", () => {
  // A fresh joinable household is created in beforeAll so its code is known.
  let targetCode = "";

  test.beforeAll(async ({ browser }) => {
    const ctx = await browser.newContext();
    const page = await ctx.newPage();
    await signUp(page, freshUser("join-host"));
    const createRes = await page.request.post(
      "http://localhost:3000/api/household/create",
      { data: { name: "Joinable House" } }
    );
    expect(createRes.ok()).toBeTruthy();
    const { household } = (await createRes.json()) as {
      household: { code: string };
    };
    targetCode = household.code;
    // Save this host's session so the join tests can use test.use()
    await ctx.storageState({ path: JOIN_HOST_STATE });
    await ctx.close();
  });

  test("invalid code → 404", async ({ page }) => {
    // Fresh user (no existing household) — 404 fires before multi-household check
    await signUp(page, freshUser("join-invalid"));
    const res = await page.request.post("/api/household/join", {
      data: { code: "XXXXXX" },
    });
    expect(res.status()).toBe(404);
  });

  test("fresh user with no household can join with valid code → 200", async ({
    page,
  }) => {
    await signUp(page, freshUser("join-ok"));
    const res = await page.request.post("/api/household/join", {
      data: { code: targetCode },
    });
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as {
      household: { id: string; name: string };
    };
    expect(body.household.name).toBe("Joinable House");
  });

  test.describe("already a member of the target household", () => {
    // The join-host is already in Joinable House
    test.use({ storageState: JOIN_HOST_STATE });

    test("joining own household → 400 already a member", async ({ page }) => {
      const res = await page.request.post("/api/household/join", {
        data: { code: targetCode },
      });
      expect(res.status()).toBe(400);
      const body = (await res.json()) as { error: string };
      expect(body.error).toMatch(/already a member/i);
    });
  });

  test.describe("free-tier multi-household gate", () => {
    // Seeded free-admin is already in Roost Free House (a free household).
    // Trying to join another free household triggers the premium gate.
    test.use({ storageState: "e2e/.auth/free-admin.json" });

    test("free admin joining a second household → 403 multi-household requires premium", async ({
      page,
    }) => {
      const res = await page.request.post("/api/household/join", {
        data: { code: targetCode },
      });
      expect(res.status()).toBe(403);
    });
  });
});

// ---------------------------------------------------------------------------
// Add child account
// ---------------------------------------------------------------------------

test.describe("Add child account", () => {
  test("admin creates child account → 201 with child id and 4-digit PIN", async ({
    page,
  }) => {
    await signUp(page, freshUser("add-child"));
    await createHousehold(page, "Child Test House");

    const res = await page.request.post("/api/household/members/add-child", {
      data: { name: "Little One", pin: "1234" },
    });
    expect(res.status()).toBe(201);
    const body = (await res.json()) as {
      child: { id: string; name: string };
      pin: string;
    };
    expect(body.child.name).toBe("Little One");
    expect(typeof body.child.id).toBe("string");
    // PIN is a 4-digit numeric string
    expect(body.pin).toMatch(/^\d{4}$/);
  });

  test("name longer than 32 characters → 400", async ({ page }) => {
    await signUp(page, freshUser("add-child-long"));
    await createHousehold(page, "Child Validation House");

    const res = await page.request.post("/api/household/members/add-child", {
      data: { name: "A".repeat(33), pin: "1234" },
    });
    expect(res.status()).toBe(400);
  });

  test("empty name → 400", async ({ page }) => {
    await signUp(page, freshUser("add-child-empty"));
    await createHousehold(page, "Child Empty Name House");

    const res = await page.request.post("/api/household/members/add-child", {
      data: { name: "", pin: "1234" },
    });
    expect(res.status()).toBe(400);
  });

  test("missing PIN → 400", async ({ page }) => {
    await signUp(page, freshUser("add-child-nopin"));
    await createHousehold(page, "Child Missing Pin House");

    const res = await page.request.post("/api/household/members/add-child", {
      data: { name: "Little One" },
    });
    expect(res.status()).toBe(400);
  });

  test("invalid PIN → 400", async ({ page }) => {
    await signUp(page, freshUser("add-child-badpin"));
    await createHousehold(page, "Child Invalid Pin House");

    const res = await page.request.post("/api/household/members/add-child", {
      data: { name: "Little One", pin: "12" },
    });
    expect(res.status()).toBe(400);
  });
});

// ---------------------------------------------------------------------------
// Remove member
// ---------------------------------------------------------------------------

test.describe("Remove member", () => {
  // Fresh admin + household so we can safely add and remove members
  // without affecting the seeded Test Child in Roost Free House.
  let childMembershipId = ""; // household_members.id (not user ID) of the added child
  let hostPage: import("@playwright/test").Page;
  let hostContext: import("@playwright/test").BrowserContext;

  test.beforeAll(async ({ browser }) => {
    hostContext = await browser.newContext();
    hostPage = await hostContext.newPage();
    await signUp(hostPage, freshUser("remove-host"));
    await hostPage.request.post(
      "http://localhost:3000/api/household/create",
      { data: { name: "Remove Test House" } }
    );

    // Add a child to get a removable member
    const addRes = await hostPage.request.post(
      "http://localhost:3000/api/household/members/add-child",
      { data: { name: "Removable Child", pin: "1234" } }
    );
    expect(addRes.ok()).toBeTruthy();
    const { child } = (await addRes.json()) as { child: { id: string } };

    // Get the child's household_members.id via the members list
    const membersRes = await hostPage.request.get(
      "http://localhost:3000/api/household/members"
    );
    const { members } = (await membersRes.json()) as {
      members: { id: string; userId: string; role: string }[];
    };
    const childMember = members.find((m) => m.userId === child.id);
    if (!childMember) throw new Error("Child member not found in members list");
    childMembershipId = childMember.id;
  });

  test.afterAll(async () => {
    await hostContext.close();
  });

  test("admin removes a non-admin member → success", async () => {
    const res = await hostPage.request.delete(
      `/api/household/members/${childMembershipId}`
    );
    expect(res.ok()).toBeTruthy();
    const body = (await res.json()) as { success: boolean };
    expect(body.success).toBe(true);
  });

  test("removing non-existent member → 404", async () => {
    // Use a plausible but non-existent UUID
    const fakeId = "00000000-0000-0000-0000-000000000000";
    const res = await hostPage.request.delete(
      `/api/household/members/${fakeId}`
    );
    expect(res.status()).toBe(404);
  });

  test.describe("member cannot remove anyone", () => {
    test.use({ storageState: "e2e/.auth/member.json" });

    test("member DELETE /api/household/members/:id → 403", async ({ page }) => {
      // Member attempts to remove a member from their own household.
      // Even with a valid membership ID, the role check fires first.
      const res = await page.request.delete(
        `/api/household/members/${childMembershipId}`
      );
      expect(res.status()).toBe(403);
    });
  });
});

// ---------------------------------------------------------------------------
// Delete household data (POST /api/household/:id/delete-data)
// ---------------------------------------------------------------------------

test.describe("Delete household data", () => {
  test("admin can wipe all content — content gone, household row persists", async ({
    page,
  }) => {
    await signUp(page, freshUser("delete-data"));
    const createRes = await page.request.post("/api/household/create", {
      data: { name: "Delete Data House" },
    });
    const { household } = (await createRes.json()) as {
      household: { id: string };
    };
    const householdId = household.id;

    // Create a chore so there is content to delete
    await page.request.post("/api/chores", {
      data: { title: "Sweep", frequency: "daily" },
    });
    const beforeRes = await page.request.get("/api/chores");
    const before = (await beforeRes.json()) as { chores: unknown[] };
    expect(before.chores.length).toBeGreaterThan(0);

    // Delete all content
    const deleteRes = await page.request.post(
      `/api/household/${householdId}/delete-data`
    );
    expect(deleteRes.ok()).toBeTruthy();

    // Chores are gone
    const afterRes = await page.request.get("/api/chores");
    const after = (await afterRes.json()) as { chores: unknown[] };
    expect(after.chores.length).toBe(0);

    // But the household still exists
    const meRes = await page.request.get("/api/household/me");
    expect(meRes.ok()).toBeTruthy();
  });

  // Non-admin check lives in the separate describe below (test.use requires describe scope)
});

// Nested describe so test.use can override for the non-admin check
test.describe("Delete household data — non-admin blocked", () => {
  test.use({ storageState: "e2e/.auth/member.json" });

  test("member POST /api/household/:id/delete-data → 403", async ({ page }) => {
    // Get the member's household ID
    const meRes = await page.request.get("/api/household/me");
    const { household } = (await meRes.json()) as {
      household: { id: string };
    };
    const res = await page.request.post(
      `/api/household/${household.id}/delete-data`
    );
    expect(res.status()).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Delete household entirely (DELETE /api/household/:id)
// ---------------------------------------------------------------------------

test.describe("Delete household entirely", () => {
  test("admin can delete household — household and members gone", async ({
    page,
  }) => {
    await signUp(page, freshUser("delete-hh"));
    const createRes = await page.request.post("/api/household/create", {
      data: { name: "Doomed House" },
    });
    const { household } = (await createRes.json()) as {
      household: { id: string };
    };
    const householdId = household.id;

    const deleteRes = await page.request.delete(
      `/api/household/${householdId}`
    );
    expect(deleteRes.ok()).toBeTruthy();

    // Household no longer accessible — /api/household/me returns 404 because
    // all memberships were deleted along with the household
    const meRes = await page.request.get("/api/household/me");
    expect(meRes.status()).toBe(404);
  });

  // Non-admin check lives in the separate describe below (test.use requires describe scope)
});

test.describe("Delete household entirely — non-admin blocked", () => {
  test.use({ storageState: "e2e/.auth/member.json" });

  test("member DELETE /api/household/:id → 403", async ({ page }) => {
    const meRes = await page.request.get("/api/household/me");
    const { household } = (await meRes.json()) as {
      household: { id: string };
    };
    const res = await page.request.delete(`/api/household/${household.id}`);
    expect(res.status()).toBe(403);
  });
});

// ---------------------------------------------------------------------------
// Rename household (PATCH /api/household/:id)
// ---------------------------------------------------------------------------

test.describe("Rename household", () => {
  test("admin can rename household", async ({ page }) => {
    await signUp(page, freshUser("rename"));
    const createRes = await page.request.post("/api/household/create", {
      data: { name: "Old Name" },
    });
    const { household } = (await createRes.json()) as {
      household: { id: string };
    };

    const renameRes = await page.request.patch(
      `/api/household/${household.id}`,
      { data: { name: "New Name" } }
    );
    expect(renameRes.ok()).toBeTruthy();
    const body = (await renameRes.json()) as {
      household: { name: string };
    };
    expect(body.household.name).toBe("New Name");
  });
});

test.describe("Rename household — non-admin blocked", () => {
  test.use({ storageState: "e2e/.auth/member.json" });

  test("member PATCH /api/household/:id → 403", async ({ page }) => {
    const meRes = await page.request.get("/api/household/me");
    const { household } = (await meRes.json()) as {
      household: { id: string };
    };
    const res = await page.request.patch(`/api/household/${household.id}`, {
      data: { name: "Hacked Name" },
    });
    expect(res.status()).toBe(403);
  });
});
