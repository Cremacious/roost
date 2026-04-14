import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { household_members, households } from "@/db/schema";
import { and, desc, eq } from "drizzle-orm";
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

const sessionCache = new WeakMap<Request, Promise<AuthSession | null>>();
const membershipCache = new WeakMap<Request, Promise<CurrentMembership | null>>();

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

      const [membership] = await db
        .select({
          householdId: household_members.household_id,
          role: household_members.role,
          expiresAt: household_members.expires_at,
          joinedAt: household_members.joined_at,
        })
        .from(household_members)
        .where(eq(household_members.user_id, session.user.id))
        .orderBy(desc(household_members.joined_at))
        .limit(1);

      if (!membership) return null;

      if (
        membership.role === "guest" &&
        membership.expiresAt &&
        membership.expiresAt < new Date()
      ) {
        return null;
      }

      return membership;
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

  // Check time-based expiry (promo codes, cancelled Stripe subs)
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

export function blockChild(member: HouseholdMember): void {
  if (member.role === "child") {
    throw new Response("Forbidden", { status: 403 });
  }
}
