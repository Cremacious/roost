import { SignJWT, jwtVerify } from "jose";

export const ADMIN_SESSION_COOKIE = "roost_admin_session";
export const SESSION_DURATION = 60 * 60 * 8; // 8 hours

async function getSecret(): Promise<Uint8Array> {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret) throw new Error("ADMIN_SESSION_SECRET not set");
  return new TextEncoder().encode(secret);
}

export async function createAdminSession(): Promise<string> {
  return new SignJWT({ admin: true })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("8h")
    .sign(await getSecret());
}

export async function verifyAdminSession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, await getSecret());
    return true;
  } catch {
    return false;
  }
}

export function checkAdminCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL;
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminEmail || !adminPassword) return false;
  return email === adminEmail && password === adminPassword;
}
