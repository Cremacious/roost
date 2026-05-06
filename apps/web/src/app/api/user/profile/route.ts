import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { users, user as authUser } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar_color: users.avatarColor,
      timezone: users.timezone,
      language: users.language,
      theme: users.theme,
      has_seen_welcome: users.hasSeenWelcome,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (!row) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  return NextResponse.json({ user: row })
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    name?: string
    email?: string
    avatar_color?: string
    timezone?: string
    language?: string
    push_token?: string
  }

  const normalizedEmail =
    body.email !== undefined ? body.email.trim().toLowerCase() : undefined

  if (normalizedEmail !== undefined) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(normalizedEmail)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 })
    }

    const [authConflict] = await db
      .select({ id: authUser.id })
      .from(authUser)
      .where(eq(authUser.email, normalizedEmail))
      .limit(1)
    if (authConflict && authConflict.id !== session.user.id) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }

    const [appConflict] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, normalizedEmail))
      .limit(1)
    if (appConflict && appConflict.id !== session.user.id) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
    }
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.name !== undefined) updates.name = body.name.trim()
  if (normalizedEmail !== undefined) updates.email = normalizedEmail
  if (body.avatar_color !== undefined) updates.avatarColor = body.avatar_color
  if (body.timezone !== undefined) updates.timezone = body.timezone
  if (body.language !== undefined) updates.language = body.language
  if (body.push_token !== undefined) updates.pushToken = body.push_token

  if (normalizedEmail !== undefined) {
    const previousEmail = session.user.email?.trim().toLowerCase()
    try {
      await db
        .update(authUser)
        .set({ email: normalizedEmail, updatedAt: new Date() })
        .where(eq(authUser.id, session.user.id))

      await db.update(users).set(updates).where(eq(users.id, session.user.id))
    } catch (err) {
      if (previousEmail) {
        await db
          .update(authUser)
          .set({ email: previousEmail, updatedAt: new Date() })
          .where(eq(authUser.id, session.user.id))
          .catch(() => undefined)
      }
      if (err instanceof Error && err.message.includes('unique')) {
        return NextResponse.json({ error: 'Email already in use' }, { status: 409 })
      }
      throw err
    }
  } else {
    await db.update(users).set(updates).where(eq(users.id, session.user.id))
  }

  return NextResponse.json({ ok: true })
}
