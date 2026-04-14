import { ADMIN_SESSION_COOKIE } from "@/lib/admin/auth";
import { isAdminIpAllowed, isSameOriginRequest } from "@/lib/security/request";

export async function POST(request: Request): Promise<Response> {
  if (!isAdminIpAllowed(request)) {
    return new Response("Not Found", { status: 404 });
  }

  if (!isSameOriginRequest(request)) {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }

  const cookieValue = [
    `${ADMIN_SESSION_COOKIE}=`,
    `Max-Age=0`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Strict`,
  ].join("; ");

  const headers = new Headers();
  headers.set("Set-Cookie", cookieValue);
  headers.set("Location", "/admin/login");
  headers.set("Cache-Control", "no-store");

  return new Response(null, { status: 302, headers });
}
