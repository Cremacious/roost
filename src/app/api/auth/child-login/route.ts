import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { households, household_members, users } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";
import { serializeSignedCookie } from "better-call";
import { consumeRateLimit, resetRateLimit } from "@/lib/security/rateLimit";
import { getClientIp, hashValue } from "@/lib/security/request";

// ---- In-memory rate limiter --------------------------------------------------
// Same pattern as admin login: 5 attempts per IP per 15-minute window.
// Per-instance only (Vercel serverless) — prevents trivial single-source brute force
// of 4-digit child PINs. The attack surface requires knowing the household code first.

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;


// ---- GET: List children in a household (public, no auth) --------------------

export async function GET(request: NextRequest): Promise<Response> {
  const { searchParams } = new URL(request.url);
  const householdCode = searchParams.get("householdCode")?.toUpperCase();

  if (!householdCode) {
    return Response.json({ error: "householdCode is required" }, { status: 400 });
  }

  const [household] = await db
    .select({ id: households.id })
    .from(households)
    .where(and(eq(households.code, householdCode), isNull(households.deleted_at)))
    .limit(1);

  if (!household) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  const childMembers = await db
    .select({
      id: users.id,
      name: users.name,
      avatar_color: users.avatar_color,
    })
    .from(household_members)
    .innerJoin(users, eq(users.id, household_members.user_id))
    .where(
      and(
        eq(household_members.household_id, household.id),
        eq(household_members.role, "child")
      )
    );

  return Response.json({ children: childMembers });
}

// ---- POST: Authenticate a child with childId + PIN --------------------------

export async function POST(request: NextRequest): Promise<Response> {
  const ip = getClientIp(request);
  const rateLimitKey = hashValue(`child-login:${ip}`);
  const { allowed, retryAfterSec } = await consumeRateLimit({
    scope: "child-login",
    key: rateLimitKey,
    limit: MAX_ATTEMPTS,
    windowMs: WINDOW_MS,
  });
  if (!allowed) {
    return Response.json(
      { error: "Too many attempts. Try again later." },
      { status: 429, headers: { "Retry-After": String(retryAfterSec) } }
    );
  }

  let body: { householdCode?: string; childId?: string; pin?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { householdCode, childId, pin } = body;

  if (!householdCode || !childId || !pin) {
    return Response.json(
      { error: "householdCode, childId, and PIN are required" },
      { status: 400 }
    );
  }

  const [household] = await db
    .select()
    .from(households)
    .where(and(eq(households.code, householdCode.toUpperCase()), isNull(households.deleted_at)))
    .limit(1);

  if (!household) {
    return Response.json({ error: "Invalid household code" }, { status: 401 });
  }

  const [member] = await db
    .select()
    .from(household_members)
    .where(
      and(
        eq(household_members.household_id, household.id),
        eq(household_members.user_id, childId),
        eq(household_members.role, "child")
      )
    )
    .limit(1);

  if (!member) {
    return Response.json({ error: "Invalid PIN" }, { status: 401 });
  }

  if (!member.pin) {
    return Response.json(
      { error: "No PIN set. Ask a parent to set one in Settings." },
      { status: 401 }
    );
  }

  const valid = await verifyPassword({ hash: member.pin, password: pin });
  if (!valid) {
    return Response.json({ error: "Invalid PIN" }, { status: 401 });
  }

  await resetRateLimit("child-login", rateLimitKey);

  const ctx = await auth.$context;
  const session = await ctx.internalAdapter.createSession(childId);

  const cookieName = ctx.authCookies.sessionToken.name;
  const cookieOptions = ctx.authCookies.sessionToken.attributes;

  const setCookie = await serializeSignedCookie(
    cookieName,
    session.token,
    ctx.secret,
    {
      ...cookieOptions,
      path: "/",
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    }
  );

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: {
      "Content-Type": "application/json",
      "Set-Cookie": setCookie,
    },
  });
}
