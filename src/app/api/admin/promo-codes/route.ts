import { NextRequest } from "next/server";
import { requireAdminSession } from "@/lib/admin/requireAdmin";
import { db } from "@/lib/db";
import { promo_codes } from "@/db/schema";
import { desc, eq } from "drizzle-orm";

const VALID_DURATIONS = [30, 60, 90, 180, 365];

function generateCode(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function GET(request: NextRequest): Promise<Response> {
  const authError = await requireAdminSession(request);
  if (authError) return authError;

  const codes = await db
    .select()
    .from(promo_codes)
    .orderBy(desc(promo_codes.created_at));

  return Response.json({ codes });
}

export async function POST(request: NextRequest): Promise<Response> {
  const authError = await requireAdminSession(request);
  if (authError) return authError;

  let body: {
    code?: string;
    durationDays: number;
    maxRedemptions?: number;
    expiresAt?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { durationDays, maxRedemptions, expiresAt } = body;
  let code = body.code?.trim().toUpperCase();

  if (!VALID_DURATIONS.includes(durationDays)) {
    return Response.json(
      { error: "Duration must be one of: 30, 60, 90, 180, 365 days" },
      { status: 400 }
    );
  }

  if (code) {
    if (!/^[A-Z0-9]+$/.test(code)) {
      return Response.json(
        { error: "Code must be alphanumeric uppercase only" },
        { status: 400 }
      );
    }
    if (code.length < 3 || code.length > 32) {
      return Response.json(
        { error: "Code must be 3 to 32 characters" },
        { status: 400 }
      );
    }
    const [existing] = await db
      .select({ id: promo_codes.id })
      .from(promo_codes)
      .where(eq(promo_codes.code, code))
      .limit(1);
    if (existing) {
      return Response.json(
        { error: "A promo code with this name already exists" },
        { status: 409 }
      );
    }
  } else {
    // Auto-generate unique code
    let attempts = 0;
    while (attempts < 10) {
      code = generateCode();
      const [existing] = await db
        .select({ id: promo_codes.id })
        .from(promo_codes)
        .where(eq(promo_codes.code, code))
        .limit(1);
      if (!existing) break;
      attempts++;
    }
  }

  const [created] = await db
    .insert(promo_codes)
    .values({
      code: code!,
      duration_days: durationDays,
      max_redemptions: maxRedemptions && maxRedemptions > 0 ? maxRedemptions : null,
      expires_at: expiresAt ? new Date(expiresAt) : null,
    })
    .returning();

  return Response.json({ code: created }, { status: 201 });
}
