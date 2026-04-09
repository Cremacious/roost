import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin/requireAdmin";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import { EXCLUDE_TEST_USERS_SQL } from "@/lib/admin/testFilters";

export async function GET(request: NextRequest): Promise<Response> {
  const authError = await requireAdminSession(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? 1));
  const limit = Math.min(100, Math.max(1, Number(searchParams.get("limit") ?? 50)));
  const search = searchParams.get("search")?.trim() ?? "";
  const filter = searchParams.get("filter") ?? "all";
  const hideTest = searchParams.get("hideTest") !== "false";
  const offset = (page - 1) * limit;

  const searchClause = search
    ? sql`AND (u.name ILIKE ${"%" + search + "%"} OR u.email ILIKE ${"%" + search + "%"})`
    : sql``;

  const filterClause =
    filter === "premium"
      ? sql`AND h.subscription_status = 'premium'`
      : filter === "free"
      ? sql`AND (h.subscription_status = 'free' OR h.subscription_status IS NULL)`
      : sql``;

  const testClause = hideTest ? sql.raw(EXCLUDE_TEST_USERS_SQL) : sql``;

  const [usersRows, countRows] = await Promise.all([
    db.execute(sql`
      SELECT
        u.id,
        u.name,
        u.email,
        u.created_at,
        hm.role AS household_role,
        hm.joined_at,
        h.id AS household_id,
        h.name AS household_name,
        h.subscription_status,
        h.stripe_customer_id
      FROM users u
      LEFT JOIN household_members hm ON hm.user_id = u.id
      LEFT JOIN households h ON h.id = hm.household_id AND h.deleted_at IS NULL
      WHERE u.deleted_at IS NULL
      ${searchClause}
      ${filterClause}
      ${testClause}
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `),
    db.execute(sql`
      SELECT COUNT(*) AS total
      FROM users u
      LEFT JOIN household_members hm ON hm.user_id = u.id
      LEFT JOIN households h ON h.id = hm.household_id AND h.deleted_at IS NULL
      WHERE u.deleted_at IS NULL
      ${searchClause}
      ${filterClause}
      ${testClause}
    `),
  ]);

  const total = Number((countRows.rows[0] as Record<string, string>)?.total ?? 0);

  type UserRow = {
    id: string;
    name: string | null;
    email: string;
    created_at: string;
    household_role: string | null;
    household_id: string | null;
    household_name: string | null;
    subscription_status: string | null;
    stripe_customer_id: string | null;
  };

  const users = (usersRows.rows as UserRow[]).map((u) => ({
    id: u.id,
    name: u.name ?? "",
    email: u.email,
    createdAt: u.created_at,
    role: u.household_role,
    householdId: u.household_id,
    householdName: u.household_name,
    subscriptionStatus: u.subscription_status,
    stripeCustomerId: u.stripe_customer_id,
  }));

  return Response.json({
    users,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  });
}
