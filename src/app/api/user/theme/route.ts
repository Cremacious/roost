import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { users, households } from "@/db/schema";
import { eq } from "drizzle-orm";
import { FREE_THEMES, PREMIUM_THEMES, ALL_THEMES } from "@/lib/constants/freeTierLimits";
import { getUserHousehold } from "@/app/api/chores/route";

export async function PATCH(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const body = await request.json().catch(() => ({}));
  const { theme } = body as { theme: unknown };

  // Validate theme is a known theme
  if (typeof theme !== "string" || !(ALL_THEMES as readonly string[]).includes(theme)) {
    return Response.json({ error: "Invalid theme" }, { status: 400 });
  }

  // Premium-only themes require a premium household
  if ((PREMIUM_THEMES as readonly string[]).includes(theme)) {
    const membership = await getUserHousehold(session.user.id);
    if (!membership) {
      return Response.json({ error: "No household found" }, { status: 404 });
    }
    const [household] = await db
      .select({ subscription_status: households.subscription_status })
      .from(households)
      .where(eq(households.id, membership.householdId))
      .limit(1);
    if (household?.subscription_status !== "premium") {
      return Response.json(
        { error: "This theme requires Premium.", code: "THEMES_PREMIUM" },
        { status: 403 }
      );
    }
  }

  await db
    .update(users)
    .set({ theme })
    .where(eq(users.id, session.user.id));

  return Response.json({ theme });
}
