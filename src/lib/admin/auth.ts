import { createHash, timingSafeEqual } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";

export const ADMIN_SESSION_COOKIE = "roost_admin_session";
export const SESSION_DURATION = 60 * 60 * 8; // 8 hours

function hashForComparison(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

function secureEqual(left: string, right: string): boolean {
  return timingSafeEqual(hashForComparison(left), hashForComparison(right));
}

function normalizeAdminEmail(email: string): string {
  return email.trim().toLowerCase();
}

async function getSecret(): Promise<Uint8Array> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET not set");
  return new TextEncoder().encode(secret);
}

export async function createAdminSession(): Promise<string> {
  return new SignJWT({ admin: true, scope: "roost-admin" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(await getSecret());
}

export async function verifyAdminSession(token: string): Promise<boolean> {
  try {
    const { payload } = await jwtVerify(token, await getSecret());
    return payload.admin === true && payload.scope === "roost-admin";
  } catch {
    return false;
  }
}

export function checkAdminCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return false;

  return (
    secureEqual(normalizeAdminEmail(email), normalizeAdminEmail(adminEmail)) &&
    secureEqual(password, adminPassword)
  );
}

export function adminSessionCookieAttributes(isProduction: boolean): string[] {
  return [
    `Max-Age=${SESSION_DURATION}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Strict`,
    isProduction ? "Secure" : "",
  ].filter(Boolean);
}
