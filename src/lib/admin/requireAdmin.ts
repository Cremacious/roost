import type { NextRequest } from 'next/server'
import { verifyAdminSession, COOKIE_NAME } from './auth'

/**
 * Returns null if the request has a valid admin session token.
 * Returns a 401 Response if not authenticated.
 * Usage: const unauth = await requireAdminSession(request); if (unauth) return unauth
 */
export async function requireAdminSession(request: NextRequest): Promise<Response | null> {
  // Parse cookie header manually (works in Edge Runtime + Node)
  const cookieHeader = request.headers.get('cookie') ?? ''
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const [k, ...v] = c.trim().split('=')
      return [k.trim(), v.join('=')]
    })
  )
  const token = cookies[COOKIE_NAME]
  if (!token) {
    return Response.json({ error: 'Admin authentication required' }, { status: 401 })
  }
  const valid = await verifyAdminSession(token)
  if (!valid) {
    return Response.json({ error: 'Invalid or expired admin session' }, { status: 401 })
  }
  return null
}
