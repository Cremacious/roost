import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const { theme } = body

  const allowed = ['default', 'midnight']
  if (!allowed.includes(theme)) {
    return NextResponse.json({ error: 'Invalid theme' }, { status: 400 })
  }

  await db
    .update(users)
    .set({ theme, updatedAt: new Date() })
    .where(eq(users.id, session.user.id))

  return NextResponse.json({ ok: true })
}
