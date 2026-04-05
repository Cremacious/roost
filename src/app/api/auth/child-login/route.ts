import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { households, household_members } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { verifyPassword } from "better-auth/crypto";
import { serializeSignedCookie } from "better-call";

export async function POST(request: NextRequest): Promise<Response> {
  let body: { householdCode?: string; pin?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { householdCode, pin } = body;

  if (!householdCode || !pin) {
    return Response.json(
      { error: "Household code and PIN are required" },
      { status: 400 }
    );
  }

  const [household] = await db
    .select()
    .from(households)
    .where(
      and(eq(households.code, householdCode), isNull(households.deleted_at))
    )
    .limit(1);

  if (!household) {
    return Response.json({ error: "Invalid household code" }, { status: 401 });
  }

  const childMembers = await db
    .select()
    .from(household_members)
    .where(
      and(
        eq(household_members.household_id, household.id),
        eq(household_members.role, "child")
      )
    );

  let matchedUserId: string | null = null;

  for (const member of childMembers) {
    if (!member.pin) continue;
    const valid = await verifyPassword({ hash: member.pin, password: pin });
    if (valid) {
      matchedUserId = member.user_id;
      break;
    }
  }

  if (!matchedUserId) {
    return Response.json({ error: "Invalid PIN" }, { status: 401 });
  }

  const ctx = await auth.$context;
  const session = await ctx.internalAdapter.createSession(matchedUserId);

  const cookieName = ctx.authCookies.sessionToken.name;
  const cookieOptions = ctx.authCookies.sessionToken.options;

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
