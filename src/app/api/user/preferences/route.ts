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
    return Response.json({ error: "User not found" }, { status: 404 });
  }

  return Response.json(user);
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

  return Response.json(updated);
}
