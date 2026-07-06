import { NextRequest } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'
import { EXCLUDE_TEST_USERS_SQL, EXCLUDE_TEST_HOUSEHOLDS_SQL } from '@/lib/admin/testFilters'

export async function GET(request: NextRequest): Promise<Response> {
  const unauth = await requireAdminSession(request)
  if (unauth) return unauth

  const hideTest = new URL(request.url).searchParams.get('hideTest') === 'true'
  // Raw AND fragments (empty when the toggle is off). All values are constants.
  const excludeUsers = sql.raw(hideTest ? EXCLUDE_TEST_USERS_SQL : '')
  const excludeHouseholds = sql.raw(hideTest ? EXCLUDE_TEST_HOUSEHOLDS_SQL : '')

  const [
    totalUsers,
    totalHouseholds,
    premiumHouseholds,
    signupsOverTime,
    conversionsOverTime,
  ] = await Promise.all([
    // Total users: query the app `users` table (not better-auth "user"), which
    // has a deleted_at column. Honors the hide-test-accounts toggle.
    db.execute(sql`SELECT COUNT(*) AS count FROM users u WHERE u.deleted_at IS NULL ${excludeUsers}`),

    // Total households (non-deleted)
    db.execute(sql`
      SELECT COUNT(*) AS count FROM households h WHERE h.deleted_at IS NULL ${excludeHouseholds}
    `),

    // Premium vs free breakdown
    db.execute(sql`
      SELECT
        COUNT(*) FILTER (WHERE h.subscription_status = 'premium') AS premium,
        COUNT(*) FILTER (WHERE h.subscription_status = 'free') AS free
      FROM households h
      WHERE h.deleted_at IS NULL ${excludeHouseholds}
    `),

    // Signups per day over last 90 days
    db.execute(sql`
      SELECT
        DATE_TRUNC('day', u.created_at)::date AS date,
        COUNT(*) AS count
      FROM users u
      WHERE u.created_at >= NOW() - INTERVAL '90 days'
        AND u.deleted_at IS NULL ${excludeUsers}
      GROUP BY 1
      ORDER BY 1
    `),

    // Premium conversions per day over last 90 days
    db.execute(sql`
      SELECT
        DATE_TRUNC('day', h.subscription_upgraded_at)::date AS date,
        COUNT(*) AS count
      FROM households h
      WHERE h.subscription_upgraded_at >= NOW() - INTERVAL '90 days'
        AND h.subscription_status = 'premium'
        AND h.deleted_at IS NULL ${excludeHouseholds}
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
