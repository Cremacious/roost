import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { users } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const [row] = await db
    .select({
      temperatureUnit: users.temperatureUnit,
      latitude: users.latitude,
      longitude: users.longitude,
      timezone: users.timezone,
      language: users.language,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  if (!row) {
    return NextResponse.json({
      temperatureUnit: 'fahrenheit',
      latitude: null,
      longitude: null,
      timezone: 'America/New_York',
      language: 'en',
    })
  }

  return NextResponse.json({
    temperatureUnit: row.temperatureUnit,
    latitude: row.latitude != null ? Number(row.latitude) : null,
    longitude: row.longitude != null ? Number(row.longitude) : null,
    timezone: row.timezone,
    language: row.language,
  })
}

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as {
    temperature_unit?: string
    latitude?: number
    longitude?: number
    timezone?: string
    language?: string
  }

  if (body.temperature_unit !== undefined && !['fahrenheit', 'celsius'].includes(body.temperature_unit)) {
    return NextResponse.json({ error: 'Invalid temperature_unit' }, { status: 400 })
  }

  const updates: Record<string, unknown> = { updatedAt: new Date() }
  if (body.temperature_unit !== undefined) updates.temperatureUnit = body.temperature_unit
  if (body.latitude !== undefined) updates.latitude = String(body.latitude)
  if (body.longitude !== undefined) updates.longitude = String(body.longitude)
  if (body.timezone !== undefined) updates.timezone = body.timezone
  if (body.language !== undefined) updates.language = body.language

  await db.update(users).set(updates).where(eq(users.id, session.user.id))

  const [row] = await db
    .select({
      temperatureUnit: users.temperatureUnit,
      latitude: users.latitude,
      longitude: users.longitude,
      timezone: users.timezone,
      language: users.language,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)

  return NextResponse.json({
    temperatureUnit: row?.temperatureUnit ?? 'fahrenheit',
    latitude: row?.latitude != null ? Number(row.latitude) : null,
    longitude: row?.longitude != null ? Number(row.longitude) : null,
    timezone: row?.timezone ?? 'America/New_York',
    language: row?.language ?? 'en',
  })
}
