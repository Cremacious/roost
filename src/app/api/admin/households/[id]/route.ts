import { NextRequest } from 'next/server'
import { requireAdminSession } from '@/lib/admin/requireAdmin'
import { db } from '@/lib/db'
import { households } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const unauth = await requireAdminSession(request)
  if (unauth) return unauth

  const { id } = await params

  let body: { subscriptionStatus?: 'premium' | 'free' }
  try {
    body = await request.json()
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const { subscriptionStatus } = body
  if (subscriptionStatus !== 'premium' && subscriptionStatus !== 'free') {
    return Response.json({ error: 'subscriptionStatus must be premium or free' }, { status: 400 })
  }

  const now = new Date()
  const [updated] = await db
    .update(households)
    .set({
      subscription_status: subscriptionStatus,
      // Set upgraded_at when granting premium; clear when revoking
      subscription_upgraded_at: subscriptionStatus === 'premium' ? now : null,
      // Clear expiry when granting (admin grant = permanent until revoked)
      premium_expires_at: subscriptionStatus === 'premium' ? null : undefined,
      updated_at: now,
    })
    .where(eq(households.id, id))
    .returning()

  if (!updated) {
    return Response.json({ error: 'Household not found' }, { status: 404 })
  }

  return Response.json({ household: updated })
}
