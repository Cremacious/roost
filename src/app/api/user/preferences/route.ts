import { NextRequest } from "next/server";
import { requireSession } from "@/lib/auth/helpers";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// ---- GET --------------------------------------------------------------------

export async function GET(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  const [user] = await db
    .select({
      temperature_unit: users.temperature_unit,
      latitude: users.latitude,
      longitude: users.longitude,
      timezone: users.timezone,
      language: users.language,
      theme: users.theme,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1);

  if (!user) {
    // No app users row yet (mirror hook may not have fired). Return safe defaults.
    return Response.json({
      temperature_unit: "fahrenheit",
      latitude: null,
      longitude: null,
      timezone: "America/New_York",
      language: "en",
      theme: "default",
    });
  }

  // latitude/longitude are Drizzle numeric columns — convert Decimal to number or null.
  return Response.json({
    ...user,
    latitude: user.latitude != null ? Number(user.latitude) : null,
    longitude: user.longitude != null ? Number(user.longitude) : null,
  });
}

// ---- PATCH ------------------------------------------------------------------

export async function PATCH(request: NextRequest): Promise<Response> {
  let session;
  try {
    session = await requireSession(request);
  } catch (r) {
    return r as Response;
  }

  let body: {
    temperature_unit?: string;
    latitude?: number;
    longitude?: number;
    timezone?: string;
    language?: string;
  };
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400 });
  }

  if (
    body.temperature_unit !== undefined &&
    !["fahrenheit", "celsius"].includes(body.temperature_unit)
  ) {
    return Response.json({ error: "Invalid temperature_unit" }, { status: 400 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date() };
  if (body.temperature_unit !== undefined) updates.temperature_unit = body.temperature_unit;
  if (body.latitude !== undefined) updates.latitude = String(body.latitude);
  if (body.longitude !== undefined) updates.longitude = String(body.longitude);
  if (body.timezone !== undefined) updates.timezone = body.timezone;
  if (body.language !== undefined) updates.language = body.language;

  const [updated] = await db
    .update(users)
    .set(updates)
    .where(eq(users.id, session.user.id))
    .returning({
      temperature_unit: users.temperature_unit,
      latitude: users.latitude,
      longitude: users.longitude,
      timezone: users.timezone,
      language: users.language,
      theme: users.theme,
    });

  // latitude/longitude are Drizzle numeric columns — they return as Decimal
  // objects which Response.json() cannot serialize. Convert to number or null.
  return Response.json({
    ...updated,
    latitude: updated?.latitude != null ? Number(updated.latitude) : null,
    longitude: updated?.longitude != null ? Number(updated.longitude) : null,
  });
}
