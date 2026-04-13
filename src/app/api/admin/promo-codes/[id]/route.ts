import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin/requireAdmin";
import { db } from "@/lib/db";
import { promo_codes } from "@/db/schema";
import { eq } from "drizzle-orm";

const VALID_STATUSES = ["active", "paused", "deactivated"];

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const authError = await requireAdminSession(request);
  if (authError) return authError;

  const { id } = await params;

  let body: { status?: string };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { status } = body;
  if (!status || !VALID_STATUSES.includes(status)) {
    return Response.json(
      { error: "Status must be one of: active, paused, deactivated" },
      { status: 400 }
    );
  }

  const [existing] = await db
    .select({ id: promo_codes.id })
    .from(promo_codes)
    .where(eq(promo_codes.id, id))
    .limit(1);

  if (!existing) {
    return Response.json({ error: "Promo code not found" }, { status: 404 });
  }

  const [updated] = await db
    .update(promo_codes)
    .set({ status })
    .where(eq(promo_codes.id, id))
    .returning();

  return Response.json({ code: updated });
}
