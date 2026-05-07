import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { account } from '@/db/schema'
import { and, eq } from 'drizzle-orm'
import { verifyPassword, hashPassword } from 'better-auth/crypto'

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    currentPassword?: string
    newPassword?: string
  }

  if (!body.currentPassword || !body.newPassword) {
    return NextResponse.json(
      { error: 'currentPassword and newPassword are required' },
      { status: 400 },
    )
  }

  if (body.newPassword.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
  }

  const [credAccount] = await db
    .select({ id: account.id, password: account.password })
    .from(account)
    .where(and(eq(account.userId, session.user.id), eq(account.providerId, 'credential')))
    .limit(1)

  if (!credAccount?.password) {
    return NextResponse.json({ error: 'No password account found' }, { status: 400 })
  }

  const valid = await verifyPassword({ hash: credAccount.password, password: body.currentPassword })
  if (!valid) {
    return NextResponse.json({ error: 'Current password is incorrect' }, { status: 400 })
  }

  const newHash = await hashPassword(body.newPassword)
  await db
    .update(account)
    .set({ password: newHash, updatedAt: new Date() })
    .where(eq(account.id, credAccount.id))

  return NextResponse.json({ ok: true })
}
