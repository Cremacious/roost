import { SignJWT, jwtVerify } from 'jose'

const COOKIE_NAME = 'roost-admin-token'
const ALG = 'HS256'
const EXPIRY = '8h'

function getSecret(): Uint8Array {
  const secret = process.env.ADMIN_JWT_SECRET ?? process.env.BETTER_AUTH_SECRET
  if (!secret) throw new Error('ADMIN_JWT_SECRET or BETTER_AUTH_SECRET must be set')
  return new TextEncoder().encode(secret)
}

export async function createAdminSession(): Promise<string> {
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: ALG })
    .setIssuedAt()
    .setExpirationTime(EXPIRY)
    .sign(getSecret())
}

export async function verifyAdminSession(token: string): Promise<boolean> {
  try {
    await jwtVerify(token, getSecret())
    return true
  } catch {
    return false
  }
}

export function checkAdminCredentials(email: string, password: string): boolean {
  const adminEmail = process.env.ADMIN_EMAIL
  const adminPassword = process.env.ADMIN_PASSWORD
  if (!adminEmail || !adminPassword) return false
  return email === adminEmail && password === adminPassword
}

export { COOKIE_NAME }
