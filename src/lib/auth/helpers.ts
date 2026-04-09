import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { household_members, households } from "@/db/schema";
import { and, eq } from "drizzle-orm";
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

export async function getSession(
  request: Request
): Promise<AuthSession | null> {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return null;
  return session;
}

export async function requireSession(request: Request): Promise<AuthSession> {
  const session = await getSession(request);
  if (!session) {
    throw new Response("Unauthorized", { status: 401 });
  }
  return session;
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
    .select({ subscription_status: households.subscription_status })
    .from(households)
    .where(eq(households.id, householdId))
    .limit(1);

  if (!household || household.subscription_status !== "premium") {
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
