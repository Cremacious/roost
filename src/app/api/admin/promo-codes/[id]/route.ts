import { NextRequest } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { db } from '@/lib/db'
import { promoCodes } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const unauth = await requireAdminSession(request)
  if (unauth) return unauth

  const { id } = await params

  let body: { status?: 'active' | 'paused' | 'deactivated' }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { status } = body
  if (!status || !['active', 'paused', 'deactivated'].includes(status)) {
    return Response.json({ error: 'status must be active, paused, or deactivated' }, { status: 400 })
  }

  const [updated] = await db
    .update(promoCodes)
    .set({ status })
    .where(eq(promoCodes.id, id))
    .returning()

  if (!updated) {
    return Response.json({ error: 'Promo code not found' }, { status: 404 })
  }

  return Response.json({ promoCode: updated })
}
