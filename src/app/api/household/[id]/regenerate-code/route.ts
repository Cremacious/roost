import { NextRequest } from "next/server";
import { requireHouseholdAdmin } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { households } from "@/db/schema";
import { eq } from "drizzle-orm";

function generateInviteCode(): string {
  // Excludes ambiguous characters (I, O, 0, 1) to match household creation.
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
}

// POST: admin only — replace the household invite code with a fresh unique one.
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  try {
    await requireHouseholdAdmin(request, id);
  } catch (r) {
    return r as Response;
  }

  // Generate a code that is not already taken by another household.
  let code = generateInviteCode();
  let clash = await db
    .select({ id: households.id })
    .from(households)
    .where(eq(households.code, code))
    .limit(1);
  while (clash.length > 0) {
    code = generateInviteCode();
    clash = await db
      .select({ id: households.id })
      .from(households)
      .where(eq(households.code, code))
      .limit(1);
  }

  await db
    .update(households)
    .set({ code, updated_at: new Date() })
    .where(eq(households.id, id));

  return Response.json({ code });
}
