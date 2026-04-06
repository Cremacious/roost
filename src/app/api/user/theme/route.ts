import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { users, households, household_members } from "@/db/schema";
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

  // Premium check: only 'default' theme is free
  if (theme !== "default") {
    const [membership] = await db
      .select({ householdId: household_members.household_id })
      .from(household_members)
      .where(eq(household_members.user_id, session.user.id))
      .limit(1);

    if (membership) {
      const [household] = await db
        .select({ subscription_status: households.subscription_status })
        .from(households)
        .where(eq(households.id, membership.householdId))
        .limit(1);

      if (household?.subscription_status !== "premium") {
        return Response.json(
          { error: "Additional themes require premium", code: "THEMES_PREMIUM" },
          { status: 403 }
        );
      }
    }
  }

  await db
    .update(users)
    .set({ theme: theme as ThemeKey })
    .where(eq(users.id, session.user.id));

  return Response.json({ theme });
}
