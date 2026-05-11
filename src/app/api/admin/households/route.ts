import { NextRequest } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function GET(request: NextRequest): Promise<Response> {
  const unauth = await requireAdminSession(request)
  if (unauth) return unauth

  const { searchParams } = new URL(request.url)
  const search = searchParams.get('search')?.trim() ?? ''
  const filter = searchParams.get('filter') ?? 'all' // all | premium | free
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10))
  const limit = 25
  const offset = (page - 1) * limit

  const conditions: string[] = ['h.deleted_at IS NULL']

  if (search) {
    const s = search.replace(/'/g, "''")
    conditions.push(`(h.name ILIKE '%${s}%' OR h.invite_code ILIKE '%${s}%')`)
  }
  if (filter === 'premium') conditions.push(`h.subscription_status = 'premium'`)
  if (filter === 'free') conditions.push(`h.subscription_status = 'free'`)

  const where = `WHERE ${conditions.join(' AND ')}`

  const [householdsResult, countResult] = await Promise.all([
    db.execute(sql.raw(`
      SELECT
        h.id,
        h.name,
        h.invite_code AS "inviteCode",
        h.subscription_status AS "subscriptionStatus",
        h.premium_expires_at AS "premiumExpiresAt",
        h.created_at AS "createdAt",
        COUNT(hm.id) FILTER (WHERE hm.deleted_at IS NULL) AS "memberCount",
        ARRAY_AGG(u.email ORDER BY hm.created_at) FILTER (WHERE hm.deleted_at IS NULL AND u.email IS NOT NULL) AS "memberEmails",
        ARRAY_AGG(
          JSON_BUILD_OBJECT('name', u.name, 'email', u.email, 'role', hm.role)
          ORDER BY hm.created_at
        ) FILTER (WHERE hm.deleted_at IS NULL) AS "members"
      FROM households h
      LEFT JOIN household_members hm ON hm.household_id = h.id
      LEFT JOIN users u ON u.id = hm.user_id
      ${where}
      GROUP BY h.id
      ORDER BY h.created_at DESC
      LIMIT ${limit} OFFSET ${offset}
    `)),
    db.execute(sql.raw(`
      SELECT COUNT(*) AS count FROM households h ${where}
    `)),
  ])

  const total = parseInt((countResult.rows[0] as { count: string }).count, 10)

  return Response.json({
    households: householdsResult.rows,
    total,
    page,
    totalPages: Math.ceil(total / limit),
  })
}
