import { NextRequest } from "next/server";
import {
  checkAdminCredentials,
  createAdminSession,
  ADMIN_SESSION_COOKIE,
  SESSION_DURATION,
} from "@/lib/admin/auth";

// ---- In-memory rate limiter --------------------------------------------------
// Limits per source IP: 5 attempts per 15-minute window.
// Note: this is per serverless function instance (Vercel). It prevents trivial
// brute force but does not protect against distributed attacks across instances.
// For stronger protection, use Vercel KV or an upstream WAF.

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

interface RateEntry { count: number; resetAt: number }
const loginAttempts = new Map<string, RateEntry>();

function getClientIp(request: NextRequest): string {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip") ??
    "unknown"
  );
}

function checkRateLimit(ip: string): { allowed: boolean; retryAfterSec: number } {
  const now = Date.now();
  const entry = loginAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    loginAttempts.set(ip, { count: 1, resetAt: now + WINDOW_MS });
    return { allowed: true, retryAfterSec: 0 };
  }

  if (entry.count >= MAX_ATTEMPTS) {
    return { allowed: false, retryAfterSec: Math.ceil((entry.resetAt - now) / 1000) };
  }

  entry.count++;
  return { allowed: true, retryAfterSec: 0 };
}

function clearRateLimit(ip: string): void {
  loginAttempts.delete(ip);
}

// ---- POST: admin login -------------------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
  const ip = getClientIp(request);
  const now = new Date().toISOString();

  // Rate limit check
  const { allowed, retryAfterSec } = checkRateLimit(ip);
  if (!allowed) {
    console.warn(`[admin-login] rate-limited ip=${ip} at=${now}`);
    return Response.json(
      { error: "Too many login attempts. Try again later." },
      {
        status: 429,
        headers: { "Retry-After": String(retryAfterSec) },
      }
    );
  }

  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return Response.json({ error: "Email and password required" }, { status: 400 });
  }

  if (!checkAdminCredentials(email, password)) {
    console.warn(`[admin-login] failed attempt email=${email} ip=${ip} at=${now}`);
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Successful login: clear rate limit counter and issue session
  clearRateLimit(ip);
  console.info(`[admin-login] success email=${email} ip=${ip} at=${now}`);

  const token = await createAdminSession();
  const isProduction = process.env.NODE_ENV === "production";

  const response = Response.json({ success: true });
  const cookieValue = [
    `${ADMIN_SESSION_COOKIE}=${token}`,
    `Max-Age=${SESSION_DURATION}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    isProduction ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  const headers = new Headers(response.headers);
  headers.set("Set-Cookie", cookieValue);

  return new Response(response.body, { status: 200, headers });
}
