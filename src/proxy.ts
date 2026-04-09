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

export async function proxy(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  // Always public — homepage is never redirected
  if (ALWAYS_PUBLIC.includes(pathname)) {
    const res = NextResponse.next();
    res.headers.set("x-pathname", pathname);
    return res;
  }

  // Skip assets, API routes, and admin routes (each handles own auth)
  if (SKIP_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    const res = NextResponse.next();
    res.headers.set("x-pathname", pathname);
    return res;
  }

  // Auth pages: redirect to /dashboard if already signed in
  if (AUTH_PAGES.includes(pathname)) {
    const session = await getSession(request);
    if (session) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    const res = NextResponse.next();
    res.headers.set("x-pathname", pathname);
    return res;
  }

  // All other routes (app shell, onboarding, etc.) require auth
  const session = await getSession(request);
  if (!session) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  const res = NextResponse.next();
  res.headers.set("x-pathname", pathname);
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|.*\\.png$|.*\\.ico$|.*\\.svg$).*)"],
};
