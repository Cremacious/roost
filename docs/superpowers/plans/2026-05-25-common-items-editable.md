# Editable Common Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the hardcoded `COMMON_ITEMS` chip array on the Lists page with a household-shared, CRUD-managed table so households can add, rename, and remove their own quick-add items.

**Architecture:** A new `common_items` table per household. Four REST endpoints under `/api/grocery/common-items` (GET/POST list, PATCH/DELETE by id). The Lists page swaps its hardcoded constant for a TanStack Query against the GET endpoint; a pencil button in each COMMON ITEMS header opens a `DraggableSheet` for CRUD. On household create we seed the twelve defaults; for pre-existing households a lazy seed in GET fires once (gated on total row count including soft-deleted) so deletions stick.

**Tech Stack:** Next.js 16 App Router API routes, Drizzle ORM + Neon, TanStack Query (optimistic + invalidate), sonner for toasts, `DraggableSheet` + shadcn `AlertDialog`, Playwright for E2E.

**Spec:** `docs/superpowers/specs/2026-05-25-common-items-editable-design.md`

**Testing note:** This repo has no unit-test runner — only Playwright E2E (`npm run test:e2e`) plus `npx tsc --noEmit` and `npm run lint`. Each task is verified with typecheck + lint + targeted manual/API checks. One Playwright spec covers the API round-trip at the end.

**Conventions:** No emojis (Lucide icons only). No em dashes or double hyphens in any UI copy. Touch targets 48px+. Toasts via sonner. The grocery section color is amber `#F59E0B` (dark `#C87D00`). All sheets use `DraggableSheet`.

---

### Task 1: Add `common_items` table

**Files:**
- Modify: `src/db/schema/grocery.ts`

- [ ] **Step 1: Add the table**

Append to the bottom of `src/db/schema/grocery.ts` (the file already imports `pgTable, text, timestamp, index` from drizzle-orm/pg-core and `households` from `./households`; confirm those imports exist and add any missing one):

```typescript
export const commonItems = pgTable('common_items', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  householdId: text('household_id')
    .notNull()
    .references(() => households.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  deletedAt: timestamp('deleted_at'),
}, (table) => [
  index('idx_common_items_household_deleted').on(table.householdId, table.deletedAt),
])
```

If `pgTable`, `text`, `timestamp`, or `index` is not yet imported at the top of the file, add it to the existing drizzle import. If `households` is not imported, add `import { households } from './households'`.

- [ ] **Step 2: Push to Neon**

Run: `npm run db:push`
Expected: drizzle-kit reports the `common_items` table created with no errors. Accept the additive change if prompted.

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no NEW errors. Pre-existing `MemberSheet.tsx` "possibly null" errors are unrelated; ignore them.

- [ ] **Step 4: Commit**

```bash
git add src/db/schema/grocery.ts
git commit -m "feat: add common_items table"
```

---

### Task 2: Default-items constant and seed helper

**Files:**
- Create: `src/lib/constants/commonItems.ts`
- Create: `src/lib/utils/seedCommonItems.ts`

- [ ] **Step 1: Create the defaults constant**

```typescript
// src/lib/constants/commonItems.ts
export const DEFAULT_COMMON_ITEMS: readonly string[] = [
  'Milk',
  'Eggs',
  'Bread',
  'Butter',
  'Chicken breast',
  'Pasta',
  'Rice',
  'Olive oil',
  'Onions',
  'Garlic',
  'Bananas',
  'Cheese',
]
```

- [ ] **Step 2: Create the seed helper**

```typescript
// src/lib/utils/seedCommonItems.ts
import { db } from '@/lib/db'
import { commonItems } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { DEFAULT_COMMON_ITEMS } from '@/lib/constants/commonItems'

/**
 * Idempotent seed for the twelve default common items.
 * Only inserts when the household has ZERO total rows in common_items —
 * including soft-deleted — so a household that has deleted every default
 * is not re-seeded next time someone opens the manage sheet.
 *
 * Safe to call from both the household create flow and the GET handler.
 */
export async function seedCommonItems(householdId: string): Promise<void> {
  const existing = await db
    .select({ id: commonItems.id })
    .from(commonItems)
    .where(eq(commonItems.householdId, householdId))
    .limit(1)
  if (existing.length > 0) return

  await db.insert(commonItems).values(
    DEFAULT_COMMON_ITEMS.map((name) => ({ householdId, name }))
  )
}
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/constants/commonItems.ts src/lib/utils/seedCommonItems.ts
git commit -m "feat: default common-items constant and idempotent seed helper"
```

---

### Task 3: GET and POST endpoints

**Files:**
- Create: `src/app/api/grocery/common-items/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextResponse } from 'next/server'
import { getSession, getUserHousehold, checkMemberPermission } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { commonItems } from '@/db/schema'
import { and, eq, isNull, asc, sql } from 'drizzle-orm'
import { seedCommonItems } from '@/lib/utils/seedCommonItems'

const MAX_NAME_LEN = 60

export async function GET() {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  // Lazy-seed defaults for pre-existing households that have never had a row.
  await seedCommonItems(householdId)

  const items = await db
    .select({ id: commonItems.id, name: commonItems.name })
    .from(commonItems)
    .where(and(eq(commonItems.householdId, householdId), isNull(commonItems.deletedAt)))
    .orderBy(asc(commonItems.createdAt))

  return NextResponse.json({ items })
}

export async function POST(request: Request) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const canAdd = await checkMemberPermission(session.user.id, householdId, role, 'groceryAdd')
  if (!canAdd) {
    return NextResponse.json(
      { error: 'You do not have permission to manage common items', code: 'PERMISSION_DENIED' },
      { status: 403 },
    )
  }

  const body = await request.json().catch(() => ({})) as { name?: string }
  const name = body.name?.trim()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (name.length > MAX_NAME_LEN) {
    return NextResponse.json({ error: `Name must be ${MAX_NAME_LEN} characters or fewer` }, { status: 400 })
  }

  // Case-insensitive uniqueness within the household, excluding soft-deleted rows.
  const [dup] = await db
    .select({ id: commonItems.id })
    .from(commonItems)
    .where(
      and(
        eq(commonItems.householdId, householdId),
        isNull(commonItems.deletedAt),
        sql`lower(${commonItems.name}) = lower(${name})`,
      ),
    )
    .limit(1)
  if (dup) {
    return NextResponse.json(
      { error: 'Already in your common items', code: 'DUPLICATE' },
      { status: 409 },
    )
  }

  const id = crypto.randomUUID()
  await db.insert(commonItems).values({ id, householdId, name })
  return NextResponse.json({ id, name }, { status: 201 })
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Lint the new file**

Run: `npx eslint src/app/api/grocery/common-items/route.ts`
Expected: no errors (warnings unrelated to this file may appear in a broader lint and are not your concern).

- [ ] **Step 4: Commit**

```bash
git add src/app/api/grocery/common-items/route.ts
git commit -m "feat: GET and POST common-items endpoints"
```

---

### Task 4: PATCH and DELETE endpoints

**Files:**
- Create: `src/app/api/grocery/common-items/[id]/route.ts`

- [ ] **Step 1: Create the route**

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { getSession, getUserHousehold, checkMemberPermission } from '@/lib/auth/helpers'
import { db } from '@/lib/db'
import { commonItems } from '@/db/schema'
import { and, eq, isNull, ne, sql } from 'drizzle-orm'

const MAX_NAME_LEN = 60

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const canAdd = await checkMemberPermission(session.user.id, householdId, role, 'groceryAdd')
  if (!canAdd) {
    return NextResponse.json(
      { error: 'You do not have permission to manage common items', code: 'PERMISSION_DENIED' },
      { status: 403 },
    )
  }

  const body = await request.json().catch(() => ({})) as { name?: string }
  const name = body.name?.trim()
  if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 })
  if (name.length > MAX_NAME_LEN) {
    return NextResponse.json({ error: `Name must be ${MAX_NAME_LEN} characters or fewer` }, { status: 400 })
  }

  // Confirm the target exists in the caller's household and is not soft-deleted.
  const [target] = await db
    .select({ id: commonItems.id })
    .from(commonItems)
    .where(
      and(
        eq(commonItems.id, id),
        eq(commonItems.householdId, householdId),
        isNull(commonItems.deletedAt),
      ),
    )
    .limit(1)
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Case-insensitive uniqueness excluding self.
  const [dup] = await db
    .select({ id: commonItems.id })
    .from(commonItems)
    .where(
      and(
        eq(commonItems.householdId, householdId),
        isNull(commonItems.deletedAt),
        ne(commonItems.id, id),
        sql`lower(${commonItems.name}) = lower(${name})`,
      ),
    )
    .limit(1)
  if (dup) {
    return NextResponse.json(
      { error: 'Already in your common items', code: 'DUPLICATE' },
      { status: 409 },
    )
  }

  await db.update(commonItems).set({ name }).where(eq(commonItems.id, id))
  return NextResponse.json({ id, name })
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await params

  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const membership = await getUserHousehold(session.user.id)
  if (!membership) return NextResponse.json({ error: 'No household' }, { status: 403 })

  const { householdId, role } = membership
  if (role === 'child') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const canAdd = await checkMemberPermission(session.user.id, householdId, role, 'groceryAdd')
  if (!canAdd) {
    return NextResponse.json(
      { error: 'You do not have permission to manage common items', code: 'PERMISSION_DENIED' },
      { status: 403 },
    )
  }

  const [target] = await db
    .select({ id: commonItems.id })
    .from(commonItems)
    .where(
      and(
        eq(commonItems.id, id),
        eq(commonItems.householdId, householdId),
        isNull(commonItems.deletedAt),
      ),
    )
    .limit(1)
  if (!target) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  await db.update(commonItems).set({ deletedAt: new Date() }).where(eq(commonItems.id, id))
  return NextResponse.json({ ok: true })
}
```

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Lint the new file**

Run: `npx eslint "src/app/api/grocery/common-items/[id]/route.ts"`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/api/grocery/common-items/[id]/route.ts"
git commit -m "feat: PATCH and DELETE common-items endpoints"
```

---

### Task 5: Seed common items on household create

**Files:**
- Modify: `src/app/api/household/create/route.ts`

- [ ] **Step 1: Add the seed call**

In `src/app/api/household/create/route.ts`, add an import near the other helpers (after the existing `@/db/schema` import):

```typescript
import { seedCommonItems } from '@/lib/utils/seedCommonItems'
```

Then in the `POST` handler, after the membership insert and before the `db.update(user).set({ onboardingCompleted: true ...` block, add:

```typescript
  // Seed the default twelve common items so the Lists page chip grid is populated.
  await seedCommonItems(householdId)
```

The resulting order in the POST handler should be: create household row → create admin membership → seed common items → mark onboarding complete → return.

- [ ] **Step 2: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/api/household/create/route.ts
git commit -m "feat: seed default common items on household create"
```

---

### Task 6: Lists page consumes the API

**Files:**
- Modify: `src/app/(app)/lists/page.tsx`

This swaps the hardcoded chip source for a query, in both layout variants of the page (the COMMON ITEMS section appears twice — confirmed at two render sites). The pencil button to open the manage sheet is wired in Task 7; here you only swap the data source and keep the chip behavior identical.

- [ ] **Step 1: Remove the hardcoded constant**

In `src/app/(app)/lists/page.tsx`, delete the block:

```typescript
const COMMON_ITEMS = [
  'Milk',
  'Eggs',
  'Bread',
  'Butter',
  'Chicken breast',
  'Pasta',
  'Rice',
  'Olive oil',
  'Onions',
  'Garlic',
  'Bananas',
  'Cheese',
]
```

- [ ] **Step 2: Add the query inside the page component**

Near the other `useQuery` hooks in the default exported page component, add:

```typescript
  const { data: commonItemsData } = useQuery<{ items: { id: string; name: string }[] }>({
    queryKey: ['common-items'],
    queryFn: async () => {
      const res = await fetch('/api/grocery/common-items')
      if (!res.ok) throw new Error('Failed to load common items')
      return res.json()
    },
    staleTime: 30_000,
  })
  const commonItems = commonItemsData?.items ?? []
```

- [ ] **Step 3: Update both render sites**

Find the two existing `{COMMON_ITEMS.map((itemName) => (` JSX blocks (around lines 1930 and 2211 in the current file). In each, replace `COMMON_ITEMS.map((itemName) => (` with `commonItems.map((item) => (`, update the `key` from `key={itemName}` to `key={item.id}`, and replace `{itemName}` inside the chip label with `{item.name}`. The `onClick` should change from `() => addMutation.mutate({ name: itemName })` to `() => addMutation.mutate({ name: item.name })`.

The full updated chip block for each site should look like:

```tsx
              {commonItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => addMutation.mutate({ name: item.name })}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '6px 12px',
                    borderRadius: 20,
                    border: '1.5px solid var(--roost-border)',
                    backgroundColor: 'var(--roost-surface)',
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--roost-text-primary)',
                    cursor: 'pointer',
                    fontFamily: 'inherit',
                  }}
                >
                  <Plus size={12} color={COLOR} strokeWidth={2.5} />
                  {item.name}
                </button>
              ))}
```

(Leave the surrounding container and the "COMMON ITEMS" header untouched in this task — Task 7 adds the pencil button.)

- [ ] **Step 4: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 5: Manual smoke (optional)**

Start the dev server and sign in as a seeded user. On `/lists`, confirm the COMMON ITEMS chip grid still shows the twelve defaults. Tapping a chip should still add it to the current list. No regression in behavior.

- [ ] **Step 6: Commit**

```bash
git add "src/app/(app)/lists/page.tsx"
git commit -m "feat: load common items from API on lists page"
```

---

### Task 7: CommonItemsSheet (manage sheet) + pencil button wiring

**Files:**
- Create: `src/components/grocery/CommonItemsSheet.tsx`
- Modify: `src/app/(app)/lists/page.tsx`

- [ ] **Step 1: Create the sheet**

```tsx
'use client'

import { useState } from 'react'
import { motion } from 'framer-motion'
import { Check, Pencil, Plus, Trash2, X } from 'lucide-react'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { DraggableSheet } from '@/components/shared/DraggableSheet'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'

const COLOR = '#F59E0B'
const COLOR_DARK = '#C87D00'

interface CommonItem { id: string; name: string }
interface CommonItemsResponse { items: CommonItem[] }

const LABEL_STYLE: React.CSSProperties = {
  display: 'block', fontSize: 11, fontWeight: 800, textTransform: 'uppercase',
  letterSpacing: '0.07em', color: '#374151', marginBottom: 6,
}
const INPUT_STYLE: React.CSSProperties = {
  width: '100%', height: 48, fontSize: 16, fontWeight: 600, padding: '0 14px',
  border: '1.5px solid var(--roost-border)', borderBottom: '3px solid var(--roost-border-bottom)',
  borderRadius: 12, background: 'var(--roost-surface)', color: 'var(--roost-text-primary)', outline: 'none',
}
const ADD_BTN_STYLE: React.CSSProperties = {
  height: 48, paddingLeft: 16, paddingRight: 16, borderRadius: 12,
  border: 'none', borderBottom: `3px solid ${COLOR_DARK}`, background: COLOR,
  color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', whiteSpace: 'nowrap',
}

export function CommonItemsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const qc = useQueryClient()
  const { data } = useQuery<CommonItemsResponse>({
    queryKey: ['common-items'],
    queryFn: async () => {
      const res = await fetch('/api/grocery/common-items')
      if (!res.ok) throw new Error('Failed to load common items')
      return res.json()
    },
    enabled: open,
    staleTime: 30_000,
  })
  const items = data?.items ?? []

  const [newName, setNewName] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')
  const [removeTarget, setRemoveTarget] = useState<CommonItem | null>(null)

  const addMut = useMutation({
    mutationFn: async (name: string) => {
      const res = await fetch('/api/grocery/common-items', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Failed to add')
      return body as CommonItem
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['common-items'] }); setNewName(''); toast.success('Added') },
    onError: (err) => toast.error('Could not add', { description: err instanceof Error ? err.message : 'Please try again.' }),
  })

  const renameMut = useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const res = await fetch(`/api/grocery/common-items/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Failed to rename')
      return body as CommonItem
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['common-items'] }); setEditingId(null); toast.success('Renamed') },
    onError: (err) => toast.error('Could not rename', { description: err instanceof Error ? err.message : 'Please try again.' }),
  })

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/grocery/common-items/${id}`, { method: 'DELETE' })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error ?? 'Failed to delete')
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['common-items'] }); setRemoveTarget(null); toast.success('Removed') },
    onError: (err) => toast.error('Could not remove', { description: err instanceof Error ? err.message : 'Please try again.' }),
  })

  function startEdit(item: CommonItem) {
    setEditingId(item.id)
    setEditName(item.name)
  }

  function submitAdd() {
    const trimmed = newName.trim()
    if (!trimmed) return
    addMut.mutate(trimmed)
  }

  function submitRename(item: CommonItem) {
    const trimmed = editName.trim()
    if (!trimmed) return
    if (trimmed === item.name) { setEditingId(null); return }
    renameMut.mutate({ id: item.id, name: trimmed })
  }

  return (
    <>
      <DraggableSheet open={open} onOpenChange={(v: boolean) => { if (!v) onClose() }} featureColor={COLOR}>
        <div className="px-4 pb-8">
          <p className="mb-1 text-lg" style={{ color: 'var(--roost-text-primary)', fontWeight: 800 }}>
            Common items
          </p>
          <p style={{ margin: '0 0 16px', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)', lineHeight: 1.5 }}>
            Quick-add suggestions shared with everyone in your household.
          </p>

          {/* Add row */}
          <div style={{ marginBottom: 20 }}>
            <label style={LABEL_STYLE}>Add a common item</label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); submitAdd() } }}
                placeholder="e.g. Yogurt"
                maxLength={60}
                style={{ ...INPUT_STYLE, flex: 1 }}
              />
              <motion.button
                type="button"
                whileTap={{ y: 1 }}
                onClick={submitAdd}
                disabled={addMut.isPending || !newName.trim()}
                style={{ ...ADD_BTN_STYLE, opacity: addMut.isPending || !newName.trim() ? 0.5 : 1 }}
              >
                <Plus size={16} style={{ verticalAlign: 'middle', marginRight: 4 }} />
                Add
              </motion.button>
            </div>
          </div>

          {/* List */}
          {items.length === 0 ? (
            <p style={{ margin: '12px 0', fontSize: 13, fontWeight: 600, color: 'var(--roost-text-muted)', textAlign: 'center' }}>
              No common items yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {items.map((item) => {
                const editing = editingId === item.id
                return (
                  <div
                    key={item.id}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 8,
                      padding: '10px 12px',
                      border: '1.5px solid var(--roost-border)',
                      borderBottom: '3px solid var(--roost-border-bottom)',
                      borderRadius: 12, background: 'var(--roost-surface)',
                    }}
                  >
                    {editing ? (
                      <>
                        <input
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') { e.preventDefault(); submitRename(item) }
                            if (e.key === 'Escape') setEditingId(null)
                          }}
                          maxLength={60}
                          autoFocus
                          style={{ ...INPUT_STYLE, flex: 1, height: 40 }}
                        />
                        <button
                          type="button"
                          aria-label="Save rename"
                          onClick={() => submitRename(item)}
                          disabled={renameMut.isPending}
                          style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: COLOR, color: '#fff', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Check size={16} />
                        </button>
                        <button
                          type="button"
                          aria-label="Cancel rename"
                          onClick={() => setEditingId(null)}
                          style={{ width: 40, height: 40, borderRadius: 10, border: '1.5px solid var(--roost-border)', background: 'var(--roost-surface)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <X size={16} color="var(--roost-text-muted)" />
                        </button>
                      </>
                    ) : (
                      <>
                        <span style={{ flex: 1, fontSize: 14, fontWeight: 700, color: 'var(--roost-text-primary)' }}>
                          {item.name}
                        </span>
                        <button
                          type="button"
                          aria-label={`Rename ${item.name}`}
                          onClick={() => startEdit(item)}
                          style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Pencil size={16} color="var(--roost-text-muted)" />
                        </button>
                        <button
                          type="button"
                          aria-label={`Remove ${item.name}`}
                          onClick={() => setRemoveTarget(item)}
                          style={{ width: 40, height: 40, borderRadius: 10, border: 'none', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                        >
                          <Trash2 size={16} color="#EF4444" />
                        </button>
                      </>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </DraggableSheet>

      <AlertDialog open={!!removeTarget} onOpenChange={(v) => { if (!v) setRemoveTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove {removeTarget?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              It will no longer appear as a quick-add chip. Items already added to your lists are unaffected.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => removeTarget && deleteMut.mutate(removeTarget.id)}
              disabled={deleteMut.isPending}
              style={{ background: '#EF4444', borderBottom: '3px solid #C93B3B', color: '#fff', fontWeight: 700 }}
            >
              {deleteMut.isPending ? 'Removing...' : 'Remove'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
```

- [ ] **Step 2: Wire the pencil button into the lists page**

In `src/app/(app)/lists/page.tsx`:

a) Add the import next to other component imports near the top of the file:

```typescript
import { CommonItemsSheet } from '@/components/grocery/CommonItemsSheet'
import { Pencil } from 'lucide-react' // add `Pencil` to the existing lucide-react import if you prefer
```

(Add `Pencil` to the existing lucide-react `import { … } from 'lucide-react'` block rather than a second import line, to follow the file's style.)

b) Add state inside the default exported page component, next to other `useState` calls:

```typescript
  const [commonItemsSheetOpen, setCommonItemsSheetOpen] = useState(false)
```

c) Both `<p ...>COMMON ITEMS</p>` headers are currently a standalone `<p>`. Wrap each in a flex row that adds a pencil button to its right. Replace each occurrence of the standalone header `<p style={{ … }}>COMMON ITEMS</p>` with this block:

```tsx
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <p
                style={{
                  fontSize: 11,
                  fontWeight: 800,
                  color: 'var(--roost-text-muted)',
                  letterSpacing: '0.08em',
                  margin: 0,
                }}
              >
                COMMON ITEMS
              </p>
              <button
                type="button"
                aria-label="Edit common items"
                onClick={() => setCommonItemsSheetOpen(true)}
                style={{
                  width: 32, height: 32, borderRadius: 8,
                  border: '1.5px solid var(--roost-border)',
                  borderBottom: '2px solid var(--roost-border-bottom)',
                  background: 'var(--roost-surface)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
                <Pencil size={14} color="var(--roost-text-muted)" />
              </button>
            </div>
```

Note: the previous `<p style={{ … marginBottom: 8 }}>COMMON ITEMS</p>` had `marginBottom: 8` so the gap above the chip grid is preserved by the new wrapping `<div>`'s `marginBottom: 8` and the inner `<p>`'s `margin: 0`. Do not change the chip-grid container or chips themselves in this task.

d) Mount the sheet near the bottom of the page's JSX (alongside any other dialog/sheet mounts, before the final closing fragment/div):

```tsx
      <CommonItemsSheet open={commonItemsSheetOpen} onClose={() => setCommonItemsSheetOpen(false)} />
```

- [ ] **Step 3: Typecheck**

Run: `npx tsc --noEmit`
Expected: no new errors.

- [ ] **Step 4: Lint touched files**

Run: `npx eslint src/components/grocery/CommonItemsSheet.tsx "src/app/(app)/lists/page.tsx"`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/grocery/CommonItemsSheet.tsx "src/app/(app)/lists/page.tsx"
git commit -m "feat: common-items manage sheet with pencil button"
```

---

### Task 8: E2E spec for the API round-trip

**Files:**
- Create: `e2e/common-items.spec.ts`
- Modify: `playwright.config.ts`

- [ ] **Step 1: Write the spec**

```typescript
import { test, expect } from '@playwright/test'

// Runs under the "free" project (storageState = free admin).
test('common items CRUD round-trip', async ({ request }) => {
  // 1. GET seeds defaults on first call.
  const list1 = await (await request.get('/api/grocery/common-items')).json()
  expect(Array.isArray(list1.items)).toBeTruthy()
  expect(list1.items.length).toBeGreaterThan(0)

  // 2. POST a new item.
  const suffix = Date.now()
  const newName = `E2E Item ${suffix}`
  const create = await request.post('/api/grocery/common-items', { data: { name: newName } })
  expect(create.status()).toBe(201)
  const created = await create.json()
  expect(created.name).toBe(newName)

  // 3. Duplicate POST returns 409.
  const dup = await request.post('/api/grocery/common-items', { data: { name: newName } })
  expect(dup.status()).toBe(409)

  // 4. PATCH renames.
  const renamed = `${newName} renamed`
  const patch = await request.patch(`/api/grocery/common-items/${created.id}`, { data: { name: renamed } })
  expect(patch.ok()).toBeTruthy()
  const patchBody = await patch.json()
  expect(patchBody.name).toBe(renamed)

  // 5. DELETE soft-deletes.
  const del = await request.delete(`/api/grocery/common-items/${created.id}`)
  expect(del.ok()).toBeTruthy()

  // 6. The item no longer appears.
  const list2 = await (await request.get('/api/grocery/common-items')).json()
  expect((list2.items as { id: string }[]).some(i => i.id === created.id)).toBe(false)

  // 7. PATCH on the deleted id returns 404.
  const patchDeleted = await request.patch(`/api/grocery/common-items/${created.id}`, { data: { name: 'no' } })
  expect(patchDeleted.status()).toBe(404)
})
```

- [ ] **Step 2: Add the spec to the free project's testMatch**

In `playwright.config.ts`, the "free" project has an explicit `testMatch` allowlist. Add the new spec to it.

Find this list (it currently includes e.g. `"**/navigation.spec.ts"`, `"**/chores.spec.ts"`, `"**/grocery.spec.ts"`, `"**/child-upgrade.spec.ts"`) and append:

```typescript
"**/common-items.spec.ts",
```

Match the existing array's formatting and trailing comma style.

- [ ] **Step 3: Typecheck and a syntax run**

Run: `npx tsc --noEmit` — expected: no new errors.
If you can run Playwright in this environment: `npm run db:seed && npm run test:e2e -- common-items`. Expected: PASS. If the test runner cannot start (environment issue, e.g. stale auth state or webServer timeout), capture the output and report it. Treat it as not your bug if the failure is `global-setup`-related.

- [ ] **Step 4: Commit**

```bash
git add e2e/common-items.spec.ts playwright.config.ts
git commit -m "test: e2e for common-items CRUD round-trip"
```

---

### Task 9: Final gate + docs

**Files:**
- Modify: `CLAUDE.md`

- [ ] **Step 1: Update CLAUDE.md**

Add a new subsection immediately after the "## Features: Grocery Lists" section (or, if that exact heading is not present, immediately after the existing grocery-related notes in the file). The text:

```markdown
## Features: Common Items
- Each household has its own editable list of quick-add "Common items" chips
  shown above the active grocery list on /lists.
- Schema: common_items (id, household_id, name, created_at, deleted_at). Indexed
  on (household_id, deleted_at).
- API:
  - GET /api/grocery/common-items lists non-deleted items for the caller's
    household and lazy-seeds the twelve defaults if the household has zero
    total rows (including soft-deleted), so deletions stick.
  - POST adds an item (case-insensitive uniqueness within the household,
    max 60 chars, 409 DUPLICATE on collision).
  - PATCH /api/grocery/common-items/[id] renames; DELETE soft-deletes.
- Permission: anyone with grocery.add (non-child member). Children are blocked.
- Seeding: on household create, the twelve defaults are inserted via
  seedCommonItems(householdId). The same helper is the lazy-seed in GET.
- UI: src/components/grocery/CommonItemsSheet.tsx is a DraggableSheet with an
  add row at top and a list of rename/delete rows. The pencil-icon button next
  to each COMMON ITEMS header on /lists opens it.
- Defaults: Milk, Eggs, Bread, Butter, Chicken breast, Pasta, Rice, Olive oil,
  Onions, Garlic, Bananas, Cheese — defined in src/lib/constants/commonItems.ts.
```

- [ ] **Step 2: Final typecheck and lint pass on the feature files**

Run:
```
npx tsc --noEmit
npx eslint src/db/schema/grocery.ts src/lib/constants/commonItems.ts src/lib/utils/seedCommonItems.ts src/app/api/grocery/common-items/route.ts "src/app/api/grocery/common-items/[id]/route.ts" src/components/grocery/CommonItemsSheet.tsx "src/app/(app)/lists/page.tsx" src/app/api/household/create/route.ts e2e/common-items.spec.ts
```
Expected: no NEW errors anywhere (pre-existing MemberSheet.tsx "possibly null" errors are unrelated; ignore them). Lint clean on all listed feature files.

- [ ] **Step 3: Commit the docs**

```bash
git add CLAUDE.md
git commit -m "docs: document editable common items feature"
```

---

## Notes for the implementer

- The query key `['common-items']` is shared between the page (Task 6) and the sheet (Task 7). Mutations in the sheet invalidate this key, so the chip grid refreshes automatically when the sheet closes.
- Both render sites in `lists/page.tsx` use the same `commonItems` array and the same query — do not duplicate the query.
- `seedCommonItems` is intentionally idempotent and gated on total row count, including soft-deleted. Do not change that gate without re-reading the spec: a user who deletes every default must not see them resurrected.
- Children remain blocked at every endpoint (the existing finance-block pattern). They never see the pencil button because the chip grid (and thus the page section) is already gated by the lists page's existing child handling.
- Permissions follow `grocery.add` because adding to common items is essentially the same trust level as adding to a list.
