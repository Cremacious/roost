import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { THEMES, type ThemeKey } from "@/lib/constants/themes";

export async function PATCH(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const body = await request.json().catch(() => ({}));
  const { theme } = body as { theme: unknown };

  if (typeof theme !== "string" || !(theme in THEMES)) {
    return Response.json({ error: "Invalid theme" }, { status: 400 });
  }

  await db
    .update(users)
    .set({ theme: theme as ThemeKey })
    .where(eq(users.id, session.user.id));

  return Response.json({ theme });
}
