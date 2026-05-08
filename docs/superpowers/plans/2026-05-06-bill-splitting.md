# Bill Splitting — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add receipt scanning with grid item assignment, percentage/share-based splits, split templates, and Venmo/Cash App payment deep links to the V2 Money module.

**Architecture:** All new components live in `apps/web/src/components/money/`. The ExpenseSheet orchestrates the receipt flow (scan → review → grid → pre-fill). Split method state is extended to support `percent` and `shares` in addition to the existing `equal`, `custom`, `payer`. Payment deep links are added to SettleSheet using URL scheme deep links — no external API keys needed.

**Tech Stack:** Next.js 16 App Router, Drizzle ORM, Neon PostgreSQL, Azure Document Intelligence (`@azure/ai-form-recognizer`), TanStack Query, Zustand, Tailwind v4, Lucide icons.

---

## File Map

**Create:**
- `apps/web/src/db/schema/splitTemplates.ts` — split_templates table
- `apps/web/src/lib/utils/azureReceipts.ts` — Azure OCR helper (ported from V1)
- `apps/web/src/app/api/expenses/scan/route.ts` — POST scan endpoint
- `apps/web/src/app/api/split-templates/route.ts` — GET + POST templates
- `apps/web/src/app/api/split-templates/[id]/route.ts` — DELETE template
- `apps/web/src/components/money/ReceiptScanner.tsx` — camera/upload/scanning states
- `apps/web/src/components/money/LineItemReview.tsx` — editable OCR item list
- `apps/web/src/components/money/LineItemGrid.tsx` — grid assignment matrix

**Modify:**
- `apps/web/src/db/schema/users.ts` — add venmoHandle, cashappHandle
- `apps/web/src/db/schema/index.ts` — export splitTemplates
- `apps/web/src/app/api/user/profile/route.ts` — read/write payment handles
- `apps/web/src/components/money/ExpenseSheet.tsx` — scan banner, % splits, shares, templates
- `apps/web/src/components/money/SettleSheet.tsx` — payment deep link buttons
- `apps/web/scripts/add-missing-columns.ts` — add new columns to Neon

---

## Task 1: DB Schema — splitTemplates table + user payment handles

**Files:**
- Create: `apps/web/src/db/schema/splitTemplates.ts`
- Modify: `apps/web/src/db/schema/users.ts`
- Modify: `apps/web/src/db/schema/index.ts`
- Modify: `apps/web/scripts/add-missing-columns.ts`

- [ ] **Step 1: Create splitTemplates schema**

```ts
// apps/web/src/db/schema/splitTemplates.ts
import { pgTable, text, timestamp } from 'drizzle-orm/pg-core'
import { households } from './households'
import { users } from './users'

export const splitTemplates = pgTable('split_templates', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  createdBy: text('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  // 'percent' | 'shares' | 'custom' | 'equal'
  method: text('method').notNull(),
  // JSON: [{ userId: string, value: number }]
  // value = percentage (0-100) for percent, share count for shares, dollar amount for custom
  splits: text('splits').notNull().default('[]'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
})

export type SplitTemplate = typeof splitTemplates.$inferSelect
export type NewSplitTemplate = typeof splitTemplates.$inferInsert
```

- [ ] **Step 2: Add payment handle columns to users schema**

Open `apps/web/src/db/schema/users.ts`. Add two columns after `pushToken`:

```ts
  pushToken: text('push_token'),
  venmoHandle: text('venmo_handle'),
  cashappHandle: text('cashapp_handle'),
```

- [ ] **Step 3: Export splitTemplates from schema index**

Open `apps/web/src/db/schema/index.ts`. Add at the end:

```ts
export * from './splitTemplates'
```

- [ ] **Step 4: Add missing columns to Neon via migration script**

Open `apps/web/scripts/add-missing-columns.ts`. Replace the full file content:

```ts
import { neon } from '@neondatabase/serverless'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const sql = neon(process.env.DATABASE_URL!)

async function main() {
  console.log('Adding missing columns...')

  await sql`
    ALTER TABLE households
    ADD COLUMN IF NOT EXISTS stripe_price_id text,
    ADD COLUMN IF NOT EXISTS subscription_upgraded_at timestamp,
    ADD COLUMN IF NOT EXISTS created_by text,
    ADD COLUMN IF NOT EXISTS stats_visibility text
  `

  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS venmo_handle text,
    ADD COLUMN IF NOT EXISTS cashapp_handle text
  `

  await sql`
    CREATE TABLE IF NOT EXISTS split_templates (
      id text PRIMARY KEY,
      household_id text NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      created_by text NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      name text NOT NULL,
      method text NOT NULL,
      splits text NOT NULL DEFAULT '[]',
      created_at timestamp NOT NULL DEFAULT now()
    )
  `

  console.log('Done.')
}

main().catch((err) => { console.error(err); process.exit(1) })
```

- [ ] **Step 5: Run the migration**

```bash
npx tsx --env-file=.env.local scripts/add-missing-columns.ts
```

Expected output:
```
Adding missing columns...
Done.
```

- [ ] **Step 6: Commit**

```bash
git add apps/web/src/db/schema/splitTemplates.ts apps/web/src/db/schema/users.ts apps/web/src/db/schema/index.ts apps/web/scripts/add-missing-columns.ts
git commit -m "feat: add split_templates table and user payment handle columns"
```

---

## Task 2: Split Templates API

**Files:**
- Create: `apps/web/src/app/api/split-templates/route.ts`
- Create: `apps/web/src/app/api/split-templates/[id]/route.ts`

- [ ] **Step 1: Create GET + POST route**

```ts
// apps/web/src/app/api/split-templates/route.ts
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { splitTemplates } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getUserHousehold } from '@/lib/utils/household'

export async function GET() {
  const session = await requireSession()
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
  const session = await requireSession()
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
```

- [ ] **Step 2: Check that `getUserHousehold` utility exists**

Look for `apps/web/src/lib/utils/household.ts`. If it does not exist, create it:

```ts
// apps/web/src/lib/utils/household.ts
import { db } from '@/lib/db'
import { householdMembers } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function getUserHousehold(userId: string) {
  const [row] = await db
    .select({
      householdId: householdMembers.householdId,
      role: householdMembers.role,
    })
    .from(householdMembers)
    .where(eq(householdMembers.userId, userId))
    .limit(1)
  return row ?? null
}
```

If it already exists with this signature, skip this step.

- [ ] **Step 3: Create DELETE route**

```ts
// apps/web/src/app/api/split-templates/[id]/route.ts
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { splitTemplates } from '@/db/schema'
import { eq, and } from 'drizzle-orm'
import { getUserHousehold } from '@/lib/utils/household'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await requireSession()
  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 404 })

  const [template] = await db
    .select({ createdBy: splitTemplates.createdBy, householdId: splitTemplates.householdId })
    .from(splitTemplates)
    .where(eq(splitTemplates.id, id))
    .limit(1)

  if (!template || template.householdId !== membership.householdId) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const isCreator = template.createdBy === session.user.id
  const isAdmin = membership.role === 'admin'
  if (!isCreator && !isAdmin) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await db.delete(splitTemplates).where(eq(splitTemplates.id, id))
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/app/api/split-templates/ apps/web/src/lib/utils/household.ts
git commit -m "feat: add split templates API (GET, POST, DELETE)"
```

---

## Task 3: Azure Receipt Scan API

**Files:**
- Create: `apps/web/src/lib/utils/azureReceipts.ts`
- Create: `apps/web/src/app/api/expenses/scan/route.ts`

- [ ] **Step 1: Create Azure OCR utility**

```ts
// apps/web/src/lib/utils/azureReceipts.ts
import {
  DocumentAnalysisClient,
  AzureKeyCredential,
} from '@azure/ai-form-recognizer'

export interface ParsedReceipt {
  merchant?: string
  date?: string
  subtotal?: number
  tax?: number
  tip?: number
  total?: number
  lineItems: { description: string; amount: number }[]
}

export async function parseReceiptImage(imageBase64: string): Promise<ParsedReceipt> {
  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY
  if (!endpoint || !key) throw new Error('Azure Document Intelligence not configured')

  const client = new DocumentAnalysisClient(endpoint, new AzureKeyCredential(key))

  const cleanBase64 = imageBase64.includes(',') ? imageBase64.split(',')[1] : imageBase64
  const buffer = Buffer.from(cleanBase64, 'base64')

  const poller = await client.beginAnalyzeDocument('prebuilt-receipt', buffer)
  const result = await poller.pollUntilDone()
  const doc = result.documents?.[0]

  if (!doc) return { lineItems: [] }

  type FieldMap = Record<string, {
    value?: unknown
    values?: Array<{ properties?: Record<string, { value?: unknown }> }>
    properties?: Record<string, { value?: unknown }>
  }>
  const fields = doc.fields as FieldMap

  const merchant = fields?.MerchantName?.value as string | undefined
  const dateVal = fields?.TransactionDate?.value
  const date = dateVal ? new Date(dateVal as string).toLocaleDateString('en-US') : undefined
  const subtotal = fields?.Subtotal?.value as number | undefined
  const tax = fields?.TotalTax?.value as number | undefined
  const tip = fields?.Tip?.value as number | undefined
  const total = fields?.Total?.value as number | undefined

  const lineItems: { description: string; amount: number }[] = []
  const itemsField = fields?.Items
  if (itemsField?.values) {
    for (const item of itemsField.values) {
      const f = item.properties
      const description = (f?.Description?.value as string | undefined)?.trim() ?? ''
      const amount =
        (f?.TotalPrice?.value as number | undefined) ??
        (f?.Price?.value as number | undefined) ?? 0
      if (description.length > 0 && amount > 0) {
        lineItems.push({ description, amount })
      }
    }
  }

  return { merchant, date, subtotal, tax, tip, total, lineItems }
}
```

- [ ] **Step 2: Create scan API route**

V2's policy: 75 scans/month free (tracked in `receiptScanUsage`), unlimited for premium. Use the `receiptScanUsage` table that already exists in `apps/web/src/db/schema/receipts.ts`.

First read `apps/web/src/db/schema/receipts.ts` to confirm the table shape, then write:

```ts
// apps/web/src/app/api/expenses/scan/route.ts
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { households, receiptScanUsage } from '@/db/schema'
import { eq, and, gte, sql } from 'drizzle-orm'
import { getUserHousehold } from '@/lib/utils/household'
import { parseReceiptImage } from '@/lib/utils/azureReceipts'

const MAX_BASE64_LENGTH = 14_000_000 // ~10MB
const FREE_SCANS_PER_MONTH = 75

export async function POST(request: Request) {
  const session = await requireSession()
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

  // Check premium or free scan quota
  const [household] = await db
    .select({ subscriptionStatus: households.subscription_status })
    .from(households)
    .where(eq(households.id, membership.householdId))
    .limit(1)

  const isPremium = household?.subscriptionStatus === 'premium'

  if (!isPremium) {
    // Count scans this month
    const monthStart = new Date()
    monthStart.setDate(1)
    monthStart.setHours(0, 0, 0, 0)

    const [usage] = await db
      .select({ count: sql<number>`count(*)` })
      .from(receiptScanUsage)
      .where(
        and(
          eq(receiptScanUsage.householdId, membership.householdId),
          gte(receiptScanUsage.scannedAt, monthStart)
        )
      )

    if (Number(usage?.count ?? 0) >= FREE_SCANS_PER_MONTH) {
      return NextResponse.json(
        { error: 'Monthly scan limit reached. Upgrade for unlimited scans.', code: 'SCAN_LIMIT_REACHED' },
        { status: 403 }
      )
    }
  }

  const endpoint = process.env.AZURE_DOCUMENT_INTELLIGENCE_ENDPOINT
  const key = process.env.AZURE_DOCUMENT_INTELLIGENCE_KEY
  if (!endpoint || !key) {
    return NextResponse.json({ error: 'Receipt scanning not configured' }, { status: 503 })
  }

  try {
    const receipt = await parseReceiptImage(body.imageBase64)

    // Record scan usage
    await db.insert(receiptScanUsage).values({
      householdId: membership.householdId,
      userId: session.user.id,
    }).catch(() => undefined) // non-fatal

    const empty = receipt.lineItems.length === 0
    return NextResponse.json({
      receipt,
      warning: empty ? 'No items detected. You can add them manually.' : undefined,
    })
  } catch {
    return NextResponse.json({ error: 'Could not read receipt', code: 'SCAN_FAILED' }, { status: 422 })
  }
}
```

- [ ] **Step 3: Verify receiptScanUsage schema**

Open `apps/web/src/db/schema/receipts.ts`. The table should have at minimum: `id`, `householdId`, `userId`, `scannedAt`. If `scannedAt` is named differently (e.g. `createdAt`), update the query in the route to match.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/lib/utils/azureReceipts.ts apps/web/src/app/api/expenses/scan/route.ts
git commit -m "feat: add Azure receipt scan API with free tier quota"
```

---

## Task 4: ReceiptScanner Component

**Files:**
- Create: `apps/web/src/components/money/ReceiptScanner.tsx`

This component handles: idle (show banner), scanning (spinner), error, empty-scan states.

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/money/ReceiptScanner.tsx
'use client'

import { useRef, useState } from 'react'
import { Camera, Upload, AlertCircle, RefreshCw } from 'lucide-react'

export interface ParsedReceipt {
  merchant?: string
  date?: string
  subtotal?: number
  tax?: number
  tip?: number
  total?: number
  lineItems: { description: string; amount: number }[]
}

interface Props {
  onSuccess: (receipt: ParsedReceipt) => void
  onManual: () => void
}

type ScanState = 'idle' | 'scanning' | 'error' | 'empty'

const TIPS_KEY = 'roost-receipt-tips-dismissed'

export function ReceiptScanner({ onSuccess, onManual }: Props) {
  const [state, setState] = useState<ScanState>('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [tipsDismissed, setTipsDismissed] = useState(
    typeof sessionStorage !== 'undefined' && !!sessionStorage.getItem(TIPS_KEY)
  )
  const cameraRef = useRef<HTMLInputElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  function dismissTipsAndTrigger(inputRef: React.RefObject<HTMLInputElement | null>) {
    if (!tipsDismissed) {
      sessionStorage.setItem(TIPS_KEY, '1')
      setTipsDismissed(true)
    }
    inputRef.current?.click()
  }

  async function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    if (file.size > 10 * 1024 * 1024) {
      setErrorMsg('Image must be under 10MB')
      setState('error')
      return
    }

    setState('scanning')
    try {
      const base64 = await fileToBase64(file)
      const res = await fetch('/api/expenses/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: base64 }),
      })
      const data = await res.json()
      if (!res.ok) {
        setErrorMsg(data.error ?? 'Could not read receipt')
        setState(data.code === 'SCAN_LIMIT_REACHED' ? 'error' : 'error')
        return
      }
      if (data.receipt.lineItems.length === 0) {
        setState('empty')
        return
      }
      onSuccess(data.receipt)
    } catch {
      setErrorMsg('Network error. Check your connection.')
      setState('error')
    }
  }

  const COLOR = '#22C55E'
  const COLOR_DARK = '#15803D'

  if (state === 'scanning') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, padding: '20px 0' }}>
        <RefreshCw size={28} color={COLOR} style={{ animation: 'spin 1s linear infinite' }} />
        <p style={{ margin: 0, fontWeight: 700, fontSize: 14, color: 'var(--roost-text-secondary)' }}>
          Reading your receipt...
        </p>
        <style>{`@keyframes spin { to { transform: rotate(360deg) } }`}</style>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 12, borderRadius: 10, background: '#FEF2F2', border: '1.5px solid #FECACA' }}>
          <AlertCircle size={16} color="#EF4444" />
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#991B1B' }}>{errorMsg}</p>
        </div>
        <button
          onClick={() => { setState('idle'); setErrorMsg('') }}
          style={{ padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 14, backgroundColor: COLOR, color: '#fff', border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, cursor: 'pointer' }}
        >
          Try again
        </button>
        <button
          onClick={onManual}
          style={{ padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 14, backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-secondary)', border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)', cursor: 'pointer' }}
        >
          Enter manually
        </button>
      </div>
    )
  }

  if (state === 'empty') {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '4px 0' }}>
        <div style={{ padding: 12, borderRadius: 10, background: '#FFFBEB', border: '1.5px solid #FDE68A' }}>
          <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: '#92400E' }}>No items detected</p>
          <p style={{ margin: '4px 0 0', fontSize: 12, color: '#92400E' }}>The receipt may be unclear. Add items manually.</p>
        </div>
        <button
          onClick={onManual}
          style={{ padding: '12px 0', borderRadius: 12, fontWeight: 800, fontSize: 14, backgroundColor: COLOR, color: '#fff', border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, cursor: 'pointer' }}
        >
          Add items manually
        </button>
        <button
          onClick={() => setState('idle')}
          style={{ padding: '10px 0', borderRadius: 12, fontWeight: 700, fontSize: 14, backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-secondary)', border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)', cursor: 'pointer' }}
        >
          Try scanning again
        </button>
      </div>
    )
  }

  // idle — show the banner
  return (
    <div>
      {!tipsDismissed && (
        <div style={{ background: '#F0FDF4', border: '1.5px solid #BBF7D0', borderRadius: 10, padding: 12, marginBottom: 10, fontSize: 12, color: '#166534' }}>
          <p style={{ margin: '0 0 6px', fontWeight: 800 }}>For best results:</p>
          <ul style={{ margin: 0, paddingLeft: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
            <li>Good lighting, no shadows</li>
            <li>Camera directly above, not at an angle</li>
            <li>Full receipt in frame</li>
            <li>Flat dark surface behind receipt</li>
          </ul>
        </div>
      )}
      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={() => dismissTipsAndTrigger(cameraRef)}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 8px', borderRadius: 12, fontWeight: 700, fontSize: 13, backgroundColor: COLOR, color: '#fff', border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, cursor: 'pointer' }}
        >
          <Camera size={20} />
          Camera
        </button>
        <button
          onClick={() => dismissTipsAndTrigger(fileRef)}
          style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, padding: '14px 8px', borderRadius: 12, fontWeight: 700, fontSize: 13, backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-primary)', border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)', cursor: 'pointer' }}
        >
          <Upload size={20} />
          Upload
        </button>
      </div>
      <button
        onClick={onManual}
        style={{ width: '100%', marginTop: 8, padding: '8px 0', borderRadius: 10, fontWeight: 600, fontSize: 13, backgroundColor: 'transparent', color: 'var(--roost-text-muted)', border: 'none', cursor: 'pointer' }}
      >
        Or enter items manually
      </button>

      {/* Hidden file inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" style={{ display: 'none' }} onChange={handleFile} />
      <input ref={fileRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleFile} />
    </div>
  )
}

async function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/money/ReceiptScanner.tsx
git commit -m "feat: add ReceiptScanner component with camera/upload/scanning states"
```

---

## Task 5: LineItemReview Component

**Files:**
- Create: `apps/web/src/components/money/LineItemReview.tsx`

Editable list of OCR-extracted items. Users fix names/amounts and delete spurious rows.

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/money/LineItemReview.tsx
'use client'

import { useState } from 'react'
import { Trash2, Plus } from 'lucide-react'

export interface LineItem {
  id: string
  description: string
  amount: number
}

interface Props {
  initialItems: LineItem[]
  taxAndTip: number
  onConfirm: (items: LineItem[], taxAndTip: number) => void
  onBack: () => void
}

const COLOR = '#22C55E'
const COLOR_DARK = '#15803D'

export function LineItemReview({ initialItems, taxAndTip, onConfirm, onBack }: Props) {
  const [items, setItems] = useState<LineItem[]>(initialItems)
  const [taxTip, setTaxTip] = useState(taxAndTip.toFixed(2))

  function updateItem(id: string, field: 'description' | 'amount', value: string) {
    setItems(prev => prev.map(item =>
      item.id === id
        ? { ...item, [field]: field === 'amount' ? parseFloat(value) || 0 : value }
        : item
    ))
  }

  function deleteItem(id: string) {
    setItems(prev => prev.filter(i => i.id !== id))
  }

  function addItem() {
    setItems(prev => [...prev, { id: crypto.randomUUID(), description: '', amount: 0 }])
  }

  const inputStyle = {
    border: '1.5px solid var(--roost-border)',
    borderBottom: '3px solid var(--roost-border-bottom)',
    borderRadius: 8,
    padding: '7px 10px',
    fontSize: 14,
    backgroundColor: 'var(--roost-surface)',
    color: 'var(--roost-text-primary)',
    outline: 'none',
    width: '100%',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)' }}>
        Review items
      </p>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--roost-text-muted)' }}>
        Fix any errors before assigning to people.
      </p>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {items.map(item => (
          <div key={item.id} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              value={item.description}
              onChange={e => updateItem(item.id, 'description', e.target.value)}
              placeholder="Item name"
              style={{ ...inputStyle, flex: 1 }}
            />
            <div style={{ position: 'relative', width: 80, flexShrink: 0 }}>
              <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--roost-text-muted)', fontWeight: 700, fontSize: 13, pointerEvents: 'none' }}>$</span>
              <input
                type="number"
                step="0.01"
                value={item.amount || ''}
                onChange={e => updateItem(item.id, 'amount', e.target.value)}
                placeholder="0.00"
                style={{ ...inputStyle, paddingLeft: 20 }}
              />
            </div>
            <button
              onClick={() => deleteItem(item.id)}
              style={{ padding: 8, borderRadius: 8, border: 'none', backgroundColor: 'transparent', cursor: 'pointer', color: '#EF4444', flexShrink: 0 }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        ))}
      </div>

      <button
        onClick={addItem}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, padding: '8px 0', borderRadius: 10, fontWeight: 700, fontSize: 13, backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-secondary)', border: '1.5px dashed var(--roost-border)', cursor: 'pointer' }}
      >
        <Plus size={14} /> Add item
      </button>

      {/* Tax + tip row */}
      <div style={{ paddingTop: 8, borderTop: '1px solid var(--roost-border)' }}>
        <label style={{ display: 'block', fontSize: 11, fontWeight: 700, color: '#374151', letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 6 }}>
          Tax + Tip (split equally)
        </label>
        <div style={{ position: 'relative', width: 100 }}>
          <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--roost-text-muted)', fontWeight: 700, fontSize: 13, pointerEvents: 'none' }}>$</span>
          <input
            type="number"
            step="0.01"
            value={taxTip}
            onChange={e => setTaxTip(e.target.value)}
            style={{ ...inputStyle, paddingLeft: 20, width: 100 }}
          />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
        <button
          onClick={onBack}
          style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontWeight: 700, fontSize: 14, backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-secondary)', border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)', cursor: 'pointer' }}
        >
          Back
        </button>
        <button
          onClick={() => onConfirm(items.filter(i => i.description.trim()), parseFloat(taxTip) || 0)}
          disabled={items.filter(i => i.description.trim()).length === 0}
          style={{ flex: 2, padding: '12px 0', borderRadius: 12, fontWeight: 800, fontSize: 14, backgroundColor: COLOR, color: '#fff', border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, cursor: 'pointer' }}
        >
          Assign to people →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/money/LineItemReview.tsx
git commit -m "feat: add LineItemReview component for editing OCR results"
```

---

## Task 6: LineItemGrid Component

**Files:**
- Create: `apps/web/src/components/money/LineItemGrid.tsx`

Grid matrix: items as rows, members as columns. Tap cells to assign. Live totals footer.

- [ ] **Step 1: Create the component**

```tsx
// apps/web/src/components/money/LineItemGrid.tsx
'use client'

import { useState } from 'react'
import { LineItem } from './LineItemReview'

interface Member {
  id: string
  name: string
  avatarColor?: string
}

export interface ItemAssignment {
  itemId: string
  assignedTo: string[] // userId array
}

export interface SplitResult {
  userId: string
  amount: number
}

interface Props {
  items: LineItem[]
  taxAndTip: number
  members: Member[]
  onConfirm: (splits: SplitResult[], receiptData: object) => void
  onBack: () => void
}

const COLOR = '#22C55E'
const COLOR_DARK = '#15803D'

export function LineItemGrid({ items, taxAndTip, members, onConfirm, onBack }: Props) {
  const [assignments, setAssignments] = useState<Record<string, string[]>>(
    Object.fromEntries(items.map(i => [i.id, []]))
  )

  function toggleAssignment(itemId: string, userId: string) {
    setAssignments(prev => {
      const current = prev[itemId] ?? []
      const next = current.includes(userId)
        ? current.filter(id => id !== userId)
        : [...current, userId]
      return { ...prev, [itemId]: next }
    })
  }

  // Calculate per-member totals
  function calcTotals(): Record<string, number> {
    const totals: Record<string, number> = {}
    members.forEach(m => { totals[m.id] = 0 })

    for (const item of items) {
      const assigned = assignments[item.id] ?? []
      if (assigned.length === 0) continue
      const perPerson = item.amount / assigned.length
      assigned.forEach(uid => { totals[uid] = (totals[uid] ?? 0) + perPerson })
    }

    // Split tax+tip equally among all members
    const taxPerPerson = taxAndTip / members.length
    members.forEach(m => { totals[m.id] = (totals[m.id] ?? 0) + taxPerPerson })

    return totals
  }

  const totals = calcTotals()
  const unassigned = items.filter(i => (assignments[i.id] ?? []).length === 0)
  const canConfirm = unassigned.length === 0

  function handleConfirm() {
    const splits: SplitResult[] = members
      .map(m => ({ userId: m.id, amount: Math.round((totals[m.id] ?? 0) * 100) / 100 }))
      .filter(s => s.amount > 0)

    const receiptData = {
      lineItems: items.map(item => ({
        name: item.description,
        amount: item.amount,
        assignedTo: assignments[item.id] ?? [],
      })),
      taxAndTip,
    }

    onConfirm(splits, receiptData)
  }

  function initials(name: string) {
    return name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <p style={{ margin: 0, fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)' }}>
        Who had what?
      </p>
      <p style={{ margin: 0, fontSize: 13, color: 'var(--roost-text-muted)' }}>
        Tap to assign. Tap multiple for shared items.
      </p>

      {/* Scrollable grid */}
      <div style={{ overflowX: 'auto', borderRadius: 12, border: '1.5px solid var(--roost-border)' }}>
        <table style={{ borderCollapse: 'collapse', minWidth: '100%', fontSize: 12 }}>
          <thead>
            <tr style={{ backgroundColor: 'var(--roost-surface)' }}>
              <th style={{
                padding: '8px 10px', textAlign: 'left', borderBottom: '2px solid var(--roost-border)',
                color: 'var(--roost-text-secondary)', fontWeight: 700,
                position: 'sticky', left: 0, backgroundColor: 'var(--roost-surface)', zIndex: 1,
                minWidth: 130,
              }}>Item</th>
              {members.map(m => (
                <th key={m.id} style={{ padding: '6px 8px', textAlign: 'center', borderBottom: '2px solid var(--roost-border)', minWidth: 52 }}>
                  <div style={{
                    width: 28, height: 28, borderRadius: '50%', margin: '0 auto 2px',
                    backgroundColor: m.avatarColor ?? '#6B7280',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 10, fontWeight: 800, color: '#fff',
                  }}>
                    {initials(m.name)}
                  </div>
                  <div style={{ fontSize: 9, color: 'var(--roost-text-muted)', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 48 }}>
                    {m.name.split(' ')[0]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((item, idx) => {
              const assigned = assignments[item.id] ?? []
              const isUnassigned = assigned.length === 0
              const isShared = assigned.length > 1
              const perPerson = isShared ? item.amount / assigned.length : item.amount
              const rowBg = isUnassigned ? '#FFFBEB' : idx % 2 === 0 ? 'var(--roost-surface)' : 'var(--roost-bg)'

              return (
                <tr key={item.id} style={{ backgroundColor: rowBg }}>
                  <td style={{
                    padding: '8px 10px', borderBottom: '1px solid var(--roost-border)',
                    position: 'sticky', left: 0, backgroundColor: rowBg, zIndex: 1,
                  }}>
                    <div style={{ fontWeight: 600, color: isUnassigned ? '#92400E' : 'var(--roost-text-primary)' }}>
                      {item.description}
                      {isShared && (
                        <span style={{ marginLeft: 5, fontSize: 9, backgroundColor: '#DCFCE7', color: '#15803D', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>shared</span>
                      )}
                      {isUnassigned && (
                        <span style={{ marginLeft: 5, fontSize: 9, backgroundColor: '#FEF3C7', color: '#92400E', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>unassigned</span>
                      )}
                    </div>
                    <div style={{ fontSize: 10, color: isUnassigned ? '#D97706' : COLOR, marginTop: 2, fontWeight: 600 }}>
                      ${item.amount.toFixed(2)}{isShared ? ` · $${perPerson.toFixed(2)} each` : ''}
                    </div>
                  </td>
                  {members.map(m => {
                    const checked = assigned.includes(m.id)
                    return (
                      <td key={m.id} style={{ textAlign: 'center', padding: '8px', borderBottom: '1px solid var(--roost-border)' }}>
                        <div
                          onClick={() => toggleAssignment(item.id, m.id)}
                          style={{
                            width: 24, height: 24, borderRadius: 6, margin: '0 auto', cursor: 'pointer',
                            backgroundColor: checked ? COLOR : isUnassigned ? '#FEF3C7' : 'var(--roost-surface)',
                            border: checked ? 'none' : `1.5px ${isUnassigned ? 'dashed #FCD34D' : 'solid var(--roost-border)'}`,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            transition: 'background 0.1s',
                          }}
                        >
                          {checked && <div style={{ width: 10, height: 10, borderRadius: 2, backgroundColor: '#fff' }} />}
                        </div>
                      </td>
                    )
                  })}
                </tr>
              )
            })}
            {/* Tax + tip locked row */}
            <tr style={{ backgroundColor: 'var(--roost-bg)' }}>
              <td style={{ padding: '8px 10px', position: 'sticky', left: 0, backgroundColor: 'var(--roost-bg)', zIndex: 1 }}>
                <div style={{ fontWeight: 600, color: 'var(--roost-text-muted)' }}>
                  Tax + tip
                  <span style={{ marginLeft: 5, fontSize: 9, backgroundColor: '#E5E7EB', color: '#6B7280', borderRadius: 4, padding: '1px 5px', fontWeight: 700 }}>equal</span>
                </div>
                <div style={{ fontSize: 10, color: 'var(--roost-text-muted)', marginTop: 2 }}>
                  ${taxAndTip.toFixed(2)} · ${(taxAndTip / members.length).toFixed(2)} each
                </div>
              </td>
              {members.map(m => (
                <td key={m.id} style={{ textAlign: 'center', padding: '8px' }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, margin: '0 auto', backgroundColor: '#E5E7EB', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 10, height: 1.5, backgroundColor: '#9CA3AF' }} />
                  </div>
                </td>
              ))}
            </tr>
            {/* Totals footer */}
            <tr style={{ backgroundColor: '#F0FDF4' }}>
              <td style={{ padding: '8px 10px', fontWeight: 800, fontSize: 12, color: '#15803D', position: 'sticky', left: 0, backgroundColor: '#F0FDF4', zIndex: 1 }}>
                Totals
              </td>
              {members.map(m => (
                <td key={m.id} style={{ textAlign: 'center', padding: '8px', fontWeight: 800, fontSize: 11, color: '#15803D' }}>
                  ${(totals[m.id] ?? 0).toFixed(2)}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      {/* Unassigned warning */}
      {!canConfirm && (
        <div style={{ padding: '10px 12px', borderRadius: 10, backgroundColor: '#FFFBEB', border: '1.5px solid #FDE68A', fontSize: 13, fontWeight: 700, color: '#92400E' }}>
          {unassigned.length} item{unassigned.length > 1 ? 's' : ''} unassigned. Assign to continue.
        </div>
      )}

      <div style={{ display: 'flex', gap: 8 }}>
        <button
          onClick={onBack}
          style={{ flex: 1, padding: '12px 0', borderRadius: 12, fontWeight: 700, fontSize: 14, backgroundColor: 'var(--roost-surface)', color: 'var(--roost-text-secondary)', border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)', cursor: 'pointer' }}
        >
          Back
        </button>
        <button
          onClick={handleConfirm}
          disabled={!canConfirm}
          style={{ flex: 2, padding: '12px 0', borderRadius: 12, fontWeight: 800, fontSize: 14, backgroundColor: canConfirm ? COLOR : '#E5E7EB', color: canConfirm ? '#fff' : '#9CA3AF', border: 'none', borderBottom: `3px solid ${canConfirm ? COLOR_DARK : '#D1D5DB'}`, cursor: canConfirm ? 'pointer' : 'not-allowed' }}
        >
          Confirm splits →
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/money/LineItemGrid.tsx
git commit -m "feat: add LineItemGrid component for receipt item assignment"
```

---

## Task 7: Wire Receipt Flow Into ExpenseSheet

**Files:**
- Modify: `apps/web/src/components/money/ExpenseSheet.tsx`

The sheet gains a `scanMode` state that shows `ReceiptScanner` → `LineItemReview` → `LineItemGrid` as overlays before the form. When the grid is confirmed, splits and title/amount are pre-filled.

- [ ] **Step 1: Replace ExpenseSheet with extended version**

```tsx
// apps/web/src/components/money/ExpenseSheet.tsx
'use client'

import { useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import { Camera } from 'lucide-react'
import { DraggableSheet } from '@/components/shared/DraggableSheet'
import { ReceiptScanner, type ParsedReceipt } from './ReceiptScanner'
import { LineItemReview, type LineItem } from './LineItemReview'
import { LineItemGrid, type SplitResult } from './LineItemGrid'

const COLOR = '#22C55E'
const COLOR_DARK = '#15803D'

interface Member {
  id: string
  name: string
  avatarColor?: string
}

interface CustomSplit {
  userId: string
  amount: string
}

interface Props {
  open: boolean
  onClose: () => void
  members: Member[]
  currentUserId: string
  isPremium: boolean
  onUpgradeRequired?: (code: string) => void
}

type ScanStep = 'none' | 'scanning' | 'review' | 'grid'

export function ExpenseSheet({ open, onClose, members, currentUserId, isPremium, onUpgradeRequired }: Props) {
  const qc = useQueryClient()

  // Form state
  const [title, setTitle] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(currentUserId)
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom' | 'payer'>('equal')
  const [customSplits, setCustomSplits] = useState<CustomSplit[]>([])
  const [saving, setSaving] = useState(false)

  // Receipt scan state
  const [scanStep, setScanStep] = useState<ScanStep>('none')
  const [scannedReceipt, setScannedReceipt] = useState<ParsedReceipt | null>(null)
  const [reviewItems, setReviewItems] = useState<LineItem[]>([])
  const [reviewTaxTip, setReviewTaxTip] = useState(0)
  const [receiptData, setReceiptData] = useState<object | null>(null)

  const nonPayerMembers = members.filter(m => m.id !== paidBy)

  function initCustomSplits(payerId: string) {
    const others = members.filter(m => m.id !== payerId)
    const each = others.length > 0 && amount ? (parseFloat(amount) / others.length).toFixed(2) : ''
    setCustomSplits(others.map(m => ({ userId: m.id, amount: each })))
  }

  function handleSplitMethodChange(method: 'equal' | 'custom' | 'payer') {
    setSplitMethod(method)
    if (method === 'custom') initCustomSplits(paidBy)
  }

  function handlePaidByChange(userId: string) {
    setPaidBy(userId)
    if (splitMethod === 'custom') initCustomSplits(userId)
  }

  // Receipt flow handlers
  function handleScanSuccess(receipt: ParsedReceipt) {
    setScannedReceipt(receipt)
    const taxTip = (receipt.tax ?? 0) + (receipt.tip ?? 0)
    const items: LineItem[] = receipt.lineItems.map(li => ({
      id: crypto.randomUUID(),
      description: li.description,
      amount: li.amount,
    }))
    setReviewItems(items)
    setReviewTaxTip(taxTip)
    setScanStep('review')
  }

  function handleReviewConfirm(items: LineItem[], taxTip: number) {
    setReviewItems(items)
    setReviewTaxTip(taxTip)
    setScanStep('grid')
  }

  function handleGridConfirm(splits: SplitResult[], rData: object) {
    // Pre-fill form from receipt
    if (scannedReceipt?.merchant) setTitle(scannedReceipt.merchant)
    const total = reviewItems.reduce((s, i) => s + i.amount, 0) + reviewTaxTip
    setAmount(total.toFixed(2))
    setReceiptData(rData)

    // Convert splits to customSplits format (exclude payer)
    const cs: CustomSplit[] = splits
      .filter(s => s.userId !== paidBy)
      .map(s => ({ userId: s.userId, amount: s.amount.toFixed(2) }))
    setCustomSplits(cs)
    setSplitMethod('custom')
    setScanStep('none')
  }

  function resetForm() {
    setTitle('')
    setAmount('')
    setPaidBy(currentUserId)
    setSplitMethod('equal')
    setCustomSplits([])
    setScanStep('none')
    setScannedReceipt(null)
    setReviewItems([])
    setReviewTaxTip(0)
    setReceiptData(null)
  }

  async function handleSave() {
    if (!title.trim()) { toast.error('Title required', { description: 'Give the expense a name.' }); return }
    if (!amount || isNaN(parseFloat(amount)) || parseFloat(amount) <= 0) {
      toast.error('Invalid amount', { description: 'Enter a positive number.' }); return
    }

    let splits: CustomSplit[] = []
    if (splitMethod === 'equal') {
      splits = members.filter(m => m.id !== paidBy).map(m => ({
        userId: m.id,
        amount: (parseFloat(amount) / members.length).toFixed(2),
      }))
    } else if (splitMethod === 'custom') {
      splits = customSplits.filter(s => s.amount && parseFloat(s.amount) > 0)
      const splitTotal = splits.reduce((s, sp) => s + parseFloat(sp.amount), 0)
      if (Math.abs(splitTotal - parseFloat(amount)) > 0.02) {
        toast.error('Splits do not add up', { description: `Total splits: $${splitTotal.toFixed(2)}, expense: $${parseFloat(amount).toFixed(2)}` })
        return
      }
    }

    setSaving(true)
    try {
      const res = await fetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          amount: parseFloat(amount).toFixed(2),
          paidBy,
          splits,
          receiptData: receiptData ? JSON.stringify(receiptData) : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) {
        if (data.code && onUpgradeRequired) { onUpgradeRequired(data.code); return }
        toast.error('Failed to save', { description: data.error ?? 'Something went wrong.' })
        return
      }
      toast.success('Expense added')
      qc.invalidateQueries({ queryKey: ['expenses'] })
      qc.invalidateQueries({ queryKey: ['money-dashboard'] })
      resetForm()
      onClose()
    } finally {
      setSaving(false)
    }
  }

  const labelStyle = { color: '#374151', fontWeight: 700 as const, fontSize: 11, letterSpacing: '0.07em', textTransform: 'uppercase' as const, display: 'block', marginBottom: 6 }
  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: 12, fontSize: 16,
    border: `1.5px solid var(--roost-border)`,
    borderBottom: `3px solid var(--roost-border-bottom)`,
    backgroundColor: 'var(--roost-surface)',
    color: 'var(--roost-text-primary)',
    outline: 'none',
  }
  const pillStyle = (active: boolean) => ({
    padding: '8px 14px', borderRadius: 10, fontWeight: 700, fontSize: 13, cursor: 'pointer',
    backgroundColor: active ? COLOR : 'var(--roost-surface)',
    color: active ? '#fff' : 'var(--roost-text-primary)',
    border: `1.5px solid ${active ? COLOR : 'var(--roost-border)'}`,
    borderBottom: `3px solid ${active ? COLOR_DARK : 'var(--roost-border-bottom)'}`,
  })

  return (
    <DraggableSheet open={open} onOpenChange={(v: boolean) => { if (!v) { resetForm(); onClose() } }} featureColor={COLOR}>
      <div className="px-4 pb-8">

        {/* Receipt scan sub-flows */}
        {scanStep === 'scanning' && (
          <ReceiptScanner
            onSuccess={handleScanSuccess}
            onManual={() => {
              setReviewItems([])
              setReviewTaxTip(0)
              setScanStep('review')
            }}
          />
        )}

        {scanStep === 'review' && (
          <LineItemReview
            initialItems={reviewItems}
            taxAndTip={reviewTaxTip}
            onConfirm={handleReviewConfirm}
            onBack={() => setScanStep('scanning')}
          />
        )}

        {scanStep === 'grid' && (
          <LineItemGrid
            items={reviewItems}
            taxAndTip={reviewTaxTip}
            members={members}
            onConfirm={handleGridConfirm}
            onBack={() => setScanStep('review')}
          />
        )}

        {/* Main form — hidden while scanning */}
        {scanStep === 'none' && (
          <>
            <p className="mb-4 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>Add expense</p>

            {/* Scan receipt banner */}
            <button
              onClick={() => setScanStep('scanning')}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                marginBottom: 16, padding: '10px 12px', borderRadius: 12, cursor: 'pointer',
                backgroundColor: 'var(--roost-surface)',
                border: `1.5px dashed ${COLOR}`,
                textAlign: 'left',
              }}
            >
              <div style={{ width: 34, height: 34, borderRadius: 9, backgroundColor: COLOR, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Camera size={18} color="#fff" />
              </div>
              <div>
                <div style={{ fontSize: 13, fontWeight: 700, color: '#15803D' }}>Scan receipt to auto-fill</div>
                <div style={{ fontSize: 11, color: 'var(--roost-text-muted)' }}>75 free scans/month</div>
              </div>
            </button>

            {/* Amount */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Amount</label>
              <div style={{ position: 'relative' }}>
                <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--roost-text-muted)', fontWeight: 700 }}>$</span>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  style={{ ...inputStyle, paddingLeft: 24 }}
                />
              </div>
            </div>

            {/* Description */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Description</label>
              <input
                type="text"
                placeholder="What was it for?"
                value={title}
                onChange={e => setTitle(e.target.value)}
                style={inputStyle}
              />
            </div>

            {/* Paid by */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Paid by</label>
              <select value={paidBy} onChange={e => handlePaidByChange(e.target.value)} style={inputStyle}>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.id === currentUserId ? `${m.name} (you)` : m.name}</option>
                ))}
              </select>
            </div>

            {/* Split method */}
            <div style={{ marginBottom: 16 }}>
              <label style={labelStyle}>Split</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['equal', 'custom', 'payer'] as const).map(method => (
                  <button key={method} onClick={() => handleSplitMethodChange(method)} style={pillStyle(splitMethod === method)}>
                    {method === 'equal' ? 'Equal' : method === 'custom' ? 'Custom' : 'Just me'}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom splits */}
            {splitMethod === 'custom' && (
              <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {members.filter(m => m.id !== paidBy).map(m => {
                  const split = customSplits.find(s => s.userId === m.id)
                  return (
                    <div key={m.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: 'var(--roost-text-primary)' }}>{m.name}</span>
                      <div style={{ position: 'relative', width: 100 }}>
                        <span style={{ position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--roost-text-muted)', fontWeight: 700, fontSize: 13 }}>$</span>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="0.00"
                          value={split?.amount ?? ''}
                          onChange={e => setCustomSplits(prev =>
                            prev.some(s => s.userId === m.id)
                              ? prev.map(s => s.userId === m.id ? { ...s, amount: e.target.value } : s)
                              : [...prev, { userId: m.id, amount: e.target.value }]
                          )}
                          style={{ ...inputStyle, paddingLeft: 20, width: '100%' }}
                        />
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                width: '100%', padding: '14px 0', borderRadius: 14, fontWeight: 800, fontSize: 16,
                backgroundColor: COLOR, color: '#fff', border: 'none',
                borderBottom: `3px solid ${COLOR_DARK}`, cursor: saving ? 'not-allowed' : 'pointer',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Add expense'}
            </button>
          </>
        )}
      </div>
    </DraggableSheet>
  )
}
```

- [ ] **Step 2: Test the receipt flow manually**

Start the dev server (`npm run dev` from `apps/web/`). Open the Money page, tap an expense add button, verify:
1. The scan banner appears at the top
2. Tapping it shows the ReceiptScanner with Camera/Upload buttons
3. The "Or enter items manually" link shows the LineItemReview with an empty list
4. Adding items and tapping "Assign to people" shows the LineItemGrid
5. Assigning items and confirming pre-fills the form

You do not need AZURE credentials to test the manual path.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/money/ExpenseSheet.tsx
git commit -m "feat: wire receipt scan flow into ExpenseSheet with scan banner"
```

---

## Task 8: Percentage and Share-Based Splits

**Files:**
- Modify: `apps/web/src/components/money/ExpenseSheet.tsx`

Extend the split method to support `percent` and `shares` in addition to `equal`, `custom`, `payer`.

- [ ] **Step 1: Add percent and shares state to ExpenseSheet**

In `ExpenseSheet.tsx`, update the `splitMethod` type and add new state. Find the existing state declarations at the top of the component function and replace:

```ts
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom' | 'payer'>('equal')
  const [customSplits, setCustomSplits] = useState<CustomSplit[]>([])
```

with:

```ts
  const [splitMethod, setSplitMethod] = useState<'equal' | 'custom' | 'payer' | 'percent' | 'shares'>('equal')
  const [customSplits, setCustomSplits] = useState<CustomSplit[]>([])
  // percent: value is 0-100; shares: value is integer multiplier
  const [percentSplits, setPercentSplits] = useState<{ userId: string; value: string }[]>([])
  const [sharesSplits, setSharesSplits] = useState<{ userId: string; value: number }[]>([])
```

- [ ] **Step 2: Add init functions for new split methods**

Below the existing `initCustomSplits` function, add:

```ts
  function initPercentSplits() {
    const equal = members.length > 0 ? (100 / members.length).toFixed(1) : '0'
    setPercentSplits(members.map(m => ({ userId: m.id, value: equal })))
  }

  function initSharesSplits() {
    setSharesSplits(members.map(m => ({ userId: m.id, value: 1 })))
  }
```

- [ ] **Step 3: Update handleSplitMethodChange**

Replace the existing `handleSplitMethodChange`:

```ts
  function handleSplitMethodChange(method: typeof splitMethod) {
    setSplitMethod(method)
    if (method === 'custom') initCustomSplits(paidBy)
    if (method === 'percent') initPercentSplits()
    if (method === 'shares') initSharesSplits()
  }
```

- [ ] **Step 4: Update handleSave to compute splits for new methods**

In `handleSave`, replace the `let splits: CustomSplit[] = []` block with:

```ts
    let splits: CustomSplit[] = []
    if (splitMethod === 'equal') {
      splits = members.filter(m => m.id !== paidBy).map(m => ({
        userId: m.id,
        amount: (parseFloat(amount) / members.length).toFixed(2),
      }))
    } else if (splitMethod === 'custom') {
      splits = customSplits.filter(s => s.amount && parseFloat(s.amount) > 0)
      const splitTotal = splits.reduce((s, sp) => s + parseFloat(sp.amount), 0)
      if (Math.abs(splitTotal - parseFloat(amount)) > 0.02) {
        toast.error('Splits do not add up', { description: `Total splits: $${splitTotal.toFixed(2)}, expense: $${parseFloat(amount).toFixed(2)}` })
        return
      }
    } else if (splitMethod === 'percent') {
      const total = parseFloat(amount)
      const totalPct = percentSplits.reduce((s, p) => s + parseFloat(p.value || '0'), 0)
      if (Math.abs(totalPct - 100) > 0.5) {
        toast.error('Percentages must add up to 100%', { description: `Current total: ${totalPct.toFixed(1)}%` })
        return
      }
      splits = percentSplits.filter(p => parseFloat(p.value) > 0).map(p => ({
        userId: p.userId,
        amount: ((parseFloat(p.value) / 100) * total).toFixed(2),
      }))
    } else if (splitMethod === 'shares') {
      const totalShares = sharesSplits.reduce((s, sh) => s + sh.value, 0)
      if (totalShares === 0) { toast.error('Add at least one share'); return }
      const perShare = parseFloat(amount) / totalShares
      splits = sharesSplits.filter(sh => sh.value > 0).map(sh => ({
        userId: sh.userId,
        amount: (sh.value * perShare).toFixed(2),
      }))
    }
    // payer: no splits
```

- [ ] **Step 5: Add percent and shares UI**

In the JSX, find the split method pills section. Replace the existing pills `div` with:

```tsx
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {(['equal', 'custom', 'percent', 'shares', 'payer'] as const).map(method => (
                  <button key={method} onClick={() => handleSplitMethodChange(method)} style={pillStyle(splitMethod === method)}>
                    {method === 'equal' ? 'Equal'
                      : method === 'custom' ? 'Custom $'
                      : method === 'percent' ? '%'
                      : method === 'shares' ? 'Shares'
                      : 'Just me'}
                  </button>
                ))}
              </div>
```

Then after the existing `{splitMethod === 'custom' && (...)}` block, add:

```tsx
            {/* Percent splits */}
            {splitMethod === 'percent' && (
              <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {percentSplits.map(p => {
                  const member = members.find(m => m.id === p.userId)
                  const dollarAmount = amount ? ((parseFloat(p.value || '0') / 100) * parseFloat(amount)).toFixed(2) : '0.00'
                  return (
                    <div key={p.userId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: 'var(--roost-text-primary)' }}>
                        {member?.id === currentUserId ? `${member?.name} (you)` : member?.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <div style={{ position: 'relative', width: 72 }}>
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            max="100"
                            value={p.value}
                            onChange={e => setPercentSplits(prev => prev.map(ps => ps.userId === p.userId ? { ...ps, value: e.target.value } : ps))}
                            style={{ ...inputStyle, textAlign: 'right', paddingRight: 20 }}
                          />
                          <span style={{ position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)', color: 'var(--roost-text-muted)', fontSize: 12, fontWeight: 700 }}>%</span>
                        </div>
                        <span style={{ fontSize: 12, color: COLOR, fontWeight: 700, minWidth: 52, textAlign: 'right' }}>${dollarAmount}</span>
                      </div>
                    </div>
                  )
                })}
                {/* Percent total bar */}
                {(() => {
                  const total = percentSplits.reduce((s, p) => s + parseFloat(p.value || '0'), 0)
                  const balanced = Math.abs(total - 100) < 0.5
                  return (
                    <div>
                      <div style={{ height: 6, borderRadius: 3, backgroundColor: 'var(--roost-border)', overflow: 'hidden' }}>
                        <div style={{ height: '100%', width: `${Math.min(total, 100)}%`, backgroundColor: balanced ? COLOR : '#EF4444', borderRadius: 3, transition: 'width 0.2s' }} />
                      </div>
                      <p style={{ margin: '4px 0 0', fontSize: 11, fontWeight: 700, color: balanced ? COLOR_DARK : '#EF4444', textAlign: 'right' }}>
                        {total.toFixed(1)}% {balanced ? '— balanced' : '— must be 100%'}
                      </p>
                    </div>
                  )
                })()}
              </div>
            )}

            {/* Shares splits */}
            {splitMethod === 'shares' && (
              <div style={{ marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
                {sharesSplits.map(sh => {
                  const member = members.find(m => m.id === sh.userId)
                  const totalShares = sharesSplits.reduce((s, x) => s + x.value, 0)
                  const dollarAmount = totalShares > 0 && amount
                    ? ((sh.value / totalShares) * parseFloat(amount)).toFixed(2)
                    : '0.00'
                  return (
                    <div key={sh.userId} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: 'var(--roost-text-primary)' }}>
                        {member?.id === currentUserId ? `${member?.name} (you)` : member?.name}
                      </span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button
                          onClick={() => setSharesSplits(prev => prev.map(s => s.userId === sh.userId ? { ...s, value: Math.max(0, s.value - 1) } : s))}
                          style={{ width: 30, height: 30, borderRadius: 8, border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)', backgroundColor: 'var(--roost-surface)', cursor: 'pointer', fontWeight: 800, fontSize: 16, color: 'var(--roost-text-secondary)' }}
                        >−</button>
                        <span style={{ width: 30, textAlign: 'center', fontWeight: 800, fontSize: 16, color: 'var(--roost-text-primary)' }}>{sh.value}×</span>
                        <button
                          onClick={() => setSharesSplits(prev => prev.map(s => s.userId === sh.userId ? { ...s, value: s.value + 1 } : s))}
                          style={{ width: 30, height: 30, borderRadius: 8, border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, backgroundColor: COLOR, cursor: 'pointer', fontWeight: 800, fontSize: 16, color: '#fff' }}
                        >+</button>
                        <span style={{ fontSize: 12, color: COLOR, fontWeight: 700, minWidth: 52, textAlign: 'right' }}>${dollarAmount}</span>
                      </div>
                    </div>
                  )
                })}
                {(() => {
                  const totalShares = sharesSplits.reduce((s, x) => s + x.value, 0)
                  const perShare = totalShares > 0 && amount ? (parseFloat(amount) / totalShares).toFixed(2) : '0.00'
                  return (
                    <p style={{ margin: 0, fontSize: 11, color: 'var(--roost-text-muted)', fontWeight: 600 }}>
                      {totalShares} total shares · ${perShare} per share
                    </p>
                  )
                })()}
              </div>
            )}
```

- [ ] **Step 6: Test percent and shares splits manually**

Open Money page, add expense, select "%" — verify dollar amounts update live and the progress bar turns green at 100%. Select "Shares" — verify +/- steppers work and dollar amounts update.

- [ ] **Step 7: Commit**

```bash
git add apps/web/src/components/money/ExpenseSheet.tsx
git commit -m "feat: add percent and share-based split methods to ExpenseSheet"
```

---

## Task 9: Split Templates

**Files:**
- Modify: `apps/web/src/components/money/ExpenseSheet.tsx`

Add a templates section below the split method pills: fetch templates, apply with one tap, save current split as a template.

- [ ] **Step 1: Add template query and UI to ExpenseSheet**

At the top of `ExpenseSheet.tsx`, add the import:

```ts
import { useQuery } from '@tanstack/react-query'
import { BookmarkPlus, ChevronDown, ChevronUp } from 'lucide-react'
```

Inside the component, add state and query after the existing state declarations:

```ts
  const [showTemplates, setShowTemplates] = useState(false)
  const [saveTemplateName, setSaveTemplateName] = useState('')
  const [savingTemplate, setSavingTemplate] = useState(false)

  const { data: templateData } = useQuery({
    queryKey: ['split-templates'],
    queryFn: async () => {
      const res = await fetch('/api/split-templates')
      if (!res.ok) return { templates: [] }
      return res.json() as Promise<{ templates: Array<{ id: string; name: string; method: string; splits: string }> }>
    },
  })
  const templates = templateData?.templates ?? []
```

Add the template application function:

```ts
  function applyTemplate(template: { method: string; splits: string }) {
    const splits = JSON.parse(template.splits) as { userId: string; value: number }[]
    if (template.method === 'percent') {
      setSplitMethod('percent')
      setPercentSplits(members.map(m => {
        const match = splits.find(s => s.userId === m.id)
        return { userId: m.id, value: match ? String(match.value) : '0' }
      }))
    } else if (template.method === 'shares') {
      setSplitMethod('shares')
      setSharesSplits(members.map(m => {
        const match = splits.find(s => s.userId === m.id)
        return { userId: m.id, value: match?.value ?? 1 }
      }))
    } else if (template.method === 'custom') {
      setSplitMethod('custom')
      setCustomSplits(members.filter(m => m.id !== paidBy).map(m => {
        const match = splits.find(s => s.userId === m.id)
        return { userId: m.id, amount: match ? String(match.value) : '' }
      }))
    }
    setShowTemplates(false)
  }

  async function handleSaveTemplate() {
    if (!saveTemplateName.trim()) return
    let splits: { userId: string; value: number }[] = []
    let method = splitMethod
    if (splitMethod === 'percent') {
      splits = percentSplits.map(p => ({ userId: p.userId, value: parseFloat(p.value) }))
    } else if (splitMethod === 'shares') {
      splits = sharesSplits.map(s => ({ userId: s.userId, value: s.value }))
    } else if (splitMethod === 'custom') {
      splits = customSplits.map(s => ({ userId: s.userId, value: parseFloat(s.amount) }))
    } else {
      toast.error('Cannot save equal or just-me as a template')
      return
    }

    setSavingTemplate(true)
    try {
      const res = await fetch('/api/split-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: saveTemplateName.trim(), method, splits }),
      })
      if (!res.ok) { toast.error('Failed to save template'); return }
      toast.success('Template saved')
      setSaveTemplateName('')
      qc.invalidateQueries({ queryKey: ['split-templates'] })
    } finally {
      setSavingTemplate(false)
    }
  }
```

- [ ] **Step 2: Add templates UI in the JSX**

In the JSX, after the split method pills section (but before the split inputs), insert:

```tsx
            {/* Templates */}
            {templates.length > 0 && (
              <div style={{ marginBottom: 8 }}>
                <button
                  onClick={() => setShowTemplates(v => !v)}
                  style={{ display: 'flex', alignItems: 'center', gap: 4, fontSize: 12, fontWeight: 700, color: COLOR_DARK, background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                >
                  {showTemplates ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                  Saved templates
                </button>
                {showTemplates && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: 8 }}>
                    {templates.map(t => (
                      <div key={t.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', borderRadius: 10, backgroundColor: '#F0FDF4', border: '1.5px solid #BBF7D0' }}>
                        <div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: '#15803D' }}>{t.name}</div>
                          <div style={{ fontSize: 11, color: 'var(--roost-text-muted)', textTransform: 'capitalize' }}>{t.method} split</div>
                        </div>
                        <button onClick={() => applyTemplate(t)} style={{ fontSize: 12, fontWeight: 700, color: COLOR, background: 'none', border: 'none', cursor: 'pointer' }}>Apply</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
```

After the percent/shares inputs (before the save button), add the save-as-template section:

```tsx
            {/* Save as template */}
            {['percent', 'shares', 'custom'].includes(splitMethod) && (
              <div style={{ marginBottom: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
                <BookmarkPlus size={14} color="var(--roost-text-muted)" />
                <input
                  placeholder="Save as template (name)"
                  value={saveTemplateName}
                  onChange={e => setSaveTemplateName(e.target.value)}
                  style={{ ...inputStyle, flex: 1, padding: '7px 10px', fontSize: 13 }}
                />
                {saveTemplateName.trim() && (
                  <button
                    onClick={handleSaveTemplate}
                    disabled={savingTemplate}
                    style={{ padding: '7px 12px', borderRadius: 10, fontWeight: 700, fontSize: 12, backgroundColor: COLOR, color: '#fff', border: 'none', borderBottom: `2px solid ${COLOR_DARK}`, cursor: 'pointer' }}
                  >
                    Save
                  </button>
                )}
              </div>
            )}
```

- [ ] **Step 3: Test templates manually**

Add an expense with a % split, enter a name in the template field, tap Save. Verify it appears in the templates list. Open a new expense, expand templates, tap Apply — verify the split is restored.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/money/ExpenseSheet.tsx
git commit -m "feat: add split templates to ExpenseSheet (save, apply)"
```

---

## Task 10: Payment Deep Links + Profile Payment Handles

**Files:**
- Modify: `apps/web/src/components/money/SettleSheet.tsx`
- Modify: `apps/web/src/app/api/user/profile/route.ts`

- [ ] **Step 1: Update profile API to read/write payment handles**

In `apps/web/src/app/api/user/profile/route.ts`, update the GET select to include the new columns:

```ts
  const [row] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      avatar_color: users.avatarColor,
      timezone: users.timezone,
      language: users.language,
      theme: users.theme,
      has_seen_welcome: users.hasSeenWelcome,
      venmo_handle: users.venmoHandle,
      cashapp_handle: users.cashappHandle,
    })
    .from(users)
    .where(eq(users.id, session.user.id))
    .limit(1)
```

Update the PATCH body type:

```ts
  const body = await request.json().catch(() => ({})) as {
    name?: string
    email?: string
    avatar_color?: string
    timezone?: string
    language?: string
    push_token?: string
    venmo_handle?: string
    cashapp_handle?: string
  }
```

Add to the updates object (before the email-conditional block):

```ts
  if (body.venmo_handle !== undefined) updates.venmoHandle = body.venmo_handle.trim().replace(/^@/, '')
  if (body.cashapp_handle !== undefined) updates.cashappHandle = body.cashapp_handle.trim().replace(/^\$/, '')
```

- [ ] **Step 2: Expose payee handles from the expenses API**

Open `apps/web/src/app/api/expenses/route.ts`. In the GET handler, when returning `debts`, include the payee's payment handles. Find where debts are constructed and add a join or secondary lookup:

The expenses route builds `debts` from `expenseSplits`. After computing simplified debts, fetch payment handles for all unique payee user IDs:

```ts
// After debts array is computed, add handle lookup:
const payeeIds = [...new Set(debts.map((d: { to: string }) => d.to))]
const payeeHandles: Record<string, { venmoHandle: string | null; cashappHandle: string | null }> = {}
if (payeeIds.length > 0) {
  const handleRows = await db
    .select({ id: users.id, venmoHandle: users.venmoHandle, cashappHandle: users.cashappHandle })
    .from(users)
    .where(inArray(users.id, payeeIds))
  handleRows.forEach(r => { payeeHandles[r.id] = { venmoHandle: r.venmoHandle, cashappHandle: r.cashappHandle } })
}

const debtsWithHandles = debts.map((d: { to: string }) => ({
  ...d,
  payeeVenmo: payeeHandles[d.to]?.venmoHandle ?? null,
  payeeCashapp: payeeHandles[d.to]?.cashappHandle ?? null,
}))
```

Return `debtsWithHandles` instead of `debts` in the response.

- [ ] **Step 3: Update SettleSheet to accept and show payment buttons**

In `apps/web/src/components/money/SettleSheet.tsx`, update the `DebtItem` interface:

```ts
interface DebtItem {
  from: string
  to: string
  amount: number
  splitIds: string[]
  pendingClaim?: { settledByPayer: boolean; settledByPayee: boolean } | null
  payeeVenmo?: string | null
  payeeCashapp?: string | null
}
```

In the debtor initial view (`mode === 'initial' && iDebtor`), add payment buttons before the "I paid" button:

```tsx
        {mode === 'initial' && iDebtor && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--roost-text-secondary)', marginBottom: 4 }}>
              Pay {creditorName} outside the app, then mark as paid here.
            </p>

            {/* Venmo deep link */}
            {debt.payeeVenmo && (
              <a
                href={`venmo://paycharge?txn=pay&recipients=${encodeURIComponent(debt.payeeVenmo)}&amount=${debt.amount.toFixed(2)}&note=${encodeURIComponent('Roost expense')}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', borderRadius: 12, textDecoration: 'none',
                  backgroundColor: '#3D95CE', borderBottom: '3px solid #2D7AB0',
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', flexShrink: 0 }}>V</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Pay with Venmo</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>${debt.amount.toFixed(2)} to @{debt.payeeVenmo}</div>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>→</span>
              </a>
            )}

            {/* Cash App deep link */}
            {debt.payeeCashapp && (
              <a
                href={`cashme://cash.app/$${encodeURIComponent(debt.payeeCashapp)}/${debt.amount.toFixed(2)}`}
                style={{
                  display: 'flex', alignItems: 'center', gap: 10,
                  padding: '12px 14px', borderRadius: 12, textDecoration: 'none',
                  backgroundColor: '#5724C0', borderBottom: '3px solid #4118A0',
                }}
              >
                <div style={{ width: 28, height: 28, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 900, color: '#fff', flexShrink: 0 }}>$</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>Pay with Cash App</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.75)' }}>${debt.amount.toFixed(2)} to ${debt.payeeCashapp}</div>
                </div>
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: 16 }}>→</span>
              </a>
            )}

            <button onClick={handleClaim} disabled={loading} style={{ ...btnBase, backgroundColor: COLOR, color: '#fff', borderBottom: `3px solid ${COLOR_DARK}` }}>
              I paid {creditorName}
            </button>
          </div>
        )}
```

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/components/money/SettleSheet.tsx apps/web/src/app/api/user/profile/route.ts apps/web/src/app/api/expenses/route.ts
git commit -m "feat: add Venmo and Cash App payment deep links to SettleSheet"
```

---

## Self-Review

**Spec coverage check:**

| Spec section | Covered by |
|---|---|
| Receipt scan banner in ExpenseSheet | Task 7 |
| Camera/upload/scanning/error/empty states | Task 4 |
| Editable OCR line items | Task 5 |
| Grid matrix assignment | Task 6 |
| Tax+tip locked equal row | Task 6 |
| Unassigned item warning | Task 6 |
| Pre-fill form from grid | Task 7 |
| Percentage splits | Task 8 |
| Share-based splits | Task 8 |
| Split templates (save/apply) | Task 9 |
| Venmo deep link | Task 10 |
| Cash App deep link | Task 10 |
| User payment handles in profile | Task 10 |
| DB: split_templates table | Task 1 |
| DB: venmoHandle, cashappHandle | Task 1 |

**Placeholder scan:** None.

**Type consistency:** `LineItem` exported from `LineItemReview.tsx` and imported in `LineItemGrid.tsx`. `SplitResult` exported from `LineItemGrid.tsx` and used in `ExpenseSheet.tsx`. `ParsedReceipt` exported from `ReceiptScanner.tsx` and used in `ExpenseSheet.tsx`. All consistent.
