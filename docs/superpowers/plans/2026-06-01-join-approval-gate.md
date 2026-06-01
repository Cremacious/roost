# Join Approval Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add an admin-controlled approval gate (on by default) so joining a household by code requires explicit admin approval before a new member can access anything.

**Architecture:** A new `join_requests` table holds pending requests. The join-by-code route checks `households.join_approval_required` and either creates a member immediately (flag off) or inserts a request row (flag on). The onboarding page gains a waiting-room state that polls a status endpoint until the admin approves or rejects. Two stub components already in the settings page (`HouseholdJoinRequestsCard`, `RequestHouseholdJoinCard`) are implemented; an admin notification banner is added to the app shell.

**Tech Stack:** Drizzle ORM (neon-http), Next.js App Router API routes, TanStack Query, React/TypeScript, Lucide icons, sonner toasts, framer-motion.

---

## File map

| Action | File |
|---|---|
| Modify | `src/db/schema/households.ts` |
| Create | `src/db/schema/joinRequests.ts` |
| Modify | `src/db/schema/index.ts` |
| Modify | `src/app/api/household/me/route.ts` |
| Modify | `src/app/api/household/[id]/route.ts` |
| Modify | `src/lib/hooks/useHousehold.ts` |
| Modify | `src/app/api/household/join/route.ts` |
| Create | `src/app/api/household/join-requests/route.ts` |
| Create | `src/app/api/household/join-requests/status/route.ts` |
| Create | `src/app/api/household/join-requests/[id]/approve/route.ts` |
| Create | `src/app/api/household/join-requests/[id]/reject/route.ts` |
| Modify | `src/app/onboarding/page.tsx` |
| Create | `src/components/shared/JoinRequestsBanner.tsx` |
| Modify | `src/app/(app)/layout.tsx` |
| Modify | `src/components/household/HouseholdJoinRequestsCard.tsx` |

---

## Task 1: Schema — add `join_approval_required` and `join_requests` table

**Files:**
- Modify: `src/db/schema/households.ts`
- Create: `src/db/schema/joinRequests.ts`
- Modify: `src/db/schema/index.ts`

- [ ] **Step 1: Add `join_approval_required` to households schema**

Replace the contents of `src/db/schema/households.ts`:

```typescript
import { pgTable, text, timestamp, boolean } from "drizzle-orm/pg-core";

export const households = pgTable("households", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  code: text("invite_code").unique().notNull(),
  subscription_status: text("subscription_status").notNull().default("free"),
  stripe_subscription_id: text("stripe_subscription_id"),
  stripe_customer_id: text("stripe_customer_id"),
  stripe_price_id: text("stripe_price_id"),
  premium_expires_at: timestamp("premium_expires_at"),
  subscription_upgraded_at: timestamp("subscription_upgraded_at"),
  stats_visibility: text("stats_visibility"),
  meal_approval_mode: text("meal_approval_mode").notNull().default("admin_only").$type<'admin_only' | 'open_vote'>(),
  join_approval_required: boolean("join_approval_required").notNull().default(true),
  created_by: text("created_by"),
  created_at: timestamp("created_at").defaultNow(),
  updated_at: timestamp("updated_at").defaultNow(),
  deleted_at: timestamp("deleted_at"),
});

export type Household = typeof households.$inferSelect;
export type NewHousehold = typeof households.$inferInsert;
```

- [ ] **Step 2: Create `src/db/schema/joinRequests.ts`**

```typescript
import { pgTable, text, timestamp, uniqueIndex } from "drizzle-orm/pg-core";

export const joinRequests = pgTable(
  "join_requests",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    householdId: text("household_id").notNull(),
    userId: text("user_id").notNull(),
    type: text("type").notNull().$type<"code" | "invite">(),
    status: text("status").notNull().default("pending"),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (t) => [uniqueIndex("join_requests_household_user_uidx").on(t.householdId, t.userId)]
);

export type JoinRequest = typeof joinRequests.$inferSelect;
```

- [ ] **Step 3: Export from `src/db/schema/index.ts`**

Add this line at the end of `src/db/schema/index.ts`:

```typescript
export * from './joinRequests'
```

- [ ] **Step 4: Push schema to Neon**

```bash
npm run db:push
```

Expected: schema synced, no errors.

- [ ] **Step 5: Commit**

```bash
git add src/db/schema/households.ts src/db/schema/joinRequests.ts src/db/schema/index.ts
git commit -m "feat(schema): add join_approval_required to households and join_requests table"
```

---

## Task 2: Expose `joinApprovalRequired` via API and hook

**Files:**
- Modify: `src/app/api/household/me/route.ts`
- Modify: `src/app/api/household/[id]/route.ts`
- Modify: `src/lib/hooks/useHousehold.ts`

- [ ] **Step 1: Add `join_approval_required` to the `me` route select**

In `src/app/api/household/me/route.ts`, update the household select to include the new column:

```typescript
const [household] = await db
  .select({
    id: households.id,
    name: households.name,
    code: households.code,
    subscription_status: households.subscription_status,
    stripe_customer_id: households.stripe_customer_id,
    stripe_subscription_id: households.stripe_subscription_id,
    premium_expires_at: households.premium_expires_at,
    stats_visibility: households.stats_visibility,
    meal_approval_mode: households.meal_approval_mode,
    join_approval_required: households.join_approval_required,
  })
  .from(households)
  .where(and(eq(households.id, membership.householdId), isNull(households.deleted_at)))
  .limit(1);
```

- [ ] **Step 2: Accept `joinApprovalRequired` in the PATCH route**

In `src/app/api/household/[id]/route.ts`, update the body type and updates object:

```typescript
// Update the body type (line ~40):
let body: {
  name?: string;
  statsVisibility?: Record<string, boolean>;
  mealApprovalMode?: 'admin_only' | 'open_vote';
  joinApprovalRequired?: boolean;
};

// Update the updates type (line ~48):
const updates: {
  name?: string;
  stats_visibility?: string;
  meal_approval_mode?: 'admin_only' | 'open_vote';
  join_approval_required?: boolean;
  updated_at: Date;
} = { updated_at: new Date() };

// Add after the mealApprovalMode block (before the "nothing to update" check):
if (body.joinApprovalRequired !== undefined) {
  updates.join_approval_required = body.joinApprovalRequired;
}

// Update the "nothing to update" guard to include join_approval_required:
if (!updates.name && !updates.stats_visibility && !updates.meal_approval_mode && updates.join_approval_required === undefined) {
  return Response.json({ error: "Nothing to update" }, { status: 400 });
}
```

- [ ] **Step 3: Expose `joinApprovalRequired` in `useHousehold`**

In `src/lib/hooks/useHousehold.ts`, update the `HouseholdData` interface and return value:

```typescript
// Add to the household object in HouseholdData interface:
interface HouseholdData {
  household: {
    id: string;
    name: string;
    code: string;
    subscription_status: string;
    stripe_customer_id: string | null;
    stripe_subscription_id: string | null;
    premium_expires_at: string | null;
    stats_visibility: string | null;
    join_approval_required: boolean;
  };
  role: string;
  permissions: string[];
  upgradeAllowed?: boolean;
}

// Add to the return object in useHousehold():
return {
  household: data?.household,
  role: data?.role,
  permissions: data?.permissions ?? [],
  upgradeAllowed: data?.upgradeAllowed ?? false,
  isPremium,
  isCancelled,
  stripeCustomerId: data?.household?.stripe_customer_id ?? null,
  stripeSubscriptionId: data?.household?.stripe_subscription_id ?? null,
  premiumExpiresAt,
  statsVisibility,
  joinApprovalRequired: data?.household?.join_approval_required ?? true,
  isLoading,
  error,
};
```

- [ ] **Step 4: Verify by loading settings page**

Start the dev server (`npm run dev`) and open `/settings`. No console errors expected. The household section should render normally.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/household/me/route.ts src/app/api/household/[id]/route.ts src/lib/hooks/useHousehold.ts
git commit -m "feat: expose joinApprovalRequired in household API and hook"
```

---

## Task 3: Modify join-by-code route to support approval gate

**Files:**
- Modify: `src/app/api/household/join/route.ts`

- [ ] **Step 1: Rewrite `src/app/api/household/join/route.ts`**

Replace the entire file:

```typescript
import { NextResponse } from 'next/server'
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { households, householdMembers, memberPermissions, user, joinRequests } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

async function checkMultiHouseholdLimit(userId: string): Promise<Response | null> {
  const existingMemberships = await db
    .select({ id: householdMembers.id })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.userId, userId),
        isNull(householdMembers.deletedAt),
      )
    )

  if (existingMemberships.length >= 1) {
    const currentMembership = await db
      .select({ subscriptionStatus: households.subscription_status })
      .from(householdMembers)
      .innerJoin(households, eq(householdMembers.householdId, households.id))
      .where(
        and(
          eq(householdMembers.userId, userId),
          isNull(householdMembers.deletedAt),
        )
      )
      .limit(1)
      .then(r => r[0])

    if (!currentMembership || currentMembership.subscriptionStatus !== 'premium') {
      return NextResponse.json(
        { error: 'Multiple households require a premium subscription', code: 'MULTIPLE_HOUSEHOLDS_PREMIUM' },
        { status: 403 }
      )
    }
  }
  return null
}

export async function POST(request: Request) {
  const session = await requireSession()
  const body = await request.json().catch(() => ({}))
  const { code } = body

  if (!code?.trim()) {
    return NextResponse.json({ error: 'Invite code is required' }, { status: 400 })
  }

  const household = await db
    .select()
    .from(households)
    .where(and(eq(households.code, code.toUpperCase().trim()), isNull(households.deleted_at)))
    .limit(1)
    .then(r => r[0])

  if (!household) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 })
  }

  // Check not already a member
  const existing = await db
    .select({ id: householdMembers.id })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.householdId, household.id),
        eq(householdMembers.userId, session.user.id),
        isNull(householdMembers.deletedAt),
      )
    )
    .limit(1)

  if (existing.length > 0) {
    return NextResponse.json({ error: 'Already a member of this household' }, { status: 409 })
  }

  // Free-tier: max 1 household
  const limitError = await checkMultiHouseholdLimit(session.user.id)
  if (limitError) return limitError

  // --- Approval gate ---
  if (household.join_approval_required) {
    // Check for an existing pending request
    const pendingRequest = await db
      .select({ id: joinRequests.id })
      .from(joinRequests)
      .where(
        and(
          eq(joinRequests.householdId, household.id),
          eq(joinRequests.userId, session.user.id),
        )
      )
      .limit(1)

    if (pendingRequest.length > 0) {
      return NextResponse.json(
        { error: 'You already have a pending request for this household', code: 'ALREADY_REQUESTED' },
        { status: 409 }
      )
    }

    await db.insert(joinRequests).values({
      householdId: household.id,
      userId: session.user.id,
      type: 'code',
    })

    return NextResponse.json({ status: 'pending', householdName: household.name })
  }

  // --- Immediate join (approval not required) ---
  await db.insert(householdMembers).values({
    householdId: household.id,
    userId: session.user.id,
    role: 'member',
  })

  await db.insert(memberPermissions).values({
    householdId: household.id,
    userId: session.user.id,
  })

  await db.update(user)
    .set({ onboardingCompleted: true, updatedAt: new Date() })
    .where(eq(user.id, session.user.id))

  return NextResponse.json({ householdId: household.id, name: household.name })
}
```

- [ ] **Step 2: Manually verify the route (dev server must be running)**

Open the onboarding page (`/onboarding`), enter a valid household code. Confirm:
- When the target household has `join_approval_required = true` (the default for all new households after db:push): the response should be `{ status: 'pending', householdName: '...' }`.
- To test immediate join: use the DevTools or directly update the DB to set `join_approval_required = false` on a test household, then join — it should go through immediately.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/household/join/route.ts
git commit -m "feat: check join_approval_required before adding member"
```

---

## Task 4: Create join-requests API routes

**Files:**
- Create: `src/app/api/household/join-requests/route.ts`
- Create: `src/app/api/household/join-requests/status/route.ts`
- Create: `src/app/api/household/join-requests/[id]/approve/route.ts`
- Create: `src/app/api/household/join-requests/[id]/reject/route.ts`

- [ ] **Step 1: Create `src/app/api/household/join-requests/route.ts` (admin list)**

```typescript
import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { joinRequests, householdMembers, households, users } from '@/db/schema'
import { and, eq, isNull, desc } from 'drizzle-orm'

export async function GET(request: NextRequest): Promise<Response> {
  const session = await requireSession()

  // Find the caller's household and confirm they are admin
  const [membership] = await db
    .select({
      householdId: householdMembers.householdId,
      role: householdMembers.role,
    })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.userId, session.user.id),
        isNull(householdMembers.deletedAt),
      )
    )
    .limit(1)

  if (!membership) {
    return Response.json({ error: 'No household found' }, { status: 404 })
  }

  if (membership.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  const requests = await db
    .select({
      id: joinRequests.id,
      type: joinRequests.type,
      createdAt: joinRequests.createdAt,
      userId: joinRequests.userId,
      name: users.name,
      avatarColor: users.avatarColor,
    })
    .from(joinRequests)
    .innerJoin(users, eq(joinRequests.userId, users.id))
    .where(eq(joinRequests.householdId, membership.householdId))
    .orderBy(desc(joinRequests.createdAt))

  return Response.json({ requests })
}
```

- [ ] **Step 2: Create `src/app/api/household/join-requests/status/route.ts` (requester polling)**

```typescript
import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { joinRequests, householdMembers, households } from '@/db/schema'
import { and, eq, isNull, desc } from 'drizzle-orm'

export async function GET(_request: NextRequest): Promise<Response> {
  const session = await requireSession()

  // Check if the user has an active household membership (approved)
  const [membership] = await db
    .select({ householdId: householdMembers.householdId })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.userId, session.user.id),
        isNull(householdMembers.deletedAt),
      )
    )
    .limit(1)

  if (membership) {
    return Response.json({ status: 'approved', householdId: membership.householdId })
  }

  // Check for a pending request
  const [pendingRequest] = await db
    .select({
      id: joinRequests.id,
      householdId: joinRequests.householdId,
    })
    .from(joinRequests)
    .where(eq(joinRequests.userId, session.user.id))
    .orderBy(desc(joinRequests.createdAt))
    .limit(1)

  if (pendingRequest) {
    const [household] = await db
      .select({ name: households.name })
      .from(households)
      .where(eq(households.id, pendingRequest.householdId))
      .limit(1)

    return Response.json({ status: 'pending', householdName: household?.name ?? '' })
  }

  return Response.json({ status: 'not_found' })
}
```

- [ ] **Step 3: Create `src/app/api/household/join-requests/[id]/approve/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { joinRequests, householdMembers, memberPermissions, user } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'
import { logActivity } from '@/lib/utils/activity'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params
  const session = await requireSession()

  // Confirm caller is admin of their household
  const [callerMembership] = await db
    .select({ householdId: householdMembers.householdId, role: householdMembers.role })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.userId, session.user.id),
        isNull(householdMembers.deletedAt),
      )
    )
    .limit(1)

  if (!callerMembership || callerMembership.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Load the join request and confirm it belongs to this household
  const [req] = await db
    .select()
    .from(joinRequests)
    .where(
      and(
        eq(joinRequests.id, id),
        eq(joinRequests.householdId, callerMembership.householdId),
      )
    )
    .limit(1)

  if (!req) {
    return Response.json({ error: 'Request not found' }, { status: 404 })
  }

  // Create member + permissions
  await db.insert(householdMembers).values({
    householdId: req.householdId,
    userId: req.userId,
    role: 'member',
  })

  await db.insert(memberPermissions).values({
    householdId: req.householdId,
    userId: req.userId,
  })

  // Mark user onboarding complete
  await db.update(user)
    .set({ onboardingCompleted: true, updatedAt: new Date() })
    .where(eq(user.id, req.userId))

  // Delete the request
  await db.delete(joinRequests).where(eq(joinRequests.id, id))

  await logActivity({
    householdId: req.householdId,
    userId: req.userId,
    type: 'member_joined',
    entityType: 'member',
    entityId: req.userId,
    description: 'joined the household',
  })

  return Response.json({ success: true })
}
```

- [ ] **Step 4: Create `src/app/api/household/join-requests/[id]/reject/route.ts`**

```typescript
import { NextRequest } from 'next/server'
import { requireSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { joinRequests, householdMembers } from '@/db/schema'
import { and, eq, isNull } from 'drizzle-orm'

export async function POST(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params
  const session = await requireSession()

  // Confirm caller is admin
  const [callerMembership] = await db
    .select({ householdId: householdMembers.householdId, role: householdMembers.role })
    .from(householdMembers)
    .where(
      and(
        eq(householdMembers.userId, session.user.id),
        isNull(householdMembers.deletedAt),
      )
    )
    .limit(1)

  if (!callerMembership || callerMembership.role !== 'admin') {
    return Response.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Confirm request belongs to this household
  const [req] = await db
    .select({ id: joinRequests.id })
    .from(joinRequests)
    .where(
      and(
        eq(joinRequests.id, id),
        eq(joinRequests.householdId, callerMembership.householdId),
      )
    )
    .limit(1)

  if (!req) {
    return Response.json({ error: 'Request not found' }, { status: 404 })
  }

  await db.delete(joinRequests).where(eq(joinRequests.id, id))

  return Response.json({ success: true })
}
```

- [ ] **Step 5: Commit**

```bash
git add src/app/api/household/join-requests/
git commit -m "feat: join-requests API routes (list, status, approve, reject)"
```

---

## Task 5: Onboarding — waiting room state

**Files:**
- Modify: `src/app/onboarding/page.tsx`

- [ ] **Step 1: Add pending state and waiting room to the onboarding page**

Replace the entire `src/app/onboarding/page.tsx`:

```typescript
'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, Clock } from 'lucide-react'
import { toast } from 'sonner'

type Step = 1 | '2a' | '2b' | 3 | 'pending'

function DotProgress({ step }: { step: Step }) {
  const stepNum = step === 1 ? 1 : step === '2a' || step === '2b' ? 2 : 3

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 7,
        padding: '14px 16px 10px',
      }}
    >
      {[1, 2, 3].map(d => {
        const done = d < stepNum
        const active = d === stepNum
        const inactive = !done && !active

        if (done) {
          return (
            <div
              key={d}
              style={{
                width: 14,
                height: 14,
                borderRadius: '50%',
                backgroundColor: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
            >
              <Check size={8} color="#EF4444" strokeWidth={3.5} />
            </div>
          )
        }

        if (active) {
          return (
            <div
              key={d}
              style={{
                width: 20,
                height: 6,
                borderRadius: 3,
                backgroundColor: 'rgba(255,255,255,0.95)',
                flexShrink: 0,
                transition: 'all 0.2s',
              }}
            />
          )
        }

        return (
          <div
            key={d}
            style={{
              width: 6,
              height: 6,
              borderRadius: '50%',
              backgroundColor: inactive ? 'rgba(255,255,255,0.3)' : 'transparent',
              flexShrink: 0,
              transition: 'all 0.2s',
            }}
          />
        )
      })}
    </div>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        height: 40,
        padding: '0 14px',
        background: 'rgba(255,255,255,0.12)',
        border: '1.5px solid rgba(255,255,255,0.22)',
        borderBottom: '2px solid rgba(0,0,0,0.18)',
        borderRadius: 999,
        color: '#ffffff',
        fontFamily: 'var(--font-nunito)',
        fontWeight: 800,
        fontSize: 12,
        letterSpacing: '0.04em',
        cursor: 'pointer',
        marginBottom: 14,
      }}
    >
      <ChevronLeft size={14} strokeWidth={2.5} />
      Back
    </button>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>(1)

  const [householdName, setHouseholdName] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [householdResult, setHouseholdResult] = useState<{ name: string } | null>(null)
  const [pendingHouseholdName, setPendingHouseholdName] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Poll for approval when in pending state
  useEffect(() => {
    if (step !== 'pending') {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
      return
    }

    async function checkStatus() {
      const res = await fetch('/api/household/join-requests/status')
      if (!res.ok) return
      const data = await res.json()

      if (data.status === 'approved') {
        if (pollingRef.current) clearInterval(pollingRef.current)
        await fetch('/api/auth/get-session?disableCookieCache=true')
        router.push('/today')
      } else if (data.status === 'not_found') {
        if (pollingRef.current) clearInterval(pollingRef.current)
        toast.error("Your request wasn't approved. You can try a different household.")
        setStep(1)
        setInviteCode('')
        setError('')
      }
    }

    checkStatus()
    pollingRef.current = setInterval(checkStatus, 10_000)

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  }, [step, router])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/household/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: householdName }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to create household')
      } else {
        setHouseholdResult({ name: data.name })
        await fetch('/api/auth/get-session?disableCookieCache=true')
        setStep(3)
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = await fetch('/api/household/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: inviteCode }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error ?? 'Failed to join household')
      } else if (data.status === 'pending') {
        setPendingHouseholdName(data.householdName)
        setStep('pending')
      } else {
        setHouseholdResult({ name: data.name })
        await fetch('/api/auth/get-session?disableCookieCache=true')
        setStep(3)
      }
    } catch {
      setError('Something went wrong.')
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 48,
    padding: '12px 14px',
    backgroundColor: '#ffffff',
    border: '1.5px solid rgba(255,255,255,0.5)',
    borderBottom: '3px solid rgba(0,0,0,0.12)',
    borderRadius: 10,
    fontFamily: 'var(--font-nunito)',
    fontWeight: 700,
    fontSize: 16,
    color: '#374151',
    outline: 'none',
    display: 'block',
    boxSizing: 'border-box',
  }

  const ctaButtonStyle: React.CSSProperties = {
    width: '100%',
    minHeight: 48,
    padding: '13px 16px',
    backgroundColor: '#ffffff',
    color: '#EF4444',
    border: 'none',
    borderBottom: '3px solid #E5E7EB',
    borderRadius: 11,
    fontFamily: 'var(--font-nunito)',
    fontWeight: 800,
    fontSize: 14,
    cursor: loading ? 'not-allowed' : 'pointer',
    opacity: loading ? 0.7 : 1,
    display: 'block',
  }

  return (
    <div
      style={{
        minHeight: '100dvh',
        backgroundColor: '#FFF5F5',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        style={{
          width: '100%',
          maxWidth: 420,
          backgroundColor: '#EF4444',
          borderRadius: 18,
          borderBottom: '5px solid #C93B3B',
          overflow: 'hidden',
        }}
      >
        <DotProgress step={step} />

        <div style={{ padding: '2px 16px 22px' }}>
          {/* Step 1: Choose path */}
          {step === 1 && (
            <>
              <h1
                style={{
                  fontWeight: 900,
                  fontSize: 22,
                  color: '#ffffff',
                  marginBottom: 4,
                  lineHeight: 1.2,
                }}
              >
                Your household
              </h1>
              <p
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 18,
                  lineHeight: 1.4,
                }}
              >
                Create new or join one that already exists
              </p>
              <button
                onClick={() => { setError(''); setStep('2a') }}
                style={{
                  width: '100%',
                  padding: '11px 13px',
                  backgroundColor: '#ffffff',
                  border: 'none',
                  borderBottom: '3px solid #E5E7EB',
                  borderRadius: 11,
                  textAlign: 'left',
                  cursor: 'pointer',
                  marginBottom: 8,
                  display: 'block',
                }}
              >
                <p style={{ fontWeight: 800, fontSize: 14, color: '#111827', margin: 0 }}>
                  Create a household
                </p>
                <p style={{ fontWeight: 700, fontSize: 11, color: '#6B7280', margin: '2px 0 0' }}>
                  Start fresh and invite others to join
                </p>
              </button>
              <button
                onClick={() => { setError(''); setStep('2b') }}
                style={{
                  width: '100%',
                  padding: '11px 13px',
                  backgroundColor: '#ffffff',
                  border: 'none',
                  borderBottom: '3px solid #E5E7EB',
                  borderRadius: 11,
                  textAlign: 'left',
                  cursor: 'pointer',
                  display: 'block',
                }}
              >
                <p style={{ fontWeight: 800, fontSize: 14, color: '#111827', margin: 0 }}>
                  Join a household
                </p>
                <p style={{ fontWeight: 700, fontSize: 11, color: '#6B7280', margin: '2px 0 0' }}>
                  Enter the code from your housemate
                </p>
              </button>
            </>
          )}

          {/* Step 2a: Create */}
          {step === '2a' && (
            <>
              <BackButton onClick={() => { setError(''); setStep(1) }} />
              <h1
                style={{
                  fontWeight: 900,
                  fontSize: 22,
                  color: '#ffffff',
                  marginBottom: 4,
                  lineHeight: 1.2,
                }}
              >
                Name your household
              </h1>
              <p
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 14,
                  lineHeight: 1.4,
                }}
              >
                You can always rename it later in settings
              </p>
              <form onSubmit={handleCreate}>
                <input
                  placeholder="e.g. The Johnson House"
                  value={householdName}
                  onChange={e => setHouseholdName(e.target.value)}
                  required
                  style={{ ...inputStyle, marginBottom: error ? 8 : 12 }}
                />
                {error && (
                  <p style={{ color: '#FCA5A5', fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
                    {error}
                  </p>
                )}
                <button type="submit" disabled={loading} style={ctaButtonStyle}>
                  {loading ? 'Creating...' : 'Create household'}
                </button>
              </form>
            </>
          )}

          {/* Step 2b: Join */}
          {step === '2b' && (
            <>
              <BackButton onClick={() => { setError(''); setStep(1) }} />
              <h1
                style={{
                  fontWeight: 900,
                  fontSize: 22,
                  color: '#ffffff',
                  marginBottom: 4,
                  lineHeight: 1.2,
                }}
              >
                Join a household
              </h1>
              <p
                style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 14,
                  lineHeight: 1.4,
                }}
              >
                Ask your housemate to share their code from Settings
              </p>
              <form onSubmit={handleJoin}>
                <input
                  placeholder="Household code"
                  value={inviteCode}
                  onChange={e => setInviteCode(e.target.value.toUpperCase())}
                  maxLength={6}
                  required
                  style={{
                    ...inputStyle,
                    letterSpacing: '0.25em',
                    fontFamily: 'monospace',
                    textAlign: 'center',
                    marginBottom: error ? 8 : 12,
                  }}
                />
                {error && (
                  <p style={{ color: '#FCA5A5', fontWeight: 700, fontSize: 13, marginBottom: 10 }}>
                    {error}
                  </p>
                )}
                <button type="submit" disabled={loading} style={ctaButtonStyle}>
                  {loading ? 'Joining...' : 'Join household'}
                </button>
              </form>
            </>
          )}

          {/* Step pending: Waiting room */}
          {step === 'pending' && (
            <div style={{ textAlign: 'center', paddingTop: 4 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  border: '2px solid rgba(255,255,255,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}
              >
                <Clock size={20} color="#ffffff" strokeWidth={2.5} />
              </div>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.65)',
                  marginBottom: 4,
                }}
              >
                Waiting for approval
              </p>
              <h1
                style={{
                  fontWeight: 900,
                  fontSize: 22,
                  color: '#ffffff',
                  marginBottom: 10,
                  lineHeight: 1.2,
                }}
              >
                {pendingHouseholdName}
              </h1>
              <p
                style={{
                  fontSize: 13,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.7)',
                  marginBottom: 20,
                  lineHeight: 1.5,
                }}
              >
                Your request has been sent to the admin. Hang tight.
              </p>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  color: 'rgba(255,255,255,0.45)',
                }}
              >
                Checking for approval...
              </p>
            </div>
          )}

          {/* Step 3: Success */}
          {step === 3 && (
            <div style={{ textAlign: 'center', paddingTop: 4 }}>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: '50%',
                  backgroundColor: 'rgba(255,255,255,0.18)',
                  border: '2px solid rgba(255,255,255,0.4)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 14px',
                }}
              >
                <Check size={20} color="#ffffff" strokeWidth={3} />
              </div>
              <p
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: 'rgba(255,255,255,0.65)',
                  marginBottom: 4,
                }}
              >
                You&apos;re in
              </p>
              <h1
                style={{
                  fontWeight: 900,
                  fontSize: 24,
                  color: '#ffffff',
                  marginBottom: 20,
                  lineHeight: 1.2,
                }}
              >
                {householdResult?.name}
              </h1>
              <button
                onClick={() => router.push('/today')}
                style={{
                  width: '100%',
                  minHeight: 48,
                  padding: '13px 16px',
                  backgroundColor: '#ffffff',
                  color: '#EF4444',
                  border: 'none',
                  borderBottom: '3px solid #E5E7EB',
                  borderRadius: 11,
                  fontFamily: 'var(--font-nunito)',
                  fontWeight: 800,
                  fontSize: 14,
                  cursor: 'pointer',
                  display: 'block',
                }}
              >
                Go to dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Test the waiting room manually**

1. In a second browser (or incognito), sign up as a new user.
2. Enter a household code whose household has `join_approval_required = true`.
3. Confirm the page shows the Clock icon, household name, and "Checking for approval..." text.
4. In the admin browser, go to Settings > Household — confirm `HouseholdJoinRequestsCard` still returns null (it will be implemented in Task 7).

- [ ] **Step 3: Commit**

```bash
git add src/app/onboarding/page.tsx
git commit -m "feat: onboarding waiting room state for pending join requests"
```

---

## Task 6: Admin notification banner

**Files:**
- Create: `src/components/shared/JoinRequestsBanner.tsx`
- Modify: `src/app/(app)/layout.tsx`

- [ ] **Step 1: Create `src/components/shared/JoinRequestsBanner.tsx`**

```typescript
'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { UserCheck, X } from 'lucide-react'
import { useHousehold } from '@/lib/hooks/useHousehold'

export default function JoinRequestsBanner() {
  const { role } = useHousehold()
  const router = useRouter()
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    const key = 'roost-join-requests-banner-dismissed'
    if (sessionStorage.getItem(key)) setDismissed(true)
  }, [])

  const { data } = useQuery({
    queryKey: ['join-requests'],
    queryFn: async () => {
      const res = await fetch('/api/household/join-requests')
      if (!res.ok) return { requests: [] }
      return res.json() as Promise<{ requests: { id: string }[] }>
    },
    enabled: role === 'admin',
    refetchInterval: 60_000,
    staleTime: 30_000,
  })

  const count = data?.requests?.length ?? 0

  if (role !== 'admin' || dismissed || count === 0) return null

  function handleDismiss() {
    sessionStorage.setItem('roost-join-requests-banner-dismissed', '1')
    setDismissed(true)
  }

  return (
    <div
      style={{
        position: 'fixed',
        top: 56,
        left: 0,
        right: 0,
        zIndex: 40,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        padding: '10px 16px',
        backgroundColor: '#1D4ED8',
        color: '#ffffff',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <UserCheck size={16} strokeWidth={2} />
        <span style={{ fontWeight: 700, fontSize: 13 }}>
          {count === 1
            ? '1 member request waiting for your approval'
            : `${count} member requests waiting for your approval`}
        </span>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button
          type="button"
          onClick={() => {
            router.push('/settings#section-household')
            handleDismiss()
          }}
          style={{
            fontSize: 12,
            fontWeight: 700,
            color: '#ffffff',
            textDecoration: 'underline',
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            padding: 0,
          }}
        >
          Review
        </button>
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss"
          style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0, color: '#ffffff' }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add the banner to the app layout**

In `src/app/(app)/layout.tsx`, import and render `JoinRequestsBanner`:

```typescript
import { requireSession, getUserHousehold } from '@/lib/auth/helpers'
import { Sidebar } from '@/components/layout/Sidebar'
import { BottomNav } from '@/components/layout/BottomNav'
import { TopBar } from '@/components/layout/TopBar'
import { DevTools } from '@/components/dev/DevTools'
import JoinRequestsBanner from '@/components/shared/JoinRequestsBanner'

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await requireSession()
  const membership = await getUserHousehold(session.user.id)
  const isPremium = membership?.household.subscriptionStatus === 'premium'

  return (
    <div className="flex" style={{ minHeight: '100dvh', backgroundColor: 'var(--roost-bg)' }}>
      <Sidebar />
      <TopBar />
      <JoinRequestsBanner />
      <main
        className="flex-1 overflow-y-auto"
        style={{ paddingTop: 56, paddingBottom: 52 }}
      >
        {children}
      </main>
      <BottomNav />
      <DevTools />
    </div>
  )
}
```

- [ ] **Step 3: Test banner**

With a pending join request in the DB and logged in as admin: the blue banner should appear below the TopBar showing the request count. Clicking "Review" navigates to `/settings#section-household`. Clicking X dismisses for the session. Reloading brings it back.

- [ ] **Step 4: Commit**

```bash
git add src/components/shared/JoinRequestsBanner.tsx src/app/(app)/layout.tsx
git commit -m "feat: join requests admin notification banner"
```

---

## Task 7: Implement `HouseholdJoinRequestsCard` and approval toggle

**Files:**
- Modify: `src/components/household/HouseholdJoinRequestsCard.tsx`
- Modify: `src/app/(app)/settings/page.tsx` (approval toggle only)

- [ ] **Step 1: Implement `HouseholdJoinRequestsCard`**

Replace `src/components/household/HouseholdJoinRequestsCard.tsx`:

```typescript
'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Check, X } from 'lucide-react'
import { toast } from 'sonner'
import { relativeTime } from '@/lib/utils/time'
import MemberAvatar from '@/components/shared/MemberAvatar'

interface JoinRequest {
  id: string
  type: 'code' | 'invite'
  createdAt: string
  userId: string
  name: string
  avatarColor: string | null
}

export default function HouseholdJoinRequestsCard() {
  const queryClient = useQueryClient()

  const { data } = useQuery({
    queryKey: ['join-requests'],
    queryFn: async () => {
      const res = await fetch('/api/household/join-requests')
      if (!res.ok) return { requests: [] }
      return res.json() as Promise<{ requests: JoinRequest[] }>
    },
    staleTime: 30_000,
    refetchInterval: 30_000,
  })

  const requests = data?.requests ?? []

  const approveMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/household/join-requests/${id}/approve`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to approve')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] })
      queryClient.invalidateQueries({ queryKey: ['members'] })
      toast.success('Member approved')
    },
    onError: () => {
      toast.error('Failed to approve request', { description: 'Please try again.' })
    },
  })

  const rejectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/household/join-requests/${id}/reject`, { method: 'POST' })
      if (!res.ok) throw new Error('Failed to reject')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['join-requests'] })
      toast.success('Request declined')
    },
    onError: () => {
      toast.error('Failed to decline request', { description: 'Please try again.' })
    },
  })

  if (requests.length === 0) return null

  return (
    <div>
      <p
        className="text-sm mb-3"
        style={{ color: 'var(--roost-text-primary)', fontWeight: 700 }}
      >
        Pending Requests ({requests.length})
      </p>
      <div className="space-y-2">
        {requests.map(req => (
          <motion.div
            key={req.id}
            layout
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 0',
            }}
          >
            <MemberAvatar
              name={req.name}
              color={req.avatarColor ?? '#6B7280'}
              size="sm"
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: 13, color: 'var(--roost-text-primary)', margin: 0 }}>
                {req.name}
              </p>
              <p style={{ fontWeight: 600, fontSize: 11, color: 'var(--roost-text-muted)', margin: 0 }}>
                Requested {relativeTime(new Date(req.createdAt))}
              </p>
            </div>
            <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
              <motion.button
                type="button"
                whileTap={{ y: 1 }}
                onClick={() => approveMutation.mutate(req.id)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                aria-label={`Approve ${req.name}`}
                style={{
                  height: 32,
                  width: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  backgroundColor: '#22C55E',
                  border: '1.5px solid #16A34A',
                  borderBottom: '3px solid #15803D',
                  cursor: 'pointer',
                  flexShrink: 0,
                }}
              >
                <Check size={14} color="#ffffff" strokeWidth={2.5} />
              </motion.button>
              <motion.button
                type="button"
                whileTap={{ y: 1 }}
                onClick={() => rejectMutation.mutate(req.id)}
                disabled={approveMutation.isPending || rejectMutation.isPending}
                aria-label={`Decline ${req.name}`}
                style={{
                  height: 32,
                  width: 32,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: 10,
                  backgroundColor: 'var(--roost-surface)',
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: '3px solid var(--roost-border-bottom)',
                  cursor: 'pointer',
                  flexShrink: 0,
                  color: '#EF4444',
                }}
              >
                <X size={14} strokeWidth={2.5} />
              </motion.button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add the approval toggle to the Household section in settings**

In `src/app/(app)/settings/page.tsx`, find the invite code block (around the `Generate new code` button) and add the approval toggle directly after it, before the `RequestHouseholdJoinCard` row. Add this JSX:

```tsx
{/* Approval toggle — admin only */}
{isAdmin && (
  <div
    className="p-4"
    style={{ borderTop: '1px solid var(--roost-border)' }}
  >
    <div className="flex items-start justify-between gap-4">
      <div style={{ flex: 1 }}>
        <p className="text-sm" style={{ color: 'var(--roost-text-primary)', fontWeight: 700 }}>
          Require approval for new members
        </p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--roost-text-muted)', fontWeight: 600 }}>
          Anyone with your household code must be approved before they can join.
        </p>
        {joinApprovalRequired === false && (
          <p className="text-xs mt-1" style={{ color: '#D97706', fontWeight: 700 }}>
            Anyone with your code can join immediately. Only share it with people you trust.
          </p>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={joinApprovalRequired}
        onClick={async () => {
          const newValue = !joinApprovalRequired
          await fetch(`/api/household/${household?.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ joinApprovalRequired: newValue }),
          })
          queryClient.invalidateQueries({ queryKey: ['household'] })
        }}
        style={{
          width: 44,
          height: 24,
          borderRadius: 999,
          border: 'none',
          cursor: 'pointer',
          flexShrink: 0,
          backgroundColor: joinApprovalRequired ? '#22C55E' : '#D1D5DB',
          transition: 'background-color 0.2s',
          position: 'relative',
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: joinApprovalRequired ? 22 : 2,
            width: 20,
            height: 20,
            borderRadius: '50%',
            backgroundColor: '#ffffff',
            transition: 'left 0.2s',
          }}
        />
      </button>
    </div>
  </div>
)}
```

You also need `joinApprovalRequired` from `useHousehold()`. Find the `useHousehold()` destructure in settings/page.tsx and add it:

```typescript
const { household, role, permissions, isPremium, joinApprovalRequired } = useHousehold()
```

- [ ] **Step 3: Test the full flow end-to-end**

1. Admin: go to Settings > Household. Confirm the approval toggle is ON (green) by default.
2. Second browser: sign up, enter household code. Confirm waiting room appears.
3. Admin: the blue banner appears. Click "Review" — scrolls to Settings > Household. The pending request row appears with the user's name.
4. Admin: click the green check. Toast "Member approved." Row disappears. Banner count drops.
5. Second browser: the polling detects `approved` status, refreshes session, and redirects to `/today`.
6. Admin: toggle approval OFF. Confirm amber warning appears. Second browser: joining should now be immediate (no waiting room).
7. Admin: toggle approval back ON.

- [ ] **Step 4: Commit**

```bash
git add src/components/household/HouseholdJoinRequestsCard.tsx src/app/(app)/settings/page.tsx
git commit -m "feat: join requests approval UI in settings and approval toggle"
```

---

## Self-review notes

- The invite link route (`src/app/api/invite/[token]/route.ts`) does not yet exist in the codebase. When it is built, apply the same approval check as the join route: check `household.join_approval_required`, insert a `join_requests` row with `type: 'invite'` if true.
- `RequestHouseholdJoinCard` is left as a `null` stub — it has no clear purpose for an already-joined member and is wired up but unused.
- The `isPremium` variable in `layout.tsx` is unused — left as-is to avoid scope creep.
