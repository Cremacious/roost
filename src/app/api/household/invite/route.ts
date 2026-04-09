import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { household_invites, household_members, households } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { addDays } from "date-fns";
import { generateInviteToken, getInviteUrl } from "@/lib/utils/inviteToken";
import { logActivity } from "@/lib/utils/activity";
import { getUserHousehold } from "@/app/api/chores/route";
import { format } from "date-fns";

const VALID_PRESET_DAYS = [1, 3, 7, 14, 30];

export async function POST(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const membership = await getUserHousehold(session.user.id);
  if (!membership) {
    return Response.json({ error: "No household found" }, { status: 404 });
  }
  if (membership.role !== "admin") {
    return Response.json({ error: "Only admins can invite guests" }, { status: 403 });
  }
  const { householdId } = membership;

  // Premium check
  const [household] = await db
    .select({ subscription_status: households.subscription_status })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);

  if (household?.subscription_status !== "premium") {
    return Response.json(
      { error: "Guest invites require premium", code: "GUEST_MEMBER_PREMIUM" },
      { status: 403 }
    );
  }

  let body: {
    email?: string;
    expires_in_days?: number;
    expires_at_custom?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const hasPreset = body.expires_in_days !== undefined;
  const hasCustom = body.expires_at_custom !== undefined && body.expires_at_custom !== "";

  if (!hasPreset && !hasCustom) {
    return Response.json(
      { error: "Provide either expires_in_days or expires_at_custom" },
      { status: 400 }
    );
  }
  if (hasPreset && hasCustom) {
    return Response.json(
      { error: "Provide only one of expires_in_days or expires_at_custom" },
      { status: 400 }
    );
  }

  let membershipExpiry: Date;

  if (hasPreset) {
    if (!VALID_PRESET_DAYS.includes(body.expires_in_days!)) {
      return Response.json(
        { error: "expires_in_days must be one of: 1, 3, 7, 14, 30" },
        { status: 400 }
      );
    }
    membershipExpiry = addDays(new Date(), body.expires_in_days!);
  } else {
    const parsed = new Date(body.expires_at_custom!);
    if (isNaN(parsed.getTime())) {
      return Response.json({ error: "Invalid date for expires_at_custom" }, { status: 400 });
    }
    const tomorrow = addDays(new Date(), 1);
    const maxDate = addDays(new Date(), 365);
    if (parsed < tomorrow) {
      return Response.json(
        { error: "Expiry date must be at least 1 day in the future" },
        { status: 400 }
      );
    }
    if (parsed > maxDate) {
      return Response.json(
        { error: "Expiry date must be within 365 days" },
        { status: 400 }
      );
    }
    membershipExpiry = parsed;
  }

  if (body.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(body.email)) {
      return Response.json({ error: "Invalid email format" }, { status: 400 });
    }
  }

  const linkExpiry = addDays(new Date(), 7);
  const token = generateInviteToken();

  const [invite] = await db
    .insert(household_invites)
    .values({
      household_id: householdId,
      created_by: session.user.id,
      token,
      email: body.email ?? null,
      is_guest: true,
      expires_at: membershipExpiry,
      link_expires_at: linkExpiry,
    })
    .returning();

  await logActivity({
    householdId,
    userId: session.user.id,
    type: "guest_invited",
    description: `invited a guest (access until ${format(membershipExpiry, "MMM d, yyyy")})`,
    entityId: invite.id,
    entityType: "household_invite",
  });

  return Response.json({
    invite: {
      id: invite.id,
      token: invite.token,
      url: getInviteUrl(invite.token),
      expires_at: membershipExpiry.toISOString(),
      link_expires_at: linkExpiry.toISOString(),
      email: invite.email,
    },
  });
}
