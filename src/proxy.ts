import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getSession } from "@/lib/auth/helpers";

// Always public — never redirect
const ALWAYS_PUBLIC = ["/"];

// Auth pages: public when signed out; redirect to /dashboard when signed in
const AUTH_PAGES = ["/login", "/signup", "/child-login"];

// Prefixes that always pass through without session check
// /admin handles its own auth via admin session cookie
const SKIP_PREFIXES = ["/api/", "/_next", "/favicon.ico", "/brand/", "/images/", "/invite/", "/admin"];

// Forward x-pathname as a REQUEST header so server components can read it
// via headers(). Setting it on the response object would NOT make it
// available to server components (headers() reads request headers).
function nextWithPathname(request: NextRequest, pathname: string) {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-pathname", pathname);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Always public — homepage is never redirected
  if (ALWAYS_PUBLIC.includes(pathname)) {
    return nextWithPathname(request, pathname);
  }

  // Skip assets, API routes, and admin routes (each handles own auth)
  if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return nextWithPathname(request, pathname);
  }

  // Auth pages: redirect to /dashboard if already signed in
  if (AUTH_PAGES.includes(pathname)) {
    const session = await getSession(request);
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return nextWithPathname(request, pathname);
  }

  // All other routes (app shell, onboarding, etc.) require auth
  const session = await getSession(request);
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return nextWithPathname(request, pathname);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.png$|.*\\.ico$|.*\\.svg$).*)"],
};
