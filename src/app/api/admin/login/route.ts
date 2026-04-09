import { NextRequest } from "next/server";
import {
  checkAdminCredentials,
  createAdminSession,
  ADMIN_SESSION_COOKIE,
  SESSION_DURATION,
} from "@/lib/admin/auth";

export async function POST(request: NextRequest): Promise<Response> {
  let body: { email?: string; password?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { email, password } = body;
  if (!email || !password) {
    return Response.json({ error: "Email and password required" }, { status: 400 });
  }

  if (!checkAdminCredentials(email, password)) {
    return Response.json({ error: "Invalid credentials" }, { status: 401 });
  }

  const token = await createAdminSession();
  const isProduction = process.env.NODE_ENV === "production";

  const response = Response.json({ success: true });
  const cookieValue = [
    `${ADMIN_SESSION_COOKIE}=${token}`,
    `Max-Age=${SESSION_DURATION}`,
    `Path=/`,
    `HttpOnly`,
    `SameSite=Lax`,
    isProduction ? "Secure" : "",
  ]
    .filter(Boolean)
    .join("; ");

  const headers = new Headers(response.headers);
  headers.set("Set-Cookie", cookieValue);

  return new Response(response.body, { status: 200, headers });
}
