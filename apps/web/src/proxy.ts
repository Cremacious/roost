import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { auth } from '@/lib/auth'

const AUTH_ROUTES = ['/login', '/signup']

function isAppRoute(pathname: string) {
  return (
    pathname.startsWith('/today') ||
    pathname.startsWith('/household') ||
    pathname.startsWith('/food') ||
    pathname.startsWith('/money') ||
    pathname.startsWith('/more') ||
    pathname.startsWith('/settings')
  )
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // API routes handle their own auth
  if (pathname.startsWith('/api/')) return NextResponse.next()
  // Static admin bypasses app auth
  if (pathname.startsWith('/admin')) return NextResponse.next()

  const session = await auth.api.getSession({ headers: request.headers })

  // Authed users trying to reach login/signup → send to /today
  if (session && AUTH_ROUTES.some(r => pathname.startsWith(r))) {
    return NextResponse.redirect(new URL('/today', request.url))
  }

  // Authed users who have completed onboarding visiting /onboarding → /today
  if (session && pathname.startsWith('/onboarding')) {
    const user = session.user as { onboardingCompleted?: boolean }
    if (user.onboardingCompleted) {
      return NextResponse.redirect(new URL('/today', request.url))
    }
  }

  // /onboarding is public (Step 1 creates the account); no redirect for unauthenticated

  // Protected app routes require auth
  if (!session && isAppRoute(pathname)) {
    const url = new URL('/login', request.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  // Onboarding guard: authed but onboarding not completed → hold at /onboarding
  if (session && isAppRoute(pathname)) {
    const user = session.user as { onboardingCompleted?: boolean }
    if (!user.onboardingCompleted) {
      return NextResponse.redirect(new URL('/onboarding', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
