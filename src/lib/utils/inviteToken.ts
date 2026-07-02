/**
 * Guest invite link helpers.
 *
 * Tokens are 32 random bytes hex-encoded (64 chars) — long enough to be
 * unguessable, safe in a URL. getInviteUrl() builds the public landing URL
 * from NEXT_PUBLIC_APP_URL so links work in every environment.
 */

export function generateInviteToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

export function getInviteUrl(token: string): string {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "").replace(/\/$/, "");
  return `${base}/invite/${token}`;
}
