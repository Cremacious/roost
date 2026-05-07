import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { receiptScanUsage } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { parseReceiptImage } from '@/lib/utils/azureReceipts'

const MAX_BASE64_LENGTH = 14_000_000 // ~10MB
const FREE_TIER_SCAN_LIMIT = 75

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 404 })

  if (membership.role === 'child') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
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

  // Quota check for free tier (75 scans/month)
  const isPremium = membership.household.subscriptionStatus === 'premium'
  if (!isPremium) {
    const currentMonth = new Date().toISOString().slice(0, 7) // YYYY-MM
    const [usage] = await db
      .select({ count: receiptScanUsage.count })
      .from(receiptScanUsage)
      .where(
        and(
          eq(receiptScanUsage.householdId, membership.householdId),
          eq(receiptScanUsage.month, currentMonth),
        )
      )
      .limit(1)

    if (usage && usage.count >= FREE_TIER_SCAN_LIMIT) {
      return NextResponse.json(
        {
          error: 'Monthly scan limit reached. Upgrade to premium for unlimited scans.',
          code: 'SCAN_LIMIT_REACHED',
          limit: FREE_TIER_SCAN_LIMIT,
          current: usage.count,
        },
        { status: 403 }
      )
    }
  }

  try {
    const receipt = await parseReceiptImage(body.imageBase64)

    // Increment usage counter after successful scan (free tier only)
    if (!isPremium) {
      const currentMonth = new Date().toISOString().slice(0, 7)
      const [existing] = await db
        .select({ id: receiptScanUsage.id, count: receiptScanUsage.count })
        .from(receiptScanUsage)
        .where(
          and(
            eq(receiptScanUsage.householdId, membership.householdId),
            eq(receiptScanUsage.month, currentMonth),
          )
        )
        .limit(1)

      if (existing) {
        await db
          .update(receiptScanUsage)
          .set({ count: existing.count + 1, updatedAt: new Date() })
          .where(eq(receiptScanUsage.id, existing.id))
      } else {
        await db.insert(receiptScanUsage).values({
          householdId: membership.householdId,
          month: currentMonth,
          count: 1,
        })
      }
    }

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
