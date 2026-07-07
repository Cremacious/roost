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
      has_seen_welcome: users.hasSeenWelcome,
      is_child_account: users.isChildAccount,
      seen_intros: users.seenIntros,
      venmo_handle: users.venmoHandle,
      cashapp_handle: users.cashappHandle,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (!row) return NextResponse.json({ error: 'User not found' }, { status: 404 })

  // Parse the seen_intros JSON-array text column into a string[]; fall back to
  // an empty array if it is null or malformed.
  let seenIntros: string[] = []
  try {
    const parsed = JSON.parse(row.seen_intros ?? '[]')
    if (Array.isArray(parsed)) seenIntros = parsed.filter((k): k is string => typeof k === 'string')
  } catch {
    seenIntros = []
  }

  return NextResponse.json({
    user: row,
    // Flat convenience fields used by today/page.tsx WelcomeModal check and the
    // PageIntroModal per-page intro check.
    hasSeenWelcome: row.has_seen_welcome,
    isChildAccount: row.is_child_account,
    seenIntros,
  })
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
    venmo_handle?: string
    cashapp_handle?: string
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
  if (body.venmo_handle !== undefined) updates.venmoHandle = body.venmo_handle.trim() || null
  if (body.cashapp_handle !== undefined) updates.cashappHandle = body.cashapp_handle.trim() || null

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
