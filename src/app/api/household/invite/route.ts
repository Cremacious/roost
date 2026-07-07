import { type NextRequest } from "next/server";
import { requireSession, getUserHousehold, requirePremium } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { householdInvites } from "@/db/schema";
import { generateInviteToken, getInviteUrl } from "@/lib/utils/inviteToken";

const DAY_MS = 24 * 60 * 60 * 1000;

// POST: admin — create an invite link.
// Body:
//   { role: "member" }  -> free, standard member invite (link valid 7 days,
//                          membership does not expire)
//   { role: "guest", email?, expiresInDays }  -> premium, temporary guest invite
// Omitting role defaults to a member invite.
export async function POST(request: NextRequest): Promise<Response> {
  const session = await requireSession();
  const householdData = await getUserHousehold(session.user.id);

  if (!householdData) {
    return Response.json({ error: "No household" }, { status: 403 });
  }
  if (householdData.role !== "admin") {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const role = body?.role === "guest" ? "guest" : "member";
  const email: string | null =
    typeof body?.email === "string" && body.email.trim() ? body.email.trim().toLowerCase() : null;

  const now = new Date();
  const token = generateInviteToken();

  if (role === "guest") {
    // Guest members are a premium feature.
    try {
      await requirePremium(householdData.householdId);
    } catch (r) {
      return r as Response;
    }

    const expiresInDays = Number(body?.expiresInDays);
    if (!Number.isFinite(expiresInDays) || expiresInDays < 1 || expiresInDays > 365) {
      return Response.json(
        { error: "expiresInDays must be a number between 1 and 365" },
        { status: 400 },
      );
    }

    // When the guest membership itself expires.
    const expiresAt = new Date(now.getTime() + expiresInDays * DAY_MS);
    // The link is usable for at most 7 days, but never longer than the access window.
    const linkExpiresAt = new Date(Math.min(now.getTime() + 7 * DAY_MS, expiresAt.getTime()));

    await db.insert(householdInvites).values({
      householdId: householdData.householdId,
      token,
      email,
      isGuest: "true",
      expiresAt,
      linkExpiresAt,
      createdBy: session.user.id,
    });

    return Response.json({
      token,
      url: getInviteUrl(token),
      expiresAt: expiresAt.toISOString(),
      linkExpiresAt: linkExpiresAt.toISOString(),
    });
  }

  // Member invite (free): the link works for 7 days, the membership never expires.
  const linkExpiresAt = new Date(now.getTime() + 7 * DAY_MS);

  await db.insert(householdInvites).values({
    householdId: householdData.householdId,
    token,
    email,
    isGuest: "false",
    expiresAt: null,
    linkExpiresAt,
    createdBy: session.user.id,
  });

  return Response.json({
    token,
    url: getInviteUrl(token),
    expiresAt: null,
    linkExpiresAt: linkExpiresAt.toISOString(),
  });
}
