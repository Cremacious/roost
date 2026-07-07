import { NextResponse } from 'next/server'
import { getSession, getUserHousehold, isHouseholdPremium } from '@/lib/auth/helpers'
import { parseReceiptImage } from '@/lib/utils/azureReceipts'
import { createRateLimiter } from '@/lib/utils/rateLimit'

// The Azure Document Intelligence SDK (@azure/ai-form-recognizer) relies on
// Node APIs (Buffer, long-poll HTTP), so pin this route to the Node.js runtime
// rather than letting it be bundled for Edge.
export const runtime = 'nodejs'

const MAX_BASE64_LENGTH = 14_000_000 // ~10MB

// Per-user burst limit: 10 scans per 5 minutes.
// This protects the Azure OCR quota (500 free scans/month for the whole account)
// from a single user or automated script hammering the endpoint.
// The limit is intentionally generous — a human scanning receipts will never hit it.
const scanLimiter = createRateLimiter({ windowMs: 5 * 60_000, maxRequests: 10 })

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 404 })

  if (membership.role === 'child') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Receipt scanning is premium-only. Free households cannot scan at all.
  const isPremium = await isHouseholdPremium(membership.householdId)
  if (!isPremium) {
    return NextResponse.json(
      {
        error: 'Receipt scanning is a premium feature.',
        code: 'RECEIPT_SCANNING_PREMIUM',
      },
      { status: 403 }
    )
  }

  // Burst rate limit: checked before body parsing to fail fast and cheaply
  const rateCheck = scanLimiter.check(session.user.id)
  if (!rateCheck.allowed) {
    const retryAfterSec = Math.ceil(rateCheck.retryAfterMs / 1000)
    return NextResponse.json(
      { error: 'Too many scan requests. Please wait a moment and try again.' },
      {
        status: 429,
        headers: {
          'Retry-After': String(retryAfterSec),
          'X-RateLimit-Remaining': '0',
        },
      }
    )
  }

  const body = await request.json().catch(() => ({})) as { imageBase64?: string }
  if (!body.imageBase64) return NextResponse.json({ error: 'Image required' }, { status: 400 })
  if (body.imageBase64.length > MAX_BASE64_LENGTH) {
    return NextResponse.json({ error: 'Image must be under 10MB' }, { status: 400 })
  }

  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY
  if (!endpoint || !key) {
    return NextResponse.json({ error: 'Receipt scanning not configured' }, { status: 503 })
  }

  try {
    const receipt = await parseReceiptImage(body.imageBase64)

    if (receipt.lineItems.length === 0) {
      return NextResponse.json({
        receipt,
        warning: 'No items detected. You can add them manually.',
      })
    }

    return NextResponse.json({ receipt })
  } catch (err) {
    console.error('Receipt scan error:', err)
    return NextResponse.json({ error: 'Scan failed. Try again or enter manually.' }, { status: 500 })
  }
}
