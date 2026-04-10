import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  await db
    .update(users)
    .set({ has_seen_welcome: true, updated_at: new Date() })
    .where(eq(users.id, session.user.id));

  return Response.json({ ok: true });
}
