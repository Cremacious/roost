import { NextRequest } from "next/server";
import {
  checkAdminCredentials,
  createAdminSession,
  ADMIN_SESSION_COOKIE,
  adminSessionCookieAttributes,
} from "@/lib/admin/auth";
import { consumeRateLimit, resetRateLimit } from "@/lib/security/rateLimit";
import {
  getClientIp,
  hashValue,
  isAdminIpAllowed,
  isSameOriginRequest,
} from "@/lib/security/request";
import { validateAdminEnv } from "@/lib/env";
import { log } from "@/lib/utils/logger";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minutes

// ---- POST: admin login -------------------------------------------------------

export async function POST(request: NextRequest): Promise<Response> {
  try {
    validateAdminEnv();
  } catch {
    return Response.json(
      { error: "Admin access is not configured" },
      { status: 503 }
    );
  }

  const ip = getClientIp(request);
  const sourceKey = hashValue(`admin-login:${ip}`);

  if (!isAdminIpAllowed(request)) {
    return new Response("Not Found", { status: 404 });
  }

  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  // Rate limit check
  const { allowed, retryAfterSec } = await consumeRateLimit({
    scope: "admin-login",
    key: sourceKey,
    limit: MAX_ATTEMPTS,
    windowMs: WINDOW_MS,
  });
  if (!allowed) {
    log.warn("admin.login.rate_limited", { sourceKey, retryAfterSec });
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
    log.warn("admin.login.failed", { sourceKey });
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Successful login: clear rate limit counter and issue session
  await resetRateLimit("admin-login", sourceKey);
  log.info("admin.login.succeeded", { sourceKey });

  const token = await createAdminSession();
  const isProduction = process.env.NODE_ENV === "production";

  const response = Response.json({ success: true });
  const cookieValue = [
    `${ADMIN_SESSION_COOKIE}=${token}`,
    ...adminSessionCookieAttributes(isProduction),
  ]
    .filter(Boolean)
    .join("; ");

  const headers = new Headers(response.headers);
  headers.set("Set-Cookie", cookieValue);
  headers.set("Cache-Control", "no-store");

  return new Response(response.body, { status: 200, headers });
}
