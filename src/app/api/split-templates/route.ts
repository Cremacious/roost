import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { splitTemplates } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 404 })

  const templates = await db
    .select()
    .from(splitTemplates)
    .where(eq(splitTemplates.householdId, membership.householdId))
    .orderBy(splitTemplates.createdAt)

  return NextResponse.json({ templates })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 404 })

  const body = await request.json().catch(() => ({})) as {
    name?: string
    method?: string
    splits?: { userId: string; value: number }[]
  }

  if (!body.name?.trim()) return NextResponse.json({ error: 'Name required' }, { status: 400 })
  if (!body.method) return NextResponse.json({ error: 'Method required' }, { status: 400 })
  if (!Array.isArray(body.splits) || body.splits.length === 0) {
    return NextResponse.json({ error: 'Splits required' }, { status: 400 })
  }

  const [template] = await db.insert(splitTemplates).values({
    householdId: membership.householdId,
    createdBy: session.user.id,
    name: body.name.trim(),
    method: body.method,
    splits: JSON.stringify(body.splits),
  }).returning()

  return NextResponse.json({ template })
}
