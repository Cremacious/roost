import { NextRequest } from "next/server";
import { requireHouseholdAdmin } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { households } from "@/db/schema";
import { eq } from "drizzle-orm";

function randomCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

async function uniqueCode(): Promise<string> {
  for (let i = 0; i < 10; i++) {
    const code = randomCode();
    const [existing] = await db
      .select({ id: households.id })
      .from(households)
      .where(eq(households.code, code))
      .limit(1);
    if (!existing) return code;
  }
  throw new Error("Failed to generate unique code");
}

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

  const code = await uniqueCode();

  await db
    .update(households)
    .set({ code, updated_at: new Date() })
    .where(eq(households.id, id));

  return Response.json({ code });
}
