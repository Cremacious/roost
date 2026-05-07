import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

// Routes anyone can visit without a session
const PUBLIC_ROUTES = ['/', '/login', '/signup', '/child-login']

function isPublic(pathname: string) {
  if (PUBLIC_ROUTES.includes(pathname)) return true
  if (pathname.startsWith('/invite/')) return true
  if (pathname.startsWith('/api/')) return true
  if (pathname.startsWith('/admin')) return true
  return false
}

/**
 * Build a Content-Security-Policy header value for this request's nonce.
 *
 * Design decisions:
 * - script-src uses nonce + 'strict-dynamic' so Next.js hydration scripts and
 *   dynamically imported chunks are trusted without 'unsafe-inline'.
 * - style-src uses 'unsafe-inline' because next/font injects an inline <style>
 *   for @font-face and Tiptap editor styles are also inline. CSS injection is a
 *   much weaker attack surface than JS injection, so this is an accepted trade-off.
 * - font-src only needs 'self' because next/font/google self-hosts all font files
 *   at build time under /_next/static/media/ — no external font CDN needed.
 * - connect-src allows api.open-meteo.com for the weather widget in TopBar.
 * - frame-ancestors 'none' blocks clickjacking (also covers X-Frame-Options: DENY).
 * - upgrade-insecure-requests forces HTTPS in production.
 *
 * To capture CSP violations in production, add:
 *   report-to default; report-uri /api/csp-report
 * once a monitoring service (Sentry or similar) is configured.
 */
function buildCsp(nonce: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'`,
    "style-src 'self' 'unsafe-inline'",
    "font-src 'self'",
    "connect-src 'self' api.open-meteo.com",
    "img-src 'self' data: blob:",
    "frame-src 'none'",
    "frame-ancestors 'none'",
    "form-action 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "upgrade-insecure-requests",
  ].join('; ')
}

/**
 * Apply security headers to every HTML response.
 * The nonce is unique per request so it cannot be pre-computed by an attacker.
 */
function applySecurityHeaders(response: NextResponse, nonce: string): NextResponse {
  response.headers.set('Content-Security-Policy', buildCsp(nonce))
  // Belt-and-suspenders for older browsers that predate CSP frame-ancestors
  response.headers.set('X-Frame-Options', 'DENY')
  // Prevent MIME-type sniffing attacks
  response.headers.set('X-Content-Type-Options', 'nosniff')
  // Limit referrer information on cross-origin navigation
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  // Lock down browser feature access. geolocation=(self) is required for the
  // weather widget; camera and microphone are not used by the browser API
  // (receipt scanning uses <input capture="environment">, not getUserMedia).
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=(self)')
  return response
}

/**
 * Create a pass-through NextResponse with:
 * 1. The nonce forwarded to the layout via x-nonce request header so
 *    RootLayout can stamp <html nonce={nonce}> for Next.js hydration scripts.
 * 2. Security headers on the response.
 */
function nextWithNonce(request: NextRequest, nonce: string): NextResponse {
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-nonce', nonce)
  const response = NextResponse.next({ request: { headers: requestHeaders } })
  return applySecurityHeaders(response, nonce)
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Generate a fresh cryptographic nonce for every request.
  // btoa(randomUUID()) gives a URL-safe base64 string with ~122 bits of entropy.
  const nonce = btoa(crypto.randomUUID())

  // Skip middleware for static files handled by matcher config
  if (isPublic(pathname)) {
    const session = await auth.api.getSession({ headers: request.headers })

    // Logged-in users hitting auth pages → send to /today
    if (session && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/today', request.url))
    }

    // Logged-in users who finished onboarding visiting /onboarding → /today
    // (handled below; let /onboarding fall through to the protected block)

    return nextWithNonce(request, nonce)
  }

  // Everything else requires auth
  const session = await auth.api.getSession({ headers: request.headers })

  if (!session) {
    const url = new URL('/login', request.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  // Onboarding guard: authed + onboarding complete → skip /onboarding
  if (pathname.startsWith('/onboarding')) {
    const user = session.user as { onboardingCompleted?: boolean }
    if (user.onboardingCompleted) {
      return NextResponse.redirect(new URL('/today', request.url))
    }
    return nextWithNonce(request, nonce)
  }

  // Onboarding guard: authed but onboarding NOT complete → hold at /onboarding
  const user = session.user as { onboardingCompleted?: boolean }
  if (!user.onboardingCompleted) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  return nextWithNonce(request, nonce)
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
