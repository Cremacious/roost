import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { account } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { verifyPassword, hashPassword } from "better-auth/crypto";

function validatePasswordStrength(password: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Z]/.test(password)) return "Password must contain an uppercase letter";
  if (!/[0-9]/.test(password)) return "Password must contain a number";
  if (!/[^a-zA-Z0-9]/.test(password)) return "Password must contain a symbol";
  return null;
}

export async function POST(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  let body: { currentPassword?: string; newPassword?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.currentPassword || !body.newPassword) {
    return Response.json({ error: "currentPassword and newPassword are required" }, { status: 400 });
  }

  const strengthError = validatePasswordStrength(body.newPassword);
  if (strengthError) {
    return Response.json({ error: strengthError }, { status: 400 });
  }

  // Look up the credential account for this user
  const [credAccount] = await db
    .select({ id: account.id, password: account.password })
    .from(account)
    .where(
      and(
        eq(account.userId, session.user.id),
        eq(account.providerId, "credential")
      )
    )
    .limit(1);

  if (!credAccount || !credAccount.password) {
    return Response.json({ error: "No password account found" }, { status: 400 });
  }

  const valid = await verifyPassword({
    hash: credAccount.password,
    password: body.currentPassword,
  });

  if (!valid) {
    return Response.json({ error: "Current password is incorrect" }, { status: 400 });
  }

  const newHash = await hashPassword(body.newPassword);

  await db
    .update(account)
    .set({ password: newHash, updatedAt: new Date() })
    .where(eq(account.id, credAccount.id));

  return Response.json({ success: true });
}
