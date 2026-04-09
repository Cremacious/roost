import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin/requireAdmin";
import { db } from "@/lib/db";
import { sql } from "drizzle-orm";

export async function GET(request: NextRequest): Promise<Response> {
  const authError = await requireAdminSession(request);
  if (authError) return authError;

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
        (SELECT COUNT(*) FROM "user") AS total_users,
        (SELECT COUNT(*) FROM households WHERE deleted_at IS NULL) AS total_households,
        (SELECT COUNT(*) FROM households WHERE subscription_status = 'premium' AND deleted_at IS NULL) AS premium_households,
        (SELECT COUNT(*) FROM households WHERE subscription_status = 'free' AND deleted_at IS NULL) AS free_households
    `),

    // 2. Signups over time (last 90 days)
    db.execute(sql`
      SELECT
        DATE(created_at) AS date,
        COUNT(*) AS count
      FROM "user"
      WHERE created_at > NOW() - INTERVAL '90 days'
      GROUP BY DATE(created_at)
      ORDER BY date ASC
    `),

    // 3. Premium conversions over time (last 90 days)
    db.execute(sql`
      SELECT
        DATE(subscription_upgraded_at) AS date,
        COUNT(*) AS count
      FROM households
      WHERE subscription_upgraded_at > NOW() - INTERVAL '90 days'
        AND subscription_upgraded_at IS NOT NULL
        AND deleted_at IS NULL
      GROUP BY DATE(subscription_upgraded_at)
      ORDER BY date ASC
    `),

    // 4. Active households last 30 days
    db.execute(sql`
      SELECT COUNT(DISTINCT household_id) AS count
      FROM household_activity
      WHERE created_at > NOW() - INTERVAL '30 days'
    `),

    // 5. New users this week
    db.execute(sql`
      SELECT COUNT(*) AS count
      FROM "user"
      WHERE created_at > NOW() - INTERVAL '7 days'
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
