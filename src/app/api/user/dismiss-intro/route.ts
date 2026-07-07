import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { PAGE_INTRO_KEYS } from '@/lib/constants/pageIntros'

// Appends a page-intro key to users.seen_intros. Idempotent (no duplicates) and
// only accepts known keys. Generalizes dismiss-welcome to per-page intros.
export async function POST(request: Request): Promise<Response> {
  const session = await requireSession()

  const body = (await request.json().catch(() => ({}))) as { key?: unknown }
  const key = typeof body.key === 'string' ? body.key : ''

  if (!key || !PAGE_INTRO_KEYS.includes(key)) {
    return Response.json({ error: 'Invalid intro key' }, { status: 400 })
  }

  const [row] = await db
    .select({ seenIntros: users.seenIntros })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (!row) {
    return Response.json({ error: 'User not found' }, { status: 404 })
  }

  let seen: string[] = []
  try {
    const parsed = JSON.parse(row.seenIntros ?? '[]')
    if (Array.isArray(parsed)) seen = parsed.filter((k): k is string => typeof k === 'string')
  } catch {
    seen = []
  }

  if (!seen.includes(key)) {
    seen.push(key)
    await db
      .update(users)
      .set({ seenIntros: JSON.stringify(seen), updatedAt: new Date() })
      .where(eq(users.id, session.user.id))
  }

  return Response.json({ ok: true, seenIntros: seen })
}
