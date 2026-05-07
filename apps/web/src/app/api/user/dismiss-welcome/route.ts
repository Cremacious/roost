// apps/web/src/app/api/user/dismiss-welcome/route.ts
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function POST(): Promise<Response> {
  const session = await requireSession()

  await db
    .update(users)
    .set({ hasSeenWelcome: true })
    .where(eq(users.id, session.user.id))

  return Response.json({ ok: true })
}
