import { NextRequest } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function GET(request: NextRequest): Promise<Response> {
  const unauth = await requireAdminSession(request)
  if (unauth) return unauth

  const [
    totalUsers,
    totalHouseholds,
    premiumHouseholds,
    signupsOverTime,
    conversionsOverTime,
  ] = await Promise.all([
    // Total users (app users table — excludes test accounts)
    db.execute(sql`SELECT COUNT(*) AS count FROM users WHERE deleted_at IS NULL`),

    // Total households (non-deleted)
    db.execute(sql`
      SELECT COUNT(*) AS count FROM households WHERE deleted_at IS NULL
    `),

    // Premium vs free breakdown
    db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE subscription_status = 'premium') AS premium,
        COUNT(*) FILTER (WHERE subscription_status = 'free') AS free
      FROM households
      WHERE deleted_at IS NULL
    `),

    // Signups per day over last 90 days
    db.execute(sql`
      SELECT
        DATE_TRUNC('day', created_at)::date AS date,
        COUNT(*) AS count
      FROM users
      WHERE created_at >= NOW() - INTERVAL '90 days'
        AND deleted_at IS NULL
      GROUP BY 1
      ORDER BY 1
    `),

    // Premium conversions per day over last 90 days
    db.execute(sql`
      SELECT
        DATE_TRUNC('day', subscription_upgraded_at)::date AS date,
        COUNT(*) AS count
      FROM households
      WHERE subscription_upgraded_at >= NOW() - INTERVAL '90 days'
        AND subscription_status = 'premium'
        AND deleted_at IS NULL
      GROUP BY 1
      ORDER BY 1
    `),
  ])

  const usersRow = (totalUsers.rows[0] as { count: string }) ?? { count: '0' }
  const householdsRow = (totalHouseholds.rows[0] as { count: string }) ?? { count: '0' }
  const premiumRow = (premiumHouseholds.rows[0] as { premium: string; free: string }) ?? { premium: '0', free: '0' }

  return Response.json({
    totalUsers: parseInt(usersRow.count, 10),
    totalHouseholds: parseInt(householdsRow.count, 10),
    premiumHouseholds: parseInt(premiumRow.premium, 10),
    freeHouseholds: parseInt(premiumRow.free, 10),
    signupsOverTime: (signupsOverTime.rows as { date: string; count: string }[]).map(r => ({
      date: r.date,
      count: parseInt(r.count, 10),
    })),
    conversionsOverTime: (conversionsOverTime.rows as { date: string; count: string }[]).map(r => ({
      date: r.date,
      count: parseInt(r.count, 10),
    })),
  })
}
