import { type NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { auth } from '@/lib/auth'
import { households, householdMembers as household_members, users } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { verifyPassword } from 'better-auth/crypto'
import { createRateLimiter } from '@/lib/utils/rateLimit'

// Per-IP PIN brute-force protection: 10 attempts per 15 minutes.
// Child PINs are only 4 digits (10,000 combinations), so rate limiting is the
// primary defense against exhaustive guessing.
const pinLimiter = createRateLimiter({ windowMs: 15 * 60_000, maxRequests: 10 })

// GET /api/auth/child-login?householdCode=XXXXXX
// Public — lists child accounts for a household so the child-login page can show a name picker
export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url)
  const householdCode = searchParams.get('householdCode')

  if (!householdCode) {
    return Response.json({ error: 'householdCode is required' }, { status: 400 })
  }

  const [household] = await db
    .select({ id: households.id })
    .from(households)
    .where(eq(households.code, householdCode.toUpperCase()))
    .limit(1)

  if (!household) {
    return Response.json({ error: 'Household not found' }, { status: 404 })
  }

  const children = await db
    .select({
      id: users.id,
      name: users.name,
      avatarColor: users.avatarColor,
    })
    .from(household_members)
    .innerJoin(users, eq(household_members.userId, users.id))
    .where(
      and(
        eq(household_members.householdId, household.id),
        eq(household_members.role, 'child'),
      )
    )

  return Response.json({ children })
}

// POST /api/auth/child-login
// Body: { householdCode, childId, pin }
// Verifies the child PIN and creates a session cookie
export async function POST(request: NextRequest): Promise<Response> {
  let body: { householdCode?: string; childId?: string; pin?: string }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { householdCode, childId, pin } = body

  if (!householdCode || !childId || !pin) {
    return Response.json(
      { error: 'householdCode, childId, and pin are required' },
      { status: 400 }
    )
  }

  // Rate-limit by childId to prevent PIN brute-forcing.
  // Using childId (not IP) so the limit is scoped to the specific account being attacked.
  const rateCheck = pinLimiter.check(childId)
  if (!rateCheck.allowed) {
    const retryAfterSec = Math.ceil(rateCheck.retryAfterMs / 1000)
    return Response.json(
      { error: 'Too many PIN attempts. Please wait a few minutes and try again.' },
      {
        status: 429,
        headers: { 'Retry-After': String(retryAfterSec) },
      }
    )
  }

  // Look up the household
  const [household] = await db
    .select({ id: households.id })
    .from(households)
    .where(eq(households.code, householdCode.toUpperCase()))
    .limit(1)

  if (!household) {
    return Response.json({ error: 'Household not found' }, { status: 404 })
  }

  // Find the child member in this household
  const [member] = await db
    .select({
      pin: household_members.pin,
      userId: household_members.userId,
    })
    .from(household_members)
    .where(
      and(
        eq(household_members.householdId, household.id),
        eq(household_members.userId, childId),
        eq(household_members.role, 'child'),
      )
    )
    .limit(1)

  if (!member) {
    return Response.json({ error: 'Child not found' }, { status: 404 })
  }

  if (!member.pin) {
    return Response.json(
      { error: 'No PIN set. Ask a parent to set one in Settings.' },
      { status: 401 }
    )
  }

  const valid = await verifyPassword({ hash: member.pin, password: pin })
  if (!valid) {
    return Response.json({ error: 'Invalid PIN' }, { status: 401 })
  }

  // Successful login — reset the rate limit so a user who fat-fingered a few
  // digits doesn't get locked out immediately after a successful attempt.
  pinLimiter.reset(childId)

  // Create session via better-auth internal adapter
  const ctx = await auth.$context
  const session = await ctx.internalAdapter.createSession(
    member.userId,
    // dontRememberMe = false so the session gets a maxAge cookie
    false,
  )

  if (!session) {
    return Response.json({ error: 'Failed to create session' }, { status: 500 })
  }

  // Sign the session token using HMAC-SHA256, matching better-auth's setSignedCookie format.
  // Format: encodeURIComponent(`${token}.${base64Signature}`)
  const cookieName = ctx.authCookies.sessionToken.name
  const cookieAttrs = ctx.authCookies.sessionToken.attributes
  const secret = ctx.secret

  const signedValue = await signCookieValue(session.token, secret)

  // Build the Set-Cookie header to match better-auth's cookie attributes
  const maxAge = cookieAttrs.maxAge ?? 60 * 60 * 24 * 30 // 30 days default (matches auth config)
  let cookieHeader = `${cookieName}=${signedValue}; Path=${cookieAttrs.path ?? '/'}; Max-Age=${maxAge}; SameSite=Lax; HttpOnly`
  if (cookieAttrs.secure) {
    cookieHeader += '; Secure'
  }

  const response = Response.json({ success: true })
  response.headers.set('Set-Cookie', cookieHeader)
  return response
}

// Replicates better-call's signCookieValue:
//   returns encodeURIComponent(`${value}.${base64HmacSha256Signature}`)
async function signCookieValue(value: string, secret: string): Promise<string> {
  const secretBuf = new TextEncoder().encode(secret)
  const cryptoKey = await crypto.subtle.importKey(
    'raw',
    secretBuf,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const signatureBuffer = await crypto.subtle.sign(
    'HMAC',
    cryptoKey,
    new TextEncoder().encode(value),
  )
  const base64Sig = btoa(String.fromCharCode(...new Uint8Array(signatureBuffer)))
  return encodeURIComponent(`${value}.${base64Sig}`)
}
