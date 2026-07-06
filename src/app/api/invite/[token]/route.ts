import { type NextRequest } from "next/server";
import { getSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { households, householdMembers, memberPermissions, householdInvites, user } from "@/db/schema";
import { and, eq, isNull } from "drizzle-orm";
import { logActivity } from "@/lib/utils/activity";
import { GUEST_PERMISSIONS } from "@/lib/constants/memberPermissions";

async function loadInvite(token: string) {
  const [invite] = await db
    .select({
      id: householdInvites.id,
      householdId: householdInvites.householdId,
      email: householdInvites.email,
      expiresAt: householdInvites.expiresAt,
      linkExpiresAt: householdInvites.linkExpiresAt,
      acceptedAt: householdInvites.acceptedAt,
      deletedAt: householdInvites.deletedAt,
      householdName: households.name,
      householdDeletedAt: households.deleted_at,
    })
    .from(householdInvites)
    .innerJoin(households, eq(householdInvites.householdId, households.id))
    .where(eq(householdInvites.token, token))
    .limit(1);
  return invite ?? null;
}

// GET (public): check invite validity.
//   404 = not found, 410 = expired / already used / household gone, 200 = valid.
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<Response> {
  const { token } = await params;

  const invite = await loadInvite(token);
  if (!invite || invite.deletedAt || invite.householdDeletedAt) {
    return Response.json({ status: "not_found" }, { status: 404 });
  }

  if (invite.acceptedAt) {
    return Response.json({ status: "used" }, { status: 410 });
  }
  if (invite.linkExpiresAt && invite.linkExpiresAt <= new Date()) {
    return Response.json({ status: "expired" }, { status: 410 });
  }

  return Response.json({
    status: "valid",
    householdName: invite.householdName,
    email: invite.email,
    expiresAt: invite.expiresAt?.toISOString() ?? null,
  });
}

// POST (auth): accept the invite, joining as a guest.
export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
): Promise<Response> {
  const { token } = await params;

  const session = await getSession();
  if (!session) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  const invite = await loadInvite(token);
  if (!invite || invite.deletedAt || invite.householdDeletedAt) {
    return Response.json({ status: "not_found", error: "Invite not found" }, { status: 404 });
  }
  if (invite.acceptedAt) {
    return Response.json({ status: "used", error: "This invite has already been used" }, { status: 410 });
  }
  if (invite.linkExpiresAt && invite.linkExpiresAt <= new Date()) {
    return Response.json({ status: "expired", error: "This invite link has expired" }, { status: 410 });
  }

  // Already an active member of this household?
  const [existing] = await db
    .select({ id: householdMembers.id })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, invite.householdId),
        eq(householdMembers.userId, userId),
        isNull(householdMembers.deletedAt),
      )
    )
    .limit(1);

  if (existing) {
    return Response.json(
      { error: "You are already a member of this household", code: "ALREADY_MEMBER" },
      { status: 409 },
    );
  }

  // Create the guest membership with the invite's access window.
  await db.insert(householdMembers).values({
    householdId: invite.householdId,
    userId,
    role: "guest",
    expiresAt: invite.expiresAt,
  });

  await db.insert(memberPermissions).values({
    householdId: invite.householdId,
    userId,
    ...GUEST_PERMISSIONS,
  });

  // Mark the invite consumed.
  await db
    .update(householdInvites)
    .set({ acceptedAt: new Date(), acceptedByUserId: userId })
    .where(eq(householdInvites.id, invite.id));

  // A guest has joined a household — clear the onboarding gate so the proxy
  // does not redirect them to /onboarding.
  await db
    .update(user)
    .set({ onboardingCompleted: true, updatedAt: new Date() })
    .where(eq(user.id, userId));

  await logActivity({
    householdId: invite.householdId,
    userId,
    type: "member_joined",
    entityId: userId,
    entityType: "member",
    description: "Guest joined the household",
  });

  return Response.json({ householdId: invite.householdId, householdName: invite.householdName });
}
