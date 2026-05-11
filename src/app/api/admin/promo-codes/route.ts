import { NextRequest } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { db } from '@/lib/db'
import { promoCodes, promoRedemptions } from '@/db/schema'
import { desc, sql } from 'drizzle-orm'

const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function generateCode(length = 8): string {
  let code = ''
  for (let i = 0; i < length; i++) {
    code += CODE_CHARS[Math.floor(Math.random() * CODE_CHARS.length)]
  }
  return code
}

export async function GET(request: NextRequest): Promise<Response> {
  const unauth = await requireAdminSession(request)
  if (unauth) return unauth

  const { searchParams } = new URL(request.url)
  const filter = searchParams.get('filter') ?? 'all' // all | active | paused | deactivated

  const rows = await db
    .select({
      id: promoCodes.id,
      code: promoCodes.code,
      durationDays: promoCodes.durationDays,
      isLifetime: promoCodes.isLifetime,
      status: promoCodes.status,
      maxRedemptions: promoCodes.maxRedemptions,
      redemptionCount: promoCodes.redemptionCount,
      expiresAt: promoCodes.expiresAt,
      createdAt: promoCodes.createdAt,
    })
    .from(promoCodes)
    .orderBy(desc(promoCodes.createdAt))

  const filtered = filter === 'all' ? rows : rows.filter(r => r.status === filter)

  // Attach redemption list to each code
  const codeIds = filtered.map(r => r.id)
  let redemptions: { promoCodeId: string; householdId: string; redeemedAt: Date; premiumExpiresAt: Date | null }[] = []
  if (codeIds.length > 0) {
    redemptions = await db
      .select({
        promoCodeId: promoRedemptions.promoCodeId,
        householdId: promoRedemptions.householdId,
        redeemedAt: promoRedemptions.redeemedAt,
        premiumExpiresAt: promoRedemptions.premiumExpiresAt,
      })
      .from(promoRedemptions)
  }

  const redemptionsByCode = new Map<string, typeof redemptions>()
  for (const r of redemptions) {
    const arr = redemptionsByCode.get(r.promoCodeId) ?? []
    arr.push(r)
    redemptionsByCode.set(r.promoCodeId, arr)
  }

  return Response.json({
    promoCodes: filtered.map(c => ({
      ...c,
      redemptions: redemptionsByCode.get(c.id) ?? [],
    })),
  })
}

export async function POST(request: NextRequest): Promise<Response> {
  const unauth = await requireAdminSession(request)
  if (unauth) return unauth

  let body: {
    code?: string
    durationDays?: number
    isLifetime?: boolean
    maxRedemptions?: number
    expiresAt?: string
  }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const isLifetime = body.isLifetime === true
  const durationDays = isLifetime ? 0 : (body.durationDays ?? 30)

  if (!isLifetime && (durationDays < 1 || durationDays > 3650)) {
    return Response.json({ error: 'durationDays must be between 1 and 3650' }, { status: 400 })
  }

  // Auto-generate or use provided code
  let code = body.code?.trim().toUpperCase() ?? generateCode()
  if (!code) code = generateCode()

  const expiresAt = body.expiresAt ? new Date(body.expiresAt) : null
  const maxRedemptions = body.maxRedemptions ?? null

  const [created] = await db
    .insert(promoCodes)
    .values({
      code,
      durationDays,
      isLifetime,
      status: 'active',
      maxRedemptions,
      redemptionCount: 0,
      expiresAt,
    })
    .returning()

  return Response.json({ promoCode: created }, { status: 201 })
}
