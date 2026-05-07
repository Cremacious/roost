# Multi-Household Switching — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-05-07-multi-household-switching-design.md`
**Goal:** Let premium users belong to multiple households and switch between them via an inline sidebar dropdown (desktop) and a bottom sheet (mobile).

**Architecture summary:**
- Add `active_household_id` to `users` table — single source of truth for active household
- Update `getUserHousehold()` to respect it — transparent to all API routes
- Two new API routes: `GET /api/households` and `PATCH /api/household/switch`
- Gate join/create to 1 household for free users
- `HouseholdSwitcher` component in Sidebar, `HouseholdSwitcherSheet` in TopBar

---

## File Map

**Create:**
- `apps/web/src/app/api/households/route.ts`
- `apps/web/src/app/api/household/switch/route.ts`
- `apps/web/src/components/layout/HouseholdSwitcher.tsx`
- `apps/web/src/components/layout/HouseholdSwitcherSheet.tsx`

**Modify:**
- `apps/web/src/db/schema/users.ts`
- `apps/web/scripts/add-missing-columns.ts`
- `apps/web/src/lib/auth/helpers.ts`
- `apps/web/src/components/layout/Sidebar.tsx`
- `apps/web/src/components/layout/TopBar.tsx`
- `apps/web/src/app/api/household/join/route.ts`
- `apps/web/src/app/api/household/create/route.ts`
- `apps/web/src/lib/constants/premiumGateConfig.ts`

---

## Task 1: DB Schema + Migration

**Files:**
- Modify: `apps/web/src/db/schema/users.ts`
- Modify: `apps/web/scripts/add-missing-columns.ts`

- [ ] **Step 1: Add `activeHouseholdId` to users schema**

Open `apps/web/src/db/schema/users.ts`. After the `cashappHandle` line, add:

```ts
  cashappHandle: text('cashapp_handle'),
  activeHouseholdId: text('active_household_id'),
```

No FK reference needed here — we validate membership at runtime rather than at the DB level (avoids FK issues when a user is removed from a household).

- [ ] **Step 2: Add migration to `add-missing-columns.ts`**

Open `apps/web/scripts/add-missing-columns.ts`. Add this block before the final `console.log('Done.')`:

```ts
  await sql`
    ALTER TABLE users
    ADD COLUMN IF NOT EXISTS active_household_id text
  `
```

- [ ] **Step 3: Run the migration**

```bash
cd apps/web && npx tsx --env-file=.env.local scripts/add-missing-columns.ts
```

Expected: `Adding missing columns... Done.`

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/db/schema/users.ts apps/web/scripts/add-missing-columns.ts
git commit -m "feat: add active_household_id column to users table"
```

---

## Task 2: Update `getUserHousehold()`

**Files:**
- Modify: `apps/web/src/lib/auth/helpers.ts`

- [ ] **Step 1: Update imports**

Add `users` to the schema import and add `eq` for the users query:

```ts
import { householdMembers, households, users } from '@/db/schema'
import { eq, and, isNull, desc } from 'drizzle-orm'
```

- [ ] **Step 2: Rewrite `getUserHousehold()`**

Replace the existing function with:

```ts
export async function getUserHousehold(userId: string) {
  // 1. Read the user's active_household_id preference
  const [userRow] = await db
    .select({ activeHouseholdId: users.activeHouseholdId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)

  const activeHouseholdId = userRow?.activeHouseholdId ?? null

  // 2. If set, try to load that household membership
  if (activeHouseholdId) {
    const row = await db
      .select({
        householdId: householdMembers.householdId,
        role: householdMembers.role,
        household: {
          name: households.name,
          subscriptionStatus: households.subscription_status,
        },
      })
      .from(householdMembers)
      .innerJoin(households, eq(householdMembers.householdId, households.id))
      .where(
        and(
          eq(householdMembers.userId, userId),
          eq(householdMembers.householdId, activeHouseholdId),
          isNull(householdMembers.deletedAt),
          isNull(households.deleted_at),
        )
      )
      .limit(1)
      .then(r => r[0] ?? null)

    if (row) return row
    // Membership no longer valid — fall through to most-recent
  }

  // 3. Fall back to most recently joined household
  const row = await db
    .select({
      householdId: householdMembers.householdId,
      role: householdMembers.role,
      household: {
        name: households.name,
        subscriptionStatus: households.subscription_status,
      },
    })
    .from(householdMembers)
    .innerJoin(households, eq(householdMembers.householdId, households.id))
    .where(
      and(
        eq(householdMembers.userId, userId),
        isNull(householdMembers.deletedAt),
        isNull(households.deleted_at),
      )
    )
    .orderBy(desc(householdMembers.createdAt))
    .limit(1)
    .then(r => r[0] ?? null)

  return row
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/auth/helpers.ts
git commit -m "feat: update getUserHousehold to respect active_household_id"
```

---

## Task 3: New API Routes

**Files:**
- Create: `apps/web/src/app/api/households/route.ts`
- Create: `apps/web/src/app/api/household/switch/route.ts`

- [ ] **Step 1: Create `GET /api/households`**

```ts
// apps/web/src/app/api/households/route.ts
import { NextResponse } from 'next/server'
import { getSession, getUserHousehold } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { householdMembers, households, users } from '@/db/schema'
import { eq, and, isNull, sql } from 'drizzle-orm'

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const userId = session.user.id

  // Get active household id for this user
  const [userRow] = await db
    .select({ activeHouseholdId: users.activeHouseholdId })
    .from(users)
    .where(eq(users.id, userId))
    .limit(1)
  const activeHouseholdId = userRow?.activeHouseholdId ?? null

  // Get all active memberships with household info + member count
  const rows = await db
    .select({
      householdId: householdMembers.householdId,
      role: householdMembers.role,
      householdName: households.name,
      subscriptionStatus: households.subscription_status,
      joinedAt: householdMembers.createdAt,
    })
    .from(householdMembers)
    .innerJoin(households, eq(householdMembers.householdId, households.id))
    .where(
      and(
        eq(householdMembers.userId, userId),
        isNull(householdMembers.deletedAt),
        isNull(households.deleted_at),
      )
    )
    .orderBy(householdMembers.createdAt)

  // Get member counts per household
  const householdIds = rows.map(r => r.householdId)
  const memberCounts: Record<string, number> = {}
  if (householdIds.length > 0) {
    const counts = await db
      .select({
        householdId: householdMembers.householdId,
        count: sql<number>`count(*)`,
      })
      .from(householdMembers)
      .where(
        and(
          isNull(householdMembers.deletedAt),
        )
      )
      .groupBy(householdMembers.householdId)
    for (const c of counts) {
      memberCounts[c.householdId] = Number(c.count)
    }
  }

  // Determine which household is "active": explicit preference, or most recently joined
  const effectiveActiveId = activeHouseholdId && rows.some(r => r.householdId === activeHouseholdId)
    ? activeHouseholdId
    : rows[rows.length - 1]?.householdId ?? null

  const result = rows.map(r => ({
    id: r.householdId,
    name: r.householdName,
    role: r.role,
    memberCount: memberCounts[r.householdId] ?? 1,
    isPremium: r.subscriptionStatus === 'premium',
    isActive: r.householdId === effectiveActiveId,
  }))

  return NextResponse.json({ households: result })
}
```

- [ ] **Step 2: Create `PATCH /api/household/switch`**

```ts
// apps/web/src/app/api/household/switch/route.ts
import { NextResponse } from 'next/server'
import { getSession } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { householdMembers, households, users } from '@/db/schema'
import { eq, and, isNull } from 'drizzle-orm'

export async function PATCH(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({})) as { householdId?: string }
  if (!body.householdId) {
    return NextResponse.json({ error: 'householdId required' }, { status: 400 })
  }

  const userId = session.user.id

  // Validate membership
  const [membership] = await db
    .select({
      role: householdMembers.role,
      householdName: households.name,
    })
    .from(householdMembers)
    .innerJoin(households, eq(householdMembers.householdId, households.id))
    .where(
      and(
        eq(householdMembers.userId, userId),
        eq(householdMembers.householdId, body.householdId),
        isNull(householdMembers.deletedAt),
        isNull(households.deleted_at),
      )
    )
    .limit(1)

  if (!membership) {
    return NextResponse.json({ error: 'Not a member of this household' }, { status: 403 })
  }

  // Children cannot switch households
  if (membership.role === 'child') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Write active household
  await db
    .update(users)
    .set({ activeHouseholdId: body.householdId, updatedAt: new Date() })
    .where(eq(users.id, userId))

  return NextResponse.json({
    ok: true,
    household: {
      id: body.householdId,
      name: membership.householdName,
      role: membership.role,
    },
  })
}
```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/households/route.ts apps/web/src/app/api/household/switch/route.ts
git commit -m "feat: add GET /api/households and PATCH /api/household/switch routes"
```

---

## Task 4: Free-Tier Household Limit

**Files:**
- Modify: `apps/web/src/app/api/household/join/route.ts`
- Modify: `apps/web/src/app/api/household/create/route.ts`

- [ ] **Step 1: Read both files**

Read `apps/web/src/app/api/household/join/route.ts` and `apps/web/src/app/api/household/create/route.ts` in full.

- [ ] **Step 2: Add limit check helper**

In both files, after the session/user check and before the membership insert, add this check. Insert it right after the "check not already a member" block in join, and right before the household insert in create:

```ts
// Free-tier: max 1 household
const existingMemberships = await db
  .select({ id: householdMembers.id })
  .from(householdMembers)
  .where(
    and(
      eq(householdMembers.userId, session.user.id),
      isNull(householdMembers.deletedAt),
    )
  )

if (existingMemberships.length >= 1) {
  // Check if current household is premium
  // For join: the user's existing household determines free/premium status
  // Simpler: just check if user already has any household membership
  // Premium users don't hit this because we check subscription_status on THEIR household
  // Actually: check if the user's CURRENT household is premium
  const currentMembership = await db
    .select({ subscriptionStatus: households.subscription_status })
    .from(householdMembers)
    .innerJoin(households, eq(householdMembers.householdId, households.id))
    .where(
      and(
        eq(householdMembers.userId, session.user.id),
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
```

Make sure `households` is imported in both files — check existing imports and add if missing.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/app/api/household/join/route.ts apps/web/src/app/api/household/create/route.ts
git commit -m "feat: enforce single-household limit for free users"
```

---

## Task 5: Add `households` Premium Gate Config

**Files:**
- Modify: `apps/web/src/lib/constants/premiumGateConfig.ts`

- [ ] **Step 1: Read the file**

Read `apps/web/src/lib/constants/premiumGateConfig.ts` in full.

- [ ] **Step 2: Add the `households` entry**

Add `Home` to the Lucide imports at the top. Then add a new entry to `PREMIUM_GATE_CONFIG`:

```ts
  households: {
    icon: Home,
    title: 'Unlock multiple households',
    subtitle: "You're in one home. Premium lets you belong to as many as you need.",
    perks: [
      'Join or create unlimited households',
      'Switch between them instantly',
      'Each household keeps its own data',
    ],
    valueProp: 'Perfect for roommates, family homes, or managing a rental.',
    featureColor: 'expenses',
    featureHex: '#22C55E',
    featureDarkHex: '#159040',
  },
```

Also add `'households'` to the `PremiumGateFeature` type union if one exists in the file.

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/lib/constants/premiumGateConfig.ts
git commit -m "feat: add households premium gate config entry"
```

---

## Task 6: `HouseholdSwitcher` Component

**Files:**
- Create: `apps/web/src/components/layout/HouseholdSwitcher.tsx`

- [ ] **Step 1: Create the component**

This is a client component used inside the red sidebar. It fetches the households list and renders the collapsible inline dropdown.

```tsx
// apps/web/src/components/layout/HouseholdSwitcher.tsx
'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, ChevronUp, Plus } from 'lucide-react'

interface HouseholdItem {
  id: string
  name: string
  role: string
  memberCount: number
  isPremium: boolean
  isActive: boolean
}

export function HouseholdSwitcher() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data } = useQuery<{ households: HouseholdItem[] }>({
    queryKey: ['households'],
    queryFn: () => fetch('/api/households').then(r => r.json()),
    staleTime: 30_000,
  })

  const households = data?.households ?? []
  const active = households.find(h => h.isActive)

  // Only render switcher when user has 2+ households
  const hasMultiple = households.length >= 2

  async function handleSwitch(householdId: string) {
    if (households.find(h => h.id === householdId)?.isActive) {
      setOpen(false)
      return
    }
    await fetch('/api/household/switch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ householdId }),
    })
    queryClient.clear()
    setOpen(false)
    router.push('/today')
  }

  return (
    <div
      style={{
        padding: '12px 12px 10px',
        borderBottom: '1px solid rgba(255,255,255,0.12)',
      }}
    >
      <div
        style={{
          fontSize: 9,
          fontWeight: 700,
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '0.08em',
          marginBottom: 4,
          textTransform: 'uppercase',
        }}
      >
        Household
      </div>

      {/* Household name row */}
      <button
        onClick={() => hasMultiple && setOpen(o => !o)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          width: '100%',
          background: 'none',
          border: 'none',
          padding: 0,
          cursor: hasMultiple ? 'pointer' : 'default',
          gap: 6,
        }}
      >
        <span
          style={{
            fontSize: 13,
            fontWeight: 800,
            color: '#fff',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
            flex: 1,
            textAlign: 'left',
          }}
        >
          {active?.name ?? '...'}
        </span>
        {hasMultiple && (
          open
            ? <ChevronUp size={14} color="rgba(255,255,255,0.6)" />
            : <ChevronDown size={14} color="rgba(255,255,255,0.6)" />
        )}
      </button>

      {/* Dropdown */}
      {open && hasMultiple && (
        <div
          style={{
            marginTop: 8,
            background: 'rgba(0,0,0,0.25)',
            borderRadius: 10,
            padding: 6,
          }}
        >
          {households.map(h => (
            <button
              key={h.id}
              onClick={() => handleSwitch(h.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                background: h.isActive ? 'rgba(255,255,255,0.18)' : 'transparent',
                border: 'none',
                borderRadius: 7,
                padding: '8px 10px',
                marginBottom: 3,
                cursor: h.isActive ? 'default' : 'pointer',
                textAlign: 'left',
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    fontWeight: h.isActive ? 800 : 700,
                    color: h.isActive ? '#fff' : 'rgba(255,255,255,0.75)',
                  }}
                >
                  {h.name}
                </div>
                <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)' }}>
                  {h.role.charAt(0).toUpperCase() + h.role.slice(1)}
                </div>
              </div>
              {h.isActive && (
                <div
                  style={{
                    width: 8,
                    height: 8,
                    borderRadius: '50%',
                    background: '#4ade80',
                    flexShrink: 0,
                  }}
                />
              )}
            </button>
          ))}

          {/* Join / create link */}
          <button
            onClick={() => { setOpen(false); router.push('/onboarding') }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 5,
              width: '100%',
              background: 'none',
              border: 'none',
              borderTop: '1px solid rgba(255,255,255,0.1)',
              paddingTop: 7,
              paddingBottom: 3,
              paddingLeft: 10,
              cursor: 'pointer',
            }}
          >
            <Plus size={11} color="rgba(255,255,255,0.45)" />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,0.45)' }}>
              Join or create another
            </span>
          </button>
        </div>
      )}
    </div>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add apps/web/src/components/layout/HouseholdSwitcher.tsx
git commit -m "feat: add HouseholdSwitcher sidebar dropdown component"
```

---

## Task 7: Wire `HouseholdSwitcher` into Sidebar

**Files:**
- Modify: `apps/web/src/components/layout/Sidebar.tsx`

- [ ] **Step 1: Read `Sidebar.tsx` in full**

- [ ] **Step 2: Add import**

```ts
import { HouseholdSwitcher } from './HouseholdSwitcher'
```

- [ ] **Step 3: Replace the logo block with HouseholdSwitcher**

The current sidebar has a logo block at the top (the `div` with `'Roost'` text). Replace it with:

```tsx
{/* Household switcher — shows name always, dropdown when 2+ households */}
<HouseholdSwitcher />
```

Keep the existing logo/wordmark visual. Looking at the current code: the logo block renders a white square placeholder + "Roost" wordmark. Keep this above `HouseholdSwitcher`, then add `HouseholdSwitcher` immediately below it.

So the order becomes:
1. Logo block (unchanged)
2. `<HouseholdSwitcher />` (new, below logo, above nav)

- [ ] **Step 4: Dim nav when switcher is open**

The `HouseholdSwitcher` manages its own open state. To dim nav items when the dropdown is open, one approach: the `HouseholdSwitcher` returns an `isOpen` value via a `useHouseholdSwitcher` context, or simpler — accept an `onOpenChange` prop. 

For now, skip the dimming effect (it's a polish detail) — just add the component. The dimming can be added as a follow-up if desired.

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/components/layout/Sidebar.tsx
git commit -m "feat: add household switcher to sidebar"
```

---

## Task 8: Mobile — `HouseholdSwitcherSheet` + TopBar

**Files:**
- Create: `apps/web/src/components/layout/HouseholdSwitcherSheet.tsx`
- Modify: `apps/web/src/components/layout/TopBar.tsx`

- [ ] **Step 1: Create `HouseholdSwitcherSheet`**

This is a `DraggableSheet` that shows the same household list for mobile.

```tsx
// apps/web/src/components/layout/HouseholdSwitcherSheet.tsx
'use client'

import { useRouter } from 'next/navigation'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { Plus } from 'lucide-react'
import { DraggableSheet } from '@/components/shared/DraggableSheet'

interface HouseholdItem {
  id: string
  name: string
  role: string
  memberCount: number
  isPremium: boolean
  isActive: boolean
}

interface Props {
  open: boolean
  onClose: () => void
}

const COLOR = '#22C55E'
const COLOR_DARK = '#15803D'

export function HouseholdSwitcherSheet({ open, onClose }: Props) {
  const router = useRouter()
  const queryClient = useQueryClient()

  const { data } = useQuery<{ households: HouseholdItem[] }>({
    queryKey: ['households'],
    queryFn: () => fetch('/api/households').then(r => r.json()),
    staleTime: 30_000,
    enabled: open,
  })

  const households = data?.households ?? []

  async function handleSwitch(householdId: string) {
    const target = households.find(h => h.id === householdId)
    if (target?.isActive) { onClose(); return }
    await fetch('/api/household/switch', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ householdId }),
    })
    queryClient.clear()
    onClose()
    router.push('/today')
  }

  return (
    <DraggableSheet open={open} onOpenChange={v => !v && onClose()} featureColor={COLOR}>
      <div style={{ padding: '0 16px 32px' }}>
        <p style={{ fontSize: 18, fontWeight: 800, color: 'var(--roost-text-primary)', marginBottom: 16 }}>
          Switch Household
        </p>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {households.map(h => (
            <button
              key={h.id}
              onClick={() => handleSwitch(h.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'var(--roost-surface)',
                border: `1.5px solid var(--roost-border)`,
                borderBottom: h.isActive ? `3px solid ${COLOR}` : '3px solid var(--roost-border-bottom)',
                borderRadius: 12,
                padding: '12px 14px',
                cursor: h.isActive ? 'default' : 'pointer',
                textAlign: 'left',
                width: '100%',
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 800, color: 'var(--roost-text-primary)' }}>
                  {h.name}
                </div>
                <div style={{ fontSize: 12, color: 'var(--roost-text-muted)', marginTop: 2 }}>
                  {h.role.charAt(0).toUpperCase() + h.role.slice(1)} · {h.memberCount} member{h.memberCount !== 1 ? 's' : ''}
                </div>
              </div>
              {h.isActive && (
                <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLOR, flexShrink: 0 }} />
              )}
            </button>
          ))}
        </div>

        <button
          onClick={() => { onClose(); router.push('/onboarding') }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 12,
            background: 'none',
            border: 'none',
            padding: '8px 4px',
            cursor: 'pointer',
          }}
        >
          <Plus size={14} color={COLOR} />
          <span style={{ fontSize: 13, fontWeight: 700, color: COLOR }}>Join or create another household</span>
        </button>
      </div>
    </DraggableSheet>
  )
}
```

- [ ] **Step 2: Update `TopBar.tsx`**

Read `TopBar.tsx` in full. Then:

1. Add import: `import { HouseholdSwitcherSheet } from './HouseholdSwitcherSheet'`
2. Add state: `const [switcherOpen, setSwitcherOpen] = useState(false)`
3. Fetch households count to know if switcher should be enabled:
   ```ts
   const { data: householdsData } = useQuery<{ households: { id: string }[] }>({
     queryKey: ['households'],
     queryFn: () => fetch('/api/households').then(r => r.json()),
     staleTime: 30_000,
   })
   const hasMultiple = (householdsData?.households?.length ?? 0) >= 2
   ```
4. Find the mobile section that renders the household name (it's currently not in mobile TopBar — it shows the Roost logo instead). Add a tappable household name for mobile below the Roost logo block, OR make the Roost wordmark area also show the current household name and a chevron when `hasMultiple` is true.

   Looking at the current TopBar: mobile shows `<div className="flex items-center gap-2 md:hidden">` with logo + "Roost" wordmark. Replace "Roost" with a tappable element when `hasMultiple`:

   ```tsx
   {/* Mobile: logo + household name */}
   <div className="flex items-center gap-2 md:hidden">
     <div style={{ width: 26, height: 26, borderRadius: 7, backgroundColor: 'rgba(255,255,255,0.22)', flexShrink: 0 }} />
     <button
       onClick={() => hasMultiple && setSwitcherOpen(true)}
       style={{
         display: 'flex', alignItems: 'center', gap: 4,
         background: 'none', border: 'none', padding: 0,
         cursor: hasMultiple ? 'pointer' : 'default',
       }}
     >
       <span style={{ color: '#fff', fontWeight: 800, fontSize: 15, letterSpacing: '-0.3px' }}>
         {householdName || 'Roost'}
       </span>
       {hasMultiple && <ChevronDown size={14} color="rgba(255,255,255,0.7)" />}
     </button>
   </div>
   ```

5. Add `ChevronDown` to Lucide imports.
6. Render the sheet at the bottom of the component return:
   ```tsx
   <HouseholdSwitcherSheet open={switcherOpen} onClose={() => setSwitcherOpen(false)} />
   ```

- [ ] **Step 3: Commit**

```bash
git add apps/web/src/components/layout/HouseholdSwitcherSheet.tsx apps/web/src/components/layout/TopBar.tsx
git commit -m "feat: add mobile household switcher sheet and TopBar integration"
```

---

## Task 9: Push + Verify

- [ ] **Step 1: Push to GitHub**

```bash
git push origin master
```

- [ ] **Step 2: Smoke test checklist**

1. Dev server running at `http://localhost:3001` (from `apps/web/`)
2. Sign in with a premium account
3. Join a second household via invite code
4. Confirm sidebar shows the household name block with a chevron
5. Tap the name — dropdown opens, both households listed, green dot on active
6. Tap the inactive household — app navigates to `/today` under the new household
7. All data (chores, money, grocery) reflects the new household
8. On mobile viewport: TopBar shows household name with chevron, tap opens bottom sheet
9. Sign in with a free account — confirm sidebar shows static name (no chevron), joining a second household returns the `MULTIPLE_HOUSEHOLDS_PREMIUM` error

---

## Out of Scope (explicitly deferred)

- Nav dimming while switcher is open (polish, can add later)
- Notification badges per household in the switcher
- Invite landing page premium gate (low traffic path, can add in a follow-up)
