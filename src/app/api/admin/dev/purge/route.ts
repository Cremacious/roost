import { NextRequest } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { db } from '@/lib/db'
import { sql } from 'drizzle-orm'

export async function POST(request: NextRequest): Promise<Response> {
  // Dev only — hard block in any other environment
  if (process.env.NODE_ENV !== 'development') {
    return Response.json({ error: 'This endpoint is only available in development' }, { status: 403 })
  }

  const unauth = await requireAdminSession(request)
  if (unauth) return unauth

  // Discover every table that actually exists in the public schema,
  // then truncate them all in one shot. This is safe across migrations
  // and won't fail if a schema-defined table hasn't been pushed yet.
  const result = await db.execute(sql`
    SELECT table_name
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_type = 'BASE TABLE'
  `)

  const tables = (result.rows as { table_name: string }[]).map(r => r.table_name)

  if (tables.length === 0) {
    return Response.json({ success: true, message: 'Nothing to purge.' })
  }

  // Quote each table name to handle reserved words (e.g. "user", "session")
  const quoted = tables.map(t => `"${t}"`).join(', ')

  await db.execute(sql.raw(`TRUNCATE TABLE ${quoted} RESTART IDENTITY CASCADE`))

  return Response.json({ success: true, tablesCleared: tables.length })
}
