import { isAdminIpAllowed, isSafeMethod, isSameOriginRequest } from "@/lib/security/request";
import { ADMIN_SESSION_COOKIE, verifyAdminSession } from "./auth";

function getBlockedAdminResponse(): Response {
  return new Response("Not Found", { status: 404 });
}

export async function requireAdminSession(request: Request): Promise<Response | null> {
  if (!isAdminIpAllowed(request)) {
    return getBlockedAdminResponse();
  }

  if (!isSafeMethod(request.method) && !isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const cookieHeader = request.headers.get("cookie") ?? "";

  // Parse cookies manually (no DOM dependency needed here)
  const cookies: Record<string, string> = {};
  for (const part of cookieHeader.split(";")) {
    const eqIdx = part.indexOf("=");
    if (eqIdx === -1) continue;
    const key = decodeURIComponent(part.slice(0, eqIdx).trim());
    const val = decodeURIComponent(part.slice(eqIdx + 1).trim());
    cookies[key] = val;
  }

  const token = cookies[ADMIN_SESSION_COOKIE];
  if (!token) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const valid = await verifyAdminSession(token);
  if (!valid) {
    return Response.json({ error: "Session expired" }, { status: 401 });
  }

  return null; // authorized — proceed
}
