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

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Skip middleware for static files handled by matcher config
  if (isPublic(pathname)) {
    const session = await auth.api.getSession({ headers: request.headers })

    // Logged-in users hitting auth pages → send to /today
    if (session && (pathname === '/login' || pathname === '/signup')) {
      return NextResponse.redirect(new URL('/today', request.url))
    }

    // Logged-in users who finished onboarding visiting /onboarding → /today
    // (handled below; let /onboarding fall through to the protected block)

    return NextResponse.next()
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
    return NextResponse.next()
  }

  // Onboarding guard: authed but onboarding NOT complete → hold at /onboarding
  const user = session.user as { onboardingCompleted?: boolean }
  if (!user.onboardingCompleted) {
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
