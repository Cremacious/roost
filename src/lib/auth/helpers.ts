import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { household_members, households, users } from "@/db/schema";
import { and, desc, eq, inArray } from "drizzle-orm";
import type { HouseholdMember } from "@/db/schema";

type SessionUser = typeof auth.$Infer.Session.user;
type SessionData = typeof auth.$Infer.Session.session;

export interface AuthSession {
  user: SessionUser;
  session: SessionData;
}

export interface AuthSessionWithMember extends AuthSession {
  member: HouseholdMember;
}

export interface CurrentMembership {
  householdId: string;
  role: HouseholdMember["role"];
  expiresAt: Date | null;
  joinedAt: Date | null;
}

export interface UserMembershipSummary extends CurrentMembership {
  id: string;
}

const sessionCache = new WeakMap<Request, Promise<AuthSession | null>>();
const membershipCache = new WeakMap<Request, Promise<CurrentMembership | null>>();

function isMembershipActive(membership: {
  role: HouseholdMember["role"];
  expiresAt: Date | null;
}): boolean {
  if (
    membership.role === "guest" &&
    membership.expiresAt &&
    membership.expiresAt < new Date()
  ) {
    return false;
  }

  return true;
}

async function persistActiveHousehold(userId: string, householdId: string): Promise<void> {
  await db
    .update(users)
    .set({
      active_household_id: householdId,
      updated_at: new Date(),
    })
    .where(eq(users.id, userId))
    .catch(() => {
      // Non-fatal: some older users may still be missing an app-users row.
    });
}

export async function getUserMemberships(
  userId: string
): Promise<UserMembershipSummary[]> {
  const memberships = await db
    .select({
      id: household_members.id,
      householdId: household_members.household_id,
      role: household_members.role,
      expiresAt: household_members.expires_at,
      joinedAt: household_members.joined_at,
    })
    .from(household_members)
    .where(eq(household_members.user_id, userId))
    .orderBy(desc(household_members.joined_at));

  return memberships.filter(isMembershipActive);
}

export async function getUserActiveMembership(
  userId: string
): Promise<CurrentMembership | null> {
  const memberships = await getUserMemberships(userId);
  if (memberships.length === 0) {
    return null;
  }

  const [userRow] = await db
    .select({ activeHouseholdId: users.active_household_id })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  const activeMembership =
    memberships.find((membership) => membership.householdId === userRow?.activeHouseholdId) ??
    memberships[0];

  if (activeMembership && activeMembership.householdId !== userRow?.activeHouseholdId) {
    await persistActiveHousehold(userId, activeMembership.householdId);
  }

  return {
    householdId: activeMembership.householdId,
    role: activeMembership.role,
    expiresAt: activeMembership.expiresAt,
    joinedAt: activeMembership.joinedAt,
  };
}

export async function userHasPremiumHousehold(userId: string): Promise<boolean> {
  const memberships = await getUserMemberships(userId);
  if (memberships.length === 0) {
    return false;
  }

  const householdRows = await db
    .select({
      id: households.id,
      subscriptionStatus: households.subscription_status,
      premiumExpiresAt: households.premium_expires_at,
    })
    .from(households)
    .where(inArray(households.id, memberships.map((membership) => membership.householdId)));

  return householdRows.some((household) => {
    if (household.subscriptionStatus !== "premium") {
      return false;
    }

    return household.premiumExpiresAt === null || new Date(household.premiumExpiresAt) > new Date();
  });
}

export async function getSession(
  request: Request
): Promise<AuthSession | null> {
  let cached = sessionCache.get(request);
  if (!cached) {
    cached = auth.api.getSession({ headers: request.headers }).then(
      (session) => session ?? null
    );
    sessionCache.set(request, cached);
  }

  return cached;
}

export async function requireSession(request: Request): Promise<AuthSession> {
  const session = await getSession(request);
  if (!session) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return session;
}

export async function getCurrentMembership(
  request: Request
): Promise<CurrentMembership | null> {
  let cached = membershipCache.get(request);
  if (!cached) {
    cached = (async () => {
      const session = await getSession(request);
      if (!session) return null;
      return getUserActiveMembership(session.user.id);
    })();

    membershipCache.set(request, cached);
  }

  return cached;
}

export async function requireCurrentMembership(
  request: Request
): Promise<AuthSession & { membership: CurrentMembership }> {
  const session = await requireSession(request);
  const membership = await getCurrentMembership(request);

  if (!membership) {
    throw Response.json({ error: "No household found" }, { status: 404 });
  }

  return { ...session, membership };
}

export async function requireHouseholdMember(
  request: Request,
  householdId: string
): Promise<AuthSessionWithMember> {
  const session = await requireSession(request);

  const [member] = await db
    .select()
    .from(household_members)
    .where(
      and(
        eq(household_members.household_id, householdId),
        eq(household_members.user_id, session.user.id)
      )
    )
    .limit(1);

  if (!member) {
    throw new Response("Forbidden", { status: 403 });
  }

  // Real-time guest expiry check (safety net — cron handles cleanup)
  if (member.role === "guest" && member.expires_at && member.expires_at < new Date()) {
    throw Response.json(
      { error: "Your guest access has expired", code: "GUEST_EXPIRED" },
      { status: 403 }
    );
  }

  return { ...session, member };
}

export async function requireHouseholdAdmin(
  request: Request,
  householdId: string
): Promise<AuthSessionWithMember> {
  const result = await requireHouseholdMember(request, householdId);

  if (result.member.role !== "admin") {
    throw new Response("Forbidden", { status: 403 });
  }

  return result;
}

export async function requirePremium(
  request: Request,
  householdId: string
): Promise<AuthSessionWithMember> {
  const result = await requireHouseholdMember(request, householdId);

  const [household] = await db
    .select({
      subscription_status: households.subscription_status,
      premium_expires_at: households.premium_expires_at,
    })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);

  if (!household || household.subscription_status !== "premium") {
    throw Response.json({ error: "Premium required" }, { status: 403 });
  }

  // Check time-based expiry (promo codes, cancelled Stripe subs).
  // premium_expires_at = null means permanent premium (Stripe active or lifetime promo).
  if (
    household.premium_expires_at &&
    new Date(household.premium_expires_at) <= new Date()
  ) {
    // Lazy cleanup: revert expired premium back to free
    await db
      .update(households)
      .set({
        subscription_status: "free",
        premium_expires_at: null,
        updated_at: new Date(),
      })
      .where(eq(households.id, householdId));

    throw Response.json({ error: "Premium required" }, { status: 403 });
  }

  return result;
}

export function isChild(member: HouseholdMember): boolean {
  return member.role === "child";
}

export async function setUserActiveHousehold(
  userId: string,
  householdId: string
): Promise<void> {
  await persistActiveHousehold(userId, householdId);
}

export function blockChild(member: HouseholdMember): void {
  if (member.role === "child") {
    throw new Response("Forbidden", { status: 403 });
  }
}
