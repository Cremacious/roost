import { createHash } from "node:crypto";
import type { NextRequest } from "next/server";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

function normalizeIp(ip: string | null | undefined): string {
  if (!ip) return "unknown";
  return ip.trim();
}

export function getClientIp(request: Request | NextRequest): string {
  return normalizeIp(
    request.headers.get("x-forwarded-for")?.split(",")[0] ??
      request.headers.get("x-real-ip") ??
      request.headers.get("cf-connecting-ip")
  );
}

export function hashValue(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

export function isSafeMethod(method: string): boolean {
  return SAFE_METHODS.has(method.toUpperCase());
}

export function isSameOriginRequest(request: Request | NextRequest): boolean {
  const requestOrigin = new URL(request.url).origin;
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (origin) {
    return origin === requestOrigin;
  }

  if (referer) {
    try {
      return new URL(referer).origin === requestOrigin;
    } catch {
      return false;
    }
  }

  return true;
}

export function getAdminAllowedIps(): string[] {
  const raw = process.env.ADMIN_ALLOWED_IPS?.trim();
  if (!raw) return [];

  return raw
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export function isAdminIpAllowed(request: Request | NextRequest): boolean {
  const allowedIps = getAdminAllowedIps();
  if (allowedIps.length === 0) return true;

  return allowedIps.includes(getClientIp(request));
}
