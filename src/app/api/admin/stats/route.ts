import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin/requireAdmin";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";
import {
  EXCLUDE_TEST_USERS_SQL,
  EXCLUDE_TEST_HOUSEHOLDS_SQL,
} from "@/lib/admin/testFilters";

export async function GET(request: NextRequest): Promise<Response> {
  const authError = await requireAdminSession(request);
  if (authError) return authError;

  const { searchParams } = new URL(request.url);
  const hideTest = searchParams.get("hideTest") !== "false";

  const testUserClause = hideTest ? sql.raw(EXCLUDE_TEST_USERS_SQL) : sql``;
  const testHouseholdClause = hideTest ? sql.raw(EXCLUDE_TEST_HOUSEHOLDS_SQL) : sql``;

  const [
    overviewRows,
    signupsRows,
    conversionsRows,
    activeRows,
    newUsersRows,
  ] = await Promise.all([
    // 1. Overview counts
    db.execute(sql`
      SELECT
        (SELECT COUNT(*) FROM users u WHERE u.deleted_at IS NULL ${testUserClause}) AS total_users,
        (SELECT COUNT(*) FROM households h WHERE h.deleted_at IS NULL ${testHouseholdClause}) AS total_households,
        (SELECT COUNT(*) FROM households h WHERE h.subscription_status = 'premium' AND h.deleted_at IS NULL ${testHouseholdClause}) AS premium_households,
        (SELECT COUNT(*) FROM households h WHERE h.subscription_status = 'free' AND h.deleted_at IS NULL ${testHouseholdClause}) AS free_households
    `),

    // 2. Signups over time (last 90 days)
    db.execute(sql`
      SELECT
        DATE(u.created_at) AS date,
        COUNT(*) AS count
      FROM users u
      WHERE u.deleted_at IS NULL
        AND u.created_at > NOW() - INTERVAL '90 days'
      ${testUserClause}
      GROUP BY DATE(u.created_at)
      ORDER BY date ASC
    `),

    // 3. Premium conversions over time (last 90 days)
    db.execute(sql`
      SELECT
        DATE(h.subscription_upgraded_at) AS date,
        COUNT(*) AS count
      FROM households h
      WHERE h.subscription_upgraded_at > NOW() - INTERVAL '90 days'
        AND h.subscription_upgraded_at IS NOT NULL
        AND h.deleted_at IS NULL
      ${testHouseholdClause}
      GROUP BY DATE(h.subscription_upgraded_at)
      ORDER BY date ASC
    `),

    // 4. Active households last 30 days
    db.execute(sql`
      SELECT COUNT(DISTINCT ha.household_id) AS count
      FROM household_activity ha
      JOIN households h ON h.id = ha.household_id
      WHERE ha.created_at > NOW() - INTERVAL '30 days'
        AND h.deleted_at IS NULL
      ${testHouseholdClause}
    `),

    // 5. New users this week
    db.execute(sql`
      SELECT COUNT(*) AS count
      FROM users u
      WHERE u.deleted_at IS NULL
        AND u.created_at > NOW() - INTERVAL '7 days'
      ${testUserClause}
    `),
  ]);

  const ov = overviewRows.rows[0] as Record<string, string>;
  const totalUsers = Number(ov.total_users ?? 0);
  const totalHouseholds = Number(ov.total_households ?? 0);
  const premiumHouseholds = Number(ov.premium_households ?? 0);
  const freeHouseholds = Number(ov.free_households ?? 0);
  const activeHouseholdsLast30Days = Number(
    (activeRows.rows[0] as Record<string, string>)?.count ?? 0
  );
  const newUsersThisWeek = Number(
    (newUsersRows.rows[0] as Record<string, string>)?.count ?? 0
  );
  const conversionRate =
    totalHouseholds > 0
      ? Math.round((premiumHouseholds / totalHouseholds) * 100)
      : 0;

  return Response.json({
    overview: {
      totalUsers,
      totalHouseholds,
      premiumHouseholds,
      freeHouseholds,
      activeHouseholdsLast30Days,
      newUsersThisWeek,
      conversionRate,
    },
    signupsOverTime: signupsRows.rows.map((r) => {
      const row = r as Record<string, unknown>;
      return { date: String(row.date ?? ""), count: Number(row.count ?? 0) };
    }),
    conversionsOverTime: conversionsRows.rows.map((r) => {
      const row = r as Record<string, unknown>;
      return { date: String(row.date ?? ""), count: Number(row.count ?? 0) };
    }),
  });
}
