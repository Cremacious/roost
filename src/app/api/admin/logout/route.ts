import { ADMIN_SESSION_COOKIE } from "@/lib/admin/auth";

export async function POST(): Promise<Response> {
  const cookieValue = [
    `${ADMIN_SESSION_COOKIE}=`,
    `Max-Age=0`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
  ].join("; ");

  const headers = new Headers();
  headers.set("Set-Cookie", cookieValue);
  headers.set("Location", "/admin/login");

  return new Response(null, { status: 302, headers });
}
