import type { NextRequest } from "next/server";

const LOCAL_ADMIN_DEV_HOST = "localhost:3000";

function normalizeHost(host: string | null | undefined): string {
  return (host ?? "").trim().toLowerCase();
}

export function isLocalAdminDevHost(host: string | null | undefined): boolean {
  return normalizeHost(host) === LOCAL_ADMIN_DEV_HOST;
}

export function isLocalAdminDevEnabled(host: string | null | undefined): boolean {
  return process.env.NODE_ENV === "development" && isLocalAdminDevHost(host);
}

export function isLocalAdminDevRequest(request: Request | NextRequest): boolean {
  return isLocalAdminDevEnabled(new URL(request.url).host);
}
