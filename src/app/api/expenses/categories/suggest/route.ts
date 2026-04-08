import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { expense_categories, user } from "@/db/schema";
import { eq } from "drizzle-orm";
import { getUserHousehold } from "@/app/api/chores/route";

export async function POST(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const membership = await getUserHousehold(session.user.id);
  if (!membership) {
    return Response.json({ error: "No household found" }, { status: 404 });
  }
  const { householdId } = membership;

  let body: { name?: string; icon?: string; color?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (!body.name?.trim()) return Response.json({ error: "Name is required" }, { status: 400 });
  if (!body.icon?.trim()) return Response.json({ error: "Icon is required" }, { status: 400 });
  if (!body.color?.trim()) return Response.json({ error: "Color is required" }, { status: 400 });

  const [category] = await db
    .insert(expense_categories)
    .values({
      household_id: householdId,
      name: body.name.trim(),
      icon: body.icon.trim(),
      color: body.color.trim(),
      is_default: false,
      is_custom: true,
      suggested_by: session.user.id,
      status: "pending",
    })
    .returning();

  // Fetch suggester name for notification text (best-effort)
  try {
    const [suggester] = await db
      .select({ name: user.name })
      .from(user)
      .where(eq(user.id, session.user.id))
      .limit(1);
    // TODO: push notify admin when Expo push is wired up
    // Notification copy: `${suggester.name} suggested a new category: ${category.name}`
    void suggester;
  } catch {
    // ignore
  }

  return Response.json({ category }, { status: 201 });
}
