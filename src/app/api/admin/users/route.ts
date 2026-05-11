import { NextRequest } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function GET(request: NextRequest): Promise<Response> {
  const unauth = await requireAdminSession(request)
  if (unauth) return unauth

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim() ?? ''
  const filter = searchParams.get('filter') ?? 'all' // all | premium | free | child
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = 25
  const offset = (page - 1) * limit

  // Build WHERE clauses
  const conditions: string[] = ['u.deleted_at IS NULL']

  if (search) {
    conditions.push(`(u.name ILIKE '%${search.replace(/'/g, "''")}%' OR u.email ILIKE '%${search.replace(/'/g, "''")}%')`)
  }

  if (filter === 'child') {
    conditions.push(`u.is_child_account = true`)
  } else if (filter === 'premium') {
    conditions.push(`h.subscription_status = 'premium'`)
  } else if (filter === 'free') {
    conditions.push(`(h.subscription_status = 'free' OR h.subscription_status IS NULL)`)
    conditions.push(`u.is_child_account = false`)
  }

  const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : ''

  const [usersResult, countResult] = await Promise.all([
    db.execute(sql.raw(`
      SELECT
        u.id,
        u.name,
        u.email,
        u.is_child_account AS "isChildAccount",
        u.created_at AS "createdAt",
        hm.role,
        hm.household_id AS "householdId",
        h.name AS "householdName",
        h.subscription_status AS "subscriptionStatus"
      FROM users u
      LEFT JOIN household_members hm ON hm.user_id = u.id AND hm.deleted_at IS NULL
      LEFT JOIN households h ON h.id = hm.household_id AND h.deleted_at IS NULL
      ${where}
      ORDER BY u.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `)),
    db.execute(sql.raw(`
      SELECT COUNT(DISTINCT u.id) AS count
      FROM users u
      LEFT JOIN household_members hm ON hm.user_id = u.id AND hm.deleted_at IS NULL
      LEFT JOIN households h ON h.id = hm.household_id AND h.deleted_at IS NULL
      ${where}
    `)),
  ])

  const total = parseInt((countResult.rows[0] as { count: string }).count, 10)

  return Response.json({
    users: usersResult.rows,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}
